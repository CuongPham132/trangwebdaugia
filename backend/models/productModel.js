const { sql } = require('../config/db');

// Lấy tất cả sản phẩm đang đấu giá
async function getAllProducts() {
  const result = await sql.query`
    SELECT * FROM product 
    WHERE status = 'active' 
    ORDER BY created_at DESC
  `;
  return result.recordset;
}

// Lấy sản phẩm sắp diễn ra đấu giá
async function getUpcomingProducts() {
  const result = await sql.query`
    SELECT * FROM product 
    WHERE status = 'upcoming' 
    AND start_time > GETDATE()
    ORDER BY start_time ASC
  `;
  return result.recordset;
}

// Lấy sản phẩm theo ID
async function getProductById(product_id) {
  const result = await sql.query`SELECT * FROM product WHERE product_id = ${product_id}`;
  return result.recordset[0];
}

// Lấy sản phẩm theo category
async function getProductsByCategory(category_id) {
  const result = await sql.query`
    SELECT * FROM product 
    WHERE category_id = ${category_id}
    ORDER BY created_at DESC
  `;
  return result.recordset;
}

// Tìm kiếm sản phẩm theo tiêu đề (lấy cả active và upcoming)
async function searchProducts(keyword) {
  const result = await sql.query`
    SELECT * FROM product 
    WHERE title LIKE ${'%' + keyword + '%'} 
    AND (status = 'active' OR status = 'upcoming')
    ORDER BY created_at DESC
  `;
  return result.recordset;
}

// Lấy sản phẩm của seller
async function getSellerProducts(seller_id) {
  const result = await sql.query`
    SELECT * FROM product 
    WHERE seller_id = ${seller_id}
    ORDER BY created_at DESC
  `;
  return result.recordset;
}

// Tạo sản phẩm mới
async function createProduct({ title, description, start_price, min_increment, start_time, end_time, seller_id, category_id }) {
  const result = await sql.query`
    INSERT INTO product (title, description, start_price, current_price, min_increment, start_time, end_time, original_end_time, extension_count, max_extensions, seller_id, category_id, status)
    VALUES (${title}, ${description}, ${start_price}, ${start_price}, ${min_increment}, ${start_time}, ${end_time}, ${end_time}, 0, 3, ${seller_id}, ${category_id}, 'upcoming');
    SELECT SCOPE_IDENTITY() as product_id
  `;
  return result.recordset[0].product_id;
}

// Cập nhật sản phẩm
async function updateProduct(product_id, updates) {
  if (updates.title !== undefined && updates.description !== undefined && updates.status !== undefined) {
    const result = await sql.query`
      UPDATE product 
      SET title = ${updates.title}, description = ${updates.description}, status = ${updates.status}
      WHERE product_id = ${product_id}
    `;
    return result;
  }
  
  if (updates.start_time !== undefined && updates.end_time !== undefined) {
    const result = await sql.query`
      UPDATE product 
      SET start_time = ${updates.start_time}, end_time = ${updates.end_time}
      WHERE product_id = ${product_id}
    `;
    return result;
  }
  
  if (updates.current_price !== undefined) {
    const result = await sql.query`
      UPDATE product 
      SET current_price = ${updates.current_price}
      WHERE product_id = ${product_id}
    `;
    return result;
  }
  
  if (updates.title !== undefined) {
    const result = await sql.query`
      UPDATE product 
      SET title = ${updates.title}
      WHERE product_id = ${product_id}
    `;
    return result;
  }
  
  if (updates.description !== undefined) {
    const result = await sql.query`
      UPDATE product 
      SET description = ${updates.description}
      WHERE product_id = ${product_id}
    `;
    return result;
  }
  
  if (updates.status !== undefined) {
    const result = await sql.query`
      UPDATE product 
      SET status = ${updates.status}
      WHERE product_id = ${product_id}
    `;
    return result;
  }
  
  return null;
}

// Xóa sản phẩm
async function deleteProduct(product_id) {
  const result = await sql.query`DELETE FROM product WHERE product_id = ${product_id}`;
  return result;
}

// Cập nhật giá hiện tại (khi có bid mới)
async function updateProductPrice(product_id, new_price) {
  const result = await sql.query`
    UPDATE product 
    SET current_price = ${new_price}
    WHERE product_id = ${product_id}
  `;
  return result;
}

module.exports = {
  getAllProducts,
  getUpcomingProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductPrice,
};
