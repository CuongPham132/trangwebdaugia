-- Drop existing database if exists (chạy từ master context)
USE master;
GO

IF EXISTS(SELECT * FROM sys.databases WHERE name = 'dau_gia')
BEGIN
    ALTER DATABASE dau_gia SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE dau_gia;
END
GO

-- Create new database 
CREATE DATABASE dau_gia; 
GO 
USE dau_gia; 
GO 

-- ======================== 
-- TABLE: [user] 
-- ======================== 
CREATE TABLE [user] ( 
    user_id INT IDENTITY(1,1) PRIMARY KEY, 
    username NVARCHAR(100) NOT NULL, 
    email NVARCHAR(100) UNIQUE NOT NULL, 
    [password] NVARCHAR(255) NOT NULL, 
    [role] NVARCHAR(50) DEFAULT 'user', 
    created_at DATETIME DEFAULT GETDATE(), 
    [status] NVARCHAR(50) DEFAULT 'active' 
); 

-- ======================== 
-- TABLE: category 
-- ======================== 
CREATE TABLE category ( 
    category_id INT IDENTITY(1,1) PRIMARY KEY, 
    name NVARCHAR(100) NOT NULL UNIQUE, 
    description NVARCHAR(255), 
    created_at DATETIME DEFAULT GETDATE() 
); 

-- ======================== 
-- TABLE: product 
-- ======================== 
CREATE TABLE product ( 
    product_id INT IDENTITY(1,1) PRIMARY KEY, 
    title NVARCHAR(255) NOT NULL, 
    description NVARCHAR(MAX), 
    start_price DECIMAL(18,2) NOT NULL, 
    current_price DECIMAL(18,2), 
    min_increment DECIMAL(18,2), 
    start_time DATETIME NOT NULL, 
    end_time DATETIME NOT NULL, 
    original_end_time DATETIME NOT NULL, 
    extension_count INT DEFAULT 0, 
    max_extensions INT DEFAULT 3, 
    status NVARCHAR(50) DEFAULT 'pending', 
    seller_id INT NOT NULL, 
    category_id INT NOT NULL, 
    winning_bid_id INT, 
    created_at DATETIME DEFAULT GETDATE(), 
    FOREIGN KEY (seller_id) REFERENCES [user](user_id), 
    FOREIGN KEY (category_id) REFERENCES category(category_id), 
    CHECK (start_price > 0), 
    CHECK (min_increment > 0), 
    CHECK (end_time > start_time), 
    CHECK (extension_count >= 0), 
    CHECK (extension_count <= max_extensions) 
); 

-- ======================== 
-- TABLE: product_image 
-- ======================== 
CREATE TABLE product_image ( 
    image_id INT IDENTITY(1,1) PRIMARY KEY, 
    product_id INT NOT NULL, 
    image_url NVARCHAR(255) NOT NULL, 
    is_primary BIT DEFAULT 0, 
    is_main BIT DEFAULT 0, 
    created_at DATETIME DEFAULT GETDATE(), 
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE 
); 

-- ======================== 
-- TABLE: bid 
-- ======================== 
CREATE TABLE bid ( 
    bid_id INT IDENTITY(1,1) PRIMARY KEY, 
    product_id INT NOT NULL, 
    user_id INT NOT NULL, 
    bid_amount DECIMAL(18,2) NOT NULL, 
    bid_time DATETIME DEFAULT GETDATE(), 
    is_winning BIT DEFAULT 0, 
    is_cancelled BIT DEFAULT 0, 
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE, 
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE, 
    CHECK (bid_amount > 0) 
); 

-- ======================== 
-- TABLE: wallet 
-- ======================== 
CREATE TABLE wallet ( 
    wallet_id INT IDENTITY(1,1) PRIMARY KEY, 
    user_id INT NOT NULL UNIQUE, 
    balance DECIMAL(18,2) DEFAULT 0, 
    locked_balance DECIMAL(18,2) DEFAULT 0, 
    total_spent DECIMAL(18,2) DEFAULT 0, 
    updated_at DATETIME DEFAULT GETDATE(), 
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE, 
    CHECK (balance >= 0), 
    CHECK (locked_balance >= 0), 
    CHECK (total_spent >= 0) 
); 

-- ======================== 
-- TABLE: transaction_history 
-- ======================== 
CREATE TABLE transaction_history ( 
    transaction_id INT IDENTITY(1,1) PRIMARY KEY, 
    wallet_id INT NOT NULL, 
    amount DECIMAL(18,2) NOT NULL, 
    transaction_type NVARCHAR(50) NOT NULL, 
    reference_id INT, 
    description NVARCHAR(255), 
    created_at DATETIME DEFAULT GETDATE(), 
    FOREIGN KEY (wallet_id) REFERENCES wallet(wallet_id) ON DELETE CASCADE, 
    CHECK (amount != 0) 
); 

