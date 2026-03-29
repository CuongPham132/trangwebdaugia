# Auction System Backend API

Backend API cho hệ thống đấu giá trực tuyến.

## 📋 Mô Tả

Đây là API backend xây dựng bằng Node.js/Express để quản lý hệ thống đấu giá trực tuyến. Hỗ trợ:
- Quản lý user (buyer/seller)
- CRUD sản phẩm
- Hệ thống đấu giá tự động (30 phút/sản phẩm)
- Quản lý bid
- Upload hình ảnh
- Xác định người thắng

## 🚀 Cài Đặt

### 1. Prerequisites
- Node.js (v14+)
- SQL Server
- npm hoặc yarn

### 2. Installation

```bash
# Clone repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Tạo file .env
cp .env.example .env  # (nếu có)
```

### 3. Environment Variables

Tạo file `.env`:
```
JWT_SECRET=your-secret-key
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=password
DB_NAME=auction_system
DB_PORT=1433
PORT=3000
```

### 4. Database Setup

```sql
-- Tạo database và tables
-- Chi tiết xem file SQL trong project
```

### 5. Chạy Server

```bash
npm start
# hoặc
node server.js
```

Server chạy tại: `http://localhost:3000`

## 📚 API Documentation

### User Routes (`/api/users/`)
- `POST /register` - Đăng ký user
- `POST /login` - Đăng nhập
- `GET /profile` - Lấy thông tin user (auth required)

### Product Routes (`/api/products/`)
- `GET /` - Danh sách sản phẩm active
- `GET /upcoming` - Sản phẩm sắp diễn ra
- `GET /detail/:id` - Chi tiết sản phẩm
- `GET /search?keyword=xxx` - Tìm kiếm
- `GET /category/:id` - Sản phẩm theo danh mục
- `GET /my-products` - Sản phẩm của seller (auth required)
- `POST /` - Tạo sản phẩm (auth required)
- `PUT /:id` - Update sản phẩm (auth required)
- `DELETE /:id` - Xóa sản phẩm (auth required)

### Bid Routes (`/api/bids/`)
- `GET /history/:product_id` - Lịch sử bid
- `GET /top/:product_id` - Bid cao nhất
- `POST /` - Đặt giá (auth required)
- `GET /my-bids` - Bid của user (auth required)

### Auction Routes (`/api/auctions/`)
- `GET /time/:product_id` - Thời gian còn lại
- `GET /result/:product_id` - Kết quả đấu giá
- `POST /end-early/:product_id` - Kết thúc sớm (seller)

### Category Routes (`/api/categories/`)
- `GET /` - Tất cả danh mục
- `GET /:id` - Chi tiết danh mục
- `POST /` - Tạo danh mục

### Image Routes (`/api/images/`)
- `POST /upload` - Upload hình (auth required)
- `PUT /set-main` - Đặt ảnh chính (auth required)
- `DELETE /remove` - Xóa ảnh (auth required)

## ⚙️ Kiến Trúc

```
backend/
├── config/          # Database config
├── controllers/     # Request handlers
├── models/          # Database queries
├── routes/          # API routes
├── middlewares/     # Auth middleware
├── server.js        # Entry point
└── package.json
```

## 🔐 Authentication

- JWT Token-based (Bearer)
- Token expires: 1 ngày
- Header: `Authorization: Bearer {token}`

## 📝 Lưu Ý Quan Trọng

### Auction Duration
- Mặc định: 30 phút từ `start_time`
- Tự động tính: `end_time = start_time + 30 phút`

### Status Transitions
- **upcoming**: `now < start_time`
- **active**: `start_time ≤ now < end_time` (auto update)
- **ended**: `now ≥ end_time` (auto update)

### Bid Rules
- Seller KHÔNG thể bid sản phẩm của mình
- Bid phải ≥ `current_price + min_increment`
- Sản phẩm phải status "active"

### Validation
- Email unique
- Password: hash bcrypt
- Bid amount > 0
- Product title, price bắt buộc

## 📦 Dependencies

```json
{
  "express": "5.2.1",
  "mssql": "12.2.0",
  "jsonwebtoken": "latest",
  "bcrypt": "latest",
  "dotenv": "latest"
}
```

## 🧪 Testing

Sử dụng Thunder Client (thunder-client-collection.json):
```bash
# Hoặc xem THUNDER_CLIENT_TEST.md
```

## 👥 Roles

- **Buyer**: Tham gia đấu giá
- **Seller**: Đăng sản phẩm, quản lý đấu giá

## 📞 Support

Liên hệ: [your-email]

## 📄 License

MIT
