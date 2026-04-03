/**
 * WALLET + TRANSACTION WORKFLOW
 * =============================
 * 
 * Giải thích chi tiết cách hoạt động của wallet system với đấu giá
 */

// ============================================
// 1. DATABASE STRUCTURE
// ============================================

/**
 * wallet:
 * ├─ wallet_id (PK)
 * ├─ user_id (FK → user) UNIQUE
 * ├─ balance: Tiền có thể sử dụng ngay
 * ├─ locked_balance: Tiền đang bị kẹt trong bids
 * ├─ total_spent: (Optional) Tổng chi tiêu
 * └─ updated_at: Thời gian cập nhật
 * 
 * transaction_history:
 * ├─ transaction_id (PK)
 * ├─ wallet_id (FK → wallet)
 * ├─ amount: +/- (positive hoặc negative)
 * ├─ transaction_type: 'deposit', 'withdraw', 'bid_hold', 'bid_refund', 'payment'
 * ├─ reference_id: Link đến product_id hoặc bid_id
 * ├─ description: Mô tả giao dịch
 * └─ created_at: Ngày giờ
 * 
 * product: 
 * ├─ winning_bid_id (FK → bid) -- ⭐ Optimization
 * 
 * bid:
 * ├─ bid_id
 * ├─ is_winning (BIT) -- ⭐ Optimization
 */

// ============================================
// 2. WORKFLOW: USER ĐẶT GIÁ
// ============================================

/**
 * Scenario: User A muốn bid 100.000đ cho sản phẩm X
 * 
 * BƯỚC 1: Kiểm tra tiền
 * ├─ Query: SELECT balance FROM wallet WHERE user_id = A
 * ├─ balance = 500.000đ ✅
 * └─ OK, tiếp tục
 * 
 * BƯỚC 2: Tạo bid
 * ├─ INSERT INTO bid (product_id, user_id, bid_amount, is_winning)
 * │   VALUES (X, A, 100.000, 1) -- is_winning = 1 (tạm thắng)
 * └─ bid_id = 101
 * 
 * BƯỚC 3: Cập nhật wallet
 * ├─ UPDATE wallet
 * │   SET balance = 500.000 - 100.000 = 400.000
 * │   SET locked_balance = 0 + 100.000 = 100.000
 * │   WHERE user_id = A
 * └─ OK
 * 
 * BƯỚC 4: Ghi giao dịch
 * ├─ INSERT INTO transaction_history
 * │   (wallet_id, amount, transaction_type, reference_id, description)
 * │   VALUES (wallet_A, -100.000, 'bid_hold', 101, 'Tạm giữ tiền cho bid sản phẩm X')
 * └─ transaction_id = 5001
 * 
 * BƯỚC 5: Cập nhật product winning_bid_id
 * ├─ UPDATE product
 * │   SET winning_bid_id = 101,
 * │       current_price = 100.000
 * │   WHERE product_id = X
 * └─ OK
 * 
 * KẾT LỤC:
 * User A:
 * ├─ balance: 500.000 → 400.000 ✅
 * ├─ locked_balance: 0 → 100.000 ✅
 * └─ (Có 400.000 để dùng, 100.000 bị kẹt)
 */

// ============================================
// 3. WORKFLOW: NGƯỜI KHÁC BID CAO HƠN
// ============================================

/**
 * Scenario: User B bid 150.000đ (cao hơn A)
 * 
 * BƯỚC 1-2: (Tương tự như User A)
 * ├─ Kiểm tra balance User B
 * └─ Tạo bid mới (bid_id = 102)
 * 
 * BƯỚC 3: Cập nhật wallet User B
 * ├─ UPDATE wallet
 * │   SET balance = 300.000 - 150.000 = 150.000
 * │   SET locked_balance = 0 + 150.000 = 150.000
 * │   WHERE user_id = B
 * └─ OK
 * 
 * BƯỚC 4: HOÀN TIỀN cho User A (người bid cũ)
 * ├─ UPDATE wallet
 * │   SET balance = 400.000 + 100.000 = 500.000
 * │   SET locked_balance = 100.000 - 100.000 = 0
 * │   WHERE user_id = A
 * └─ Trả lại tiền A
 * 
 * BƯỚC 5: Ghi transaction cho A
 * ├─ INSERT INTO transaction_history
 * │   (wallet_id, amount, transaction_type, reference_id, description)
 * │   VALUES (wallet_A, +100.000, 'bid_refund', 102, 'Hoàn tiền - Ai đó bid cao hơn')
 * └─ OK
 * 
 * BƯỚC 6: Ghi transaction cho B
 * ├─ INSERT INTO transaction_history
 * │   (wallet_id, amount, transaction_type, reference_id, description)
 * │   VALUES (wallet_B, -150.000, 'bid_hold', 102, 'Tạm giữ tiền cho bid cao hơn')
 * └─ OK
 * 
 * BƯỚC 7: Cập nhật bid status
 * ├─ UPDATE bid SET is_winning = 0 WHERE bid_id = 101 -- A không thắng nữa
 * ├─ UPDATE bid SET is_winning = 1 WHERE bid_id = 102 -- B là người thắng hiện tại
 * └─ OK
 * 
 * BƯỚC 8: Update product
 * ├─ UPDATE product
 * │   SET winning_bid_id = 102,
 * │       current_price = 150.000
 * │   WHERE product_id = X
 * └─ OK
 * 
 * KẾT LỤC:
 * User A: balance 500.000, locked_balance 0 ✅ (Tiền trả lại)
 * User B: balance 150.000, locked_balance 150.000 (Tiền bị kẹt)
 */

