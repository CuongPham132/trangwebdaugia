const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middlewares/auth');
const {
  listActiveProducts,
  listUpcomingProducts,
  getProductDetail,
  searchProduct,
  getProductsByCateg,
  getMyProducts,
  createNewProduct,
  updateProductInfo,
  deleteProductItem,
} = require('../controllers/productController');

// Cấu hình multer cho upload hình ảnh
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận hình ảnh (JPEG, JPG, PNG, GIF)'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Public routes (không cần auth)
router.get('/', listActiveProducts); // Danh sách sản phẩm đang đấu giá
router.get('/upcoming', listUpcomingProducts); // Sản phẩm sắp diễn ra
router.get('/detail/:product_id', getProductDetail); // Chi tiết sản phẩm
router.get('/search', searchProduct); // Tìm kiếm sản phẩm
router.get('/category/:category_id', getProductsByCateg); // Sản phẩm theo danh mục

// Protected routes (cần auth)
router.get('/my-products', authMiddleware, getMyProducts); // Lấy sản phẩm của seller
router.post('/', authMiddleware, upload.single('image'), createNewProduct); // Đăng sản phẩm mới (có thể kèm ảnh)
router.put('/:product_id', authMiddleware, updateProductInfo); // Cập nhật sản phẩm
router.delete('/:product_id', authMiddleware, deleteProductItem); // Xóa sản phẩm

module.exports = router;
