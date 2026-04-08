# 📊 KIỂM TRA WORKFLOW VÍ - HIỆN TRẠNG DỰ ÁN

## ✅ PHẦN 1: LUỒNG ADMIN CẤP TIỀN (Test Flow)

### Bước 1: Admin chọn User & nhập số tiền
**Status:** ✅ CÓ
- **File:** `backend/routes/walletRoutes.js`
- **Endpoint:** `POST /api/wallet/test/add-balance`
- **Require:** `{ user_id, amount }`

### Bước 2: Kiểm tra ví User có tồn tại chưa
**Status:** ✅ CÓ
- **File:** `backend/controllers/walletController.js` → `addBalanceForTesting()`
- **Code:** `const wallet = await walletModel.getOrCreateWallet(user_id);`
- **Logic:** Tự động tạo ví nếu chưa tồn tại

### Bước 3: Cộng tiền vào balance
**Status:** ✅ CÓ
- **File:** `backend/models/walletModel.js` → `addBalance()`
- **Query:**
```sql
UPDATE wallet
SET balance = balance + ${amount},
    updated_at = GETDATE()
WHERE wallet_id = ${wallet_id}
```

### Bước 4: Ghi transaction_history với loại 'deposit'
**Status:** ⚠️ CẦN CẬP NHẬT ❌
- **Issue:** `addBalanceForTesting()` CHỈ cộng balance, **KHÔNG ghi transaction log**
- **Cần thêm:**
```javascript
await walletModel.createTransaction(
  wallet.wallet_id,
  amount,
  'admin_deposit',  // loại là admin_deposit
  null,
  `Admin cấp tiền test: ${amount}đ`
);
```

---

## ✅ PHẦN 2: LUỒNG ĐẶT GIÁ (Bidding Flow)

### Bước 1: User đặt giá
**Status:** ✅ CÓ
- **File:** `backend/controllers/bidController.js` → `placeBid()`
- **Endpoint:** `POST /api/bid`

### Bước 2: Kiểm tra balance có đủ không
**Status:** ✅ CÓ
- **File:** `backend/services/walletService.js` → `checkSufficientBalance()`
- **Logic:** 
```javascript
const totalAvailable = wallet.balance + wallet.locked_balance;
const isSufficient = totalAvailable >= amount;
```

### Bước 3: Khóa tiền (Trừ balance + Cộng locked_balance)
**Status:** ✅ CÓ
- **File:** `backend/models/walletModel.js` → `lockBalance()`
- **Query:**
```sql
UPDATE wallet
SET locked_balance = locked_balance + ${amount},
    updated_at = GETDATE()
WHERE wallet_id = ${wallet_id}
```
- **Wait:** ⚠️ CẦN KIỂM TRA - Có trừ balance không? ❌
- **Issue:** Chỉ cộng `locked_balance`, không trừ `balance`!
- **Cần sửa:**
```sql
UPDATE wallet
SET balance = balance - ${amount},           -- ✅ THÊM DÀI
    locked_balance = locked_balance + ${amount},
    updated_at = GETDATE()
WHERE wallet_id = ${wallet_id}
```

### Bước 4: Hoàn tiền người bid cũ (Overbid)
**Status:** ✅ CÓ
- **File:** `backend/models/walletModel.js` → `unlockBalance()`
- **Logic:** Khi có bid cao hơn, refund người bid cũ
```sql
UPDATE wallet
SET balance = balance + ${amount},
    locked_balance = CASE 
        WHEN locked_balance >= ${amount} THEN locked_balance - ${amount}
        ELSE 0
    END,
    updated_at = GETDATE()
WHERE wallet_id = ${wallet_id}
```

### Bước 5: Ghi lịch sử (bid_hold / bid_refund)
**Status:** ✅ CÓ
- **File:** `backend/services/walletService.js` → `lockBalanceForBid()`
- **Transaction types:**
  - `bid_hold` - khi đặt giá mới
  - `bid_refund` - khi bị overbid

---

## ✅ PHẦN 3: LUỒNG KẾT THÚC & TRỪ TIỀN (Settlement Flow)

### Bước 1: Xác định Winner
**Status:** ✅ CÓ
- **File:** `backend/models/auctionModel.js` → `determineWinner()`
- **Logic:** Lấy bid cao nhất, xác định người thắng

