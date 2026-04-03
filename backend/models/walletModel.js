const { sql } = require('../config/db');
const logger = require('../services/logger');

/**
 * Get user's wallet information
 * @param {number} user_id - User ID
 * @returns {Promise<Object>} Wallet data
 */
async function getWallet(user_id) {
    try {
        const result = await sql.query`
            SELECT 
                wallet_id,
                user_id,
                balance,
                locked_balance,
                total_spent,
                updated_at
            FROM wallet
            WHERE user_id = ${user_id}
        `;
        
        return result.recordset[0] || null;
    } catch (error) {
        logger.error('Error fetching wallet', { user_id, error: error.message });
        throw error;
    }
}

/**
 * Get or create wallet for user
 * @param {number} user_id - User ID
 * @returns {Promise<Object>} Wallet data
 */
async function getOrCreateWallet(user_id) {
    try {
        // Try to get existing wallet
        let wallet = await getWallet(user_id);
        
        if (!wallet) {
            // Create new wallet
            await sql.query`
                INSERT INTO wallet (user_id, balance, locked_balance, total_spent)
                VALUES (${user_id}, 0, 0, 0)
            `;
            
            wallet = await getWallet(user_id);
        }
        
        return wallet;
    } catch (error) {
        logger.error('Error getting or creating wallet', { user_id, error: error.message });
        throw error;
    }
}

/**
 * Update wallet balance - Lock balance for bid
 * @param {number} wallet_id - Wallet ID
 * @param {number} amount - Amount to lock
 * @returns {Promise<Object>} Updated wallet
 */
async function lockBalance(wallet_id, amount) {
    try {
        await sql.query`
            UPDATE wallet
            SET locked_balance = locked_balance + ${amount},
                updated_at = GETDATE()
            WHERE wallet_id = ${wallet_id}
        `;
        
        const result = await sql.query`
            SELECT 
                wallet_id, user_id, balance, locked_balance, total_spent, updated_at
            FROM wallet
            WHERE wallet_id = ${wallet_id}
        `;
        
        return result.recordset[0];
    } catch (error) {
        logger.error('Error locking balance', { wallet_id, amount, error: error.message });
        throw error;
    }
}

/**
 * Unlock balance - Return locked amount to balance
 * @param {number} wallet_id - Wallet ID
 * @param {number} amount - Amount to unlock
 * @returns {Promise<Object>} Updated wallet
 */
async function unlockBalance(wallet_id, amount) {
    try {
        await sql.query`
            UPDATE wallet
            SET balance = balance + ${amount},
                locked_balance = CASE 
                    WHEN locked_balance >= ${amount} THEN locked_balance - ${amount} 
                    ELSE 0 
                END,
                updated_at = GETDATE()
            WHERE wallet_id = ${wallet_id}
        `;
        
        const result = await sql.query`
            SELECT 
                wallet_id, user_id, balance, locked_balance, total_spent, updated_at
            FROM wallet
            WHERE wallet_id = ${wallet_id}
        `;
        
        return result.recordset[0];
    } catch (error) {
        logger.error('Error unlocking balance', { wallet_id, amount, error: error.message });
        throw error;
    }
}

/**
 * Deduct from locked balance (converting to payment)
 * @param {number} wallet_id - Wallet ID
 * @param {number} amount - Amount to deduct
 * @returns {Promise<Object>} Updated wallet
 */
async function deductLockedBalance(wallet_id, amount) {
    try {
        await sql.query`
            UPDATE wallet
            SET locked_balance = CASE 
                    WHEN locked_balance >= ${amount} THEN locked_balance - ${amount} 
                    ELSE 0 
                END,
                total_spent = total_spent + ${amount},
                updated_at = GETDATE()
            WHERE wallet_id = ${wallet_id}
        `;
        
        const result = await sql.query`
            SELECT 
                wallet_id, user_id, balance, locked_balance, total_spent, updated_at
            FROM wallet
            WHERE wallet_id = ${wallet_id}
        `;
        
        return result.recordset[0];
    } catch (error) {
        logger.error('Error deducting locked balance', { wallet_id, amount, error: error.message });
        throw error;
    }
}

/**
 * Add balance (deposit or payment received)
 * @param {number} wallet_id - Wallet ID
 * @param {number} amount - Amount to add
 * @returns {Promise<Object>} Updated wallet
 */
async function addBalance(wallet_id, amount) {
    try {
        await sql.query`
            UPDATE wallet
            SET balance = balance + ${amount},
                updated_at = GETDATE()
            WHERE wallet_id = ${wallet_id}
        `;
        
        const result = await sql.query`
            SELECT 
                wallet_id, user_id, balance, locked_balance, total_spent, updated_at
            FROM wallet
            WHERE wallet_id = ${wallet_id}
        `;
        
        return result.recordset[0];
    } catch (error) {
        logger.error('Error adding balance', { wallet_id, amount, error: error.message });
        throw error;
    }
}

/**
 * Get transaction history for wallet
 * @param {number} wallet_id - Wallet ID
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<Array>} Transaction records
 */
async function getTransactionHistory(wallet_id, limit = 50) {
    try {
        const request = new sql.Request();
        request.input('wallet_id', sql.Int, wallet_id);
        request.input('limit', sql.Int, Math.min(limit, 500));
        
        const result = await request.query(`
            SELECT TOP (@limit)
                transaction_id,
                wallet_id,
                amount,
                transaction_type,
                reference_id,
                description,
                created_at
            FROM transaction_history
            WHERE wallet_id = @wallet_id
            ORDER BY created_at DESC
        `);
        
        return result.recordset;
    } catch (error) {
        logger.error('Error fetching transaction history', { wallet_id, error: error.message });
        throw error;
    }
}

/**
 * Create transaction record
 * @param {number} wallet_id - Wallet ID
 * @param {number} amount - Transaction amount
 * @param {string} type - Transaction type (deposit, withdraw, bid_hold, bid_refund, payment)
 * @param {number} reference_id - Reference product_id or bid_id
 * @param {string} description - Transaction description
 * @returns {Promise<boolean>} Success indicator
 */
async function createTransaction(wallet_id, amount, type, reference_id = null, description = '') {
    try {
        await sql.query`
            INSERT INTO transaction_history (wallet_id, amount, transaction_type, reference_id, description)
            VALUES (${wallet_id}, ${amount}, ${type}, ${reference_id}, ${description})
        `;
        
        logger.info('Transaction created', {
            wallet_id,
            amount,
            type
        });
        
        return true;
    } catch (error) {
        logger.error('Error creating transaction', { wallet_id, amount, type, error: error.message });
        throw error;
    }
}

module.exports = {
    getWallet,
    getOrCreateWallet,
    lockBalance,
    unlockBalance,
    deductLockedBalance,
    addBalance,
    getTransactionHistory,
    createTransaction
};
