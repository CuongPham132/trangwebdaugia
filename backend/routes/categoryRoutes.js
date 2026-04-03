const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const { getAllCategory, getCategoryDetail, createNewCategory } = require('../controllers/categoryController');

// Middleware để check admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền tạo danh mục' });
  }
  next();
}

// Public routes
// Lấy tất cả danh mục
router.get('/', getAllCategory);

// Lấy chi tiết danh mục
router.get('/:category_id', getCategoryDetail);

// Protected routes (admin only)
// Tạo danh mục mới (cần đăng nhập + admin)
router.post('/', authMiddleware, requireAdmin, createNewCategory);

module.exports = router;
