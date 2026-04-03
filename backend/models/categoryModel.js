const { sql } = require('../config/db');

// Lấy tất cả category
async function getAllCategories() {
  const result = await sql.query`SELECT * FROM category`;
  return result.recordset;
}

// Lấy category theo ID
async function getCategoryById(category_id) {
  const result = await sql.query`SELECT * FROM category WHERE category_id = ${category_id}`;
  return result.recordset[0];
}

// Tạo category mới
async function createCategory({ name, description }) {
  const result = await sql.query`
    INSERT INTO category (name, description)
    VALUES (${name}, ${description});
    SELECT SCOPE_IDENTITY() as category_id
  `;
  return result.recordset[0].category_id;
}

module.exports = { getAllCategories, getCategoryById, createCategory };
