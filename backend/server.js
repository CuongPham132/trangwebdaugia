const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { startScheduler } = require('./services/scheduler');
const logger = require('./services/logger');
const requestLogger = require('./middlewares/requestLogger');
const userRoutes = require('./routes/userRoutes'); // import route user
const productRoutes = require('./routes/productRoutes'); // import route product
const categoryRoutes = require('./routes/categoryRoutes'); // import route category
const bidRoutes = require('./routes/bidRoutes'); // import route bid
const auctionRoutes = require('./routes/auctionRoutes'); // import route auction
const homeRoutes = require('./routes/homeRoutes'); // import route home
const imageRoutes = require('./routes/imageRoutes'); // import route image

const app = express();

// Middleware chung
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse form-data
app.use(requestLogger);

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route test server cơ bản
app.get('/', (req, res) => {
  res.send('🚀 Server is running...');
});

// User API
app.use('/api/users', userRoutes); // route đăng ký, login, profile

// Product API
app.use('/api/products', productRoutes); // route sản phẩm

// Category API
app.use('/api/categories', categoryRoutes); // route danh mục

// Bid API (Phần III)
app.use('/api/bids', bidRoutes); // route đấu giá

// Auction API (Phần IV, V)
app.use('/api/auctions', auctionRoutes); // route quản lý thời gian và kết quả

// Home API (Phần VI)
app.use('/api/home', homeRoutes); // route trang chủ

// Image API
app.use('/api/images', imageRoutes); // route quản lý hình ảnh

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, async () => {
  try {
    await connectDB(); // kết nối DB
    startScheduler(); // Bắt đầu scheduler tự động update status
    logger.success('Server started', { port: PORT, url: `http://localhost:${PORT}` });
  } catch (err) {
    logger.error('DB connection failed', { error: err.message });
  }
});