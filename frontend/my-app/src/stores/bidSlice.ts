import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { placeBid, getBidHistory, getMyBids, retractBid, getTopBid } from './thunks';

export interface Bid {
  bid_id: number;
  product_id: number;
  user_id: number;
  bid_price: number;
  bid_time: string;
  is_winning: boolean;
  username?: string;
}

interface BidState {
  bids: Bid[];
  myBids: Bid[];
  bidHistory: Bid[];
  topBid: Bid | null;
  isLoading: boolean;
  error: string | null;
  lastBidTime: string | null;
}

const initialState: BidState = {
  bids: [],
  myBids: [],
  bidHistory: [],
  topBid: null,
  isLoading: false,
  error: null,
  lastBidTime: null,
};

const bidSlice = createSlice({
  name: 'bids',
  initialState,
  reducers: {
    addBid: (state, action: PayloadAction<Bid>) => {
      state.bids.unshift(action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
    updateTopBid: (state, action: PayloadAction<Bid>) => {
      state.topBid = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Place Bid
    builder
      .addCase(placeBid.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(placeBid.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBids.push(action.payload);
        state.lastBidTime = new Date().toISOString();
      })
      .addCase(placeBid.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to place bid';
      });

    // Get Bid History
    builder
      .addCase(getBidHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getBidHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bidHistory = action.payload;
      })
      .addCase(getBidHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch bid history';
      });

    // Get My Bids
    builder
      .addCase(getMyBids.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMyBids.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBids = action.payload;
      })
      .addCase(getMyBids.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch your bids';
      });

    // Retract Bid
    builder
      .addCase(retractBid.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(retractBid.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBids = state.myBids.filter((bid) => bid.bid_id !== action.payload);
      })
      .addCase(retractBid.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to retract bid';
      });

    // Get Top Bid
    builder
      .addCase(getTopBid.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getTopBid.fulfilled, (state, action) => {
        state.isLoading = false;
        state.topBid = action.payload;
      })
      .addCase(getTopBid.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { addBid, clearError, updateTopBid } = bidSlice.actions;
export default bidSlice.reducer;
