-- =========================================================================
-- FIX sp_PayOrder: Áp dụng logic Balance/Locked chuẩn production
-- =========================================================================
-- THAY ĐỔI CHỈ SỬA sp_PayOrder hiện tại:
-- 1. Kiểm tra locked_balance >= price (không phải balance)
-- 2. Trừ BOTH balance AND locked_balance khi thanh toán
-- 3. Thêm Isolation Level SERIALIZABLE để chống Race Condition
-- =========================================================================

USE dau_gia;
GO

-- Drop SP cũ
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_PayOrder]') AND type in (N'P', N'PC'))
BEGIN
    DROP PROCEDURE [dbo].[sp_PayOrder];
    PRINT '✅ Dropped old sp_PayOrder procedure';
END
GO

-- Tạo SP mới với logic chuẩn
CREATE PROCEDURE sp_PayOrder
    @order_id INT,
    @error_message NVARCHAR(255) = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @buyer_id INT, 
                @final_price DECIMAL(18,2), 
                @wallet_id INT, 
                @locked_balance DECIMAL(18,2);
        
        -- 1️⃣ Lấy thông tin đơn hàng
        SELECT @buyer_id = buyer_id, @final_price = final_price 
        FROM [order] 
        WHERE order_id = @order_id;
        
        IF @buyer_id IS NULL
        BEGIN
            SET @error_message = 'Order không tồn tại';
            RAISERROR (@error_message, 16, 1);
        END
        
        -- 2️⃣ Lấy wallet_id, locked_balance
        SELECT @wallet_id = wallet_id, 
               @locked_balance = locked_balance
        FROM wallet 
        WHERE user_id = @buyer_id;
        
        IF @wallet_id IS NULL
        BEGIN
            SET @error_message = 'Ví không tồn tại';
            RAISERROR (@error_message, 16, 1);
        END
        
        -- ✅ 3️⃣ KIỂM TRA: locked_balance >= price
        IF @locked_balance < @final_price
        BEGIN
            SET @error_message = 'Số dư ví bị khóa không đủ. Đã khóa: ' 
                                + CAST(@locked_balance AS NVARCHAR(20)) 
                                + '₫, cần: ' + CAST(@final_price AS NVARCHAR(20)) + '₫';
            RAISERROR (@error_message, 16, 1);
        END
        
        -- ✅ 4️⃣ THANH TOÁN: Trừ BOTH balance AND locked_balance
        UPDATE wallet 
        SET balance = balance - @final_price,                    -- ✅ Tiền thực sự mất đi
            locked_balance = locked_balance - @final_price,      -- ✅ Giải phóng tiền khóa
            updated_at = GETDATE()
        WHERE wallet_id = @wallet_id;
        
        -- 5️⃣ Ghi lịch sử giao dịch (Deduct)
        INSERT INTO transaction_history 
        (wallet_id, transaction_type, amount, reference_id, description, created_at)
        VALUES 
        (@wallet_id, 'deduct', @final_price, @order_id, 
         'Thanh toán đơn hàng #' + CAST(@order_id AS NVARCHAR(20)), GETDATE());
        
        -- 6️⃣ Cập nhật trạng thái thanh toán (CHỈ UPDATE payment_status)
        UPDATE [order] 
        SET payment_status = 'paid'
        WHERE order_id = @order_id;
        
        COMMIT TRANSACTION;
        PRINT '✅ sp_PayOrder executed successfully';
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SET @error_message = ERROR_MESSAGE();
        RAISERROR (@error_message, 16, 1);
    END CATCH
END
GO

-- =========================================================================
-- OPTIONAL: Thêm Trigger để tự động Unlock khi bid bị Overridden
-- =========================================================================
-- (Chỉ thêm nếu bạn muốn auto-unlock, không bắt buộc)
-- Bỏ qua STEP này nếu bạn chỉ muốn fix sp_PayOrder thôi

/*
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_UnlockPreviousBidWhenOverridden')
BEGIN
    DROP TRIGGER [tr_UnlockPreviousBidWhenOverridden];
    PRINT '✅ Dropped old trigger';
END
GO

CREATE TRIGGER tr_UnlockPreviousBidWhenOverridden
ON bid
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    DECLARE @product_id INT, @new_bid_user INT, @new_bid_amount DECIMAL(18,2);
    
    -- Lấy bid vừa insert
    SELECT TOP 1 
        @product_id = product_id, 
        @new_bid_user = user_id, 
        @new_bid_amount = bid_amount
    FROM inserted
    WHERE is_cancelled = 0;
    
    -- Lấy bid cao thứ 2 (bid cũ bị overridden)
    DECLARE @previous_bid_user INT, @previous_bid_amount DECIMAL(18,2);
    
    SELECT TOP 1 
        @previous_bid_user = user_id, 
        @previous_bid_amount = bid_amount
    FROM bid
    WHERE product_id = @product_id
        AND user_id != @new_bid_user
        AND is_cancelled = 0
    ORDER BY bid_amount DESC, bid_time DESC;
    
    -- Nếu có bid cũ, unlock tiền của nó
    IF @previous_bid_user IS NOT NULL AND @previous_bid_amount > 0
    BEGIN
        UPDATE wallet
        SET locked_balance = CASE 
              WHEN locked_balance >= @previous_bid_amount 
              THEN locked_balance - @previous_bid_amount
              ELSE 0
            END,
            updated_at = GETDATE()
        WHERE user_id = @previous_bid_user;
        
        -- Ghi log
        INSERT INTO transaction_history 
        (wallet_id, transaction_type, amount, description, created_at)
        SELECT wallet_id, 'unlock', @previous_bid_amount, 
               'Bid bị overridden - giải phóng tiền', GETDATE()
        FROM wallet WHERE user_id = @previous_bid_user;
        
        PRINT '✅ Unlocked ' + CAST(@previous_bid_amount AS NVARCHAR(20)) + '₫ for user ' + CAST(@previous_bid_user AS NVARCHAR(20));
    END
END
GO
*/

-- =========================================================================
-- VERIFY: Kiểm tra sp_PayOrder mới
-- =========================================================================
PRINT '';
PRINT '=== VERIFICATION ===';
PRINT '';

SELECT 
    ROUTINE_NAME,
    ROUTINE_TYPE
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME = 'sp_PayOrder'
  AND ROUTINE_TYPE = 'PROCEDURE';

PRINT '';
PRINT '✅ sp_PayOrder procedure updated successfully!';
PRINT '✅ Now:';
PRINT '   1. Checks locked_balance >= price (not balance)';
PRINT '   2. Deducts BOTH balance AND locked_balance';
PRINT '   3. Uses SERIALIZABLE isolation level for safety';
PRINT '';
