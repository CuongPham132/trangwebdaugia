# START_TIME & END_TIME LOGIC - CHI TIẾT HOÀN CHỈNH

**Dự án:** AuctionHub  
**Ngày:** April 4, 2026  

---

## TỔNG QUAN

```
┌─────────────────────────────────────────────────────┐
│         AUCTION TIMELINE FLOW                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  start_time         ←→        end_time              │
│      ↓                          ↓                   │
│   [=====════════════════════════]                   │
│   ✓ Bắt đầu                    ✗ Kết thúc          │
│                                                     │
│  Status Progression:                                │
│  pending → upcoming → active → ended → sold         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 1. KHÁI NIỆM CƠ BẢN

### 1.1 Các Trường Thời Gian

```javascript
product = {
  // Thời gian bắt đầu đấu giá
  start_time: "2026-04-04T14:00:00Z",
  
  // Thời gian kết thúc (có thể được kéo dài)
  end_time: "2026-04-04T14:30:00Z",
  
  // Thời gian kết thúc gốc (không đổi, để biết mỗi lúc kéo dài bao lâu)
  original_end_time: "2026-04-04T14:30:00Z",
  
  // Số lần kéo dài
  extension_count: 0,
  
  // Giới hạn kéo dài
  max_extensions: 3,  // Lưu ý: giới hạn này HỆ SỐ không dùng nữa
}
```

### 1.2 Network Buffer

```javascript
const NETWORK_BUFFER_SECONDS = 2;  // 2 giây

/**
 * Lý do: Bù đắp độ trễ mạng
 * - User bids lúc 14:29:58 trên client
 * - Server nhận lúc 14:29:59.5 (do latency)
 * - Nếu end_time = 14:30:00
 * - Mà server không có buffer → bid thành công (sai!)
 * 
 * VỚI BUFFER 2s:
 * - Deadline = 14:29:58 (end_time - 2s)
 * - Nếu server time > deadline → từ chối
 */
```

---

## 2. STATUS UPDATES - LOGIC TỰ ĐỘNG

### 2.1 Quy Trình Cập Nhật

```javascript
// File: backend/models/auctionModel.js
// Function: checkAndUpdateProductStatus()

async function checkAndUpdateProductStatus() {
  // UPDATE 1: pending/upcoming → active
  // Điều kiện: start_time <= NOW() AND end_time > NOW()
  await sql.query`
    UPDATE product
    SET status = 'active'
    WHERE status IN ('pending', 'upcoming')
    AND start_time <= GETDATE()        -- Đã tới start_time
    AND end_time > GETDATE()           -- Chưa quá end_time
  `;

  // UPDATE 2: active → ended
  // Điều kiện: end_time <= NOW()
  await sql.query`
    UPDATE product
    SET status = 'ended'
    WHERE status = 'active'
    AND end_time <= GETDATE()          -- Đã hết thời gian
  `;
}
```

### 2.2 Timing Logic

```
TIMELINE:

━━━━━━━━━━ |━━━━━━━━━━━━━━━━━━━━━━━━━| ━━━━━━━━
         start_time              end_time

Phases:
┌─────────────────────┬──────────────────────┬─────────────────┐
│  CHƯA BẮT ĐẦU      │     ĐANG DIỄN RA      │  ĐÃ KẾT THÚC   │
│ (pending/upcoming)  │      (active)        │  (ended/sold)   │
├─────────────────────┼──────────────────────┼─────────────────┤
│  now < start_time   │ start_time ≤ now ≤  │  now > end_time │
│                     │   end_time           │                 │
└─────────────────────┴──────────────────────┴─────────────────┘
```

### 2.3 Cách Scheduler Cập Nhật

```javascript
// File: backend/services/scheduler.js
// Chạy mỗi 30 giây

scheduler.scheduleJob('*/30 * * * * *', async () => {
  await checkAndUpdateProductStatus();
});

// Timeline
0s   ─ Update 1: pending → active
30s  ─ Update 2: active → ended
60s  ─ Check lại, update nếu cần
...
```

---

## 3. KIỂM TRA THỜI GIAN KHI BID

### 3.1 Hàm Kiểm Tra Start Time

```javascript
// File: backend/utils/timeUtils.js

