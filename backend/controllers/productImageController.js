const { addProductImage, setPrimaryImage, deleteProductImage, getImagesByProductId } = require('../models/productImageModel');
const { getProductById } = require('../models/productModel');
const logger = require('../services/logger');

function toAbsoluteImageUrl(req, imageUrl) {
  if (!imageUrl) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${req.protocol}://${req.get('host')}${imageUrl}`;
}

// 1. Thêm hình ảnh cho sản phẩm
async function uploadProductImage(req, res) {
  try {
    const { product_id, is_primary } = req.body;
    const seller_id = req.user.user_id;
    const uploadedFile = req.file || (req.files && (req.files.image?.[0] || req.files.file?.[0]));

    // Validate
    if (!product_id) {
      return res.status(400).json({ message: 'Vui lòng nhập product_id' });
    }

    // Kiểm tra file có được upload không
    if (!uploadedFile) {
      return res.status(400).json({ message: 'Vui lòng chọn hình ảnh (field: image hoặc file)' });
    }

    // Kiểm tra sản phẩm tồn tại
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Kiểm tra quyền (chủ sản phẩm hoặc admin)
    if (String(seller_id) !== String(product.seller_id) && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Bạn không có quyền upload hình ảnh cho sản phẩm này',
        debug: {
          your_user_id: seller_id,
          product_owner_id: product.seller_id,
          product_id: product_id
        }
      });
    }

    // Tạo URL cho hình ảnh
    const image_url = `/uploads/${uploadedFile.filename}`;

    const primaryFlag = String(is_primary).toLowerCase() === 'true';
    await addProductImage({ product_id, image_url, is_primary: primaryFlag });

    logger.success('Product image uploaded', { product_id, user_id: seller_id, is_primary: primaryFlag });

    res.status(201).json({
      message: 'Upload hình ảnh thành công',
      data: { image_url: toAbsoluteImageUrl(req, image_url) },
    });
  } catch (err) {
    logger.error('Upload product image failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// 2. Đặt hình ảnh làm hình chính
async function setMainImage(req, res) {
  try {
    const { image_id, product_id } = req.body;
    const seller_id = req.user.user_id;

    // Kiểm tra sản phẩm tồn tại
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Kiểm tra quyền
    if (String(product.seller_id) !== String(seller_id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật hình ảnh cho sản phẩm này' });
    }

    await setPrimaryImage(image_id, product_id);

    logger.success('Product main image set', { image_id, product_id, user_id: seller_id });

    res.json({ message: 'Đặt hình ảnh chính thành công' });
  } catch (err) {
    logger.error('Set product main image failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// 3. Xóa hình ảnh
async function removeImage(req, res) {
  try {
    const { image_id, product_id } = req.body;
    const seller_id = req.user.user_id;

    // Kiểm tra sản phẩm tồn tại
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Kiểm tra quyền
    if (String(product.seller_id) !== String(seller_id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xóa hình ảnh cho sản phẩm này' });
    }

    await deleteProductImage(image_id);

    logger.success('Product image removed', { image_id, product_id, user_id: seller_id });

    res.json({ message: 'Xóa hình ảnh thành công' });
  } catch (err) {
    logger.error('Remove product image failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  uploadProductImage,
  setMainImage,
  removeImage,
};
