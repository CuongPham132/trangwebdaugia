# 🔍 AUDIT WORKFLOW HIỂN THỊ HOMEPAGE & CHI TIẾT SẢN PHẨM

## ✅ PHẦN 1: WORKFLOW HOMEPAGE

### 1.1 Query Filter (Backend)
**File:** `backend/models/homeModel.js` → `getOptimizedHomeData()`

**Status:** ✅ ĐÚNG

**Query có đủ điều kiện:**
```sql
WHERE p.status = 'active'
  AND GETDATE() >= p.start_time 
  AND GETDATE() < p.end_time
ORDER BY p.end_time ASC
```

✅ Filter chính xác:
- `status = 'active'` ✓
- `start_time <= GETDATE()` ✓  
- `end_time > GETDATE()` ✓
- Sắp xếp `end_time ASC` ✓

---

## ✅ PHẦN 2: WORKFLOW CHI TIẾT SẢN PHẨM

### 2.1 Thông tin PHẢI HIỆN (Public Information)
**File:** `frontend/my-app/src/pages/ProductDetailPage.tsx`

**Status:** ✅ ĐẦY ĐỦ

| Thông Tin | Hiểu Thị | Ghi Chú |
|----------|---------|--------|
| Tiêu đề | ✅ CÓ | Từ `product.title` |
| Mô tả | ✅ CÓ | Từ `product.description` |
| Hình ảnh | ✅ CÓ | `product_image` table |
| Giá hiện tại | ✅ CÓ | `current_price` hoặc `start_price` |
| Thời gian đếm ngược | ✅ CÓ | `CountdownTimer` component |
| Lịch sử đấu giá | ✅ CÓ | `BidHistory` component |
| Thông tin Seller | ✅ CÓ | Seller name + rating |

### 2.2 Nút "Đặt giá" - Logic Ẩn/Hiện
**File:** `frontend/my-app/src/pages/ProductDetailPage.tsx` (line 560+)

**Status:** ✅ CÓ NHƯNG CẦN KIỂM TRA

**Current Logic:**
```javascript
disabled={product.status !== 'active' || isOwner}
```

**Issues:**
- ⚠️ Ngoài check `status` & `isOwner`, PHẢI check thêm **time conditions**
- ⚠️ Nếu backend status chưa cập nhật, FE vẫn cho phép bid khi đã hết giờ

**CẦN THÊM:**
```javascript
// Check thời gian real-time trên FE
const now = dayjs();
const endTime = dayjs(product.end_time);
const canBid = now.isBefore(endTime);

disabled={product.status !== 'active' || isOwner || !canBid}
```

### 2.3 Thông tin Người Thắng Cuộc
**Status:** ⚠️ CHƯA CÓ ❌

**Cần check:** Khi `status = 'sold'`, có hiển thị winning_bid_id hoặc user info không?

### 2.4 Nút "Thanh toán/Liên hệ"
**Status:** ❌ CHƯA CÓ

**Cần thêm:** Khi `status = 'sold'` AND `user_id = winning_bidder_id`, hiển thị nút action

---

## 🔴 PHẦN 3: TRẠNG THÁI SẢN PHẨM (State Machine)

### 3.1 Auto-Update Trạng Thái
**Status:** ⚠️ CÓ NHƯNG KHÔNG ĐẦY ĐỦ

**Hiện tại:**
- ✅ Backend có `determineWinner()` → cập nhật `status = 'sold'`
- ✅ Backend có auto-complete scheduler
- ❌ NHƯNG frontend KHÔNG tự động refetch product status

**Issues:**
- User vẫn thấy nút Bid sau khi hết giờ
- Phải reload page mới thấy sản phẩm biến mất khỏi homepage
- Countdown timer về 0 nhưng sản phẩm vẫn ở homepage

**CẦN FIX:**
1. Khi countdown kết thúc (seconds_remaining = 0) → tự động refetch product detail
2. Khi refetch thấy `status = 'sold'` → ẩn bid button

---

## 🔴 PHẦN 4: KIỂM TRA LỖI THƯỜNG GẶP