### Bước 2: Trừ tiền thực tế từ locked_balance
**Status:** ✅ CÓ
- **File:** `backend/models/walletModel.js` → `deductLockedBalance()`
- **Query:**
```sql
UPDATE wallet
SET locked_balance = CASE 
        WHEN locked_balance >= ${amount} THEN locked_balance - ${amount}
        ELSE 0
    END,
    total_spent = total_spent + ${amount},
    updated_at = GETDATE()
WHERE wallet_id = ${wallet_id}
```

### Bước 3: Chuyển tiền cho Seller
**Status:** ✅ CÓ
- **File:** `backend/services/walletService.js` → `completeAuctionPayment()`
- **Logic:**
```javascript
// Winner: Rút từ locked_balance
await walletModel.deductLockedBalance(winnerWallet.wallet_id, payment_amount);

// Seller: Cộng vào balance
await walletModel.addBalance(sellerWallet.wallet_id, payment_amount);
```

### Bước 4: Cập nhật trạng thái sản phẩm = 'sold'
**Status:** ✅ CÓ
- **File:** `backend/models/auctionModel.js` → `determineWinner()`
```sql
UPDATE product
SET status = 'sold'
WHERE product_id = ${product_id}
```

### Bước 5: Ghi lịch sử transaction
**Status:** ✅ CÓ
- **File:** `backend/services/walletService.js` → `completeAuctionPayment()`
- **Transaction types:**
  - `payment` (trừ cho winner)
  - `payment` (cộng cho seller)

---

## 📋 BẢNG TÓM TẮT

| Bước | Mô Tả | Status | Ghi Chú |
|------|-------|--------|---------|
| **Admin cấp tiền** | | | |
| 1 | Admin chọn User & nhập tiền | ✅ CÓ | Endpoint `/api/wallet/test/add-balance` |
| 2 | Kiểm tra ví tồn tại | ✅ CÓ | `getOrCreateWallet()` |
| 3 | Cộng balance | ✅ CÓ | `addBalance()` |
| 4 | Ghi transaction | ❌ THIẾU | **CẦN THÊM `createTransaction('admin_deposit')`** |
| **Đặt giá** | | | |
| 1 | User đặt giá | ✅ CÓ | `placeBid()` endpoint |
| 2 | Kiểm tra balance | ✅ CÓ | `checkSufficientBalance()` |
| 3 | Khóa tiền | ⚠️ LỖI | **Chỉ cộng locked_balance, QUÊN TRỪ balance** |
| 4 | Hoàn tiền cũ | ✅ CÓ | `unlockBalance()` khi overbid |
| 5 | Ghi lịch sử | ✅ CÓ | `bid_hold`, `bid_refund` |
| **Kết thúc** | | | |
| 1 | Xác định winner | ✅ CÓ | `determineWinner()` |
| 2 | Trừ locked_balance | ✅ CÓ | `deductLockedBalance()` |
| 3 | Cộng tiền seller | ✅ CÓ | `addBalance()` |
| 4 | Cập nhật status=sold | ✅ CÓ | Trong `determineWinner()` |
| 5 | Ghi transaction | ✅ CÓ | `createTransaction('payment')` |

---

## 🔴 NHỮNG LỖI CẦN SỬA NGAY

### LỖI 1: Đặt giá không trừ `balance`
**Severity:** 🔴 CRITICAL
**File:** `backend/models/walletModel.js` → `lockBalance()`
**Current:**
```javascript
UPDATE wallet
SET locked_balance = locked_balance + ${amount}
WHERE wallet_id = ${wallet_id}
```
**Should be:**
```javascript
UPDATE wallet
SET balance = balance - ${amount},          // ← THÊM DÒNG NÀY
    locked_balance = locked_balance + ${amount}
WHERE wallet_id = ${wallet_id}
```

### LỖI 2: Admin cấp tiền không ghi transaction log
**Severity:** 🟡 MEDIUM
**File:** `backend/controllers/walletController.js` → `addBalanceForTesting()`
**Fix:** Thêm ghi transaction sau khi `addBalance()`

---

## 🟢 CÁC PHẦN ĐÃ LÀM TỐT

✅ Workflow đặt giá & overbid hoạt động tốt (ngoài bug trừ balance)
✅ Workflow thanh toán hoàn toàn hợp lý  
✅ Transaction history ghi chép đầy đủ
✅ Xác định winner & chuyển trạng thái OK

---

## 📌 PRIORITY FIX ORDER

1. **NGAY:** Sửa `lockBalance()` trừ `balance`
2. **NGAY:** Thêm transaction log cho `addBalanceForTesting()`
3. Test toàn bộ workflow end-to-end

