const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const { bidLimiter } = require('../middlewares/rateLimiter');
const {
  placeBid,
  viewBidHistory,
  viewMyBids,
  getTopBid,
  retractBid,
} = require('../controllers/bidController');

// Public routes
router.get('/history/:product_id', viewBidHistory); // Xem lịch sử đấu giá sản phẩm
router.get('/top/:product_id', getTopBid); // Xem bid cao nhất của sản phẩm

// Protected routes (cần đăng nhập)
// ⭐ Apply rate limiting to prevent bid spam (20 bids per minute)
router.post('/place', authMiddleware, bidLimiter, placeBid); // Đặt giá cho sản phẩm
router.get('/my-bids', authMiddleware, viewMyBids); // Xem các bids của user
router.delete('/:bid_id', authMiddleware, bidLimiter, retractBid); // Thu hồi bid

module.exports = router;
