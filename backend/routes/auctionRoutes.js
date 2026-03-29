const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  checkAuctionTime,
  updateAuctionStatus,
  getAuctionResult,
  completeAuction,
  autoCompleteAllAuctions,
  endAuctionEarly,
} = require('../controllers/auctionController');

// Public routes
router.get('/time/:product_id', checkAuctionTime); // Xem thời gian còn lại
router.get('/result/:product_id', getAuctionResult); // Xem kết quả

// Protected routes (cần đăng nhập - seller)
router.post('/end-early/:product_id', authMiddleware, endAuctionEarly); // Seller kết thúc sớm

// Admin/Scheduler routes
router.post('/update-status', updateAuctionStatus); // Cập nhật trạng thái sản phẩm
router.post('/complete/:product_id', completeAuction); // Xác định kết quả cho sản phẩm
router.post('/auto-complete', autoCompleteAllAuctions); // Tự động hoàn tất tất cả đấu giá

module.exports = router;
