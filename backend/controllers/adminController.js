const { sql } = require('../config/db');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

// Middleware để check admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json(
      createErrorResponse('Chỉ admin mới có quyền truy cập', ERROR_CODES.PERMISSION_DENIED, 403)
    );
  }
  next();
}

// 1. Dashboard Stats - Lấy các thống kê chung
async function getDashboardStats(req, res) {
  try {
    // Tổng số users
    const usersResult = await sql.query`SELECT COUNT(*) as total_users FROM [user]`;
    const totalUsers = usersResult.recordset[0].total_users;

    // Tổng số products
    const productsResult = await sql.query`SELECT COUNT(*) as total_products FROM product`;
    const totalProducts = productsResult.recordset[0].total_products;

    // Tổng số bids
    const bidsResult = await sql.query`SELECT COUNT(*) as total_bids FROM bid`;
    const totalBids = bidsResult.recordset[0].total_bids;

    // Tổng số danh mục
    const categoriesResult = await sql.query`SELECT COUNT(*) as total_categories FROM category`;
    const totalCategories = categoriesResult.recordset[0].total_categories;

    // Sản phẩm đang active
    const activeResult = await sql.query`SELECT COUNT(*) as active_count FROM product WHERE status = 'active'`;
    const activeProducts = activeResult.recordset[0].active_count;

    // Sản phẩm đã bán
    const soldResult = await sql.query`SELECT COUNT(*) as sold_count FROM product WHERE status = 'sold'`;
    const soldProducts = soldResult.recordset[0].sold_count;

    // Doanh số (total bids amount)
    const revenueResult = await sql.query`SELECT SUM(bid_amount) as total_revenue FROM bid`;
    const totalRevenue = revenueResult.recordset[0].total_revenue || 0;

    logger.success('Dashboard stats retrieved', { admin_id: req.user.user_id });

    res.json(
      createSuccessResponse({
        total_users: totalUsers,
        total_products: totalProducts,
        total_bids: totalBids,
        total_categories: totalCategories,
        active_products: activeProducts,
        sold_products: soldProducts,
        total_revenue: totalRevenue,
        timestamp: new Date(),
      }, 'Lấy thống kê thành công')
    );
  } catch (err) {
    logger.error('Get dashboard stats failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy thống kê', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 2. Lấy danh sách tất cả users
async function getAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Lấy tất cả users (không lấy password)
    const result = await sql.query`
      SELECT 
        user_id,
        username,
        email,
        role,
        created_at,
        status
      FROM [user]
      ORDER BY created_at DESC
      OFFSET ${skip} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    // Tổng số users
    const countResult = await sql.query`SELECT COUNT(*) as total FROM [user]`;
    const total = countResult.recordset[0].total;

    logger.success('All users retrieved', { admin_id: req.user.user_id, count: result.recordset.length });

    res.json(
      createSuccessResponse({
        users: result.recordset,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      }, 'Lấy danh sách users thành công')
    );
  } catch (err) {
    logger.error('Get all users failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách users', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 3. Lấy danh sách tất cả sản phẩm
async function getAllProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;

    let query = `
      SELECT 
        p.product_id,
        p.title,
        p.start_price,
        p.current_price,
        p.start_time,
        p.end_time,
        p.status,
        p.seller_id,
        u.username as seller_name,
        c.name as category_name,
        (SELECT COUNT(*) FROM bid WHERE product_id = p.product_id) as bid_count,
        p.extension_count
      FROM product p
      LEFT JOIN [user] u ON p.seller_id = u.user_id
      LEFT JOIN category c ON p.category_id = c.category_id
    `;

    if (status) {
      query += ` WHERE p.status = '${status}'`;
    }

    query += ` ORDER BY p.created_at DESC
      OFFSET ${skip} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const result = await sql.query(query);

    // Tổng số products
    let countQuery = `SELECT COUNT(*) as total FROM product`;
    if (status) {
      countQuery += ` WHERE status = '${status}'`;
    }
    const countResult = await sql.query(countQuery);
    const total = countResult.recordset[0].total;

    logger.success('All products retrieved', { admin_id: req.user.user_id, count: result.recordset.length });

    res.json(
      createSuccessResponse({
        products: result.recordset,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      }, 'Lấy danh sách sản phẩm thành công')
    );
  } catch (err) {
    logger.error('Get all products failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 4. Lấy danh sách tất cả bids
async function getAllBids(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const result = await sql.query`
      SELECT 
        b.bid_id,
        b.product_id,
        b.user_id,
        b.bid_amount,
        b.bid_time,
        u.username as bidder_name,
        p.title as product_title,
        p.current_price
      FROM bid b
      LEFT JOIN [user] u ON b.user_id = u.user_id
      LEFT JOIN product p ON b.product_id = p.product_id
      ORDER BY b.bid_time DESC
      OFFSET ${skip} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    // Tổng số bids
    const countResult = await sql.query`SELECT COUNT(*) as total FROM bid`;
    const total = countResult.recordset[0].total;

    logger.success('All bids retrieved', { admin_id: req.user.user_id, count: result.recordset.length });

    res.json(
      createSuccessResponse({
        bids: result.recordset,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      }, 'Lấy danh sách bids thành công')
    );
  } catch (err) {
    logger.error('Get all bids failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách bids', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 5. Xóa sản phẩm (admin only)
async function deleteProduct(req, res) {
  try {
    const { product_id } = req.params;

    // Check product exists
    const productResult = await sql.query`SELECT * FROM product WHERE product_id = ${product_id}`;
    if (productResult.recordset.length === 0) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }

    // Delete product (cascade delete bids & images)
    await sql.query`DELETE FROM product WHERE product_id = ${product_id}`;

    logger.success('Product deleted by admin', { 
      product_id, 
      admin_id: req.user.user_id 
    });

    res.json(
      createSuccessResponse({ product_id }, 'Xóa sản phẩm thành công')
    );
  } catch (err) {
    logger.error('Delete product failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi xóa sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 6. Xóa user (admin only)
async function deleteUser(req, res) {
  try {
    const { user_id } = req.params;

    // Không thể xóa chính mình
    if (String(req.user.user_id) === String(user_id)) {
      return res.status(400).json(
        createErrorResponse('Không thể xóa tài khoản của chính mình', ERROR_CODES.OPERATION_NOT_ALLOWED, 400)
      );
    }

    // Check user exists
    const userResult = await sql.query`SELECT * FROM [user] WHERE user_id = ${user_id}`;
    if (userResult.recordset.length === 0) {
      return res.status(404).json(
        createErrorResponse('User không tồn tại', ERROR_CODES.USER_NOT_FOUND, 404)
      );
    }

    // Delete user
    await sql.query`DELETE FROM [user] WHERE user_id = ${user_id}`;

    logger.success('User deleted by admin', { 
      deleted_user_id: user_id, 
      admin_id: req.user.user_id 
    });

    res.json(
      createSuccessResponse({ user_id }, 'Xóa user thành công')
    );
  } catch (err) {
    logger.error('Delete user failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi xóa user', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 7. Update user role (admin only)
async function updateUserRole(req, res) {
  try {
    const { user_id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json(
        createErrorResponse('Role không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Không thể thay đổi role của chính mình
    if (String(req.user.user_id) === String(user_id)) {
      return res.status(400).json(
        createErrorResponse('Không thể thay đổi role của chính mình', ERROR_CODES.OPERATION_NOT_ALLOWED, 400)
      );
    }

    // Check user exists
    const userResult = await sql.query`SELECT * FROM [user] WHERE user_id = ${user_id}`;
    if (userResult.recordset.length === 0) {
      return res.status(404).json(
        createErrorResponse('User không tồn tại', ERROR_CODES.USER_NOT_FOUND, 404)
      );
    }

    // Update role
    await sql.query`UPDATE [user] SET role = ${role} WHERE user_id = ${user_id}`;

    logger.success('User role updated by admin', { 
      user_id, 
      new_role: role,
      admin_id: req.user.user_id 
    });

    res.json(
      createSuccessResponse({
        user_id,
        new_role: role,
      }, 'Cập nhật role thành công')
    );
  } catch (err) {
    logger.error('Update user role failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi cập nhật role', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

module.exports = {
  requireAdmin,
  getDashboardStats,
  getAllUsers,
  getAllProducts,
  getAllBids,
  deleteProduct,
  deleteUser,
  updateUserRole,
};
