const { sql } = require('../config/db');
const { formatToAppTimezone } = require('../utils/timeUtils');

/**
 * Normalize/format product data for API response
 * Datetime fields from DB are already in Vietnam timezone, just format them
 * If calculated_status exists, use it as the status field (override DB status)
 */
function normalizeProduct(product) {
  if (!product) return null;
  
  return {
    ...product,
    // Use calculated_status if available (real-time status), otherwise DB status
    status: product.calculated_status || product.status,
    // DB values already in Vietnam timezone - just convert to string format
    start_time: product.start_time ? new Date(product.start_time).toISOString().replace('T', ' ').slice(0, 19) : null,
    end_time: product.end_time ? new Date(product.end_time).toISOString().replace('T', ' ').slice(0, 19) : null,
    original_end_time: product.original_end_time ? new Date(product.original_end_time).toISOString().replace('T', ' ').slice(0, 19) : null,
    created_at: product.created_at ? new Date(product.created_at).toISOString().replace('T', ' ').slice(0, 19) : null,
  };
}

// Lấy tất cả sản phẩm đang đấu giá
async function getAllProducts() {
  const result = await sql.query`
    SELECT *,
      CASE 
        WHEN GETDATE() < start_time THEN 'upcoming'
        WHEN GETDATE() >= start_time AND GETDATE() < end_time THEN 'active'
        WHEN GETDATE() >= end_time THEN 'ended'
        ELSE status
      END as calculated_status
    FROM product 
    WHERE status = 'active' 
    ORDER BY created_at DESC
  `;
  return result.recordset.map(normalizeProduct);
}

// Lấy sản phẩm sắp diễn ra đấu giá
async function getUpcomingProducts() {
  const result = await sql.query`
    SELECT *,
      CASE 
        WHEN GETDATE() < start_time THEN 'upcoming'
        WHEN GETDATE() >= start_time AND GETDATE() < end_time THEN 'active'
        WHEN GETDATE() >= end_time THEN 'ended'
        ELSE status
      END as calculated_status
    FROM product 
    WHERE status = 'upcoming' 
    AND start_time > GETDATE()
    ORDER BY start_time ASC
  `;
  return result.recordset.map(normalizeProduct);
}

// Lấy sản phẩm theo ID (với status check từ DB)
async function getProductById(product_id) {
  const result = await sql.query`
    SELECT 
      *,
      CASE 
        WHEN GETDATE() < start_time THEN 'upcoming'
        WHEN GETDATE() >= start_time AND GETDATE() < end_time THEN 'active'
        WHEN GETDATE() >= end_time THEN 'ended'
        ELSE status
      END as calculated_status
    FROM product 
    WHERE product_id = ${product_id}
  `;
  
  if (!result.recordset[0]) return null;
  
  const product = result.recordset[0];
  
  // Cập nhật status nếu khác với status hiện tại
  if (product.calculated_status !== product.status) {
    await sql.query`
      UPDATE product 
      SET status = ${product.calculated_status}
      WHERE product_id = ${product_id}
    `;
    product.status = product.calculated_status;
  }
  
  // Giữ lại calculated_status để normalizeProduct sử dụng
  return normalizeProduct(product);
}

// Lấy sản phẩm theo category
async function getProductsByCategory(category_id) {
  const result = await sql.query`
    SELECT *,
      CASE 
        WHEN GETDATE() < start_time THEN 'upcoming'
        WHEN GETDATE() >= start_time AND GETDATE() < end_time THEN 'active'
        WHEN GETDATE() >= end_time THEN 'ended'
        ELSE status
      END as calculated_status
    FROM product 
    WHERE category_id = ${category_id}
    ORDER BY created_at DESC
  `;
  return result.recordset.map(normalizeProduct);
}

// Tìm kiếm sản phẩm theo tiêu đề (lấy cả active và upcoming)
async function searchProducts(keyword) {
  const result = await sql.query`
    SELECT *,
      CASE 
        WHEN GETDATE() < start_time THEN 'upcoming'
        WHEN GETDATE() >= start_time AND GETDATE() < end_time THEN 'active'
        WHEN GETDATE() >= end_time THEN 'ended'
        ELSE status
      END as calculated_status
    FROM product 
    WHERE title LIKE ${'%' + keyword + '%'} 
    AND (status = 'active' OR status = 'upcoming')
    ORDER BY created_at DESC
  `;
  return result.recordset.map(normalizeProduct);
}

// Lấy sản phẩm của seller
async function getSellerProducts(seller_id) {
  const result = await sql.query`
    SELECT *,
      CASE 
        WHEN GETDATE() < start_time THEN 'upcoming'
        WHEN GETDATE() >= start_time AND GETDATE() < end_time THEN 'active'
        WHEN GETDATE() >= end_time THEN 'ended'
        ELSE status
      END as calculated_status
    FROM product 
    WHERE seller_id = ${seller_id}
    ORDER BY created_at DESC
  `;
  return result.recordset.map(normalizeProduct);
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
