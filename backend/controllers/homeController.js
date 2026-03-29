const { getHomePageData, getTrendingProducts } = require('../models/homeModel');

// 1. Lấy dữ liệu trang chủ
async function getHomePage(req, res) {
  try {
    const data = await getHomePageData();

    res.json({
      message: 'Lấy dữ liệu trang chủ thành công',
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 2. Lấy sản phẩm trending
async function getTrending(req, res) {
  try {
    const products = await getTrendingProducts();

    res.json({
      message: 'Lấy sản phẩm trending thành công',
      data: products,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getHomePage,
  getTrending,
};
