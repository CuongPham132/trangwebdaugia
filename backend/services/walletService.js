const walletModel = require('../models/walletModel');
const logger = require('../services/logger');

/**
 * Check if user has sufficient balance for bid
 * @param {number} user_id - User ID
 * @param {number} amount - Bid amount
 * @returns {Promise<Object>} { sufficient: boolean, balance: number, locked_balance: number }
 */
async function checkSufficientBalance(user_id, amount) {
    try {
        // Get or create wallet
        const wallet = await walletModel.getOrCreateWallet(user_id);
        
        if (!wallet) {
            throw new Error('Failed to get or create wallet');
        }
        
        const totalAvailable = wallet.balance + wallet.locked_balance;
        const isSufficient = totalAvailable >= amount;
        
        return {
            sufficient: isSufficient,
            balance: wallet.balance,
            locked_balance: wallet.locked_balance,
            total_available: totalAvailable,
            wallet_id: wallet.wallet_id
        };
    } catch (error) {
        logger.error('Error checking balance', { user_id, amount, error: error.message });
        throw error;
    }
}

/**
 * Lock balance when bid is placed
 * @param {number} user_id - User ID
 * @param {number} bid_amount - Bid amount
 * @param {number} product_id - Product ID
 * @returns {Promise<Object>} Updated wallet
 */
async function lockBalanceForBid(user_id, bid_amount, product_id) {
    try {
        // Get wallet
        const wallet = await walletModel.getOrCreateWallet(user_id);
        
        if (!wallet) {
            throw new Error('Failed to get wallet');
        }
        
        // Lock the balance
        const updatedWallet = await walletModel.lockBalance(wallet.wallet_id, bid_amount);
        
        // Create transaction record
        await walletModel.createTransaction(
            wallet.wallet_id,
            bid_amount,
            'bid_hold',
            product_id,
            `Bid placed on product #${product_id}`
        );
        
        logger.info('Balance locked for bid', {
            user_id,
            bid_amount,
            product_id
        });
        
        return updatedWallet;
    } catch (error) {
        logger.error('Error locking balance for bid', { user_id, bid_amount, error: error.message });
        throw error;
    }
}

/**
 * Unlock balance when bid is overtaken
 * @param {number} user_id - User ID
 * @param {number} bid_amount - Previously bid amount (to refund)
 * @param {number} product_id - Product ID
 * @returns {Promise<Object>} Updated wallet
 */
async function unlockBalanceFromBid(user_id, bid_amount, product_id) {
    try {
        const wallet = await walletModel.getOrCreateWallet(user_id);
        
        if (!wallet) {
            throw new Error('Failed to get wallet');
        }
        
        // Unlock the balance
        const updatedWallet = await walletModel.unlockBalance(wallet.wallet_id, bid_amount);
        
        // Create transaction record
await walletModel.createTransaction(
            wallet.wallet_id,
            -bid_amount,
            'bid_refund',
            product_id,
            `Bid refunded on product #${product_id} - outbid by higher bid`
        );
        
        logger.info('Balance unlocked from bid', {
            user_id,
            bid_amount,
            product_id
        });
        
        return updatedWallet;
    } catch (error) {
        logger.error('Error unlocking balance from bid', { user_id, bid_amount, error: error.message });
        throw error;
    }
}

/**
 * Complete payment when auction ends (winner pays)
 * @param {number} winner_id - Winner user ID
 * @param {number} seller_id - Seller user ID
 * @param {number} payment_amount - Final bid amount
 * @param {number} product_id - Product ID
 * @returns {Promise<Object>} { winner_wallet: Object, seller_wallet: Object }
 */
async function completeAuctionPayment(winner_id, seller_id, payment_amount, product_id) {
    try {
        const winnerWallet = await walletModel.getOrCreateWallet(winner_id);
        const sellerWallet = await walletModel.getOrCreateWallet(seller_id);
        
        if (!winnerWallet || !sellerWallet) {
            throw new Error('Failed to get wallets for payment');
        }
        
        // Deduct from winner's locked balance
        const updatedWinnerWallet = await walletModel.deductLockedBalance(
            winnerWallet.wallet_id,
            payment_amount
        );
        
        // Add payment to seller's balance
        const updatedSellerWallet = await walletModel.addBalance(
            sellerWallet.wallet_id,
            payment_amount
        );
        
        // Create transactions
        await walletModel.createTransaction(
            winnerWallet.wallet_id,
            -payment_amount,
            'payment',
            product_id,
            `Auction payment for product #${product_id}`
        );
        
        await walletModel.createTransaction(
            sellerWallet.wallet_id,
            payment_amount,
            'deposit',
            product_id,
            `Auction settlement - sold product #${product_id} to user #${winner_id}`
        );
        
        logger.info('Auction payment completed', {
            winner_id,
            seller_id,
            payment_amount,
            product_id
        });
        
        return {
            winner_wallet: updatedWinnerWallet,
            seller_wallet: updatedSellerWallet
        };
    } catch (error) {
        logger.error('Error completing auction payment', { 
            winner_id, 
            seller_id, 
            payment_amount, 
            error: error.message 
        });
        throw error;
    }
}

/**
 * Process deposit (add balance to wallet)
 * @param {number} user_id - User ID
 * @param {number} amount - Deposit amount
 * @returns {Promise<Object>} Updated wallet
 */
async function processDeposit(user_id, amount) {
    try {
        if (amount <= 0) {
throw new Error('Deposit amount must be greater than 0');
        }
        
        const wallet = await walletModel.getOrCreateWallet(user_id);
        
        if (!wallet) {
            throw new Error('Failed to get wallet');
        }
        
        const updatedWallet = await walletModel.addBalance(wallet.wallet_id, amount);
        
        await walletModel.createTransaction(
            wallet.wallet_id,
            amount,
            'deposit',
            null,
            `Deposit: ${amount}`
        );
        
        logger.info('Deposit processed', { user_id, amount });
        
        return updatedWallet;
    } catch (error) {
        logger.error('Error processing deposit', { user_id, amount, error: error.message });
        throw error;
    }
}

/**
 * Process withdrawal (deduct from balance)
 * @param {number} user_id - User ID
 * @param {number} amount - Withdrawal amount
 * @returns {Promise<Object>} Updated wallet
 */
async function processWithdrawal(user_id, amount) {
    try {
        if (amount <= 0) {
            throw new Error('Withdrawal amount must be greater than 0');
        }
        
        const wallet = await walletModel.getOrCreateWallet(user_id);
        
        if (!wallet) {
            throw new Error('Failed to get wallet');
        }
        
        if (wallet.balance < amount) {
            throw new Error('Insufficient balance for withdrawal');
        }
        
        // Deduct from balance (not locked balance)
        const updatedWallet = await walletModel.addBalance(
            wallet.wallet_id,
            -amount
        );
        
        await walletModel.createTransaction(
            wallet.wallet_id,
            -amount,
            'withdraw',
            null,
            `Withdrawal: ${amount}`
        );
        
        logger.info('Withdrawal processed', { user_id, amount });
        
        return updatedWallet;
    } catch (error) {
        logger.error('Error processing withdrawal', { user_id, amount, error: error.message });
        throw error;
    }
}

module.exports = {
    checkSufficientBalance,
    lockBalanceForBid,
    unlockBalanceFromBid,
    completeAuctionPayment,
    processDeposit,
    processWithdrawal
};
