const { sql } = require('../config/db');
const { randomUUID } = require('crypto');

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
  const user_id = randomUUID(); // tạo ID duy nhất cho user
  await sql.query`
    INSERT INTO [user] (user_id, username, email, password, role, created_at)
    VALUES (${user_id}, ${username}, ${email}, ${password}, ${role}, GETDATE())
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

module.exports = { getUserById, getUserByEmail, createUser, getUserStats };