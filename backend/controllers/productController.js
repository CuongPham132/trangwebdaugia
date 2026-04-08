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
const { getImagesByProductId, addProductImage } = require('../models/productImageModel');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

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
    
    // Thêm hình ảnh cho từng sản phẩm
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await getImagesByProductId(product.product_id);
        return { ...product, images: normalizeImages(req, images) };
      })
    );
    
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
    
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await getImagesByProductId(product.product_id);
        return { ...product, images: normalizeImages(req, images) };
      })
    );
    
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
    
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await getImagesByProductId(product.product_id);
        return { ...product, images: normalizeImages(req, images) };
      })
    );
    
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
    
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await getImagesByProductId(product.product_id);
        return { ...product, images: normalizeImages(req, images) };
      })
    );
    
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
    
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await getImagesByProductId(product.product_id);
        return { ...product, images: normalizeImages(req, images) };
      })
    );
    
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
    
    // DEBUG LOG
    console.log('🐛 [CREATE PRODUCT DEBUG]', {
      start_time,
      end_time,
      start_time_type: typeof start_time,
      end_time_type: typeof end_time,
    });
    
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
    
    // Auto-calculate end_time = start_time + 30 minutes
    // Use moment-timezone to parse Vietnam local time properly
    const startTimeFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
    const startTimeMoment = moment.tz(start_time, startTimeFormat, 'Asia/Ho_Chi_Minh');
    
    if (!startTimeMoment.isValid()) {
      return res.status(400).json(
        createErrorResponse('Định dạng start_time không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    const maxEndTimeMoment = startTimeMoment.clone().add(30, 'minutes'); // +30 phút
    
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
    
    // DEBUG LOG 2
    console.log('🐛 [TIME CALCULATION]', {
      startTime: startTimeMoment.format('YYYY-MM-DD HH:mm:ss'),
      maxEndTime: maxEndTimeMoment.format('YYYY-MM-DD HH:mm:ss'),
      finalEndTime: finalEndTimeMoment.format('YYYY-MM-DD HH:mm:ss'),
      startTime_vs_finalEndTime: startTimeMoment >= finalEndTimeMoment ? 'ERROR' : 'OK',
    });
    
    // Nếu end_time quá xa (> 30 phút), giới hạn lại
    if (finalEndTimeMoment > maxEndTimeMoment) {
      finalEndTimeMoment = maxEndTimeMoment;
    }
    
    if (startTimeMoment >= finalEndTimeMoment) {
      return res.status(400).json(
        createErrorResponse('Thời gian kết thúc phải sau thời gian bắt đầu', ERROR_CODES.INVALID_INPUT, 400)
      );
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
      min_increment: min_increment || 10000,
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
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    
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
    
    // Chỉ xóa được nếu chưa có ai đặt giá
    // Có thể thêm logic kiểm tra bid ở đây
    
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
