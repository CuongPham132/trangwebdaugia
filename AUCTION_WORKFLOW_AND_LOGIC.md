# WORKFLOW VÀ LOGIC XỬ LÝ PHẦN ĐẤU GIÁ

**Dự án:** AuctionHub - Ứng dụng đấu giá trực tuyến  
**Phiên bản:** 1.0  
**Ngày cập nhật:** April 4, 2026  

---

## MỤC LỤC

1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Database Schema](#database-schema)
3. [Workflow Đấu Giá Chính](#workflow-đấu-giá-chính)
4. [Các Trạng Thái Sản Phẩm](#các-trạng-thái-sản-phẩm)
5. [Logic Xử Lý Chi Tiết](#logic-xử-lý-chi-tiết)
6. [Xử Lý Risk và Edge Cases](#xử-lý-risk-và-edge-cases)
7. [Hệ Thống Ví Tiền](#hệ-thống-ví-tiền)
8. [Tự Động Kéo Dài Thời Gian](#tự-động-kéo-dài-thời-gian)
9. [Xử Lý Thanh Toán Và Hoàn Tiền](#xử-lý-thanh-toán-và-hoàn-tiền)

---

## TỔNG QUAN HỆ THỐNG

### Các Vai Trò Chính

```
┌─────────────────┐
│   Seller        │ - Đăng sản phẩm
│  (Người Bán)    │ - Xem lịch sử đấu giá
│                 │ - Nhận tiền khi sản phẩm bán được
└─────────────────┘
         │
         │
    ¿ PRODUCT ¿
         │
         │
┌─────────────────┐
│   Buyer         │ - Xem sản phẩm
│ (Người Mua)     │ - Đặt giá (Bid)
│                 │ - Nạp tiền vào ví
│                 │ - Thanh toán khi chiến thắng
└─────────────────┘
```

### Quy Trình Đấu Giá Cơ Bản

```
[Seller Đăng] → [Sản Phẩm Pending] → [Sắp Diễn Ra] → [Đang Mở] 
                                                          ↓
                                                    [Nhiều Bids]
                                                          ↓
                                    [Hết Thời Gian] ← [Auto Extend?]
                                          ↓
                                    [Seller/Admin Confirm]
                                          ↓
                                   [Xác Định Winner]
                                          ↓
                                   [Thanh Toán]
                                          ↓
                                   [Hoàn Tiền Người Thua]
                                          ↓
                                   [Sản Phẩm SOLD]
```

---

## DATABASE SCHEMA

### Bảng: product

```sql
CREATE TABLE product (
    product_id INT PRIMARY KEY,
    title NVARCHAR(255),
    description NVARCHAR(MAX),
    start_price DECIMAL(18,2),        -- Giá khởi điểm
    current_price DECIMAL(18,2),       -- Giá cao nhất hiện tại
    min_increment DECIMAL(18,2),       -- Bước giá tối thiểu
    start_time DATETIME,               -- Thời gian bắt đầu
    end_time DATETIME,                 -- Thời gian kết thúc (có thể kéo dài)
    original_end_time DATETIME,        -- Thời gian kết thúc gốc
    extension_count INT,               -- Số lần kéo dài
    max_extensions INT (DEFAULT 3),    -- Giới hạn kéo dài
    status NVARCHAR(50),               -- pending | upcoming | active | ended | sold
    seller_id INT (FK),
    category_id INT (FK),
    winning_bid_id INT (FK),           -- ID của bid chiến thắng
    created_at DATETIME
);
```

**Ràng Buộc Kiểm Tra:**
- `start_price > 0`
- `min_increment > 0`
- `end_time > start_time`
- `extension_count >= 0`
- `extension_count <= max_extensions`

### Bảng: bid

```sql
CREATE TABLE bid (
    bid_id INT PRIMARY KEY,
    product_id INT (FK),               -- Sản phẩm được đấu giá
    user_id INT (FK),                  -- Person ai đặt giá
    bid_amount DECIMAL(18,2),          -- Mức giá đặt
    bid_time DATETIME (DEFAULT GETDATE()),
    is_winning BIT (DEFAULT 0)         -- Flag đánh dấu bid chiến thắng
);
```

**Ràng Buộc Kiểm Tra:**
- `bid_amount > 0`
- FK `product_id` CASCADE DELETE
- FK `user_id` CASCADE DELETE

### Bảng: wallet (Quản Lý Tiền)

```sql
CREATE TABLE wallet (
    wallet_id INT PRIMARY KEY,
    user_id INT (UNIQUE),              -- Một ví cho mỗi người dùng
    balance DECIMAL(18,2),             -- Tiền có sẵn
    locked_balance DECIMAL(18,2),      -- Tiền bị kẹt trong các bid
    created_at DATETIME
);
```

**Công Thức:**
- `total_available = balance + locked_balance`
- `balance + locked_balance = total_money_in_wallet`

---

## CÁC TRẠNG THÁI SẢN PHẨM

| Trạng Thái | Mô Tả | Điều Kiện Chuyển Đổi |
|-----------|-------|---------------------|
| **pending** | Sản phẩm vừa được đăng | Tự động → upcoming (khi tới start_time) |
| **upcoming** | Sắp diễn ra | Tự động → active (khi tới start_time) |
| **active** | Đang mở đấu giá | Tự động → ended (khi quá end_time) |
| **ended** | Hết thời gian, chưa xác định kết quả | Manual → sold (Seller/Admin xác nhận) |
| **sold** | Đã bán, xác định winner rồi | Final state |

### Biểu Đồ Chuyển Trạng Thái

```
                      (auto, nếu tới start_time)
                                ↓
        ┌─────────┐ ────────→ ┌─────────┐
        │ pending │           │upcoming │
        └─────────┘ ←─────────└─────────┘
                      (manual roll back)
                                │
                    (auto, khi tới start_time)
                                ↓
                          ┌─────────┐
                          │ active  │
                          └─────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
    (normal timeout)  (auto extend)  (manual stopped)
            │             │             │
            ↓             │             ↓
        ┌──────────┐      │         (manual)
        │  ended   │←─────┤
        └──────────┘
            │
    (Seller confirms)
            ↓
        ┌──────────┐
        │  sold    │ ──→ Xác định Winner + Thanh Toán
        └──────────┘
```

---

## WORKFLOW ĐẤU GIÁ CHÍNH

### PHASE 1: Chuẩn Bị & Đăng Sản Phẩm

**Người tham gia:** Seller  
**Input:**
- title, description
- start_price, min_increment
- category_id
- start_time, end_time (max 30 phút)
- images (1+ hình)

**Xử Lý:**
1. Validate thông tin sản phẩm
2. Kiểm tra seller có đủ uy tín không
3. Tạo product với `status = 'pending'`
4. Upload hình ảnh prod product
5. Tự động → `upcoming` (khi tới start_time) hoặc để trong trạng thái pending đợi approval

**Output:**
- Product ID tạo thành công
- Status: `pending` hoặc `upcoming`

---

### PHASE 2: Người Dùng Xem & Tìm Kiếm

**Người tham gia:** Buyer/Public

**Chức Năng:**
- Xem danh sách sản phẩm active/upcoming
- Tìm kiếm theo tên, danh mục
- Xem chi tiết sản phẩm: giá, mô tả, hình ảnh, lịch sử bid

**Logic:**
```javascript
// Fetch sản phẩm active/upcoming
GET /api/products
GET /api/products/upcoming
GET /api/products/search?keyword=...
GET /api/products/category/:categoryId
GET /api/products/detail/:productId
```

---

### PHASE 3: Đặt Giá (BID) ⭐ CORE LOGIC

**Người tham gia:** Buyer  
**Endpoint:** `POST /api/bids/`

**Input:**
```json
{
  "product_id": 1,
  "bid_amount": 1000000
}
```

#### 3.1 Kiểm Tra Điều Kiện

```
┌─────────────────────────────────────┐
│ BID REQUEST VALIDATION              │
├─────────────────────────────────────┤
│ 1. Seller không thể bid sản phẩm    │
│    của chính mình                   │
│                                     │
│ 2. Sản phẩm phải ở trạng thái      │
│    'active'                         │
│                                     │
│ 3. Thời gian đấu giá phải hợp lệ:  │
│    - Đã tới start_time              │
│    - Chưa quá end_time (± 2s buffer)│
│                                     │
│ 4. Mức giá phải > hiện tại +        │
│    min_increment                    │
│                                     │
│ 5. Ví phải đủ tiền locking          │
│                                     │
│ 6. Không có Race Condition?         │
└─────────────────────────────────────┘
    │ ✓ Pass all checks?
    ↓ YES
```

#### 3.2 Locking Tiền & Tạo Bid

```javascript
// Luồng xử lý Bid:

async function placeBid(product_id, bid_amount) {
  // 1. Lock tiền của user (bid_amount)
  walletService.lockBalance(user_id, bid_amount);
  
  // 2. Tạo Bid mới
  createBid({
    product_id,
    user_id,
    bid_amount
  });
  
  // 3. Update product.current_price = bid_amount
  updateProduct(product_id, { 
    current_price: bid_amount 
  });
  
  // 4. Kiểm tra Auto-Extend?
  // Nếu sản phẩm < 10 giây cuối:
  //   - Kéo dài end_time thêm 10 phút
  //   - max extension 3 lần (hoặc giới hạn by tổng thời gian)
  
  // 5. Unlock tiền bid cũ của người này (nếu họ đã bid trước)
  previousBid = findUserPreviousBid(user_id, product_id);
  if (previousBid) {
    walletService.unlockBalance(user_id, previousBid.amount);
  }
}
```

#### 3.3 Auto-Extend Logic

**Điều Kiện Kích Hoạt:**
- Bid được đặt trong **10 giây cuối** của thời gian đấu giá
- `extension_count < max_extensions` (max 3 lần)
- Tổng thời gian kéo dài `<= 600 giây` (10 phút giới hạn)

**Cách Hoạt Động:**
```javascript
const timeRemaining = product.end_time - now;

if (timeRemaining < 10 * 1000) {  // 10 giây
  if (extension_count < MAX_EXTENSIONS && 
      totalExtendedSeconds < 600) {  // 10 phút limit
    
    product.end_time += 10 * 60 * 1000;  // Kéo dài 10 phút
    product.extension_count++;
    
    Log: "Auction extended automatically"
  }
}
```

---

### PHASE 4: Hết Thời Gian & Xác Định Winner

**Kích Hoạt:** Tự động (scheduler) hoặc manual

#### 4.1 Cập Nhật Trạng Thái

```sql
-- Tự động cập nhật bởi scheduler (mỗi 30s):
UPDATE product
SET status = 'ended'
WHERE status = 'active'
AND end_time <= GETDATE();
```

#### 4.2 Xác Định Winner (Manual)

**Người tham gia:** Seller / Admin  
**Endpoint:** `POST /api/auctions/:productId/complete`

**Logic:**
```javascript
async function completeAuction(product_id) {
  // 1. Lấy bid cao nhất
  const winningBid = getHighestBid(product_id);
  
  if (!winningBid) {
    // Không có ai bid → sản phẩm không bán được
    product.status = 'ended';
    return;
  }
  
  // 2. Xác định Winner
  const winner = winningBid.user;
  
  // 3. Unlock tiền của tất cả người thua
  const allBids = getBidHistory(product_id);
  for (const bid of allBids) {
    if (bid.user_id !== winner.user_id) {
      walletService.unlockBalance(bid.user_id, bid.bid_amount);
    }
  }
  
  // 4. Xử Lý Thanh Toán cho Winner
  await processPayment(
    winner.user_id,      // Buyer
    product.seller_id,   // Seller
    winningBid.amount    // Payment amount
  );
  
  // 5. Cập nhật Product
  product.status = 'sold';
  product.winning_bid_id = winningBid.bid_id;
}
```

---

## LOGIC XỬ LÝ CHI TIẾT

### 1. Race Condition Prevention ⭐

**Problem:** Hai người bid cùng lúc → update price conflict

**Solution: Atomic Update**

```javascript
// ❌ WRONG (Race Condition):
const highestBid = getHighestBid(product_id);
const minBid = highestBid.amount + min_increment;

if (bid_amount >= minBid) {
  createBid(...);
  updateProduct(product_id, { current_price: bid_amount });
  // ⚠️ Between these 2 lines, someone else might bid!
}

// ✅ CORRECT (Atomic):
async function createBidWithAtomicUpdate({
  product_id,
  user_id,
  bid_amount,
  min_increment
}) {
  const result = await sql.query`
    BEGIN TRANSACTION
    
    -- Lock bảng product
    SELECT TOP 1 current_price FROM product 
    WHERE product_id = @product_id 
    WITH (TABLOCKX);
    
    -- Kiểm tra điều kiện
    DECLARE @current_highest = (SELECT MAX(bid_amount) 
                                FROM bid 
                                WHERE product_id = @product_id);
    DECLARE @min_required = ISNULL(@current_highest, @start_price) + @min_increment;
    
    IF @bid_amount < @min_required
      ROLLBACK;
    
    -- Tạo bid
    INSERT INTO bid (product_id, user_id, bid_amount) 
    VALUES (@product_id, @user_id, @bid_amount);
    
    -- Update giá product
    UPDATE product 
    SET current_price = @bid_amount 
    WHERE product_id = @product_id;
    
    COMMIT TRANSACTION
  `;
  
  return result;
}
```

### 2. Wallet & Balance Management

```javascript
┌─────────────────────────────────────┐
│         USER WALLET                 │
├─────────────────────────────────────┤
│ Total Money: 10,000,000 VND         │
│                                     │
│ ├─ Available (balance): 5,000,000   │ ← Dùng được
│ └─ Locked (trong bids): 5,000,000   │ ← Đang dùng
└─────────────────────────────────────┘
```

#### Kịch Bản 1: Người Dùng Bid Lần Đầu

```
Before:
- balance: 10,000,000
- locked: 0

User bids 1,000,000:
- Lock 1,000,000
- balance: 9,000,000
- locked: 1,000,000

After:
- Total: 10,000,000 ✓
```

#### Kịch Bản 2: Người Dùng Bid Lần 2 (Trên Cùng Sản Phẩm)

```
Before:
- balance: 9,000,000
- locked: 1,000,000 (bid #1)

User bids 1,500,000:
1. Unlock bid #1 (1,000,000)
   - balance: 10,000,000
   - locked: 0

2. Lock bid #2 (1,500,000)
   - balance: 8,500,000
   - locked: 1,500,000

After:
- Total: 10,000,000 ✓
```

#### Kịch Bản 3: Người Thua Cuộc (Unlock Tiền)

```
Before (Seller Lock):
- balance: 8,500,000
- locked: 1,500,000

After Seller Wins (Unlock):
- balance: 10,000,000
- locked: 0

After Seller Loses (Unlock):
- balance: 10,000,000
- locked: 0
```

### 3. Thanh Toán & Hoàn Tiền

```
PAYMENT FLOW:

Winner Bid khóa: 5,000,000 VND

1. Unblock tiền của Winner
   buyer.wallet.balance += 5,000,000

2. Trừ tiền từ Buyer (debit)
   buyer.wallet.balance -= 5,000,000

3. Cộng tiền cho Seller (credit)
   seller.wallet.balance += 5,000,000

4. Record lịch sử transaction
   INSERT INTO transaction_history

5. Hoàn tiền cho tất cả người thua
   FOR EACH loser_bid:
     loser.wallet.locked -= loser_bid.amount
     loser.wallet.balance += loser_bid.amount

6. Cập nhật Product Status = 'sold'
```

---

## XỬ LÝ RISK VÀ EDGE CASES

### Edge Case 1: Không Có Ai Bid

```
Product Status: ended (hết thời gian)

Manual Complete:
- Không có winning_bid
- Status → ended (không → sold)
- Seller có thể repost hoặc cancel
```

### Edge Case 2: Seller Tự Bid Sản Phẩm Của Mình

```
Validation:
IF seller_id == user_id:
  RETURN 403 Forbidden
  "Bạn không thể đấu giá sản phẩm của chính mình"
```

### Edge Case 3: Bid Vào Phút Chót (< 10 giây)

```
Bid Request: end_time - 8 giây

✓ Bid Accepted
✓ Auto-Extend: end_time += 10 phút
✓ extension_count++
? Nếu extension_count >= max_extensions
  → Không extend thêm
```

### Edge Case 4: Người Dùng Không Đủ Tiền

```
Wallet: 
- balance: 100,000
- locked: 0
- total_available: 100,000

Bid Amount: 500,000

Check:
IF total_available < bid_amount:
  RETURN 400
  "Số dư không đủ. Bạn cần 400,000 thêm"
```

### Edge Case 5: Race Condition Detected

```
bidResult = createBidWithAtomicUpdate(...);

IF bidResult.status === 'RACE_CONDITION_DETECTED':
  RETURN 409
  "Ai đó vừa đặt giá cao hơn. Vui lòng thử lại"
  {
    current_price: 2,000,000,
    min_required: 2,500,000
  }
```

### Edge Case 6: Network Delay / Bid Gửi Vào Phút Cuối

```
end_time: 14:30:00
NETWORK_BUFFER: 2 giây

Bid Sent: 14:29:59 (client local)
Received: 14:30:01 (server)  ← Đã quá end_time!

Check:
IF now > end_time + NETWORK_BUFFER:
  RETURN 400 "Đấu giá đã kết thúc"
ELSE IF now > end_time - NETWORK_BUFFER:
  RETURN 400 "Sắp hết thời gian, không thể bid"
```

---

## HỆ THỐNG VÍ TIỀN

### Cấu Trúc Ví

```javascript
wallet = {
  wallet_id: 1,
  user_id: 1,
  balance: 5000000,           // Tiền khả dụng
  locked_balance: 3000000,     // Tiền bị khóa trong bids
  total_available: 8000000,    // balance + locked_balance
  created_at: "2024-01-01"
}
```

### Các Thao Tác Trên Ví

#### 1. Nạp Tiền (Deposit)

```javascript
await walletService.deposit(user_id, amount);
// wallet.balance += amount
```

#### 2. Lock Tiền (khi bid)

```javascript
await walletService.lockBalance(user_id, bid_amount);
// wallet.balance -= bid_amount
// wallet.locked_balance += bid_amount
```

#### 3. Unlock Tiền (khi bid bị đánh bại)

```javascript
await walletService.unlockBalance(user_id, bid_amount);
// wallet.locked_balance -= bid_amount
// wallet.balance += bid_amount
```

#### 4. Debit/Credit (thanh toán)

```javascript
// Buyer thanh toán
await walletService.debit(buyer_id, winner_bid_amount);
// wallet.balance -= winner_bid_amount

// Seller nhận tiền
await walletService.credit(seller_id, winner_bid_amount);
// wallet.balance += winner_bid_amount
```

### Ví Dụ Toàn Bộ Flow

```
Initial:  balance=10M, locked=0

User A bids 2M:
  balance=8M, locked=2M ✓

User B bids 3M:
  balance=?, locked=? 
  (khác user A, nên không unlock)

User A bids 4M:
  - Unlock bid cũ của A (2M): balance=10M, locked=0
  - Lock bid mới (4M): balance=6M, locked=4M ✓

A Loses (B wins với 3M):
  - Unlock A: balance=10M, locked=0
  - B Pay: balance=0M, locked=0 (debit 3M)
  - Seller Receive: balance=3M
```

---

## TỰ ĐỘNG KÉO DÀI THỜI GIAN

### Auto-Extend Rules

```
Điều Kiện:
✓ Bid được đặt TRONG 10 giây cuối
✓ extension_count < 3 (max extensions)
✓ Tổng thời gian kéo dài <= 10 phút (600s)

Khi Kích Hoạt:
• end_time += 10 phút
• extension_count++
• Log: "Auction extended"
```

### Biểu Đồ Timeline

```
Original end_time: 14:30:00

─ 14:20:00 ─────────────────────
  Normal bids, no extension

─ 14:29:51 ─────────────────────
  10 giây cuối, User X bids
  ✓ Auto-Extend: end_time = 14:40:00 (+10 phút)
  extension_count = 1

─ 14:39:55 ─────────────────────
  Gần cuối lại, User Y bids
  ✓ Auto-Extend: end_time = 14:50:00
  extension_count = 2

─ 14:49:58 ─────────────────────
  User Z bids
  ✓ Auto-Extend: end_time = 15:00:00
  extension_count = 3

─ 14:59:59 ─────────────────────
  User W bids NHƯNG extension_count = 3
  ✗ NO EXTEND (đã đạt max)
  end_time vẫn = 15:00:00

─ 15:00:00 ─────────────────────
  Status = 'ended'
  No more bids allowed
```

---

## XỬ LÝ THANH TOÁN VÀ HOÀN TIỀN

### Complete Auction Flow

```
STEP 1: Kiểm Tra
├ Product status = 'ended'?
├ Có ai bid không?
└ Admin/Seller request xác nhận

STEP 2: Xác Định Winner
├ SELECT TOP 1 bid by bid_amount DESC
├ winner_id = highestBid.user_id
└ winning_amount = highestBid.bid_amount

STEP 3: Hoàn Tiền Người Thua
FOR EACH bid in getBidHistory(product_id):
  IF bid.user_id != winner_id:
    // Unlock tiền của người thua
    wallet[bid.user_id].locked -= bid.amount
    wallet[bid.user_id].balance += bid.amount
    INSERT INTO transaction_history

STEP 4: Xử Lý Thanh Toán Winner
├ Unlock tiền của winner
│ wallet[winner_id].locked -= winning_amount
├ Debit từ winner
│ wallet[winner_id].balance -= winning_amount
├ Credit cho seller
│ wallet[seller_id].balance += winning_amount
└ INSERT INTO transaction_history

STEP 5: Cập Nhật Product
├ status = 'sold'
├ winning_bid_id = bid_id
└ updated_at = NOW()

STEP 6: Notification
├ Email winner: "Đấu giá thành công"
├ Email seller: "Sản phẩm đã bán"
└ Email losers: "Bạn đã thua cuộc"
```

### SQL Atomic Payment

```sql
BEGIN TRANSACTION

-- Lock winner's wallet
SELECT * FROM wallet WHERE user_id = @winner_id WITH (TABLOCKX);

-- Hoàn tiền tất cả người thua
DECLARE @cursor CURSOR;
SET @cursor = CURSOR FOR
  SELECT DISTINCT user_id FROM bid 
  WHERE product_id = @product_id 
  AND user_id != @winner_id;

OPEN @cursor;
FETCH NEXT FROM @cursor INTO @loser_id;

WHILE @@FETCH_STATUS = 0
BEGIN
  DECLARE @loser_bid_amount = (
    SELECT TOP 1 bid_amount FROM bid 
    WHERE product_id = @product_id 
    AND user_id = @loser_id 
    ORDER BY bid_amount DESC
  );
  
  UPDATE wallet 
  SET locked_balance -= @loser_bid_amount,
      balance += @loser_bid_amount
  WHERE user_id = @loser_id;
  
  FETCH NEXT FROM @cursor INTO @loser_id;
END

CLOSE @cursor;
DEALLOCATE @cursor;

-- Xử lý thanh toán winner
UPDATE wallet SET balance -= @winning_amount WHERE user_id = @winner_id;
UPDATE wallet SET balance += @winning_amount WHERE user_id = @seller_id;
UPDATE product SET status = 'sold', winning_bid_id = @winning_bid_id WHERE product_id = @product_id;

COMMIT TRANSACTION
```

---

## SCHEDULER VÀ BACKGROUND JOBS

### Job 1: Cập Nhật Trạng Thái Sản Phẩm (Mỗi 30 giây)

```javascript
scheduler.scheduleJob('*/30 * * * * *', async () => {
  // Update pending/upcoming → active
  await sql.query`
    UPDATE product
    SET status = 'active'
    WHERE status IN ('pending', 'upcoming')
    AND start_time <= GETDATE()
    AND end_time > GETDATE()
  `;
  
  // Update active → ended
  await sql.query`
    UPDATE product
    SET status = 'ended'
    WHERE status = 'active'
    AND end_time <= GETDATE()
  `;
});
```

### Job 2: Gửi Notification (Mỗi phút)

```javascript
scheduler.scheduleJob('0 * * * * *', async () => {
  // Gửi reminder cho sản phẩm sắp kết thúc (< 5 phút)
  const endingSoon = await sql.query`
    SELECT * FROM product
    WHERE status = 'active'
    AND end_time BETWEEN GETDATE() AND DATEADD(minute, 5, GETDATE())
  `;
  
  for (const product of endingSoon) {
    // Gửi email/notification cho tất cả bidders
    const bidders = await getBidders(product.product_id);
    for (const bidder of bidders) {
      sendNotification(bidder.email, `"${product.title}" sắp kết thúc`);
    }
  }
});
```

---

## SUMMARY

### Các Điểm Quan Trọng

1. **Workflow Chính:**
   - Register → Deposit → Browse → Bid → Wait → Payment → History

2. **Safety Mechanisms:**
   - Atomic updates (race condition prevention)
   - Wallet locking (balanced accounting)
   - Time buffer (network delays)
   - Auto-extend (fair bidding)

3. **Key Tables:**
   - `product` - Sản phẩm
   - `bid` - Đấu giá
   - `wallet` - Ví tiền
   - `transaction_history` - Ghi chép

4. **Timeouts & Buffers:**
   - Network buffer: 2 giây
   - Auto-extend trigger: < 10 giây
   - Max extensions: 3 lần hoặc 600 giây tổng

5. **Edge Cases Handled:**
   - Race conditions
   - Insufficient wallet balance
   - Network delays
   - No bidders
   - Max extensions reached

---

## APPENDIX: API ENDPOINTS

### Bid Endpoints

```
POST   /api/bids/                   ← Place a bid
GET    /api/bids/history/:productId ← Get bid history
GET    /api/bids/my-bids            ← Get user's bids
GET    /api/bids/statistics/:productId
```

### Auction Endpoints

```
GET    /api/auctions/time/:productId     ← Remaining time
POST   /api/auctions/:productId/complete ← Complete auction
GET    /api/auctions/:productId/result   ← Get result
```

### Product Endpoints

```
GET    /api/products/                ← All active
GET    /api/products/upcoming         ← Upcoming
GET    /api/products/search           ← Search
GET    /api/products/category/:id     ← By category
GET    /api/products/detail/:id       ← Product detail
POST   /api/products/                 ← Create
PUT    /api/products/:id              ← Update
DELETE /api/products/:id              ← Delete
```

### Wallet Endpoints

```
GET    /api/wallet/:userId           ← Get wallet
POST   /api/wallet/deposit            ← Deposit money
GET    /api/wallet/transactions       ← Transaction history
```

---

**End of Document**
