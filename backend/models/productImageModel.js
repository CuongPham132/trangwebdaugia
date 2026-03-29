const { sql } = require('../config/db');

// Lấy hình ảnh theo product_id
async function getImagesByProductId(product_id) {
  const result = await sql.query`
    SELECT * FROM product_image 
    WHERE product_id = ${product_id}
    ORDER BY is_primary DESC, created_at ASC
  `;
  return result.recordset;
}

// Lấy hình ảnh chính của sản phẩm
async function getPrimaryImage(product_id) {
  const result = await sql.query`
    SELECT * FROM product_image 
    WHERE product_id = ${product_id} AND is_primary = 1
  `;
  return result.recordset[0];
}

// Thêm hình ảnh
async function addProductImage({ product_id, image_url, is_primary }) {
  // Nếu chưa có ảnh nào, tự động set ảnh mới làm ảnh chính
  const existing = await sql.query`
    SELECT COUNT(*) as count FROM product_image WHERE product_id = ${product_id}
  `;
  const hasAnyImage = existing.recordset[0].count > 0;
  const shouldBePrimary = Boolean(is_primary) || !hasAnyImage;

  // Nếu là hình ảnh chính, set những hình cũ thành không chính
  if (shouldBePrimary) {
    await sql.query`UPDATE product_image SET is_primary = 0 WHERE product_id = ${product_id}`;
  }
  
  const result = await sql.query`
    INSERT INTO product_image (product_id, image_url, is_primary)
    VALUES (${product_id}, ${image_url}, ${shouldBePrimary ? 1 : 0})
  `;
  return result;
}

// Cập nhật hình ảnh làm hình chính
async function setPrimaryImage(image_id, product_id) {
  await sql.query`UPDATE product_image SET is_primary = 0 WHERE product_id = ${product_id}`;
  const result = await sql.query`UPDATE product_image SET is_primary = 1 WHERE image_id = ${image_id}`;
  return result;
}

// Xóa hình ảnh
async function deleteProductImage(image_id) {
  const result = await sql.query`DELETE FROM product_image WHERE image_id = ${image_id}`;
  return result;
}

module.exports = {
  getImagesByProductId,
  getPrimaryImage,
  addProductImage,
  setPrimaryImage,
  deleteProductImage,
};
