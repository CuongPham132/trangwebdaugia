const express = require('express');
const router = express.Router();
const { register, login, getProfile, getUserProfileStats } = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.get('/:user_id/stats', getUserProfileStats); // Xem thống kê của user bất kỳ

module.exports = router;