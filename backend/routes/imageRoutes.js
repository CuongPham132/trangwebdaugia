const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middlewares/auth');
const {
  uploadProductImage,
  setMainImage,
  removeImage,
} = require('../controllers/productImageController');

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

const uploadImageFlexible = (req, res, next) => {
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Dung lượng ảnh tối đa là 5MB' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Field upload không hợp lệ. Hãy dùng image hoặc file' });
      }
      return res.status(400).json({ message: `Upload lỗi: ${err.message}` });
    }

    return res.status(400).json({ message: err.message || 'Upload ảnh thất bại' });
  });
};

// Protected routes (cần đăng nhập)
router.post('/upload', authMiddleware, uploadImageFlexible, uploadProductImage);
router.put('/set-main', authMiddleware, setMainImage);
router.delete('/remove', authMiddleware, removeImage);

module.exports = router;