// ============================================
// 4. WORKFLOW: KẾT THÚC ĐẤU GIÁ - NGƯỜI THẮNG
// ============================================

/**
 * Scenario: Product X kết thúc, User B là người thắng (bid 150.000đ)
 * 
 * BƯỚC 1: Lấy thông tin winner
 * ├─ SELECT bid WHERE product_id = X AND is_winning = 1
 * │   Result: bid_id = 102, user_id = B, bid_amount = 150.000
 * └─ OK
 * 
 * BƯỚC 2: Xác định kết quả
 * ├─ UPDATE product
 * │   SET status = 'sold',
 * │       winning_bid_id = 102
 * │   WHERE product_id = X
 * └─ OK
 * 
 * BƯỚC 3: XỨ LÝ THANH TOÁN (Tuỳ chọn - có thể là)
 * 
 * Option A: Tiền vẫn bị giữ (chờ delivery)
 * ├─ Transaction: locked_balance vẫn 150.000
 * ├─ Notes: User phải thanh toán hay đánh bạc lúc latter
 * └─ Phù hợp: Đấu giá RV truyền thống
 * 
 * Option B: Tiền bị trừ hẳn (thanh toán luôn)
 * ├─ UPDATE wallet
 * │   SET locked_balance = 150.000 - 150.000 = 0,
 * │       total_spent = 150.000 + 150.000 = 300.000
 * │   WHERE user_id = B
 * ├─ INSERT transaction: 'payment'
 * └─ Phù hợp: Thanh toán tự động
 * 
 * BƯỚC 4: Ghi giao dịch cuối cùng
 * ├─ INSERT INTO transaction_history
 * │   (wallet_id, amount, transaction_type, reference_id, description)
 * │   VALUES (wallet_B, -150.000, 'payment', X, 'Đấu giá kết thúc - Sản phẩm X')
 * └─ OK
 */

// ============================================
// 5. WORKFLOW: KẾT THÚC ĐẤU GIÁ - NGƯỜI THUA
// ============================================

/**
 * User A từng bid nhưng thua:
 * ├─ Tiền đã được hoàn lại ở bước 3.4
 * ├─ balance: 500.000
 * ├─ locked_balance: 0
 * └─ Tất cả OK
 */

// ============================================
// 6. QUERY EXAMPLES
// ============================================

/**
 * Query 1: Lấy balance user
 * SELECT balance, locked_balance, (balance + locked_balance) as total_funds
 * FROM wallet
 * WHERE user_id = @user_id;
 * 
 * Query 2: Lịch sử giao dịch
 * SELECT * FROM transaction_history
 * WHERE wallet_id = @wallet_id
 * ORDER BY created_at DESC;
 * 
 * Query 3: Lấy winner nhanh (vì có winning_bid_id)
 * SELECT p.*, b.user_id as winner_id, b.bid_amount as final_price
 * FROM product p
 * LEFT JOIN bid b ON p.winning_bid_id = b.bid_id
 * WHERE p.product_id = @product_id;
 * 
 * Query 4: Xem bid nào đang thắng (vì có is_winning)
 * SELECT TOP 1 * FROM bid
 * WHERE product_id = @product_id AND is_winning = 1;
 */

// ============================================
// 7. OPTIMIZATION BENEFITS
// ============================================

/**
 * ⭐ winning_bid_id trong product:
 * ├─ Cũ: SELECT TOP 1 FROM bid WHERE product_id = X ORDER BY bid_amount DESC
 * │   → Phải scan toàn bộ bid table, tìm MAX
 * ├─ Mới: SELECT winning_bid_id FROM product WHERE product_id = X
 * │   → Direct lookup, O(1)
 * └─ Performance: 100x-1000x nhanh hơn
 * 
 * ⭐ is_winning trong bid:
 * ├─ Cũ: Phải tính lại mỗi lần
 * ├─ Mới: Đánh dấu sẵn = 1, nhanh tìm
 * └─ Index trên is_winning = 1 rất hiệu quả
 * 
 * ⭐ transaction_history:
 * ├─ Toàn bộ lịch sử giao dịch
 * ├─ Dễ audit & debug
 * └─ Tính toán số tiền nhanh
 */

// ============================================
// 8. EDGE CASES
// ============================================

/**
 * Case: User bid nhưng không đủ tiền
 * ├─ SELECT balance FROM wallet WHERE user_id = A
 * ├─ balance < bid_amount
 * └─ → Từ chối, thông báo "Không đủ tiền"
 * 
 * Case: Bid fail vì race condition
 * ├─ UI nhận thông báo race condition
 * ├─ Wallet vẫn giữ tiền (locked_balance vẫn cũ)
 * └─ Retry: Không cần hoàn lại, tiền vẫn ở đó
 * 
 * Case: Người dùng retract bid (nếu cho phép)
 * ├─ Xóa bid: DELETE FROM bid WHERE bid_id = X
 * ├─ Hoàn tiền: UPDATE wallet SET balance += locked_balance, locked_balance = 0
 * ├─ Ghi transaction: INSERT transaction_type = 'bid_retract'
 * └─ Update product: SET winning_bid_id = (SELECT TOP 1 bid từ bids còn lại)
 */

export const WalletWorkflow = {
  description: "Detailed workflow for wallet + transaction system with auction",
  optimizations: ["winning_bid_id", "is_winning", "transaction_history"],
  benchmarks: {
    oldQuery: "query toàn bảng bid (1000x chậm)",
    newQuery: "direct lookup (O(1))",
  },
};

export default WalletWorkflow;
