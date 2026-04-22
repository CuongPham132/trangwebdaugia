const moment = require('moment-timezone');
const {
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
} = require('../models/productModel');
const { getImagesByProductId, getImagesByProductIds, addProductImage } = require('../models/productImageModel');
const { hasBids } = require('../models/bidModel');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

// Auction configuration from environment
const AUCTION_MAX_DURATION_MINUTES = parseInt(process.env.AUCTION_MAX_DURATION_MINUTES || '30');
const AUCTION_DEFAULT_MIN_INCREMENT = parseInt(process.env.AUCTION_DEFAULT_MIN_INCREMENT || '10000');
const AUCTION_MIN_DURATION_MINUTES = parseInt(process.env.AUCTION_MIN_DURATION_MINUTES || '30');

function toAbsoluteImageUrl(req, imageUrl) {
  if (!imageUrl) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${req.protocol}://${req.get('host')}${imageUrl}`;
}

function normalizeImages(req, images) {
  return (images || []).map((img) => ({
    ...img,
    image_url: toAbsoluteImageUrl(req, img.image_url),
  }));
}

// 1. Lấy danh sách sản phẩm đang đấu giá
async function listActiveProducts(req, res) {
  try {
    const products = await getAllProducts();
    
    // Batch query: Lấy tất cả hình ảnh trong 1 lần thay vì N lần
    const product_ids = products.map(p => p.product_id);
    const allImages = await getImagesByProductIds(product_ids);
    const imagesByProductId = {};
    allImages.forEach(img => {
      if (!imagesByProductId[img.product_id]) imagesByProductId[img.product_id] = [];
      imagesByProductId[img.product_id].push(img);
    });
    
    const productsWithImages = products.map(product => ({
      ...product,
      images: normalizeImages(req, imagesByProductId[product.product_id] || [])
    }));
    
    res.json(
      createSuccessResponse(productsWithImages, 'Lấy danh sách sản phẩm thành công')
    );
  } catch (err) {
    logger.error('List active products failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 2. Lấy danh sách sản phẩm sắp diễn ra
async function listUpcomingProducts(req, res) {
  try {
    const products = await getUpcomingProducts();
    
    // Batch query: Lấy tất cả hình ảnh trong 1 lần
    const product_ids = products.map(p => p.product_id);
    const allImages = await getImagesByProductIds(product_ids);
    const imagesByProductId = {};
    allImages.forEach(img => {
      if (!imagesByProductId[img.product_id]) imagesByProductId[img.product_id] = [];
      imagesByProductId[img.product_id].push(img);
    });
    
    const productsWithImages = products.map(product => ({
      ...product,
      images: normalizeImages(req, imagesByProductId[product.product_id] || [])
    }));
    
    res.json(
      createSuccessResponse(productsWithImages, 'Lấy danh sách sản phẩm sắp diễn ra thành công')
    );
  } catch (err) {
    logger.error('List upcoming products failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách sản phẩm sắp diễn ra', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 3. Lấy chi tiết sản phẩm
async function getProductDetail(req, res) {
  try {
    const { product_id } = req.params;
    
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }
    
    // Lấy hình ảnh
    const images = normalizeImages(req, await getImagesByProductId(product_id));
    
    res.json(
      createSuccessResponse({ ...product, images }, 'Lấy chi tiết sản phẩm thành công')
    );
  } catch (err) {
    logger.error('Get product detail failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy chi tiết sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 4. Tìm kiếm sản phẩm
async function searchProduct(req, res) {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json(
        createErrorResponse('Vui lòng nhập từ khóa tìm kiếm', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    const products = await searchProducts(keyword);
    
    // Batch query: Lấy tất cả hình ảnh trong 1 lần
    const product_ids = products.map(p => p.product_id);
    const allImages = await getImagesByProductIds(product_ids);
    const imagesByProductId = {};
    allImages.forEach(img => {
      if (!imagesByProductId[img.product_id]) imagesByProductId[img.product_id] = [];
      imagesByProductId[img.product_id].push(img);
    });
    
    const productsWithImages = products.map(product => ({
      ...product,
      images: normalizeImages(req, imagesByProductId[product.product_id] || [])
    }));
    
    res.json(
      createSuccessResponse(productsWithImages, 'Tìm kiếm sản phẩm thành công')
    );
  } catch (err) {
    logger.error('Search product failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi tìm kiếm sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 5. Lấy sản phẩm theo danh mục
async function getProductsByCateg(req, res) {
  try {
    const { category_id } = req.params;
    
    const products = await getProductsByCategory(category_id);
    
    // Batch query: Lấy tất cả hình ảnh trong 1 lần
    const product_ids = products.map(p => p.product_id);
    const allImages = await getImagesByProductIds(product_ids);
    const imagesByProductId = {};
    allImages.forEach(img => {
      if (!imagesByProductId[img.product_id]) imagesByProductId[img.product_id] = [];
      imagesByProductId[img.product_id].push(img);
    });
    
    const productsWithImages = products.map(product => ({
      ...product,
      images: normalizeImages(req, imagesByProductId[product.product_id] || [])
    }));
    
    res.json(
      createSuccessResponse(productsWithImages, 'Lấy sản phẩm theo danh mục thành công')
    );
  } catch (err) {
    logger.error('Get products by category failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy sản phẩm theo danh mục', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 6. Lấy sản phẩm của người bán
async function getMyProducts(req, res) {
  try {
    const seller_id = req.user.user_id;
    
    const products = await getSellerProducts(seller_id);
    
    // Batch query: Lấy tất cả hình ảnh trong 1 lần
    const product_ids = products.map(p => p.product_id);
    const allImages = await getImagesByProductIds(product_ids);
    const imagesByProductId = {};
    allImages.forEach(img => {
      if (!imagesByProductId[img.product_id]) imagesByProductId[img.product_id] = [];
      imagesByProductId[img.product_id].push(img);
    });
    
    const productsWithImages = products.map(product => ({
      ...product,
      images: normalizeImages(req, imagesByProductId[product.product_id] || [])
    }));
    
    res.json(
      createSuccessResponse(productsWithImages, 'Lấy danh sách sản phẩm của bạn thành công')
    );
  } catch (err) {
    logger.error('Get my products failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 7. Đăng sản phẩm mới (user đăng nhập)
async function createNewProduct(req, res) {
  try {
    const seller_id = req.user.user_id;
    
    const { title, description, start_price, min_increment, start_time, end_time, category_id } = req.body;
    
    // Validate
    if (!title || !start_price || !start_time || !category_id) {
      return res.status(400).json(
        createErrorResponse('Vui lòng điền đầy đủ thông tin bắt buộc', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    if (start_price <= 0) {
      return res.status(400).json(
        createErrorResponse('Giá khởi điểm phải lớn hơn 0', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    // Auto-calculate end_time based on config
    // Use moment-timezone to parse Vietnam local time properly
    const startTimeFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
    const startTimeMoment = moment.tz(start_time, startTimeFormat, 'Asia/Ho_Chi_Minh');
    
    if (!startTimeMoment.isValid()) {
      return res.status(400).json(
        createErrorResponse('Định dạng start_time không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    const maxEndTimeMoment = startTimeMoment.clone().add(AUCTION_MAX_DURATION_MINUTES, 'minutes');
    
    let finalEndTimeMoment;
    if (end_time) {
      const endTimeMoment = moment.tz(end_time, startTimeFormat, 'Asia/Ho_Chi_Minh');
      if (!endTimeMoment.isValid()) {
        return res.status(400).json(
          createErrorResponse('Định dạng end_time không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
        );
      }
      finalEndTimeMoment = endTimeMoment;
    } else {
      finalEndTimeMoment = maxEndTimeMoment;
    }
    
    // ⭐ VALIDATION: Kiểm tra thời gian hợp lệ
    if (!startTimeMoment.isSameOrBefore(finalEndTimeMoment)) {
      return res.status(400).json(
        createErrorResponse('Thời gian kết thúc phải sau hoặc bằng thời gian bắt đầu', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    const durationMinutes = finalEndTimeMoment.diff(startTimeMoment, 'minutes');
    if (durationMinutes < AUCTION_MIN_DURATION_MINUTES) {
      return res.status(400).json(
        createErrorResponse(`Phiên đấu giá phải kéo dài tối thiểu ${AUCTION_MIN_DURATION_MINUTES} phút`, ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    if (durationMinutes > AUCTION_MAX_DURATION_MINUTES) {
      finalEndTimeMoment = maxEndTimeMoment;
    }
    
    // Format times for DB (already in Vietnam time, just format as string)
    const formattedStartTime = startTimeMoment.format('YYYY-MM-DD HH:mm:ss');
    const formattedEndTime = finalEndTimeMoment.format('YYYY-MM-DD HH:mm:ss');
    
    console.log('🐛 [DB INSERT DATA]', {
      formattedStartTime,
      formattedEndTime,
      check_end_greater_than_start: formattedEndTime > formattedStartTime ? 'YES' : 'NO',
    });
    
    const product_id = await createProduct({
      title,
      description,
      start_price,
      min_increment: min_increment || AUCTION_DEFAULT_MIN_INCREMENT,
      start_time: formattedStartTime,
      end_time: formattedEndTime,
      seller_id,
      category_id,
    });
    
    // Nếu có upload ảnh, tự động thêm vào sản phẩm
    let responseData = { product_id };
    if (req.file) {
      const image_url = `/uploads/${req.file.filename}`;
      await addProductImage({ product_id, image_url, is_primary: true });
      responseData.image_url = toAbsoluteImageUrl(req, image_url);
    }

    logger.success('Product created', { product_id, user_id: seller_id, with_image: !!req.file });
    
    res.status(201).json(
      createSuccessResponse(responseData, 'Đăng sản phẩm thành công')
    );
  } catch (err) {
    logger.error('Create product failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi đăng sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 8. Cập nhật sản phẩm (chủ sở hữu hoặc admin)
async function updateProductInfo(req, res) {
  try {
    const { product_id } = req.params;
    const seller_id = req.user.user_id;
    
    const { title, description, status, start_time, end_time } = req.body;
    
    // Kiểm tra sản phẩm tồn tại
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }
    
    // Kiểm tra quyền (chủ sở hữu hoặc admin)
    if (String(product.seller_id) !== String(seller_id) && req.user.role !== 'admin') {
      return res.status(403).json(
        createErrorResponse('Bạn không có quyền cập nhật sản phẩm này', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }
    
    // ⭐ VALIDATION: Kiểm tra thời gian nếu update
    if (start_time || end_time) {
      const startTimeFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
      const effectiveStart = start_time ? moment.tz(start_time, startTimeFormat, 'Asia/Ho_Chi_Minh') : moment.tz(product.start_time, startTimeFormat, 'Asia/Ho_Chi_Minh');
      const effectiveEnd = end_time ? moment.tz(end_time, startTimeFormat, 'Asia/Ho_Chi_Minh') : moment.tz(product.end_time, startTimeFormat, 'Asia/Ho_Chi_Minh');
      
      if (!effectiveStart.isValid() || !effectiveEnd.isValid()) {
        return res.status(400).json(
          createErrorResponse('Định dạng thời gian không hợp lệ (YYYY-MM-DD HH:mm:ss.SSS)', ERROR_CODES.INVALID_INPUT, 400)
        );
      }
      
      if (!effectiveStart.isSameOrBefore(effectiveEnd)) {
        return res.status(400).json(
          createErrorResponse('Thời gian kết thúc phải sau hoặc bằng thời gian bắt đầu', ERROR_CODES.INVALID_INPUT, 400)
        );
      }
      
      const durationMinutes = effectiveEnd.diff(effectiveStart, 'minutes');
      if (durationMinutes < AUCTION_MIN_DURATION_MINUTES) {
        return res.status(400).json(
          createErrorResponse(`Phiên đấu giá phải kéo dài tối thiểu ${AUCTION_MIN_DURATION_MINUTES} phút`, ERROR_CODES.INVALID_INPUT, 400)
        );
      }
      
      if (durationMinutes > AUCTION_MAX_DURATION_MINUTES) {
        return res.status(400).json(
          createErrorResponse(`Phiên đấu giá không thể quá ${AUCTION_MAX_DURATION_MINUTES} phút`, ERROR_CODES.INVALID_INPUT, 400)
        );
      }
    }
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (start_time !== undefined) updates.start_time = moment.tz(start_time, 'YYYY-MM-DD HH:mm:ss.SSS', 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    if (end_time !== undefined) updates.end_time = moment.tz(end_time, 'YYYY-MM-DD HH:mm:ss.SSS', 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    
    await updateProduct(product_id, updates);

    logger.success('Product updated', { product_id, user_id: seller_id });
    
    res.json(
      createSuccessResponse({ product_id }, 'Cập nhật sản phẩm thành công')
    );
  } catch (err) {
    logger.error('Update product failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi cập nhật sản phẩm', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 9. Xóa sản phẩm (chủ sở hữu hoặc admin)
async function deleteProductItem(req, res) {
  try {
    const { product_id } = req.params;
    const seller_id = req.user.user_id;
    
    // Kiểm tra sản phẩm tồn tại
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }
    
    // Kiểm tra quyền (chủ sở hữu hoặc admin)
    if (String(product.seller_id) !== String(seller_id) && req.user.role !== 'admin') {
      return res.status(403).json(
        createErrorResponse('Bạn không có quyền xóa sản phẩm này', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }
    
    // ⭐ CHECK: Xóa chỉ khi chưa có bid hoặc không đang active
    const productHasBids = await hasBids(product_id);
    if (productHasBids) {
      return res.status(400).json(
        createErrorResponse('Không thể xóa sản phẩm có bàn đấu giá', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    if (product.status === 'active') {
      return res.status(400).json(
        createErrorResponse('Không thể xóa sản phẩm đang hoạt động', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    await deleteProduct(product_id);

    logger.success('Product deleted', { product_id, user_id: seller_id });
    
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

module.exports = {
  listActiveProducts,
  listUpcomingProducts,
  getProductDetail,
  searchProduct,
  getProductsByCateg,
  getMyProducts,
  createNewProduct,
  updateProductInfo,
  deleteProductItem,
};