-- ======================== 
-- TABLE: [order] (⭐ Đã nhét lại vào cho bạn đây)
-- ======================== 
CREATE TABLE [order] (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    bid_id INT NOT NULL,
    final_price DECIMAL(18,2) NOT NULL,
    order_status NVARCHAR(50) DEFAULT 'pending',
    payment_status NVARCHAR(50) DEFAULT 'unpaid',
    shipping_address NVARCHAR(MAX),
    shipping_phone NVARCHAR(20),
    shipping_name NVARCHAR(100),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    confirmed_at DATETIME,
    shipped_at DATETIME,
    delivered_at DATETIME,
    cancelled_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (buyer_id) REFERENCES [user](user_id),
    FOREIGN KEY (seller_id) REFERENCES [user](user_id),
    FOREIGN KEY (bid_id) REFERENCES bid(bid_id) ON DELETE NO ACTION,
    CHECK (final_price > 0)
);

-- ======================== 
-- INDEXES (Khôi phục toàn bộ index của bạn)
-- ======================== 
CREATE INDEX idx_product_status ON product(status);
CREATE INDEX idx_product_seller_id ON product(seller_id);
CREATE INDEX idx_product_category_id ON product(category_id);
CREATE INDEX idx_product_end_time ON product(end_time);
CREATE INDEX idx_product_winning_bid_id ON product(winning_bid_id);
CREATE INDEX idx_bid_product_id ON bid(product_id);
CREATE INDEX idx_bid_user_id ON bid(user_id);
CREATE INDEX idx_bid_time ON bid(bid_time);
CREATE INDEX idx_bid_is_winning ON bid(is_winning) WHERE is_winning = 1;
CREATE INDEX idx_product_image_product_id ON product_image(product_id);
CREATE INDEX idx_user_email ON [user](email);
CREATE INDEX idx_wallet_user_id ON wallet(user_id);
CREATE INDEX idx_wallet_updated_at ON wallet(updated_at);
CREATE INDEX idx_transaction_wallet_id ON transaction_history(wallet_id);
CREATE INDEX idx_transaction_type ON transaction_history(transaction_type);
CREATE INDEX idx_transaction_created_at ON transaction_history(created_at);
CREATE INDEX idx_transaction_reference_id ON transaction_history(reference_id);
CREATE INDEX idx_order_buyer_id ON [order](buyer_id);
CREATE INDEX idx_order_seller_id ON [order](seller_id);
CREATE INDEX idx_order_product_id ON [order](product_id);
CREATE INDEX idx_order_status_created ON [order](order_status, created_at);

-- ======================== 
-- Add circular foreign key 
-- ======================== 
ALTER TABLE product ADD CONSTRAINT fk_product_winning_bid_id FOREIGN KEY (winning_bid_id) REFERENCES bid(bid_id) ON DELETE NO ACTION; 
GO 

-- ======================== 
-- TRIGGERS (Full nội dung logic phức tạp)
-- ======================== 

-- 1) Auto create wallet
CREATE TRIGGER trg_user_auto_create_wallet ON [user] AFTER INSERT AS 
BEGIN 
    SET NOCOUNT ON; 
    INSERT INTO wallet (user_id, balance, locked_balance, total_spent, updated_at)
    SELECT i.user_id, 0, 0, 0, GETDATE() FROM inserted i
    LEFT JOIN wallet w ON w.user_id = i.user_id WHERE w.user_id IS NULL;
END; 
GO 

-- 2) Set initial price
CREATE TRIGGER trg_product_set_initial_price ON product AFTER INSERT AS 
BEGIN 
    SET NOCOUNT ON; 
    UPDATE p SET p.current_price = ISNULL(p.current_price, p.start_price) FROM product p INNER JOIN inserted i ON p.product_id = i.product_id; 
END; 
GO 

-- 3) Single main image logic
CREATE TRIGGER trg_product_image_single_main ON product_image AFTER INSERT, UPDATE AS 
BEGIN 
    SET NOCOUNT ON; 
    ;WITH touched_products AS (SELECT DISTINCT product_id FROM inserted),
    ranked_images AS (SELECT pi.image_id, pi.product_id, ROW_NUMBER() OVER (PARTITION BY pi.product_id ORDER BY CASE WHEN pi.is_main = 1 THEN 0 ELSE 1 END, pi.image_id) AS rn FROM product_image pi INNER JOIN touched_products tp ON tp.product_id = pi.product_id)
    UPDATE pi SET pi.is_main = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END, pi.is_primary = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END FROM product_image pi INNER JOIN ranked_images r ON r.image_id = pi.image_id;
END; 
GO

