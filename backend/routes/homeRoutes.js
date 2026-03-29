const express = require('express');
const router = express.Router();
const { getHomePage, getTrending } = require('../controllers/homeController');

// Lấy dữ liệu trang chủ
router.get('/', getHomePage);

// Lấy sản phẩm trending
router.get('/trending', getTrending);

module.exports = router;
