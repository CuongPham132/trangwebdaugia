const walletModel = require('../models/walletModel');
const walletService = require('../services/walletService');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

/**
 * GET /api/wallet/:user_id
 * Get wallet information for a user
 */
async function getWallet(req, res) {
  try {
    const { user_id } = req.params;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json(
        createErrorResponse('User ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    const wallet = await walletModel.getOrCreateWallet(user_id);

    if (!wallet) {
      return res.status(404).json(
        createErrorResponse('Ví không tồn tại', ERROR_CODES.USER_NOT_FOUND, 404)
      );
    }

    res.status(200).json(createSuccessResponse(wallet));
  } catch (error) {
    logger.error('Error in getWallet', { error: error.message });
    res.status(500).json(createErrorResponse('Lỗi tải ví', ERROR_CODES.DATABASE_ERROR, 500));
  }
}

/**
 * GET /api/wallet/:user_id/transactions
 * Get transaction history for a wallet
 */
async function getTransactionHistory(req, res) {
  try {
    const { user_id } = req.params;
    const { limit = 50 } = req.query;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json(
        createErrorResponse('User ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    const wallet = await walletModel.getWallet(user_id);

    if (!wallet) {
      return res.status(404).json(
        createErrorResponse('Ví không tồn tại', ERROR_CODES.USER_NOT_FOUND, 404)
      );
    }

    const transactions = await walletModel.getTransactionHistory(
      wallet.wallet_id,
      Math.min(parseInt(limit) || 50, 500)
    );

    res.status(200).json(createSuccessResponse(transactions));
  } catch (error) {
    logger.error('Error in getTransactionHistory', { error: error.message });
    res.status(500).json(createErrorResponse('Lỗi tải lịch sử giao dịch', ERROR_CODES.DATABASE_ERROR, 500));
  }
}

/**
 * POST /api/wallet/deposit
 * Deposit money into wallet
 * Body: { user_id, amount }
 */
async function deposit(req, res) {
  try {
    const { user_id, amount } = req.body;

    // Validation
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json(
        createErrorResponse('User ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json(
        createErrorResponse('Số tiền nạp phải lớn hơn 0', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Process deposit
    const updatedWallet = await walletService.processDeposit(user_id, amount);

    res.status(200).json(createSuccessResponse(updatedWallet, `Nạp $${amount} thành công`));
  } catch (error) {
    logger.error('Error in deposit', { error: error.message });
    res.status(500).json(createErrorResponse(error.message || 'Lỗi nạp tiền', ERROR_CODES.PAYMENT_FAILED, 500));
  }
}

/**
 * POST /api/wallet/withdraw
 * Withdraw money from wallet
 * Body: { user_id, amount }
 */
async function withdraw(req, res) {
  try {
    const { user_id, amount } = req.body;

    // Validation
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json(
        createErrorResponse('User ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json(
        createErrorResponse('Số tiền rút phải lớn hơn 0', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Process withdrawal
    const updatedWallet = await walletService.processWithdrawal(user_id, amount);

    res.status(200).json(createSuccessResponse(updatedWallet, `Rút $${amount} thành công`));
  } catch (error) {
    logger.error('Error in withdraw', { error: error.message });

    if (error.message.includes('Insufficient balance')) {
      return res.status(400).json(
        createErrorResponse(error.message, ERROR_CODES.INSUFFICIENT_BALANCE, 400)
      );
    }

    res.status(500).json(createErrorResponse(error.message || 'Lỗi rút tiền', ERROR_CODES.PAYMENT_FAILED, 500));
  }
}

/**
 * POST /api/wallet/check-balance
 * Check if user has sufficient balance for a bid
 * Body: { user_id, amount }
 */
async function checkBalance(req, res) {
  try {
    const { user_id, amount } = req.body;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json(
        createErrorResponse('User ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json(
        createErrorResponse('Số tiền phải lớn hơn 0', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    const balanceCheck = await walletService.checkSufficientBalance(user_id, amount);

    res.status(200).json(createSuccessResponse(balanceCheck));
  } catch (error) {
    logger.error('Error in checkBalance', { error: error.message });
    res.status(500).json(createErrorResponse('Lỗi kiểm tra số dư', ERROR_CODES.DATABASE_ERROR, 500));
  }
}

module.exports = {
  getWallet,
  getTransactionHistory,
  deposit,
  withdraw,
  checkBalance,
};
