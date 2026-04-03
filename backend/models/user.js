const { sql } = require('../config/db');

//Lấy user theo id
async function getUserById(user_id){
  const result = await sql.query`SELECT * FROM [user] WHERE user_id = ${user_id}`;
  return result.recordset[0];
}

//Lấy user theo email
async function getUserByEmail(email){
  const result = await sql.query`SELECT * FROM [user] WHERE email = ${email}`;
  return result.recordset[0];
}

//Tạo user mới
async function createUser({ username, email, password, role }) {
  await sql.query`
    INSERT INTO [user] (username, email, password, role, created_at)
    VALUES (${username}, ${email}, ${password}, ${role}, GETDATE())
  `;
}

//Lấy thống kê của user
async function getUserStats(user_id) {
  const result = await sql.query`
    SELECT 
      u.user_id,
      u.username,
      u.role,
      COALESCE((SELECT COUNT(*) FROM bid WHERE user_id = ${user_id}), 0) as total_bids,
      COALESCE((SELECT COUNT(*) FROM product WHERE seller_id = ${user_id}), 0) as total_products,
      COALESCE((SELECT COUNT(*) FROM product WHERE seller_id = ${user_id} AND status = 'active'), 0) as active_products,
      COALESCE((SELECT COUNT(*) FROM product WHERE seller_id = ${user_id} AND status = 'ended'), 0) as completed_products
    FROM [user] u
    WHERE u.user_id = ${user_id}
  `;
  return result.recordset[0];
}

// Update thông tin user
async function updateUser(user_id, { username, status }) {
  try {
    const updates = [];
    const params = {};
    
    if (username !== undefined) {
      updates.push('username = @username');
      params.username = username;
    }
    
    if (status !== undefined) {
      updates.push('[status] = @status');
      params.status = status;
    }
    
    if (updates.length === 0) {
      return { success: true, message: 'Không có thay đổi' };
    }
    
    const query = `
      UPDATE [user]
      SET ${updates.join(', ')}
      WHERE user_id = @user_id;
      SELECT * FROM [user] WHERE user_id = @user_id;
    `;
    
    const request = sql.request();
    request.input('user_id', user_id);
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const result = await request.query(query);
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

module.exports = { getUserById, getUserByEmail, createUser, getUserStats, updateUser };