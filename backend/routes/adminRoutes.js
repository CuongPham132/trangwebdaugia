const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  requireAdmin,
  getDashboardStats,
  getAllUsers,
  getAllProducts,
  getAllBids,
  deleteProduct,
  deleteUser,
  updateUserRole,
} = require('../controllers/adminController');

// tất cả routes yêu cầu auth + admin role
router.use(authMiddleware, requireAdmin);

// Dashboard & Stats
router.get('/dashboard', getDashboardStats);

// Users Management
router.get('/users', getAllUsers);
router.delete('/users/:user_id', deleteUser);
router.put('/users/:user_id/role', updateUserRole);

// Products Management
router.get('/products', getAllProducts);
router.delete('/products/:product_id', deleteProduct);

// Bids Management
router.get('/bids', getAllBids);

module.exports = router;
