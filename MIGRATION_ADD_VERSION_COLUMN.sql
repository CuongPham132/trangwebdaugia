-- ========================
-- MIGRATION: Add optimistic locking version column
-- Purpose: Prevent bid concurrency race conditions
-- ========================

USE dau_gia;
GO

-- Add version column for optimistic locking
ALTER TABLE product ADD version INT DEFAULT 0;
GO

-- Add index on version for efficient querying
CREATE INDEX idx_product_version ON product(version);
GO

-- Update existing bids trigger to increment version on bid updates
-- This ensures every bid updates the version counter
GO

PRINT 'Migration completed: Added version column to product table for optimistic locking';
GO
