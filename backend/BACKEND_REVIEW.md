# 📋 REVIEW BACKEND - AUCTION SYSTEM (ĐẤU GIÁ)

**Ngày review:** 28/03/2026  
**Trạng thái:** ✅ Cập nhật với nhiều tính năng mới

---

## 📌 I. TỔNG QUAN HỆ THỐNG

### Architecture
```
Backend: Node.js + Express
Database: SQL Server (mssql)
Authentication: JWT (jsonwebtoken)
Upload file: Multer
Scheduling: Cron job mỗi phút
```

### Database Schema
- `user` - Người dùng (seller, buyer, admin)
- `category` - Danh mục sản phẩm
- `product` - Sản phẩm đấu giá
- `product_image` - Hình ảnh sản phẩm
- `bid` - Lịch sử đấu giá

---

## 🔐 II. AUTHENTICATION (XÁC THỰC)

### Endpoints:
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/users/register` | Đăng ký tài khoản (buyer/seller) |
| POST | `/api/users/login` | Đăng nhập → trả JWT token |
| GET | `/api/users/profile` | Lấy profile user (cần auth) |
| GET | `/api/users/:user_id/stats` | Xem thống kê user |

### Logic:
- ✅ Hash password bằng bcrypt
- ✅ JWT token có hạn 1 ngày
- ✅ Phân quyền: buyer, seller, admin
- ✅ Middleware auth kiểm tra token

---

## 🛍️ III. QUẢN LÝ SẢN PHẨM

### Endpoints:
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/products` | Danh sách sản phẩm đang đấu | ❌ |
| GET | `/api/products/upcoming` | Sản phẩm sắp diễn ra | ❌ |
| GET | `/api/products/detail/:id` | Chi tiết sản phẩm | ❌ |
| GET | `/api/products/category/:id` | Sản phẩm theo danh mục | ❌ |
| GET | `/api/products/search?keyword=...` | Tìm kiếm sản phẩm | ❌ |
| POST | `/api/products` | **Tạo sản phẩm + ảnh** | ✅ Seller |
| GET | `/api/products/my-products` | Sản phẩm của seller | ✅ Seller |
| PUT | `/api/products/:id` | Cập nhật sản phẩm | ✅ Seller |
| DELETE | `/api/products/:id` | Xóa sản phẩm | ✅ Seller |

### Logic tạo sản phẩm (form-data):
```
POST /api/products
Fields:
- title: string (bắt buộc)
- description: string
- start_price: number (bắt buộc)
- min_increment: number (default 10,000)
- start_time: ISO datetime (bắt buộc)
- end_time: ISO datetime (optional, auto = start + 30 phút)
- category_id: number (bắt buộc)
- image: file Upload (optional) → auto thành hình chính

Response:
{
  "message": "Đăng sản phẩm thành công",
  "data": {
    "product_id": 1,
    "image_url": "/uploads/product-xxx.png"
  }
}
```

### Status sản phẩm:
- `pending` - Đang chờ
- `upcoming` - Sắp bắt đầu
- `active` - Đang đấu giá
- `ended` - Kết thúc (no bids)
- `sold` - Bán thành công

---

## 🖼️ IV. QUẢN LÝ HÌNH ẢNH

### Endpoints:
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/images/upload` | Upload ảnh cho sản phẩm | ✅ Seller |
| PUT | `/api/images/set-main` | Đặt ảnh làm chính | ✅ Seller |
| DELETE | `/api/images/remove` | Xóa ảnh | ✅ Seller |

### Logic:
- ✅ Upload kèm sản phẩm (POST /api/products)
- ✅ Upload riêng biệt (POST /api/images/upload)
- ✅ Hỗ trợ: JPEG, JPG, PNG, GIF
- ✅ Max size: 5MB
- ✅ Kiểm tra quyền sở hữu sản phẩm

---

## 💰 V. ĐẤU GIÁ (BID)

### Endpoints:
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/bids` | Đặt giá / Bid | ✅ Buyer |
| GET | `/api/bids/history/:product_id` | Lịch sử bid sản phẩm | ❌ |
| GET | `/api/bids/top/:product_id` | Bid cao nhất hiện tại | ❌ |
| GET | `/api/bids/my-bids` | Các bid của user | ✅ Buyer |

