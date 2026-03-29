const express = require('express');
const router = express.Router();
const { getAllCategory, getCategoryDetail, createNewCategory } = require('../controllers/categoryController');

// Lấy tất cả danh mục
router.get('/', getAllCategory);

// Lấy chi tiết danh mục
router.get('/:category_id', getCategoryDetail);

// Tạo danh mục mới
router.post('/', createNewCategory);

module.exports = router;