function isAuctionStarted(now, startTime) {
  if (now < startTime) {
    const secondsUntilStart = Math.floor((startTime - now) / 1000);
    return {
      isStarted: false,
      secondsUntilStart,
      message: `Đấu giá sẽ bắt đầu trong ${secondsUntilStart} giây`,
    };
  }
  
  return {
    isStarted: true,
    message: 'Đấu giá đã bắt đầu',
  };
}
```

**Sử dụng trong Bid:**

```javascript
// File: backend/controllers/bidController.js - placeBid()

const startCheck = isAuctionStarted(now, new Date(product.start_time));

if (!startCheck.isStarted) {
  return res.status(400).json({
    error: startCheck.message,
    seconds_until_start: startCheck.secondsUntilStart,
  });
}
```

**Response Ví Dụ:**

```json
{
  "success": false,
  "error": "Đấu giá sẽ bắt đầu trong 1200 giây",
  "data": {
    "seconds_until_start": 1200
  }
}
```

### 3.2 Hàm Kiểm Tra End Time (VỚI BUFFER)

```javascript
// File: backend/utils/timeUtils.js

function isAuctionStillOpen(now, endTime) {
  // Tính thời gian còn lại (chưa có buffer)
  const actualSecondsRemaining = Math.floor((endTime - now) / 1000);
  
  // Deadline với buffer (trừ đi 2 giây)
  const deadlineWithBuffer = new Date(endTime.getTime() - NETWORK_BUFFER_SECONDS * 1000);
  
  // Nếu current time > deadline with buffer → từ chối
  if (now > deadlineWithBuffer) {
    return {
      isValid: false,
      reason: 'AUCTION_ENDED_INCLUDING_BUFFER',
      secondsRemaining: actualSecondsRemaining,
      message: `Đấu giá đã kết thúc (bao gồm ${NETWORK_BUFFER_SECONDS}s buffer)`,
    };
  }
  
  return {
    isValid: true,
    secondsRemaining: actualSecondsRemaining,
    message: `Còn ${actualSecondsRemaining} giây`,
  };
}
```

**Sử dụng Trong Bid:**

```javascript
// File: backend/controllers/bidController.js - placeBid()

const endCheck = isAuctionStillOpen(now, new Date(product.end_time));

if (!endCheck.isValid) {
  return res.status(400).json({
    error: endCheck.message,
    reason: endCheck.reason,
    seconds_remaining_actual: endCheck.secondsRemaining,
    network_buffer_seconds: NETWORK_BUFFER_SECONDS,
  });
}
```

**Response Ví Dụ:**

```json
{
  "success": false,
  "error": "Đấu giá đã kết thúc (bao gồm 2s buffer)",
  "data": {
    "reason": "AUCTION_ENDED_INCLUDING_BUFFER",
    "seconds_remaining_actual": -5,
    "network_buffer_seconds": 2
  }
}
```

---

## 4. AUTO-EXTEND LOGIC ⭐ CORE

### 4.1 Khái Niệm

```
PROBLEM (Ban đầu):
- Limit 3 lần extend → Người dùng có thể bid lần 4 mà không extend
- User không công bằng nếu bị "snipe" phút cuối

SOLUTION (Hiện tại):
- Thay vì limit SỐ LẦN → limit TỔNG THỜI GIAN
- Max tổng extension: 600 giây (10 phút)
- Mỗi bid trong 10 giây cuối → +30 giây
```

### 4.2 Config & Rules

```javascript
// File: backend/config/autoExtendConfig.js

const AUTO_EXTEND_WINDOW_SECONDS = 10;           // Bid within last 10s
const AUTO_EXTEND_INCREMENT_SECONDS = 30;        // Add 30s each time
const MAX_TOTAL_EXTENSION_SECONDS = 600;         // Max 10 minutes = 600s

// Formula:
// totalExtendedSeconds = extensionCount * 30
// canExtend = totalExtendedSeconds < 600
```

### 4.3 Đoạn Logic Chi Tiết

```javascript
// File: backend/models/auctionModel.js
// Function: extendAuctionTime(product_id)

