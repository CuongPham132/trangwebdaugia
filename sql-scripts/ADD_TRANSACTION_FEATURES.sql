-- ============= ADD TRANSACTION FEATURES (NO DROP) =============
-- Script này chỉ ADD thêm transaction logging cho DB hiện tại
-- Không drop/xóa bất cứ cái gì - an toàn 100%

USE dau_gia;
GO

-- ============= 1. CREATE wallet_transaction_log TABLE =============
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[wallet_transaction_log]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[wallet_transaction_log] (
        [transaction_id] INT PRIMARY KEY IDENTITY(1,1),
        [wallet_id] INT NOT NULL,
        [transaction_type] NVARCHAR(50) NOT NULL,  -- 'lock', 'unlock', 'deduct', 'credit', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out'
        [amount] DECIMAL(18, 2) NOT NULL,
        [description] NVARCHAR(255),
        [status] NVARCHAR(20) DEFAULT 'completed',  -- 'completed', 'pending', 'failed'
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_wallet_transaction_wallet 
            FOREIGN KEY ([wallet_id]) 
            REFERENCES [wallet]([wallet_id]) ON DELETE CASCADE
    );
    
    PRINT '✅ Created wallet_transaction_log table';
END
ELSE
BEGIN
    PRINT '⚠️ wallet_transaction_log table already exists - skipping';
END
GO

-- ============= 2. CREATE INDEXES FOR PERFORMANCE =============
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wallet_transaction_wallet_id' AND object_id = OBJECT_ID('wallet_transaction_log'))
BEGIN
    CREATE INDEX [idx_wallet_transaction_wallet_id] 
    ON [wallet_transaction_log]([wallet_id], [created_at] DESC);
    
    PRINT '✅ Created index: idx_wallet_transaction_wallet_id';
END
ELSE
BEGIN
    PRINT '⚠️ Index idx_wallet_transaction_wallet_id already exists';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wallet_transaction_type' AND object_id = OBJECT_ID('wallet_transaction_log'))
BEGIN
    CREATE INDEX [idx_wallet_transaction_type] 
    ON [wallet_transaction_log]([transaction_type], [created_at] DESC);
    
    PRINT '✅ Created index: idx_wallet_transaction_type';
END
ELSE
BEGIN
    PRINT '⚠️ Index idx_wallet_transaction_type already exists';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wallet_transaction_created_at' AND object_id = OBJECT_ID('wallet_transaction_log'))
BEGIN
    CREATE INDEX [idx_wallet_transaction_created_at] 
    ON [wallet_transaction_log]([created_at] DESC);
    
    PRINT '✅ Created index: idx_wallet_transaction_created_at';
END
ELSE
BEGIN
    PRINT '⚠️ Index idx_wallet_transaction_created_at already exists';
END
GO

-- ============= 3. ADD MISSING COLUMNS TO wallet TABLE =============
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wallet' AND COLUMN_NAME = 'locked_balance')
BEGIN
    ALTER TABLE [wallet] ADD [locked_balance] DECIMAL(18, 2) DEFAULT 0;
    PRINT '✅ Added column: locked_balance to wallet';
END
ELSE
BEGIN
    PRINT '⚠️ Column locked_balance already exists in wallet';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wallet' AND COLUMN_NAME = 'total_spent')
BEGIN
    ALTER TABLE [wallet] ADD [total_spent] DECIMAL(18, 2) DEFAULT 0;
    PRINT '✅ Added column: total_spent to wallet';
END
ELSE
BEGIN
    PRINT '⚠️ Column total_spent already exists in wallet';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wallet' AND COLUMN_NAME = 'updated_at')
BEGIN
    ALTER TABLE [wallet] ADD [updated_at] DATETIME DEFAULT GETDATE();
    PRINT '✅ Added column: updated_at to wallet';
END
ELSE
BEGIN
    PRINT '⚠️ Column updated_at already exists in wallet';
END
GO

-- ============= 4. ADD CHECK CONSTRAINT FOR TRANSACTION_TYPE =============
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_transaction_type')
BEGIN
    ALTER TABLE [wallet_transaction_log]
    ADD CONSTRAINT [CK_transaction_type] 
    CHECK ([transaction_type] IN ('lock', 'unlock', 'deduct', 'credit', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out'));
    
    PRINT '✅ Added constraint: CK_transaction_type';
END
ELSE
BEGIN
    PRINT '⚠️ Constraint CK_transaction_type already exists';
END
GO

-- ============= 5. ADD CHECK CONSTRAINT FOR WALLET AMOUNTS =============
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_wallet_locked_balance')
BEGIN
    ALTER TABLE [wallet]
    ADD CONSTRAINT [CK_wallet_locked_balance] CHECK ([locked_balance] >= 0);
    
    PRINT '✅ Added constraint: CK_wallet_locked_balance';
END
ELSE
BEGIN
    PRINT '⚠️ Constraint CK_wallet_locked_balance already exists';
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_wallet_total_spent')
BEGIN
    ALTER TABLE [wallet]
    ADD CONSTRAINT [CK_wallet_total_spent] CHECK ([total_spent] >= 0);
    
    PRINT '✅ Added constraint: CK_wallet_total_spent';
END
ELSE
BEGIN
    PRINT '⚠️ Constraint CK_wallet_total_spent already exists';
END
GO

-- ============= VERIFICATION QUERIES =============
PRINT '';
PRINT '=== VERIFICATION RESULTS ===';
PRINT '';

-- Check if tables exist
SELECT 
    'wallet_transaction_log' as table_name,
    COUNT(*) as column_count
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'wallet_transaction_log'
GROUP BY TABLE_NAME

UNION ALL

SELECT 
    'wallet' as table_name,
    COUNT(*) as column_count
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'wallet'
GROUP BY TABLE_NAME;

PRINT '';
PRINT '-- wallet table structure:';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'wallet'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '-- wallet_transaction_log table structure:';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'wallet_transaction_log'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '-- All indexes on wallet_transaction_log:';
SELECT 
    i.name as index_name,
    c.name as column_name
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE OBJECT_NAME(i.object_id) = 'wallet_transaction_log'
ORDER BY i.name, ic.key_ordinal;

PRINT '';
PRINT '=== ✅ TRANSACTION FEATURES ADDED SUCCESSFULLY ===';
PRINT '';
