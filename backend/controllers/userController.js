const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getUserById, getUserByEmail, createUser, getUserStats } = require('../models/user');
const logger = require('../services/logger');
require('dotenv').config();

// Register user
async function register(req, res) {
  try {
    const { username, email, password, role } = req.body;

    // Validate role - chỉ cho phép 'user' hoặc 'admin'
    const VALID_ROLES = ['user', 'admin'];
    const userRole = role || 'user'; // Mặc định là user
    
    if (!VALID_ROLES.includes(userRole)) {
      return res.status(400).json({ message: 'Role không hợp lệ. Chỉ được chọn user hoặc admin' });
    }

    // Check email đã tồn tại chưa
    const existingUser = await getUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'Email đã tồn tại' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser({ username, email, password: hashedPassword, role: userRole });

    logger.success('User registered', { email, role: userRole });

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (err) {
    logger.error('User registration failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });

    // Tạo JWT
    const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    logger.success('User logged in', { user_id: user.user_id, role: user.role });

    res.json({ token, user: { user_id: user.user_id, username: user.username, role: user.role } });
  } catch (err) {
    logger.error('User login failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// Lấy profile
async function getProfile(req, res) {
  try {
    const user = await getUserById(req.user.user_id);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    res.json({ user_id: user.user_id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Lấy thống kê của user
async function getUserProfileStats(req, res) {
  try {
    const { user_id } = req.params;

    // Kiểm tra user tồn tại
    const user = await getUserById(user_id);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    // Lấy thống kê
    const stats = await getUserStats(user_id);

    res.json({
      message: 'Lấy thống kê người dùng thành công',
      data: {
        user_id: stats.user_id,
        username: stats.username,
        role: stats.role,
        stats: {
          total_bids: stats.total_bids,
          total_products: stats.total_products,
          active_products: stats.active_products,
          completed_products: stats.completed_products,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, getProfile, getUserProfileStats };