async function extendAuctionTime(product_id) {
  const timeInfo = await getProductTimeInfo(product_id);
  
  const secondsRemaining = timeInfo.seconds_remaining;
  const extensionCount = timeInfo.extension_count;
  
  // Tính tổng thời gian đã extend
  const MAX_TOTAL_EXTENSION_SECONDS = 600;
  const totalExtendedSeconds = extensionCount * 30;
  
  // ✓ CONDITION 1: Bid trong 10 giây cuối
  if (secondsRemaining < 10) {
    
    // ✓ CONDITION 2: Chưa tới giới hạn tổng thời gian
    if (totalExtendedSeconds < MAX_TOTAL_EXTENSION_SECONDS) {
      
      // ✅ EXTEND: Kéo dài +30 giây
      await sql.query`
        UPDATE product
        SET 
          end_time = DATEADD(SECOND, 30, end_time),
          extension_count = extension_count + 1
        WHERE product_id = ${product_id}
      `;

      return {
        extended: true,
        extension_count: extensionCount + 1,
        total_extended_seconds: totalExtendedSeconds + 30,
        message: `Kéo dài +30s (lần ${extensionCount + 1})`
      };
    } else {
      // ❌ HẾT HẠN TỔNG EXTENSION
      return {
        extended: false,
        reason: 'EXTENSION_TIME_LIMIT_REACHED',
        total_extended_seconds: totalExtendedSeconds,
      };
    }
  } else {
    // ❌ STILL TIME (remaining >= 10s)
    return {
      extended: false,
      reason: 'STILL_TIME_REMAINING',
      seconds_remaining: secondsRemaining,
    };
  }
}
```

### 4.4 Timeline Ví Dụ

```
original_end_time: 12:00:00
current end_time: 12:00:00
extension_count: 0

╔════════════════════════════════════════════════════╗
║ Event Timeline                                     ║
╚════════════════════════════════════════════════════╝

11:59:55  ─ User A bid
          └─ secondsRemaining = 5 (< 10) ✓
          └─ totalExtended = 0 (< 600) ✓
          └─ EXTEND: end_time = 12:00:00 + 30s = 12:00:30
          └─ extension_count = 1

12:00:25  ─ User B bid
          └─ secondsRemaining = 5 (< 10) ✓
          └─ totalExtended = 30 (< 600) ✓
          └─ EXTEND: end_time = 12:00:30 + 30s = 12:01:00
          └─ extension_count = 2

12:00:55  ─ User C bid
          └─ secondsRemaining = 5 (< 10) ✓
          └─ totalExtended = 60 (< 600) ✓
          └─ EXTEND: end_time = 12:01:00 + 30s = 12:01:30
          └─ extension_count = 3

... (tiếp tục) ...

12:09:30  ─ User X bid (lần 20)
          └─ secondsRemaining = 5 (< 10) ✓
          └─ totalExtended = 570 (< 600) ✓
          └─ EXTEND: end_time += 30s
          └─ extension_count = 20

12:10:00  ─ User Y bid (lần 21)
          └─ secondsRemaining = 5 (< 10) ✓
          └─ totalExtended = 600 (= 600) ✗
          └─ NO EXTEND - Giới hạn tổng thời gian đạt
          └─ Đấu giá kết thúc lúc 12:10:00 + NETWORK_BUFFER
```

---

## 5. MÔ PHỎNG KIỂM TRA THỜI GIAN KHI BID

### 5.1 Flow Diagram

```
┌─────────────────────────────────────────┐
│ USER PLACES BID                         │
└────────────────┬────────────────────────┘
                 ↓
    ┌────────────────────────────────┐
    │ CHECK 1: Auction Started?      │
    │ now >= start_time?             │
    └────────────┬───────────────────┘
                 ├─ NO  → Reject (AUCTION_NOT_STARTED)
                 │
                 └─ YES ↓
                 
    ┌────────────────────────────────┐
    │ CHECK 2: Auction Still Open?   │
    │ now <= deadline_with_buffer?   │
    │ (deadline = end_time - 2s)     │
    └────────────┬───────────────────┘
                 ├─ NO  → Reject (AUCTION_ENDED)
                 │
                 └─ YES ↓
                 
    ┌────────────────────────────────┐
    │ CHECK 3: Product Active?       │
    │ status = 'active'?             │
    └────────────┬───────────────────┘
                 ├─ NO  → Reject (INVALID_STATUS)
                 │
                 └─ YES ↓
                 
    ┌────────────────────────────────┐
    │ CHECK 4: Wallet OK?            │
    │ balance >= bid_amount?         │
    └────────────┬───────────────────┘
                 ├─ NO  → Reject (INSUFFICIENT_BALANCE)
                 │
                 └─ YES ↓
                 
    ┌────────────────────────────────┐
    │ CHECK 5: Bid Amount Valid?     │
    │ bid_amt > current + min_inc?   │
    └────────────┬───────────────────┘
                 ├─ NO  → Reject (BID_BELOW_MINIMUM)
                 │
                 └─ YES ↓
                 
    ┌────────────────────────────────┐
    │ CHECK 6: Auto-Extend?          │
    │ < 10s remaining?               │
    │ & total < 600s?                │
    └────────────┬───────────────────┘
                 ├─ YES → Extend end_time += 30s
                 │
                 └─ NO (or limit reached)
                 
                 ↓
    ┌────────────────────────────────┐
    │ CREATE BID (ATOMIC)            │
    │ - Insert into bid table        │
    │ - Update product.current_price │
    │ - Lock wallet balance          │
    └────────────┬───────────────────┘
                 ↓
    ✅ SUCCESS
