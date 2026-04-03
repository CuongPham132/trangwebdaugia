const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getUserById, getUserByEmail, createUser, getUserStats, updateUser } = require('../models/user');
const { sql } = require('../config/db');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');
require('dotenv').config();

// Register user
async function register(req, res) {
  try {
    const { username, email, password, role } = req.body;

    // Validate role - chỉ cho phép 'user' hoặc 'admin'
    const VALID_ROLES = ['user', 'admin'];
    const userRole = role || 'user'; // Mặc định là user
    
    if (!VALID_ROLES.includes(userRole)) {
      return res.status(400).json(
        createErrorResponse('Role không hợp lệ. Chỉ được chọn user hoặc admin', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Check email đã tồn tại chưa
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json(
        createErrorResponse('Email đã tồn tại', ERROR_CODES.EMAIL_ALREADY_EXISTS, 400)
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser({ username, email, password: hashedPassword, role: userRole });

    logger.success('User registered', { email, role: userRole });

    res.status(201).json(
      createSuccessResponse({ email, role: userRole }, 'Đăng ký thành công')
    );
  } catch (err) {
    logger.error('User registration failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi đăng ký', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json(
        createErrorResponse('Email hoặc mật khẩu sai', ERROR_CODES.INVALID_CREDENTIALS, 401)
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json(
        createErrorResponse('Email hoặc mật khẩu sai', ERROR_CODES.INVALID_CREDENTIALS, 401)
      );
    }

    // Tạo JWT
    const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    logger.success('User logged in', { user_id: user.user_id, role: user.role });

    res.json(
      createSuccessResponse(
        { token, user: { user_id: user.user_id, username: user.username, role: user.role } },
        'Đăng nhập thành công'
      )
    );
  } catch (err) {
    logger.error('User login failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi đăng nhập', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// Lấy profile
async function getProfile(req, res) {
  try {
    const user = await getUserById(req.user.user_id);
    if (!user) {
      return res.status(404).json(
        createErrorResponse('User không tồn tại', ERROR_CODES.USER_NOT_FOUND, 404)
      );
    }

    res.json(
      createSuccessResponse(
        { user_id: user.user_id, username: user.username, email: user.email, role: user.role },
        'Lấy profile thành công'
      )
    );
  } catch (err) {
    logger.error('Get profile failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy profile', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// Lấy thống kê của user
async function getUserProfileStats(req, res) {
  try {
    const { user_id } = req.params;

    // Kiểm tra user tồn tại
    const user = await getUserById(user_id);
    if (!user) {
      return res.status(404).json(
        createErrorResponse('User không tồn tại', ERROR_CODES.USER_NOT_FOUND, 404)
      );
    }

    // Lấy thống kê
    const stats = await getUserStats(user_id);

    res.json(
      createSuccessResponse({
        user_id: stats.user_id,
        username: stats.username,
        role: stats.role,
        stats: {
          total_bids: stats.total_bids,
          total_products: stats.total_products,
          active_products: stats.active_products,
          completed_products: stats.completed_products,
        },
      }, 'Lấy thống kê người dùng thành công')
    );
  } catch (err) {
    logger.error('Get user stats failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy thống kê', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// Cập nhật profile - PUT /api/users/profile
async function updateProfile(req, res) {
  try {
    const user_id = req.user.user_id;
    const { username, current_password, new_password } = req.body;

    // Validate input
    if (!username && !new_password) {
      return res.status(400).json(
        createErrorResponse('Vui lòng cung cấp ít nhất một thông tin để cập nhật', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Nếu muốn đổi mật khẩu, phải cung cấp mật khẩu hiện tại
    if (new_password && !current_password) {
      return res.status(400).json(
        createErrorResponse('Vui lòng cung cấp mật khẩu hiện tại để đổi mật khẩu', ERROR_CODES.CURRENT_PASSWORD_REQUIRED, 400)
      );
    }

    const user = await getUserById(user_id);
    if (!user) {
      return res.status(404).json(
        createErrorResponse('User không tồn tại', ERROR_CODES.USER_NOT_FOUND, 404)
      );
    }

    // Kiểm tra mật khẩu hiện tại nếu muốn đổi
    if (new_password) {
      const validPassword = await bcrypt.compare(current_password, user.password);
      if (!validPassword) {
        return res.status(401).json(
          createErrorResponse('Mật khẩu hiện tại không đúng', ERROR_CODES.INVALID_PASSWORD, 401)
        );
      }

      if (new_password.length < 6) {
        return res.status(400).json(
          createErrorResponse('Mật khẩu mới phải có ít nhất 6 ký tự', ERROR_CODES.PASSWORD_TOO_SHORT, 400)
        );
      }
    }

    // Kiểm tra username có trùng với user khác không
    if (username && username !== user.username) {
      const existingUser = await getUserById(user_id);
      if (existingUser && existingUser.username === username && existingUser.user_id !== user_id) {
        return res.status(400).json(
          createErrorResponse('Username đã được sử dụng bởi user khác', ERROR_CODES.USERNAME_TAKEN, 400)
        );
      }
    }

    // Chuẩn bị dữ liệu update
    const updateData = {};
    if (username) updateData.username = username;
    
    let hashedPassword = null;
    if (new_password) {
      hashedPassword = await bcrypt.hash(new_password, 10);
      updateData.password = hashedPassword;
    }

    // Update database trực tiếp (không dùng hàm updateUser vì nó không update mật khẩu)
    const request = sql.request();
    let query = 'UPDATE [user] SET ';
    const updates = [];

    if (username) {
      updates.push('username = @username');
      request.input('username', username);
    }
    
    if (hashedPassword) {
      updates.push('[password] = @password');
      request.input('password', hashedPassword);
    }

    query += updates.join(', ') + ' WHERE user_id = @user_id; SELECT * FROM [user] WHERE user_id = @user_id;';
    request.input('user_id', user_id);

    const result = await request.query(query);
    const updatedUser = result.recordset[0];

    logger.success('User profile updated', {
      user_id,
      updated_fields: Object.keys(updateData)
    });

    res.json(
      createSuccessResponse({
        user_id: updatedUser.user_id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role
      }, 'Cập nhật profile thành công')
    );
  } catch (err) {
    logger.error('Update profile failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi cập nhật profile', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

module.exports = { register, login, getProfile, getUserProfileStats, updateProfile };