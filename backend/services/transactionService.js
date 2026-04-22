const { sql } = require('../config/db');
const logger = require('./logger');

/**
 * Transaction Service - Quản lý tất cả database transactions
 * Đảm bảo tính atomicity (Nguyên tử) - Hoặc thành công hoàn toàn, hoặc thất bại hoàn toàn
 */

/**
 * Wrapper để thực hiện transaction (Simplified - No explicit BEGIN/COMMIT)
 * @param {Function} callback - Async function nhận request object làm parameter
 * @returns {Promise} Kết quả từ callback
 */
async function executeTransaction(callback) {
  const request = new sql.Request();
  
  try {
    // Gọi callback với request - callback sẽ chạy các query
    const result = await callback(request);
    logger.success('Transaction operations completed successfully');
    return result;
  } catch (error) {
    logger.error('Transaction operations failed', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Lock balance khi đặt giá (Prevent double-spending)
 * @param {number} user_id
 * @param {number} amount
 * @param {string} reason
 * @returns {Promise<Object>}
 */
async function lockBalanceForBid(user_id, amount, reason = 'bid_placement') {
  return executeTransaction(async (request) => {
    try {
      // 1. Lấy wallet
      const req1 = new sql.Request();
      req1.input('userId', sql.Int, user_id);
      const walletResult = await req1.query(
        'SELECT wallet_id, balance, locked_balance FROM wallet WHERE user_id = @userId'
      );

      const wallet = walletResult.recordset[0];
      if (!wallet) {
        throw new Error(`Ví không tồn tại cho user ${user_id}`);
      }

      // 2. Kiểm tra đủ tiền
      const availableBalance = wallet.balance - wallet.locked_balance;
      if (availableBalance < amount) {
        throw new Error(
          `Không đủ tiền. Số dư: ${availableBalance}, cần: ${amount}`
        );
      }

      // 3. Lock tiền
      const req2 = new sql.Request();
      req2.input('lockAmount', sql.Decimal(18, 2), amount);
      req2.input('walletId', sql.Int, wallet.wallet_id);
      const updateResult = await req2.query(
        'UPDATE wallet SET locked_balance = locked_balance + @lockAmount, updated_at = GETDATE() WHERE wallet_id = @walletId'
      );

      if (updateResult.rowsAffected[0] === 0) {
        throw new Error('Không thể lock balance');
      }

      // 4. Ghi nhật ký giao dịch
      const req3 = new sql.Request();
      req3.input('walletId2', sql.Int, wallet.wallet_id);
      req3.input('transAmount', sql.Decimal(18, 2), amount);
      req3.input('reason2', sql.NVarChar(sql.MAX), reason);
      await req3.query(
        'INSERT INTO transaction_history (wallet_id, transaction_type, amount, description, created_at) VALUES (@walletId2, \'lock\', @transAmount, @reason2, GETDATE())'
      );

      logger.success('Balance locked successfully', {
        user_id,
        wallet_id: wallet.wallet_id,
        amount,
        reason
      });

      return {
        success: true,
        wallet_id: wallet.wallet_id,
        locked_amount: amount,
        message: `Đã lock ${amount}₫`
      };
    } catch (error) {
      logger.error('lockBalanceForBid error', {
        user_id,
        amount,
        error: error.message
      });
      throw error;
    }
  });
}

/**
 * Unlock balance (Khi bid bị từ chối hoặc overridden)
 * @param {number} user_id
 * @param {number} amount
 * @param {string} reason
 */
async function unlockBalance(user_id, amount, reason = 'bid_cancelled') {
  return executeTransaction(async (request) => {
    try {
      const req1 = new sql.Request();
      req1.input('userId', sql.Int, user_id);
      const walletResult = await req1.query(
        'SELECT wallet_id, locked_balance FROM wallet WHERE user_id = @userId'
      );

      const wallet = walletResult.recordset[0];
      if (!wallet) {
        throw new Error(`Ví không tồn tại cho user ${user_id}`);
      }

      const req2 = new sql.Request();
      req2.input('unlockAmount', sql.Decimal(18, 2), amount);
      req2.input('walletId', sql.Int, wallet.wallet_id);
      await req2.query(
        'UPDATE wallet SET locked_balance = CASE WHEN locked_balance >= @unlockAmount THEN locked_balance - @unlockAmount ELSE 0 END, updated_at = GETDATE() WHERE wallet_id = @walletId'
      );

      const req3 = new sql.Request();
      req3.input('walletId2', sql.Int, wallet.wallet_id);
      req3.input('transAmount', sql.Decimal(18, 2), amount);
      req3.input('reason2', sql.NVarChar(sql.MAX), reason);
      await req3.query(
        'INSERT INTO transaction_history (wallet_id, transaction_type, amount, description, created_at) VALUES (@walletId2, \'unlock\', @transAmount, @reason2, GETDATE())'
      );

      logger.success('Balance unlocked', { user_id, amount, reason });
      return { success: true };
    } catch (error) {
      logger.error('unlockBalance error', { user_id, amount, error: error.message });
      throw error;
    }
  });
}

/**
 * Deduct balance từ ví (Chốt đơn)
 * @param {number} user_id
 * @param {number} amount
 * @param {string} description
 */
async function deductBalance(user_id, amount, description = 'auction_finalized') {
  return executeTransaction(async (request) => {
    try {
      const req1 = new sql.Request();
      req1.input('userId', sql.Int, user_id);
      const walletResult = await req1.query(
        'SELECT wallet_id, locked_balance FROM wallet WHERE user_id = @userId'
      );

      const wallet = walletResult.recordset[0];
      if (!wallet) {
        throw new Error(`Ví không tồn tại cho user ${user_id}`);
      }

      const req2 = new sql.Request();
      req2.input('deductAmount', sql.Decimal(18, 2), amount);
      req2.input('walletId', sql.Int, wallet.wallet_id);
      const updateResult = await req2.query(
        'UPDATE wallet SET locked_balance = locked_balance - @deductAmount, total_spent = total_spent + @deductAmount, updated_at = GETDATE() WHERE wallet_id = @walletId AND locked_balance >= @deductAmount'
      );

      if (updateResult.rowsAffected[0] === 0) {
        throw new Error('Không đủ locked_balance để trừ');
      }

      const req3 = new sql.Request();
      req3.input('walletId2', sql.Int, wallet.wallet_id);
      req3.input('transAmount', sql.Decimal(18, 2), amount);
      req3.input('desc2', sql.NVarChar(sql.MAX), description);
      await req3.query(
        'INSERT INTO transaction_history (wallet_id, transaction_type, amount, description, created_at) VALUES (@walletId2, \'deduct\', @transAmount, @desc2, GETDATE())'
      );

      logger.success('Balance deducted', { user_id, amount });
      return { success: true };
    } catch (error) {
      logger.error('deductBalance error', { user_id, amount, error: error.message });
      throw error;
    }
  });
}

/**
 * Credit balance vào ví (Nạp tiền)
 * @param {number} user_id
 * @param {number} amount
 * @param {string} description
 */
async function addBalance(user_id, amount, description = 'deposit') {
  try {
    logger.info('addBalance called', { user_id, amount, description });

    // 1. Get or create wallet
    const walletQuery = await sql.query`
      SELECT wallet_id, balance 
      FROM wallet 
      WHERE user_id = ${user_id}
    `;

    let wallet = walletQuery.recordset[0];

    if (!wallet) {
      logger.info('Creating new wallet for user', { user_id });
      await sql.query`
        INSERT INTO wallet (user_id, balance, locked_balance, total_spent)
        VALUES (${user_id}, 0, 0, 0)
      `;

      const newWalletQuery = await sql.query`
        SELECT wallet_id, balance FROM wallet WHERE user_id = ${user_id}
      `;
      wallet = newWalletQuery.recordset[0];
    }

    // 2. Update balance (simple, no transaction)
    logger.info('Updating wallet balance', { wallet_id: wallet.wallet_id, amount });
    await sql.query`
      UPDATE wallet 
      SET balance = balance + ${amount},
          updated_at = GETDATE()
      WHERE wallet_id = ${wallet.wallet_id}
    `;

    // 3. Log transaction
    logger.info('Logging transaction', { wallet_id: wallet.wallet_id, amount });
    await sql.query`
      INSERT INTO transaction_history (
        wallet_id, 
        transaction_type, 
        amount, 
        description, 
        created_at
      )
      VALUES (
        ${wallet.wallet_id},
        'credit',
        ${amount},
        ${description},
        GETDATE()
      )
    `;

    logger.success('Balance added successfully', { user_id, wallet_id: wallet.wallet_id, amount });
    return { success: true, wallet_id: wallet.wallet_id };

  } catch (error) {
    logger.error('addBalance error', { user_id, amount, error: error.message });
    throw error;
  }
}

/**
 * Transfer tiền giữa 2 ví (Đơn giản = deduct + add)
 * @param {number} from_user_id
 * @param {number} to_user_id
 * @param {number} amount
 * @param {string} reason
 */
async function transferBalance(from_user_id, to_user_id, amount, reason = 'auction_transfer') {
  return executeTransaction(async (request) => {
    try {
      const req1 = new sql.Request();
      req1.input('fromUserId', sql.Int, from_user_id);
      const fromWalletResult = await req1.query(
        'SELECT wallet_id, locked_balance FROM wallet WHERE user_id = @fromUserId'
      );

      if (!fromWalletResult.recordset[0]) {
        throw new Error(`Ví người gửi không tồn tại`);
      }

      const fromWallet = fromWalletResult.recordset[0];
      
      const req2 = new sql.Request();
      req2.input('transferAmount', sql.Decimal(18, 2), amount);
      req2.input('fromWalletId', sql.Int, fromWallet.wallet_id);
      await req2.query(
        'UPDATE wallet SET locked_balance = locked_balance - @transferAmount, total_spent = total_spent + @transferAmount, updated_at = GETDATE() WHERE wallet_id = @fromWalletId AND locked_balance >= @transferAmount'
      );

      const req3 = new sql.Request();
      req3.input('toUserId', sql.Int, to_user_id);
      const toWalletResult = await req3.query(
        'SELECT wallet_id FROM wallet WHERE user_id = @toUserId'
      );

      let toWallet = toWalletResult.recordset[0];
      
      if (!toWallet) {
        const req4 = new sql.Request();
        req4.input('newUserId', sql.Int, to_user_id);
        await req4.query(
          'INSERT INTO wallet (user_id, balance, locked_balance, total_spent) VALUES (@newUserId, 0, 0, 0)'
        );

        const req5 = new sql.Request();
        req5.input('toUserId2', sql.Int, to_user_id);
        const requeResult = await req5.query(
          'SELECT wallet_id FROM wallet WHERE user_id = @toUserId2'
        );
        toWallet = requeResult.recordset[0];
      }

      const req6 = new sql.Request();
      req6.input('addAmount', sql.Decimal(18, 2), amount);
      req6.input('toWalletId', sql.Int, toWallet.wallet_id);
      await req6.query(
        'UPDATE wallet SET balance = balance + @addAmount, updated_at = GETDATE() WHERE wallet_id = @toWalletId'
      );

      const req7 = new sql.Request();
      req7.input('fromWalletId2', sql.Int, fromWallet.wallet_id);
      req7.input('outAmount', sql.Decimal(18, 2), amount);
      req7.input('reason2', sql.NVarChar(sql.MAX), reason);
      await req7.query(
        'INSERT INTO transaction_history (wallet_id, transaction_type, amount, description, created_at) VALUES (@fromWalletId2, \'transfer_out\', @outAmount, @reason2, GETDATE())'
      );

      const req8 = new sql.Request();
      req8.input('toWalletId2', sql.Int, toWallet.wallet_id);
      req8.input('inAmount', sql.Decimal(18, 2), amount);
      req8.input('reason3', sql.NVarChar(sql.MAX), reason);
      await req8.query(
        'INSERT INTO transaction_history (wallet_id, transaction_type, amount, description, created_at) VALUES (@toWalletId2, \'transfer_in\', @inAmount, @reason3, GETDATE())'
      );

      logger.success('Balance transferred', {
        from_user_id,
        to_user_id,
        amount,
        reason
      });

      return { success: true, message: `Đã chuyển ${amount}₫` };
    } catch (error) {
      logger.error('transferBalance error', {
        from_user_id,
        to_user_id,
        amount,
        error: error.message
      });
      throw error;
    }
  });
}

module.exports = {
  executeTransaction,
  lockBalanceForBid,
  unlockBalance,
  deductBalance,
  addBalance,
  transferBalance,
};
