/**
 * HƯỚNG DẪN THỰC HIỆN TRONG SSMS
 * ==============================
 * 
 * Step-by-step guide để execute SQL đúng cách
 */

// ============================================
// ⚠️ TRƯỚC KHI BẮT ĐẦU
// ============================================

/**
 * Bạn nói không có data quan trọng, nên có thể xoá DB.
 * Nếu có data cũ, BACKUP trước khi xoá!
 * 
 * Backup command (nếu cần):
 * ├─ Trong SSMS: Right-click dau_gia → Tasks → Backup
 * └─ Hoặc SQL: BACKUP DATABASE dau_gia TO DISK = 'C:\backup\dau_gia.bak';
 */

// ============================================
// BƯỚC 1: XOÁ DB CŨ (nếu tồn tại)
// ============================================

/**
 * 1. Mở SSMS
 * 
 * 2. Connect tới SQL Server
 * 
 * 3. Copy-paste vào Query Editor:
 */

-- ✅ RUN THIS:
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'dau_gia')
BEGIN
    ALTER DATABASE dau_gia SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE dau_gia;
END
GO

/**
 * 4. Nhấn Execute (F5 hoặc Ctrl+E)
 * 
 * Expected: "The database 'dau_gia' has been dropped."
 * 
 * Nếu lỗi: 
 * └─ Có thể đang có connection đang open
 * └─ Close tất cả Object Explorer tabs của dau_gia
 * └─ Try again
 */

// ============================================
// BƯỚC 2: EXECUTE FILE SQL MỚI
// ============================================

/**
 * 1. File dau_gia.sql đã update với:
 *    ├─ product.winning_bid_id (with ON DELETE SET NULL) ✅
 *    ├─ bid.is_winning ✅
 *    ├─ wallet table (NEW) ✅
 *    ├─ transaction_history table (NEW) ✅
 *    └─ All indexes ✅
 * 
 * 2. Trong SSMS:
 *    ├─ File → Open → File
 *    ├─ Select: d:\...\app\dau_gia.sql
 *    └─ Click Open
 * 
 * 3. Bây giờ bạn có toàn bộ SQL code trong editor
 * 
 * 4. Nhấn Execute (F5)
 *    └─ Chờ cho đến khi toàn bộ script chạy xong
 * 
 * Expected output:
 * ├─ "The database 'dau_gia' and all its objects have been created."
 * ├─ Hoặc messages từng table
 * └─ Messages at bottom: "No errors"
 */

// ============================================
// BƯỚC 3: VERIFY TRONG SSMS
// ============================================

/**
 * 1. Check xem DB có được tạo không:
 *    ├─ Refresh Object Explorer (F5)
 *    ├─ Expand Databases
 *    └─ Xem "dau_gia" có không
 * 
 * 2. Check 7 bảng:
 *    ├─ Expand dau_gia → Tables
 *    ├─ Xem:
 *    │  ├─ [user] ✅
 *    │  ├─ category ✅
 *    │  ├─ product ✅
 *    │  ├─ product_image ✅
 *    │  ├─ bid ✅
 *    │  ├─ wallet ✅ (NEW)
 *    │  └─ transaction_history ✅ (NEW)
 *    └─ Nếu thiếu → Re-run script
 * 
 * 3. Check columns của product:
 *    ├─ Right-click product → Design
 *    ├─ scroll down, tìm:
 *    │  ├─ winning_bid_id (should be here) ✅
 *    │  └─ Check type: INT, nullable
 *    └─ Close Design window
 * 
 * 4. Check columns của bid:
 *    ├─ Right-click bid → Design
 *    ├─ Tìm:
 *    │  ├─ is_winning (BIT DEFAULT 0) ✅
 *    │  └─ bid_amount (DECIMAL) ✅
 *    └─ Close Design window
 * 
 * 5. Check columns của wallet (NEW):
 *    ├─ Right-click wallet → Design
 *    ├─ Should see:
 *    │  ├─ wallet_id (PK)
 *    │  ├─ user_id (FK UNIQUE)
 *    │  ├─ balance
 *    │  ├─ locked_balance
 *    │  ├─ total_spent (nullable)
 *    │  └─ updated_at
 *    └─ Close Design window
 * 
 * 6. Check columns của transaction_history (NEW):
 *    ├─ Right-click transaction_history → Design
 *    ├─ Should see:
 *    │  ├─ transaction_id (PK)
 *    │  ├─ wallet_id (FK)
 *    │  ├─ amount
 *    │  ├─ transaction_type
 *    │  ├─ reference_id (nullable)
 *    │  ├─ description (nullable)
 *    │  └─ created_at
 *    └─ Close Design window
 */

// ============================================
// BƯỚC 4: CHECK FOREIGN KEYS & INDEXES
// ============================================

/**
 * 1. Check Foreign Keys:
 *    Copy vào Query editor:
 */

-- Check all foreign keys
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME = OBJECT_NAME(referenced_object_id)
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE CONSTRAINT_NAME LIKE 'FK%'
ORDER BY TABLE_NAME;

