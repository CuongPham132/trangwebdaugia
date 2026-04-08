const express = require('express');
const router = express.Router();
const { getHomePage, getOptimizedHome, getTrending } = require('../controllers/homeController');

// Lấy dữ liệu trang chủ (cũ - giữ để kompatibel)
router.get('/', getHomePage);

// 🚀 NEW: Lấy dữ liệu trang chủ tối ưu (Backend-driven) - DÙNG CÁI NÀY
router.get('/optimized', getOptimizedHome);

// Lấy sản phẩm trending
router.get('/trending', getTrending);

module.exports = router;
