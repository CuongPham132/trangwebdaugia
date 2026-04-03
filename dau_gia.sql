

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
    winning_bid_id INT, -- ⭐ Optimization: Quick access to winning bid (FK added later)
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
    is_winning BIT DEFAULT 0, -- ⭐ Optimization: Track winning bid

    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE,
    CHECK (bid_amount > 0)
);

-- ========================
-- TABLE: wallet (⭐ NEW - Quản lý tiền của user)
-- ========================
CREATE TABLE wallet (
    wallet_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    balance DECIMAL(18,2) DEFAULT 0, -- Tiền mặt có thể xài
    locked_balance DECIMAL(18,2) DEFAULT 0, -- Tiền đang bị kẹt trong các bid
    total_spent DECIMAL(18,2) DEFAULT 0, -- Tổng tiền đã chi (cho analytics)
    updated_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE,
    CHECK (balance >= 0),
    CHECK (locked_balance >= 0),
    CHECK (total_spent >= 0)
);

-- ========================
-- TABLE: transaction_history (⭐ NEW - Lịch sử giao dịch)
-- ========================
CREATE TABLE transaction_history (
    transaction_id INT IDENTITY(1,1) PRIMARY KEY,
    wallet_id INT NOT NULL,
    amount DECIMAL(18,2) NOT NULL, -- Số tiền biến động (+ hoặc -)
    transaction_type NVARCHAR(50) NOT NULL, -- 'deposit' (nạp), 'withdraw' (rút), 'bid_hold' (tạm giữ), 'bid_refund' (hoàn tiền), 'payment' (thanh toán)
    reference_id INT, -- product_id hoặc bid_id để link với giao dịch
    description NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (wallet_id) REFERENCES wallet(wallet_id) ON DELETE CASCADE,
    CHECK (amount != 0) -- Không được là 0
);

-- ========================
-- INDEXES for Performance
-- ========================
-- Product indexes
CREATE INDEX idx_product_status ON product(status);
CREATE INDEX idx_product_seller_id ON product(seller_id);
CREATE INDEX idx_product_category_id ON product(category_id);
CREATE INDEX idx_product_end_time ON product(end_time);
CREATE INDEX idx_product_winning_bid_id ON product(winning_bid_id); -- ⭐ NEW

-- Bid indexes
CREATE INDEX idx_bid_product_id ON bid(product_id);
CREATE INDEX idx_bid_user_id ON bid(user_id);
CREATE INDEX idx_bid_time ON bid(bid_time);
CREATE INDEX idx_bid_is_winning ON bid(is_winning) WHERE is_winning = 1; -- ⭐ NEW: Filtered index

-- Image indexes
CREATE INDEX idx_product_image_product_id ON product_image(product_id);

-- User indexes
CREATE INDEX idx_user_email ON [user](email);

-- ⭐ NEW: Wallet indexes
CREATE INDEX idx_wallet_user_id ON wallet(user_id);
CREATE INDEX idx_wallet_updated_at ON wallet(updated_at);

-- ⭐ NEW: Transaction history indexes
CREATE INDEX idx_transaction_wallet_id ON transaction_history(wallet_id);
CREATE INDEX idx_transaction_type ON transaction_history(transaction_type);
CREATE INDEX idx_transaction_created_at ON transaction_history(created_at);
CREATE INDEX idx_transaction_reference_id ON transaction_history(reference_id);

-- ========================
-- Add circular foreign key after both tables exist
-- ========================
-- Logic: When a bid is deleted, we handle the update in code (no automatic cascade)
-- This prevents circular dependency issues. Application code will update winning_bid_id manually.
ALTER TABLE product
ADD CONSTRAINT fk_product_winning_bid_id
FOREIGN KEY (winning_bid_id) REFERENCES bid(bid_id) ON DELETE NO ACTION;
GO