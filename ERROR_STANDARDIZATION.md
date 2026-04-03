# ⭐ Error Standardization - Format Chuẩn

## Tổng quan

Toàn bộ API endpoints đều theo format error response **chuẩn ngắn gọn**:

### ✅ Success Response
```json
{
  "success": true,
  "data": { /* dữ liệu */ },
  "message": "Thành công" // optional
}
```

### ❌ Error Response
```json
{
  "success": false,
  "error": "Lỗi gì đó",
  "code": "ERROR_CODE",
  "statusCode": 400 // HTTP status code
}
```

---

## Error Codes (Code nào -> HTTP Status Code nào)

### 🔴 Validation Errors (400)
```
INVALID_INPUT              → 400
INVALID_EMAIL              → 400
INVALID_PASSWORD           → 400
PASSWORD_TOO_SHORT         → 400
EMAIL_ALREADY_EXISTS       → 400
USERNAME_TAKEN             → 400
INVALID_ROLE               → 400
INSUFFICIENT_BALANCE       → 400
AUCTION_NOT_ACTIVE         → 400
AUCTION_ENDED              → 400
AUCTION_NOT_STARTED        → 400
RACE_CONDITION             → 400
SELLER_CANNOT_BID          → 400
WINNING_BID_CANNOT_DELETE  → 400
```

### 🟠 Authentication Errors (401/403)
```
UNAUTHORIZED               → 401
INVALID_TOKEN              → 401
FORBIDDEN                  → 403
PERMISSION_DENIED          → 403
```

### 🟡 Not Found Errors (404)
```
USER_NOT_FOUND             → 404
PRODUCT_NOT_FOUND          → 404
BID_NOT_FOUND              → 404
```

### 🔵 Server Errors (500)
```
INTERNAL_ERROR             → 500
DATABASE_ERROR             → 500
PAYMENT_FAILED             → 500
```

---

## Cách Dùng trong Controllers

### Tạo Success Response
```javascript
const { createSuccessResponse } = require('../utils/errorHandler');

// Không message
res.status(200).json(createSuccessResponse(userData));

// Có message
res.status(200).json(createSuccessResponse(userData, 'Lấy dữ liệu thành công'));
```

### Tạo Error Response
```javascript
const { createErrorResponse, ERROR_CODES } = require('../utils/errorHandler');

// Response sẽ tự include HTTP status code
return res.status(400).json(
  createErrorResponse('User ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
);
```

### Throw Error từ Service
```javascript
const { APIError, ERROR_CODES } = require('../middlewares/errorMiddleware');

throw new APIError('Ví không đủ tiền', ERROR_CODES.INSUFFICIENT_BALANCE, 400);
```

---

## Ví dụ Endpoints

### Frontend nhận Success
```javascript
GET /api/wallet/1
Response:
{
  "success": true,
  "data": {
    "wallet_id": 1,
    "user_id": 1,
    "balance": 100.00,
    "locked_balance": 50.00,
    "total_spent": 200.00
  }
}
```

### Frontend nhận Error
```javascript
POST /api/wallet/deposit
Body: { user_id: 1, amount: -5 }

Response:
{
  "success": false,
  "error": "Số tiền nạp phải lớn hơn 0",
  "code": "INVALID_INPUT",
  "statusCode": 400
}
```

---

## Frontend Integration

### Cách handle response
```typescript
const response = await fetch('/api/wallet/1');
const data = await response.json();

if (data.success) {
  // Success
  console.log(data.data);
} else {
  // Error - check code để xử lý khác nhau
  switch (data.code) {
    case 'INSUFFICIENT_BALANCE':
      alert('Số dư không đủ. Nạp tiền để tiếp tục?');
      break;
    case 'USER_NOT_FOUND':
      alert('User không tồn tại');
      break;
    default:
      alert(data.error);
  }
}
```

---

## Files Created/Updated

1. ✅ `backend/utils/errorHandler.js` - Error classes & helpers
2. ✅ `backend/middlewares/errorMiddleware.js` - Global error handler middleware
3. ✅ `backend/server.js` - Added error middleware to app
4. ✅ `backend/controllers/walletController.js` - Updated với format chuẩn (ví dụ)

---

## Bước Tiếp Theo

Để fully implement trên toàn bộ codebase, update các controllers còn lại:
- ✅ walletController.js (done)
- ⏳ bidController.js
- ⏳ auctionController.js
- ⏳ userController.js
- ⏳ productController.js
- ⏳ adminController.js

---

## Ghi chú

- Error middleware tự động set HTTP status code dựa trên error code
- Frontend có thể parse `data.code` để hiển thị message khác nhau
- Tất cả unhandled errors sẽ bị catch bởi global error middleware
- Trong development mode, stack trace sẽ được include trong response