### Logic bidding:
```
POST /api/bids
Body:
{
  "product_id": 1,
  "bid_amount": 150000
}

Kiểm tra:
✅ Sản phẩm tồn tại
✅ Seller không thể bid sản phẩm của mình
✅ Thời gian: start_time ≤ now < end_time
✅ Status = 'active'
✅ bid_amount ≥ (highest_bid + min_increment)

Nếu OK:
✅ Tạo bid mới
✅ Update current_price của product
```

---

## ⏱️ VI. QUẢN LÝ THỜI GIAN & KẾT QUẢ

### Endpoints:
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/auctions/time/:product_id` | Xem thời gian còn lại | ❌ |
| GET | `/api/auctions/result/:product_id` | Xem kết quả| ❌ |
| POST | `/api/auctions/end-early/:product_id` | Seller kết thúc sớm | ✅ Seller |

### Scheduler (Background Job):
- ✅ Chạy **mỗi 1 phút** tự động
- ✅ Update `upcoming` → `active` (khi có start_time)
- ✅ Update `active` → `ended` (khi quá end_time)
- ✅ Query SQL:
  ```sql
  UPDATE product SET status = 'active'
  WHERE status = 'upcoming' AND start_time <= NOW() AND end_time > NOW()
  
  UPDATE product SET status = 'ended'
  WHERE status = 'active' AND end_time <= NOW()
  ```

---

## 🏠 VII. TRANG CHỦ & TRENDING

### Endpoints:
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/home` | Dữ liệu trang chủ |
| GET | `/api/home/trending` | Sản phẩm hot nhất (trending) |

### Logic trending:
- TOP sản phẩm có **nhiều bid nhất**
- Có **giá cao nhất**
- Status = 'active' hoặc 'ended'

---

## ✅ CÁC TÍNH NĂNG CHÍNH ĐÃ IMPLEMENT

✅ **Authentication**
- Đăng ký/Đăng nhập
- JWT token (1 ngày)
- Phân quyền user

✅ **Product Management**
- Tạo sản phẩm + upload ảnh cùng lúc (form-data)
- Xem danh sách sản phẩm by status
- Xem chi tiết sản phẩm
- Tìm kiếm sản phẩm
- Lọc theo danh mục
- Cập nhật/xóa sản phẩm (chỉ seller)

✅ **Image Management**
- Upload ảnh khi tạo sản phẩm
- Upload ảnh riêng sau
- Upload multiple images
- Đặt ảnh chính
- Xóa ảnh
- Kiểm tra quyền sở hữu

✅ **Bidding System**
- Đặt giá / bid
- Kiểm tra bid amount ≥ highest_bid + min_increment
- Lịch sử bid
- Xem bid cao nhất hiện tại

✅ **Time Management**
- Auto-update status (upcoming → active → ended)
- Scheduler chạy mỗi 1 phút
- Xem thời gian còn lại của sản phẩm
- Format thời gian thân thiện (ngày, giờ, phút, giây)

✅ **Error Handling**
- Validate input
- Kiểm tra permission
- Try-catch trong từng endpoint
- Debug logs
- Type conversion (string → number)

---

## ⚠️ NHỮNG ĐIỂM CẦN LƯU Ý

### 1. **Upload ảnh khi tạo sản phẩm**
- Sử dụng **form-data**, không phải JSON
- Field name: `image`
- Tự động set `is_primary = true`

### 2. **Status update tự động**
- Scheduler chạy mỗi **1 phút**
- Kiểm tra từng sản phẩm có status = `upcoming` hoặc `active`
- Không chạy trong real-time, có delay ~1 phút

### 3. **Kiểm tra quyền**
- Seller chỉ có thể upload ảnh cho sản phẩm của mình
- Seller không thể bid sản phẩm của mình
- Buyer không thể tạo/update sản phẩm

### 4. **Type mismatch**
- `user_id` là **UUID** (guid)
- `product_id`, `category_id` là **number**
- Luôn convert bằng `Number()` trước khi so sánh

### 5. **End_time logic**
- Auto-calculate: `end_time = start_time + 30 phút`
- Nếu client gửi end_time > maxEndTime, sẽ override

---

## 🔧 VI. CODE XỬ LÝ MẠN MỰC

