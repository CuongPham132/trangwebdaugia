const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middlewares/auth');
const { walletLimiter } = require('../middlewares/rateLimiter');

/**
 * Wallet Routes
 * All routes require authentication
 */

// ⭐ IMPORTANT: Specific routes must come BEFORE generic routes
// Otherwise '/:user_id' will match '/3/transactions' as user_id=3

// GET /api/wallet/:user_id/transactions
// Get transaction history (MUST be before /:user_id)
router.get('/:user_id/transactions', authMiddleware, walletController.getTransactionHistory);

// GET /api/wallet/:user_id
// Get wallet information for a user
router.get('/:user_id', authMiddleware, walletController.getWallet);

// POST /api/wallet/check-balance
// Check if user has sufficient balance for a bid
router.post('/check-balance', authMiddleware, walletController.checkBalance);

// POST /api/wallet/deposit
// ⭐ Apply rate limiting to prevent deposit spam (10 ops per minute)
router.post('/deposit', authMiddleware, walletLimiter, walletController.deposit);

// POST /api/wallet/withdraw
// ⭐ Apply rate limiting to prevent withdrawal spam (10 ops per minute)
router.post('/withdraw', authMiddleware, walletLimiter, walletController.withdraw);

// POST /api/wallet/test/add-balance (TEST ONLY)
// Add balance directly for testing
router.post('/test/add-balance', authMiddleware, walletController.addBalanceForTesting);

module.exports = router;
