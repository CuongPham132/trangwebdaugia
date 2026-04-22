const { getWallet, getOrCreateWallet } = require('../models/walletModel');
const transactionService = require('./transactionService');
const logger = require('./logger');

/**
 * Check if user has sufficient balance for bidding
 * @param {number} user_id - User ID
 * @param {number} bid_amount - Bid amount required
 * @returns {Promise<Object>} 
 */
async function checkSufficientBalance(user_id, bid_amount) {
  try {
    const wallet = await getOrCreateWallet(user_id);
    
    // Available balance = total balance - locked balance
    const availableBalance = wallet.balance - (wallet.locked_balance || 0);
    
    return {
      sufficient: availableBalance >= bid_amount,
      balance: wallet.balance,
      locked_balance: wallet.locked_balance || 0,
      total_available: availableBalance,
      required: bid_amount,
    };
  } catch (error) {
    logger.error('Check sufficient balance failed', { user_id, bid_amount, error: error.message });
    throw error;
  }
}

/**
 * Lock balance when placing a bid - DÙNG TRANSACTION
 * @param {number} user_id - User ID
 * @param {number} bid_amount - Amount to lock
 * @param {number} product_id - Product ID (for reference)
 * @returns {Promise<Object>} Lock result
 */
async function lockBalanceForBid(user_id, bid_amount, product_id) {
  try {
    // Check sufficient balance first
    const balanceCheck = await checkSufficientBalance(user_id, bid_amount);
    if (!balanceCheck.sufficient) {
      throw new Error(
        `Insufficient balance to place bid. Available: ${balanceCheck.total_available}, Required: ${bid_amount}`
      );
    }
    
    // Sử dụng transaction để lock balance
    const lockResult = await transactionService.lockBalanceForBid(
      user_id, 
      bid_amount, 
      `bid_product_${product_id}`
    );
    
    logger.info('Balance locked for bid (with transaction)', { 
      user_id, 
      bid_amount, 
      product_id,
      result: lockResult
    });
    
    return lockResult;
  } catch (error) {
    logger.error('Lock balance for bid failed', { user_id, bid_amount, product_id, error: error.message });
    throw error;
  }
}

/**
 * Unlock balance when bid is cancelled/overridden - DÙNG TRANSACTION
 * @param {number} user_id - User ID
 * @param {number} bid_amount - Amount to unlock
 * @param {number} product_id - Product ID (for reference)
 * @returns {Promise<Object>} Unlock result
 */
async function unlockBalanceFromBid(user_id, bid_amount, product_id) {
  try {
    // Sử dụng transaction để unlock balance
    const unlockResult = await transactionService.unlockBalance(
      user_id, 
      bid_amount, 
      `bid_cancelled_product_${product_id}`
    );
    
    logger.info('Balance unlocked from bid (with transaction)', { 
      user_id, 
      bid_amount, 
      product_id,
      result: unlockResult
    });
    
    return unlockResult;
  } catch (error) {
    logger.error('Unlock balance from bid failed', { user_id, bid_amount, product_id, error: error.message });
    throw error;
  }
}

/**
 * Process deposit - DÙNG TRANSACTION
 * @param {number} user_id
 * @param {number} amount
 * @returns {Promise<Object>}
 */
async function processDeposit(user_id, amount) {
  try {
    const result = await transactionService.addBalance(
      user_id,
      amount,
      `user_deposit_${new Date().getTime()}`
    );

    logger.success('Deposit processed with transaction', { user_id, amount, result });
    
    const wallet = await getWallet(user_id);
    return {
      success: true,
      wallet,
      deposited_amount: amount,
      message: `Nạp ${amount}₫ thành công`
    };
  } catch (error) {
    logger.error('Deposit failed', { user_id, amount, error: error.message });
    throw error;
  }
}

/**
 * Process withdrawal - DÙNG TRANSACTION
 * @param {number} user_id
 * @param {number} amount
 * @returns {Promise<Object>}
 */
async function processWithdrawal(user_id, amount) {
  try {
    // Check balance first
    const wallet = await getOrCreateWallet(user_id);
    if (wallet.balance < amount) {
      throw new Error(
        `Insufficient balance. Current: ${wallet.balance}, Required: ${amount}`
      );
    }

    // Deduct từ locked balance (nếu có) hoặc balance
    const result = await transactionService.executeTransaction(async (transaction) => {
      const { sql } = require('../config/db');
      
      // Cập nhật balance
      const query = new sql.Request(transaction);
      await query.query`
        UPDATE wallet 
        SET balance = balance - ${amount},
            updated_at = GETDATE()
        WHERE user_id = ${user_id} AND balance >= ${amount}
      `;

      // Log transaction
      const logQuery = new sql.Request(transaction);
      await logQuery.query`
        INSERT INTO wallet_transaction_log (
          wallet_id, 
          transaction_type, 
          amount, 
          description, 
          created_at
        ) 
        SELECT wallet_id, 'withdrawal', ${amount}, ${'user_withdrawal'}, GETDATE()
        FROM wallet WHERE user_id = ${user_id}
      `;

      return { success: true };
    });

    logger.success('Withdrawal processed with transaction', { user_id, amount });

    const updatedWallet = await getWallet(user_id);
    return {
      success: true,
      wallet: updatedWallet,
      withdrawn_amount: amount,
      message: `Rút ${amount}₫ thành công`
    };
  } catch (error) {
    logger.error('Withdrawal failed', { user_id, amount, error: error.message });
    throw error;
  }
}

/**
 * Get user's current wallet info
 * @param {number} user_id - User ID
 * @returns {Promise<Object>} Wallet info
 */
async function getUserWalletInfo(user_id) {
  try {
    return await getOrCreateWallet(user_id);
  } catch (error) {
    logger.error('Get user wallet info failed', { user_id, error: error.message });
    throw error;
  }
}

/**
 * Helper: Log transaction details for audit trail
 * @param {number} user_id - User ID
 * @param {string} transaction_type - Type of transaction (lock, unlock, deduct, deposit, etc.)
 * @param {number} amount - Amount changed
 * @param {Object} metadata - Additional metadata (before_balance, after_balance, product_id, order_id, etc.)
 */
function logTransaction(user_id, transaction_type, amount, metadata = {}) {
  logger.info(`💰 Transaction: ${transaction_type.toUpperCase()}`, {
    user_id,
    transaction_type,
    amount,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

module.exports = {
  checkSufficientBalance,
  lockBalanceForBid,
  unlockBalanceFromBid,
  getUserWalletInfo,
  processDeposit,
  processWithdrawal,
  logTransaction
};
