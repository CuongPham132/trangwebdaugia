-- ========================
-- DATABASE
-- ========================
CREATE DATABASE dau_gia;
GO

USE dau_gia;
GO

-- ========================
-- TABLE: user
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
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255)
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
    start_time DATETIME,
    end_time DATETIME,
    status NVARCHAR(50),
    seller_id INT,
    category_id INT,
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (seller_id) REFERENCES [user](user_id),
    FOREIGN KEY (category_id) REFERENCES category(category_id)
);

-- ========================
-- TABLE: product_image
-- ========================
CREATE TABLE product_image (
    image_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT,
    image_url NVARCHAR(255),
    is_primary BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (product_id) REFERENCES product(product_id)
);

-- ========================
-- TABLE: bid
-- ========================
CREATE TABLE bid (
    bid_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT,
    user_id INT,
    bid_amount DECIMAL(18,2),
    bid_time DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (user_id) REFERENCES [user](user_id)
);