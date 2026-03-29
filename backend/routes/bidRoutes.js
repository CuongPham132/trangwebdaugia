const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  placeBid,
  viewBidHistory,
  viewMyBids,
  getTopBid,
} = require('../controllers/bidController');

// Public routes
router.get('/history/:product_id', viewBidHistory); // Lịch sử đấu giá của sản phẩm
router.get('/top/:product_id', getTopBid); // Bid cao nhất hiện tại

// Protected routes (cần đăng nhập)
router.post('/', authMiddleware, placeBid); // Đặt giá / Bid
router.get('/my-bids', authMiddleware, viewMyBids); // Danh sách bids của user

module.exports = router;