### 4.1 Lỗi Múi Giờ (Timezone)
**Status:** ⚠️ CẦN KIỂM TRA

**Backend:** `GETDATE()` trả về thời gian server (có thể UTC hoặc local)

**Check point:**
- [ ] Backend time zone là gì? (xem web.config hoặc env)
- [ ] DB lưu UTC hay Local time?
- [ ] Frontend dùng dayjs, convert về múi giờ nào?

**Risk:** Countdown có thể bị sai ±7 giờ nếu múi giờ khác!

### 4.2 Lỗi "Sản phẩm Ma" (Ghost Products)
**Status:** 🔴 CÓ LỖI ❌

**Tình huống:**
1. Countdown kết thúc (end_time = now)
2. Backend chưa auto-run `determineWinner()` 
3. Frontend vẫn hiển thị nút Bid
4. User click "Đặt Giá" → Backend reject vì `end_time < now`
5. User thấy lỗi: "Auction ended" & "Ghost product"

**Root cause:** Frontend countdown chạy local, backend status chưa cập nhật

**FIX:**
```javascript
// Lưu seconds_remaining từ API response
// Khi countdown = 0 → NGAY renew product data từ backend
.then(() => {
  if (secondsRemaining <= 0) {
    queryClient.invalidateQueries(['product-detail', product_id]);
  }
})
```

### 4.3 Lỗi Bid Price Validation
**Status:** ⚠️ CÓ NHƯNG FE KHÔNG GỢI Ý TỐT

**Backend:** ✅ Đã check `bid_amount >= current_price + min_increment`

**Frontend:**
- ✅ Check trong modal
- ⚠️ NHƯNG input số không có placeholder gợi ý minimum

**CẦN THÊM:**
```javascript
<InputNumber 
  placeholder={`Minimum: ${(current_price + min_increment).toLocaleString('vi-VN')}₫`}
  min={current_price + min_increment}
/>
```

---

## 📋 BỤC SIZE - KIỂM CHECKLIST

### Backend (Laravel/Node)

- [x] Queries filter status, start_time, end_time đúng
- [x] Sắp xếp `ORDER BY end_time ASC`
- [x] Auto-complete auctions khi hết giờ
- [x] `determineWinner()` logic
- [ ] **Cần thêm:** API `/api/product/{id}/refresh-status` để FE gọi khi countdown = 0

### Frontend (React)

- [x] Hiển thị info sản phẩm
- [x] Countdown timer
- [ ] **CẦN FIX:** Bid button logic thêm time check
- [ ] **CẦN THÊM:** Refetch product khi countdown = 0  
- [ ] **CẦN THÊM:** Hiển thị winning_bid_id khi sold
- [ ] **CẦN THÊM:** Nút "Thanh toán" cho winner
- [ ] **CẦN THÊM:** Input price validation + placeholder gợi ý

### Database

- [ ] Check timezone của server DB
- [ ] Verify `GETDATE()` trả về timezone nào

---

## 🔥 PRIORITY FIX

| Độ Ưu Tiên | Vấn Đề | Status |
|-----------|--------|--------|
| 🔴 CRITICAL | Bid button không check time → cho phép bid hết giờ | ❌ CHƯA FIX |
| 🔴 CRITICAL | Countdown = 0 nhưng sản phẩm vẫn ở homepage | ❌ CHƯA FIX |
| 🟡 HIGH | Ghost product khi backend chưa auto-complete | ❌ CHƯA FIX |
| 🟡 HIGH | Không hiển thị winner + nút thanh toán | ❌ CHƯA FIX |
| 🟢 MEDIUM | Input bid price không gợi ý minimum | ⚠️ CẦN IMPROVE |
| 🟢 MEDIUM | Timezone khả năng bị sai | ⚠️ CẦN VERIFY |

---

## 📌 NEXT ACTIONS

1. **FIX BID BUTTON:** Thêm time check
2. **FIX COUNTDOWN:** Auto refetch khi = 0
3. **THÊM WINNER UI:** Hiển thị thông tin người thắng
4. **VERIFY TIMEZONE:** Check server timezone setting

