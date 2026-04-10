import { createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../constants';

const getAuthToken = () => localStorage.getItem('token');

// ============ AUTH THUNKS ============

export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    { email, username, password }: { email: string; username: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      return {
        token: data.data.token,
        user: data.data.user,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
  return null;
});

// ============ PRODUCT THUNKS ============

interface FetchProductsParams {
  page?: number;
  limit?: number;
  category_id?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
}

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (params: FetchProductsParams = {}, { rejectWithValue }) => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('page', String(params.page || 1));
      searchParams.append('limit', String(params.limit || 12));
      if (params.category_id) searchParams.append('category_id', String(params.category_id));
      if (params.minPrice) searchParams.append('minPrice', String(params.minPrice));
      if (params.maxPrice) searchParams.append('maxPrice', String(params.maxPrice));
      if (params.status) searchParams.append('status', params.status);

      const response = await fetch(`${API_BASE_URL}/products?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch products');
      const products = Array.isArray(data.data) ? data.data : [];
      return {
        products,
        totalCount: products.length,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

interface SearchProductsParams {
  query?: string;
  page?: number;
  limit?: number;
  category_id?: number;
  minPrice?: number;
  maxPrice?: number;
}

export const searchProducts = createAsyncThunk(
  'products/search',
  async (params: SearchProductsParams = {}, { rejectWithValue }) => {
    try {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.append('keyword', params.query);
      searchParams.append('page', String(params.page || 1));
      searchParams.append('limit', String(params.limit || 12));
      if (params.category_id) searchParams.append('category_id', String(params.category_id));
      if (params.minPrice) searchParams.append('minPrice', String(params.minPrice));
      if (params.maxPrice) searchParams.append('maxPrice', String(params.maxPrice));

      const response = await fetch(`${API_BASE_URL}/products/search?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Search failed');
      const products = Array.isArray(data.data) ? data.data : [];
      return {
        products,
        totalCount: products.length,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const getProductDetail = createAsyncThunk(
  'products/getDetail',
  async ({ productId }: { productId: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/detail/${productId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch product');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

interface CreateProductParams {
  title: string;
  description: string;
  category_id: number;
  start_price: number;
  min_increment?: number;
  start_time: string;
  end_time?: string;
}

export const createProduct = createAsyncThunk(
  'products/create',
  async (params: CreateProductParams, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create product');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

interface UpdateProductParams {
  product_id: number;
  title?: string;
  description?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
}

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ product_id, ...updateData }: UpdateProductParams, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${product_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update product');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async ({ product_id }: { product_id: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${product_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete product');
      return product_id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const getMyProducts = createAsyncThunk(
  'products/getMyProducts',
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/my-products`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch my products');
      return data.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// ============ BID THUNKS ============

export const placeBid = createAsyncThunk(
  'bids/place',
  async (
    { product_id, bid_amount, bid_price }: { product_id: number; bid_amount?: number; bid_price?: number },
    { rejectWithValue }
  ) => {
    try {
      const finalBidAmount = bid_amount ?? bid_price;
      const response = await fetch(`${API_BASE_URL}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ product_id, bid_amount: finalBidAmount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to place bid');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const getBidHistory = createAsyncThunk(
  'bids/history',
  async ({ product_id }: { product_id: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bids/history/${product_id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch bid history');
      return data?.data?.bid_history || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const getMyBids = createAsyncThunk(
  'bids/getMyBids',
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bids/my-bids`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch your bids');
      return data.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const retractBid = createAsyncThunk(
  'bids/retract',
  async ({ bid_id }: { bid_id: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bids/${bid_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to retract bid');
      return bid_id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const getTopBid = createAsyncThunk(
  'bids/getTop',
  async ({ product_id }: { product_id: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bids/top/${product_id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch top bid');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// ============ WALLET THUNKS ============

export const fetchWallet = createAsyncThunk(
  'wallet/fetch',
  async ({ user_id }: { user_id: number }, { rejectWithValue }) => {
    try {
      console.log('🐛 fetchWallet thunk called with user_id:', user_id);
      
      // Guard: prevent invalid user_id
      if (!user_id || !Number.isFinite(user_id) || user_id <= 0) {
        console.warn('⚠️ fetchWallet: Invalid user_id, rejecting:', user_id);
        return rejectWithValue('Invalid user ID');
      }
      
      const token = getAuthToken();
      console.log('🐛 Auth token:', token ? 'exists' : 'missing');
      
      const response = await fetch(`${API_BASE_URL}/wallet/${user_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('🐛 fetchWallet response status:', response.status, response.statusText);
      
      // Handle 304 Not Modified - try to get from cache or retry
      if (response.status === 304) {
        console.warn('⚠️ Got 304 Not Modified, retrying without cache...');
        const retryResponse = await fetch(`${API_BASE_URL}/wallet/${user_id}?t=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        });
        const data = await retryResponse.json();
        if (!retryResponse.ok) throw new Error(data.message || 'Failed to fetch wallet');
        console.log('✅ fetchWallet retry data:', data.data);
        return data.data;
      }
      
      const data = await response.json();
      
      console.log('🐛 fetchWallet response:', { ok: response.ok, status: response.status, data });
      
      if (!response.ok) throw new Error(data.message || 'Failed to fetch wallet');
      
      console.log('🐛 fetchWallet returning data:', data.data);
      return data.data;
    } catch (error) {
      console.error('❌ fetchWallet error:', error);
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchTransactionHistory = createAsyncThunk(
  'wallet/transactions',
  async ({ user_id, limit = 50 }: { user_id: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/wallet/${user_id}/transactions?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch transactions');
      return data.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const depositMoney = createAsyncThunk(
  'wallet/deposit',
  async ({ user_id, amount }: { user_id: number; amount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ user_id, amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Deposit failed');
      return {
        wallet: data.data,
        amount,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const withdrawMoney = createAsyncThunk(
  'wallet/withdraw',
  async ({ user_id, amount }: { user_id: number; amount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ user_id, amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Withdrawal failed');
      return {
        wallet: data.data,
        amount,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const checkBalance = createAsyncThunk(
  'wallet/checkBalance',
  async ({ user_id, amount }: { user_id: number; amount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/check-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ user_id, amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Balance check failed');
      return {
        hasSufficientBalance: Boolean(data.data?.sufficient ?? data.data?.has_sufficient_balance),
        requiredAmount: Number(data.data?.required_amount ?? amount),
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// ============ USER THUNKS ============

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch profile');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const getUserStats = createAsyncThunk(
  'user/getStats',
  async ({ user_id }: { user_id: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user_id}/stats`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch stats');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

interface UpdateUserProfileParams {
  username?: string;
  new_password?: string;
  current_password?: string;
}

export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (params: UpdateUserProfileParams, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update profile');
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);