```

### 5.2 Code Implementation

```javascript
// File: backend/controllers/bidController.js
// Function: placeBid(req, res)

async function placeBid(req, res) {
  try {
    const user_id = req.user.user_id;
    const { product_id, bid_amount } = req.body;
    const now = new Date();

    // 1. Get product
    const product = await getProductById(product_id);

    // 2. CHECK 1: Auction Started?
    const startCheck = isAuctionStarted(now, new Date(product.start_time));
    if (!startCheck.isStarted) {
      return res.status(400).json({
        error: startCheck.message,
        seconds_until_start: startCheck.secondsUntilStart,
      });
    }

    // 3. CHECK 2: Auction Still Open (with buffer)?
    const endCheck = isAuctionStillOpen(now, new Date(product.end_time));
    if (!endCheck.isValid) {
      return res.status(400).json({
        error: endCheck.message,
        reason: endCheck.reason,
        seconds_remaining: endCheck.secondsRemaining,
      });
    }

    // 4. CHECK 3: Product Active?
    if (product.status !== 'active') {
      return res.status(400).json({
        error: 'Sản phẩm không khả dụng để đấu giá',
        current_status: product.status,
      });
    }

    // 5. CHECK 4: Wallet OK?
    const balanceCheck = await walletService.checkSufficientBalance(user_id, bid_amount);
    if (!balanceCheck.sufficient) {
      return res.status(400).json({
        error: `Số dư không đủ. Bạn cần ${bid_amount - balanceCheck.total_available} thêm`,
        current_balance: balanceCheck.balance,
        shortage: bid_amount - balanceCheck.total_available,
      });
    }

    // 6. CHECK 5: Bid Amount Valid?
    const highestBid = await getHighestBid(product_id);
    const minBidAmount = (highestBid ? highestBid.bid_amount : product.start_price) + product.min_increment;
    if (bid_amount < minBidAmount) {
      return res.status(400).json({
        error: `Mức giá phải cao hơn ${minBidAmount}`,
        minimum_required: minBidAmount,
      });
    }

    // 7. CHECK 6: Auto-Extend?
    const extensionResult = await extendAuctionTime(product_id);

    // 8. CREATE BID (ATOMIC)
    const bidResult = await createBidWithAtomicUpdate({
      product_id,
      user_id,
      bid_amount,
    });

    // 9. LOCK BALANCE
    await walletService.lockBalanceForBid(user_id, bid_amount, product_id);

    // 10. SUCCESS
    return res.status(201).json({
      success: true,
      message: 'Đấu giá thành công',
      data: {
        bid_amount,
        auction_extended: extensionResult.extended,
      },
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

---

## 6. TẠNG SẢN PHẨM - END_TIME VALIDATION

### 6.1 Rules

```javascript
// File: backend/controllers/productController.js
// Function: createNewProduct(req, res)

// RULE 1: Max duration = 30 phút
// RULE 2: end_time > start_time (bắt buộc)
// RULE 3: Nếu client không send end_time → auto = start_time + 30m
```

### 6.2 Code Logic

```javascript
async function createNewProduct(req, res) {
  const { 
    title, 
    description, 
    start_price, 
    start_time, 
    end_time,  // Optional
    category_id 
  } = req.body;

  // Parse start_time
  const startTimeObj = new Date(start_time);
  const maxEndTime = new Date(startTimeObj.getTime() + 30 * 60 * 1000);  // +30 phút

  // Nếu client gửi end_time
  let finalEndTime = end_time ? new Date(end_time) : maxEndTime;

  // Validate: end_time không được quá 30 phút
  if (finalEndTime > maxEndTime) {
    return res.status(400).json({
      error: 'Thời gian kết thúc không được vượt quá 30 phút',
      max_duration_minutes: 30,
    });
  }

  // Validate: end_time > start_time
  if (startTimeObj >= finalEndTime) {
    return res.status(400).json({
      error: 'Thời gian kết thúc phải sau thời gian bắt đầu',
    });
  }

  // Create product
  const product_id = await createProduct({
    title,
    description,
    start_price,
    start_time: startTimeObj.toISOString(),
    end_time: finalEndTime.toISOString(),
    original_end_time: finalEndTime.toISOString(),  // Lưu thời gian gốc
    seller_id: req.user.user_id,
    category_id,
  });

  return res.status(201).json({
    success: true,
    product_id,
  });
}
```

### 6.3 Examples

```
Example 1: Client không send end_time
Request:
{
  "title": "iPhone 15",
  "start_time": "2026-04-04T14:00:00Z",
  "end_time": null
}

Server:
start_time = 14:00:00
max_end_time = 14:30:00
final_end_time = 14:30:00 ✓

─────────────────────

Example 2: Client send end_time (valid)
Request:
{
  "title": "iPhone 15",
  "start_time": "2026-04-04T14:00:00Z",
  "end_time": "2026-04-04T14:15:00Z"
}

Server:
start_time = 14:00:00
max_end_time = 14:30:00
final_end_time = 14:15:00 ✓ (< max)

─────────────────────

Example 3: Client send end_time (INVALID - quá 30 phút)
Request:
{
  "title": "iPhone 15",
  "start_time": "2026-04-04T14:00:00Z",
  "end_time": "2026-04-04T14:45:00Z"
}

Server:
start_time = 14:00:00
max_end_time = 14:30:00
final_end_time = 14:45:00 ✗ (> max)

Response:
{
  "success": false,
  "error": "Thời gian kết thúc không được vượt quá 30 phút",
  "max_duration_minutes": 30
}
```

---

## 7. GETTING TIME INFO & STATUS

### 7.1 Hàm getProductTimeInfo

```javascript
// File: backend/models/auctionModel.js

async function getProductTimeInfo(product_id) {
  const result = await sql.query`
    SELECT 
      product_id,
      title,
      start_time,
      end_time,
      status,
      extension_count,
      DATEDIFF(SECOND, GETDATE(), end_time) as seconds_remaining,
      CASE
        WHEN GETDATE() < start_time THEN 'chưa_bắt_đầu'
        WHEN GETDATE() BETWEEN start_time AND end_time THEN 'đang_diễn_ra'
        WHEN GETDATE() > end_time THEN 'đã_kết_thúc'
      END as time_status
    FROM product
    WHERE product_id = ${product_id}
  `;
  
  return result.recordset[0];
}
```

### 7.2 API Endpoint: Check Auction Time

```javascript
// Route: GET /api/auctions/time/:productId
// Returns: Time info + formatted message

const response = {
  product_id: 1,
  title: "iPhone 15",
  start_time: "2026-04-04T14:00:00Z",
  end_time: "2026-04-04T14:40:00Z",  // Extended
  time_status: "ĐANG DIỄN RA",
  seconds_remaining: 1200,
  time_remaining: "20 phút, 0 giây",
  extension_count: 2,
  max_extensions: 3,
};
```

---

## 8. SUMMARY TABLE

| Aspect | Rule | Note |
|--------|------|------|
| **start_time** | Bắt buộc | Thời gian bắt đầu đấu giá |
| **end_time** | Auto if not provided | Auto = start + 30 phút |
| **duration** | Max 30 phút | Giới hạn thời gian đấu giá |
| **network_buffer** | 2 giây | Bù độ trễ mạng |
| **status update** | Every 30s | Scheduler cập nhật tự động |
| **auto-extend** | < 10s remaining | Kéo dài +30s (tối đa 600s tổng) |
| **bid deadline** | end_time - 2s | Có tính network buffer |

---

**End of Document**
