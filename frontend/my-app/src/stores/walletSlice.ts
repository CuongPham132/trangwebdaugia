import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchWallet,
  fetchTransactionHistory,
  depositMoney,
  withdrawMoney,
  checkBalance,
} from './thunks';

export interface Transaction {
  transaction_id: number;
  wallet_id: number;
  transaction_type: 'deposit' | 'withdraw' | 'bid' | 'bid_release' | 'settlement';
  amount: number;
  transaction_time: string;
  description: string;
  reference_id?: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface Wallet {
  wallet_id: number;
  user_id: number;
  balance: number;
  locked_balance: number;
  available_balance: number;
  total_deposit: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
}

interface WalletState {
  wallet: Wallet | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
  isCheckingBalance: boolean;
  balanceCheckResult: {
    hasSufficientBalance: boolean;
    requiredAmount: number;
  } | null;
}

const initialState: WalletState = {
  wallet: null,
  transactions: [],
  isLoading: false,
  error: null,
  lastUpdate: null,
  isCheckingBalance: false,
  balanceCheckResult: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateBalance: (state, action: PayloadAction<number>) => {
      if (state.wallet) {
        state.wallet.balance = action.payload;
        state.wallet.available_balance = action.payload - (state.wallet.locked_balance || 0);
        state.lastUpdate = new Date().toISOString();
      }
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch Wallet
    builder
      .addCase(fetchWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.wallet = action.payload;
        state.lastUpdate = new Date().toISOString();
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch wallet';
      });

    // Fetch Transaction History
    builder
      .addCase(fetchTransactionHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactionHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactionHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch transaction history';
      });

    // Deposit Money
    builder
      .addCase(depositMoney.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(depositMoney.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.wallet) {
          state.wallet.balance += action.payload.amount;
          state.wallet.available_balance = state.wallet.balance - (state.wallet.locked_balance || 0);
        }
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(depositMoney.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Deposit failed';
      });

    // Withdraw Money
    builder
      .addCase(withdrawMoney.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(withdrawMoney.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.wallet) {
          state.wallet.balance -= action.payload.amount;
          state.wallet.available_balance = state.wallet.balance - (state.wallet.locked_balance || 0);
        }
        state.transactions.unshift(action.payload.transaction);
      })
      .addCase(withdrawMoney.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Withdrawal failed';
      });

    // Check Balance
    builder
      .addCase(checkBalance.pending, (state) => {
        state.isCheckingBalance = true;
      })
      .addCase(checkBalance.fulfilled, (state, action) => {
        state.isCheckingBalance = false;
        state.balanceCheckResult = action.payload;
      })
      .addCase(checkBalance.rejected, (state) => {
        state.isCheckingBalance = false;
      });
  },
});

export const { clearError, updateBalance, addTransaction } = walletSlice.actions;
export default walletSlice.reducer;