-- 4) Sync winner & Bid Validation (Bỏ qua is_cancelled = 1)
CREATE TRIGGER trg_bid_sync_winner ON bid AFTER INSERT, UPDATE, DELETE AS 
BEGIN 
    SET NOCOUNT ON; 
    -- Validate: Bid mới phải cao hơn giá hiện tại + min_increment (chỉ check INSERT/UPDATE)
    IF EXISTS (SELECT 1 FROM inserted i INNER JOIN product p ON p.product_id = i.product_id 
              WHERE i.is_cancelled = 0 AND i.bid_amount < (ISNULL(p.current_price, p.start_price) + ISNULL(p.min_increment, 0)))
    BEGIN 
        RAISERROR (N'Bid amount lỗi giá.', 16, 1); 
        ROLLBACK TRANSACTION; 
        RETURN; 
    END;
    
    -- Tìm tất cả product bị ảnh hưởng (INSERT/UPDATE/DELETE)
    ;WITH touched_products AS (SELECT DISTINCT product_id FROM inserted UNION SELECT DISTINCT product_id FROM deleted),
    -- Xếp hạng bids: Bỏ qua những bid bị cancel, cao nhất lên đầu
    ranked_bids AS (SELECT b.bid_id, b.product_id, b.bid_amount, 
                    ROW_NUMBER() OVER (PARTITION BY b.product_id ORDER BY b.bid_amount DESC, b.bid_time ASC, b.bid_id ASC) AS rn 
                    FROM bid b INNER JOIN touched_products tp ON tp.product_id = b.product_id
                    WHERE b.is_cancelled = 0)
    UPDATE b SET b.is_winning = CASE WHEN rb.rn = 1 THEN 1 ELSE 0 END FROM bid b INNER JOIN ranked_bids rb ON rb.bid_id = b.bid_id;
    
    -- Update current_price và winning_bid_id của product
    UPDATE p SET p.current_price = ISNULL(top_bid.bid_amount, p.start_price), p.winning_bid_id = top_bid.bid_id FROM product p 
    INNER JOIN (SELECT DISTINCT product_id FROM inserted UNION SELECT DISTINCT product_id FROM deleted) tp ON tp.product_id = p.product_id
    OUTER APPLY (SELECT TOP 1 b.bid_id, b.bid_amount FROM bid b WHERE b.product_id = p.product_id AND b.is_cancelled = 0
                 ORDER BY b.bid_amount DESC, b.bid_time ASC) AS top_bid;
END; 
GO

-- 5) Sync Wallet Stats
CREATE TRIGGER trg_transaction_sync_wallet_stats ON transaction_history AFTER INSERT AS 
BEGIN 
    SET NOCOUNT ON; 
    ;WITH delta AS (SELECT i.wallet_id, SUM(CASE WHEN i.transaction_type IN ('payment', 'withdraw') THEN ABS(i.amount) ELSE 0 END) AS spent_delta FROM inserted i GROUP BY i.wallet_id)
    UPDATE w SET w.total_spent = w.total_spent + d.spent_delta, w.updated_at = GETDATE() FROM wallet w INNER JOIN delta d ON d.wallet_id = w.wallet_id;
END; 
GO

-- ======================== 
-- STORED PROCEDURES
-- ======================== 

-- 1) Stored Procedure: Thanh toán đơn hàng
CREATE PROCEDURE sp_PayOrder
    @order_id INT,
    @error_message NVARCHAR(255) = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Lấy thông tin đơn hàng
        DECLARE @buyer_id INT, @final_price DECIMAL(18,2), @wallet_id INT, @current_balance DECIMAL(18,2);
        
        SELECT @buyer_id = buyer_id, @final_price = final_price 
        FROM [order] WHERE order_id = @order_id;
        
        IF @buyer_id IS NULL
        BEGIN
            SET @error_message = 'Order không tồn tại';
            RAISERROR (@error_message, 16, 1);
        END
        
        -- Lấy wallet_id và balance
        SELECT @wallet_id = wallet_id, @current_balance = balance 
        FROM wallet WHERE user_id = @buyer_id;
        
        -- Kiểm tra số dư ví
        IF @current_balance < @final_price
        BEGIN
            SET @error_message = 'Số dư ví không đủ';
            RAISERROR (@error_message, 16, 1);
        END
        
        -- Trừ tiền từ ví
        UPDATE wallet SET balance = balance - @final_price, updated_at = GETDATE() 
        WHERE wallet_id = @wallet_id;
        
        -- Ghi lịch sử giao dịch
        INSERT INTO transaction_history (wallet_id, amount, transaction_type, reference_id, description, created_at)
        VALUES (@wallet_id, -@final_price, 'payment', @order_id, 'Thanh toán đơn hàng #' + CAST(@order_id AS NVARCHAR(20)), GETDATE());
        
        -- Cập nhật trạng thái thanh toán
        UPDATE [order] SET payment_status = 'paid' WHERE order_id = @order_id;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @error_message = ERROR_MESSAGE();
        RAISERROR (@error_message, 16, 1);
    END CATCH
END
GO