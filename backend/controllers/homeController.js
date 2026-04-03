const { getHomePageData, getTrendingProducts } = require('../models/homeModel');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

// 1. Lấy dữ liệu trang chủ
async function getHomePage(req, res) {
  try {
    const data = await getHomePageData();

    res.json(
      createSuccessResponse(data, 'Lấy dữ liệu trang chủ thành công')
    );
  } catch (err) {
    logger.error('Get home page failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy dữ liệu trang chủ', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 2. Lấy sản phẩm trending
async function getTrending(req, res) {
  try {
    const products = await getTrendingProducts();

    res.json(
      createSuccessResponse(products, 'Lấy sản phẩm trending thành công')
    );
  } catch (err) {
    logger.error('Get trending products failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy sản phẩm trending', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

module.exports = {
  getHomePage,
  getTrending,
};
