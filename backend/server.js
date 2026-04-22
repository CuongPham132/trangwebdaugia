const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('redis');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { startScheduler } = require('./services/scheduler');
const logger = require('./services/logger');
const requestLogger = require('./middlewares/requestLogger');
const { errorHandler } = require('./middlewares/errorMiddleware');
const userRoutes = require('./routes/userRoutes'); // import route user
const productRoutes = require('./routes/productRoutes'); // import route product
const categoryRoutes = require('./routes/categoryRoutes'); // import route category
const bidRoutes = require('./routes/bidRoutes'); // import route bid
const orderRoutes = require('./routes/orderRoutes'); // import route order
const auctionRoutes = require('./routes/auctionRoutes'); // import route auction
const homeRoutes = require('./routes/homeRoutes'); // import route home
const imageRoutes = require('./routes/imageRoutes'); // import route image
const walletRoutes = require('./routes/walletRoutes'); // import route wallet
const adminRoutes = require('./routes/adminRoutes'); // import route admin

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

// ⭐ Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { sql } = require('./config/db');
    const result = await sql.query`SELECT 1 as test`;
    res.json({ 
      status: 'ok', 
      server: 'running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      server: 'running',
      database: 'disconnected',
      error: err.message
    });
  }
});

// User API
app.use('/api/users', userRoutes); // route đăng ký, login, profile

// Product API
app.use('/api/products', productRoutes); // route sản phẩm

// Category API
app.use('/api/categories', categoryRoutes); // route danh mục

// Bid API (Phần III)
app.use('/api/bids', bidRoutes); // route đấu giá

// Order API (Phần thanh toán)
app.use('/api/orders', orderRoutes); // route đơn hàng & thanh toán

// Auction API (Phần IV, V)
app.use('/api/auctions', auctionRoutes); // route quản lý thời gian và kết quả

// Home API (Phần VI)
app.use('/api/home', homeRoutes); // route trang chủ

// Image API
app.use('/api/images', imageRoutes); // route quản lý hình ảnh

// Wallet API
app.use('/api/wallet', walletRoutes); // route ví tiền & giao dịch

// Admin API (Admin only)
app.use('/api/admin', adminRoutes); // route admin dashboard & management

// ⭐ Global Error Handler (PHẢI đặt cuối cùng)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// ⭐ Create HTTP server for Socket.io
const server = http.createServer(app);

// ⭐ Initialize Socket.io with Redis adapter (for multi-server scalability)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ⭐ Redis adapter setup for multi-server deployments
// If Redis is available, use it for pub/sub across servers
// If Redis is unavailable, Socket.io will use in-memory adapter (single server only)
if (process.env.REDIS_HOST) {
  try {
    const pubClient = redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    const subClient = pubClient.duplicate();

    // Wait for Redis connection
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        logger.success('Redis connected - enabling Socket.io Redis adapter');
        io.adapter(createAdapter(pubClient, subClient));
      })
      .catch((err) => {
        logger.warn('Redis connection failed - using in-memory adapter', { error: err.message });
      });
  } catch (err) {
    logger.warn('Redis adapter setup failed - using in-memory adapter', { error: err.message });
  }
} else {
  logger.info('REDIS_HOST not set - using in-memory adapter (single server only)');
}

// ⭐ Socket.io connection handlers
io.on('connection', (socket) => {
  logger.info('Socket connected', { socket_id: socket.id });

  // Join room for specific product
  socket.on('join-product', (productId) => {
    socket.join(`product-${productId}`);
    logger.info('User joined product room', { socket_id: socket.id, productId });
  });

  // Leave room
  socket.on('leave-product', (productId) => {
    socket.leave(`product-${productId}`);
    logger.info('User left product room', { socket_id: socket.id, productId });
  });

  // Disconnect
  socket.on('disconnect', () => {
    logger.info('Socket disconnected', { socket_id: socket.id });
  });
});

// ⭐ Export io for use in routes/controllers
global.io = io;

// Start server
server.listen(PORT, async () => {
  try {
    await connectDB(); // kết nối DB
    startScheduler(); // Bắt đầu scheduler tự động update status
    logger.success('Server started', { port: PORT, url: `http://localhost:${PORT}` });
  } catch (err) {
    logger.error('DB connection failed', { error: err.message });
  }
});