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
    [role] VARCHAR(20) DEFAULT 'user', -- Tối ưu: Dùng VARCHAR thay vì NVARCHAR cho ASCII enum
    created_at DATETIME2(3) DEFAULT SYSDATETIME(), -- Tối ưu: Dùng DATETIME2
    [status] VARCHAR(20) DEFAULT 'active'
);

-- ========================
-- TABLE: category
-- ========================
CREATE TABLE category (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255),
    created_at DATETIME2(3) DEFAULT SYSDATETIME()
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
    start_time DATETIME2(3) NOT NULL,
    end_time DATETIME2(3) NOT NULL,
    original_end_time DATETIME2(3) NOT NULL,
    extension_count INT DEFAULT 0,
    max_extensions INT DEFAULT 3,
    [status] VARCHAR(20) DEFAULT 'pending', -- VARCHAR thay vì NVARCHAR
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    winning_bid_id INT, 
    created_at DATETIME2(3) DEFAULT SYSDATETIME(),
    [row_version] ROWVERSION, -- ⭐ TỐI ƯU: Chống Race Condition khi đấu giá giây cuối

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
    is_primary BIT DEFAULT 0, -- Bỏ is_main vì trùng lặp ý nghĩa
    created_at DATETIME2(3) DEFAULT SYSDATETIME(),

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
    bid_time DATETIME2(3) DEFAULT SYSDATETIME(),
    is_winning BIT DEFAULT 0, 

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
    updated_at DATETIME2(3) DEFAULT SYSDATETIME(),
    [row_version] ROWVERSION, -- ⭐ TỐI ƯU: Chống Race Condition khi trừ tiền/nạp tiền cùng lúc
    
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
    transaction_type VARCHAR(50) NOT NULL, -- Dùng VARCHAR
    reference_id INT, 
    description NVARCHAR(255),
    created_at DATETIME2(3) DEFAULT SYSDATETIME(),
    
    FOREIGN KEY (wallet_id) REFERENCES wallet(wallet_id) ON DELETE CASCADE,
    CHECK (amount != 0) 
);

-- ========================
-- INDEXES for Performance
-- ========================
-- Product indexes
CREATE INDEX idx_product_status ON product(status);
CREATE INDEX idx_product_seller_id ON product(seller_id);
CREATE INDEX idx_product_category_id ON product(category_id);
CREATE INDEX idx_product_end_time ON product(end_time); 
CREATE INDEX idx_product_winning_bid_id ON product(winning_bid_id); 

-- ⭐ TỐI ƯU BẢNG BID: Composite Index để lấy danh sách bid nhanh nhất mà không cần sort lại
CREATE INDEX idx_bid_product_amount ON bid(product_id, bid_amount DESC);
CREATE INDEX idx_bid_user_id ON bid(user_id);
CREATE INDEX idx_bid_is_winning ON bid(is_winning) WHERE is_winning = 1;

-- Image indexes
CREATE INDEX idx_product_image_product_id ON product_image(product_id);

-- User indexes
CREATE UNIQUE INDEX idx_user_email ON [user](email); -- Nên dùng UNIQUE INDEX thay vì INDEX thường

-- Wallet indexes
CREATE INDEX idx_wallet_user_id ON wallet(user_id);

-- ⭐ TỐI ƯU BẢNG TRANSACTION: Query theo ví và sắp xếp theo thời gian
CREATE INDEX idx_transaction_wallet_time ON transaction_history(wallet_id, created_at DESC);
CREATE INDEX idx_transaction_reference_id ON transaction_history(reference_id);

-- ========================
-- Add circular foreign key after both tables exist
-- ========================
ALTER TABLE product
ADD CONSTRAINT fk_product_winning_bid_id
FOREIGN KEY (winning_bid_id) REFERENCES bid(bid_id) ON DELETE NO ACTION;
GO