### File: `server.js`
```javascript
// Thêm middleware parse form-data
app.use(express.urlencoded({ extended: true }));

// Import scheduler
const { startScheduler } = require('./services/scheduler');

// Khởi động scheduler khi server start
app.listen(PORT, async () => {
  await connectDB();
  startScheduler(); // ← Tự động update status mỗi 1 phút
  console.log(`🚀 Server running...`);
});
```

### File: `routes/productRoutes.js`
```javascript
// Thêm multer middleware
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => { ... }
});

// POST /api/products với upload file
router.post('/', authMiddleware, upload.single('image'), createNewProduct);
```

### File: `controllers/productController.js`
```javascript
// Kiểm tra file upload
if (req.file) {
  const image_url = `/uploads/${req.file.filename}`;
  await addProductImage({ product_id, image_url, is_primary: true });
}
```

### File: `services/scheduler.js`
```javascript
setInterval(updateProductStatuses, 60000); // Chạy mỗi 60 giây
```

---

## 🧪 VII. HƯỚNG DẪN TEST TOÀN BỘ

### 1. Reset Data
```sql
DELETE FROM bid;
DELETE FROM product_image;
DELETE FROM product;
DELETE FROM [user];
DELETE FROM category;

INSERT INTO category (name, description) VALUES 
('Điện thoại', 'Các loại điện thoại'),
('Laptop', 'Các loại laptop');
```

### 2. Register User (Postman)
```
POST /api/users/register
{
  "username": "seller1",
  "email": "seller1@test.com",
  "password": "123456",
  "role": "seller"
}
```

### 3. Login & Get Token
```
POST /api/users/login
{
  "email": "seller1@test.com",
  "password": "123456"
}
→ Copy token
```

### 4. Create Product + Image
```
POST /api/products (form-data)
Headers: Authorization: Bearer {token}

Body:
- title: Điện thoại iPhone 15
- description: Hàng mới, chưa sử dụng
- start_price: 10000000
- min_increment: 100000
- category_id: 1
- start_time: 2026-03-28T15:00:00Z
- image: (chọn file ảnh)
```

### 5. View Product
```
GET /api/products/category/1
→ Xem sản phẩm vừa tạo
```

### 6. Wait for Scheduler
```
Chờ ~1 phút
→ Server console sẽ in: ✅ Product statuses updated
→ Status `upcoming` → `active`
```

### 7. Bid (Buyer)
```
POST /api/bids (after login as buyer)
{
  "product_id": 1,
  "bid_amount": 10100000
}
```

---

## 📊 VIII. THỐNG KÊ API

| Phần | Số Endpoint | Trạng thái |
|-----|------------|-----------|
| User | 4 | ✅ |
| Product | 9 | ✅ |
| Image | 3 | ✅ |
| Bid | 4 | ✅ |
| Auction | 3 | ✅ |
| Home | 2 | ✅ |
| **Total** | **25+** | **✅** |

---

## 🚀 IX. NHỮNG TÍNH NĂNG CÓ THỂ MỞ RỘNG TRONG TƯỚ

1. **Thêm sản phẩm hot/trending**
   - GET /api/products/trending
   - Lọc theo số bid, giá cao nhất

2. **Admin panel**
   - Xóa sản phẩm/user
   - Xem thống kê toàn hệ thống

3. **Notification system**
   - Thông báo khi bid cao hơn
   - Email reminder trước khi end

4. **Payment integration**
   - Vnpay, Momo, etc
   - Kiểm tra payment trước delivery

5. **Real-time bidding**
   - WebSocket thay vì polling
   - Push notification

6. **Wishlist**
   - Save sản phẩm yêu thích
   - Notify khi price drop

---

## 📝 X. DEPENDENCIES HIỆN TẠI

```json
{
  "bcrypt": "^6.0.0",
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.3",
  "mssql": "^12.2.0",
  "multer": "^2.1.1",
  "uuid": "^13.0.0"
}
```

---

## ✨ KẾT LUẬN

✅ **Backend đã implement đầy đủ các tính năng chính:**
- Xác thực & phân quyền
- Quản lý sản phẩm + hình ảnh
- Hệ thống đấu giá
- Auto-update trạng thái mỗi phút
- Upload ảnh luôn với sản phẩm (form-data)

⚠️ **Lưu ý:**
- Kiểm tra type data (UUID vs Number)
- Test upload ảnh bằng Postman form-data
- Scheduler có delay ~1 phút

🎉 **Sẵn sàng deploy & test!**

---

**Generated: 28/03/2026**
