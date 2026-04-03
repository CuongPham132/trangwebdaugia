import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchUserProfile, updateUserProfile, getUserStats } from './thunks';

export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  role: 'user' | 'seller' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_products_created: number;
  products_active: number;
  total_bids_placed: number;
  total_auctions_won: number;
  total_auctions_lost: number;
  total_spent: number;
  join_date: string;
  seller_rating?: number;
}

interface UserState {
  profile: UserProfile | null;
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  updateError: string | null;
}

const initialState: UserState = {
  profile: null,
  stats: null,
  isLoading: false,
  error: null,
  isUpdating: false,
  updateError: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUpdateError: (state) => {
      state.updateError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch User Profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch profile';
      });

    // Get User Stats
    builder
      .addCase(getUserStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(getUserStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch stats';
      });

    // Update User Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.profile = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = (action.payload as string) || 'Failed to update profile';
      });
  },
});

export const { clearError, clearUpdateError } = userSlice.actions;
export default userSlice.reducer;
