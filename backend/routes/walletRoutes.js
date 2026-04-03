const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middlewares/auth');

/**
 * Wallet Routes
 * All routes require authentication
 */

// GET /api/wallet/:user_id
// Get wallet information for a user
router.get('/:user_id', authMiddleware, walletController.getWallet);

// GET /api/wallet/:user_id/transactions
// Get transaction history
router.get('/:user_id/transactions', authMiddleware, walletController.getTransactionHistory);

// POST /api/wallet/check-balance
// Check if user has sufficient balance for a bid
router.post('/check-balance', authMiddleware, walletController.checkBalance);

// POST /api/wallet/deposit
// Deposit money into wallet
router.post('/deposit', authMiddleware, walletController.deposit);

// POST /api/wallet/withdraw
// Withdraw money from wallet
router.post('/withdraw', authMiddleware, walletController.withdraw);

module.exports = router;
