/**
 * TEST WALLET FUNCTIONS
 * Run: node test-wallet.js
 */

const walletModel = require('./models/walletModel');
const walletService = require('./services/walletService');
const { connectDB } = require('./config/db');

async function testWallet() {
    try {
        console.log('🟢 Starting wallet tests...\n');
        
        // Connect to DB
        await connectDB();
        console.log('✅ Connected to database\n');
        
        // Test 1: Get/Create Wallet
        console.log('📝 TEST 1: Get/Create Wallet for user_id = 1');
        const wallet = await walletModel.getOrCreateWallet(1);
        console.log('Wallet:', wallet);
        console.log('✅ Pass\n');
        
        // Test 2: Deposit
        console.log('📝 TEST 2: Deposit $50');
        const depositedWallet = await walletService.processDeposit(1, 50);
        console.log('After deposit - Balance:', depositedWallet.balance);
        console.log('✅ Pass\n');
        
        // Test 3: Check Transaction
        console.log('📝 TEST 3: Check Transaction History');
        const transactions = await walletModel.getTransactionHistory(wallet.wallet_id, 10);
        console.log('Transactions:', transactions);
        console.log('✅ Pass\n');
        
        // Test 4: Withdraw
        console.log('📝 TEST 4: Withdraw $20');
        const withdrawnWallet = await walletService.processWithdrawal(1, 20);
        console.log('After withdraw - Balance:', withdrawnWallet.balance);
        console.log('✅ Pass\n');
        
        console.log('🎉 All tests passed!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testWallet();