/**
 * 2. Nhấn Execute
 * 
 * Expected result:
 * ├─ product → user (seller_id)
 * ├─ product → category
 * ├─ product → bid (winning_bid_id) ✅ WITH ON DELETE SET NULL
 * ├─ product_image → product
 * ├─ bid → product
 * ├─ bid → user
 * ├─ wallet → user
 * └─ transaction_history → wallet
 * 
 * 3. Check Indexes:
 */

-- Check all indexes
SELECT 
    TABLE_NAME = OBJECT_NAME(i.object_id),
    INDEX_NAME = i.name,
    TYPE_DESC = i.type_desc
FROM sys.indexes i
WHERE DATABASE_ID = DB_ID()
ORDER BY OBJECT_NAME(i.object_id), i.name;

/**
 * 4. Nhấn Execute
 * 
 * Expected: Rất nhiều indexes, bao gồm:
 * ├─ idx_product_status
 * ├─ idx_product_winning_bid_id ✅ (NEW)
 * ├─ idx_bid_is_winning ✅ (NEW)
 * ├─ idx_wallet_user_id ✅ (NEW)
 * ├─ idx_transaction_* ✅ (NEW)
 * └─ ... others
 */

// ============================================
// BƯỚC 5: TEST INSERT DATA
// ============================================

/**
 * 1. Test insert user:
 */

INSERT INTO [user] (username, email, [password], [role])
VALUES ('testuser', 'test@email.com', 'hashed_password', 'user');

-- Check:
SELECT * FROM [user];

/**
 * 2. Test insert wallet (automatic):
 *    (Cần Backend code, lúc này empty)
 */

-- Check wallet (should be empty sau)
SELECT * FROM wallet;

/**
 * 3. Test insert category:
 */

INSERT INTO category (name, description)
VALUES ('Điện thoại', 'Danh mục điện thoại');

-- Check:
SELECT * FROM category;

/**
 * Nếu tất cả OK → ✅ DATABASE READY!
 */

// ============================================
// ⚠️ NẾU CÓ LỖI???
// ============================================

/**
 * Lỗi 1: "There is already an object named 'wallet' in the database"
 * ├─ Cause: Bảng đã tồn tại (script chạy 2 lần)
 * └─ Fix: Run DROP DATABASE script lại, then re-run SQL
 * 
 * Lỗi 2: "The INSERT INTO statement conflicted with a FOREIGN KEY constraint"
 * ├─ Cause: FK constraint issue
 * └─ Fix: Check xem referenced table tồn tại không
 * 
 * Lỗi 3: "Incorrect syntax near..."
 * ├─ Cause: Syntax error trong SQL
 * └─ Fix: Copy dau_gia.sql lại, chắc chắn không có lỗi
 * 
 * Lỗi 4: "Cannot drop the database 'dau_gia' because it is currently in use"
 * ├─ Cause: Có connection đang mở
 * └─ Fix: 
 *    ├─ Close Object Explorer tab của dau_gia
 *    ├─ Disconnect (File → Recent Connections → Disconnect)
 *    └─ Reconnect lại
 */

// ============================================
// ✅ CHECKLIST - TẤT CẢ LẦN LƯỢT
// ============================================

const Checklist = [
  "[ ] Backup DB cũ (nếu có data quan trọng)",
  "[ ] Run DROP DATABASE script",
  "[ ] Open dau_gia.sql file",
  "[ ] Execute SQL script hoàn toàn",
  "[ ] Verify 7 bảng tồn tại",
  "[ ] Check product.winning_bid_id column",
  "[ ] Check bid.is_winning column",
  "[ ] Check wallet table",
  "[ ] Check transaction_history table",
  "[ ] Check foreign keys (especially winning_bid_id ON DELETE SET NULL)",
  "[ ] Check indexes created",
  "[ ] Insert test data (user, category)",
  "[ ] Verify test data in tables",
  "[ ] ✅ DATABASE READY FOR BACKEND CODE!"
];

//export default Checklist;

// ============================================
// 🚀 TIẾP THEO
// ============================================

/**
 * Sau khi DB setup xong:
 * 
 * 1. Update backend code:
 *    ├─ bidModel.js: Add wallet check functions
 *    ├─ bidController.js: Update placeBid() to use wallet
 *    └─ Create walletService.js: Wallet operations
 * 
 * 2. Create API endpoints:
 *    ├─ /wallet/balance (get balance)
 *    ├─ /wallet/transactions (get history)
 *    └─ /wallet/deposit (nạp tiền)
 * 
 * 3. Test E2E:
 *    ├─ User deposit → wallet.balance tăng
 *    ├─ User bid → wallet.locked_balance tăng
 *    ├─ transaction_history ghi lại
 *    └─ Race condition test
 */

export const SSMSGuide = {
  steps: 7,
  estimatedTime: "10-15 minutes",
  difficulty: "Easy",
  requiresBackup: "Only if you have important data",
};

export default SSMSGuide;
