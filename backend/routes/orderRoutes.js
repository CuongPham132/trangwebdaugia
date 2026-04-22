const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  paymentOrder,
  getOrder,
  getMyOrders,
  updateShipping
} = require('../controllers/orderController');

// Protected routes (cần đăng nhập)
// ⭐ IMPORTANT: Named routes MUST come before wildcard routes!
router.post('/pay', authMiddleware, paymentOrder); // Thanh toán order
router.get('/my-orders', authMiddleware, getMyOrders); // Xem danh sách orders của user - BEFORE /:order_id
router.get('/:order_id', authMiddleware, getOrder); // Xem thông tin order
router.put('/:order_id/shipping', authMiddleware, updateShipping); // Cập nhật shipping info

module.exports = router;
