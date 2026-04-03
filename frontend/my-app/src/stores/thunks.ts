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

      const response = await fetch(`${API_BASE_URL}/products/list-active?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch products');
      return {
        products: data.data || [],
        totalCount: data.totalCount || 0,
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
      if (params.query) searchParams.append('q', params.query);
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
      return {
        products: data.data || [],
        totalCount: data.totalCount || 0,
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
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
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
  product_name: string;
  description: string;
  category_id: number;
  starting_price: number;
  auction_duration: number;
}

export const createProduct = createAsyncThunk(
  'products/create',
  async (params: CreateProductParams, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/new-product`, {
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
  product_name?: string;
  description?: string;
  category_id?: number;
  starting_price?: number;
}

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ product_id, ...updateData }: UpdateProductParams, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/update/${product_id}`, {
        method: 'PATCH',
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
      const response = await fetch(`${API_BASE_URL}/products/delete/${product_id}`, {
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
    { product_id, bid_price }: { product_id: number; bid_price: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bids/place-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ product_id, bid_price }),
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
      const response = await fetch(`${API_BASE_URL}/bids/bid-history/${product_id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch bid history');
      return data.data || [];
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
      const response = await fetch(`${API_BASE_URL}/bids/retract-bid/${bid_id}`, {
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
      const response = await fetch(`${API_BASE_URL}/bids/top-bid/${product_id}`, {
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
      const response = await fetch(`${API_BASE_URL}/wallet/${user_id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch wallet');
      return data.data;
    } catch (error) {
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
  async ({ amount }: { amount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Deposit failed');
      return {
        amount: data.data.amount,
        transaction: data.data.transaction,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const withdrawMoney = createAsyncThunk(
  'wallet/withdraw',
  async ({ amount }: { amount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Withdrawal failed');
      return {
        amount: data.data.amount,
        transaction: data.data.transaction,
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const checkBalance = createAsyncThunk(
  'wallet/checkBalance',
  async ({ required_amount }: { required_amount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/check-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ required_amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Balance check failed');
      return {
        hasSufficientBalance: data.data.has_sufficient_balance,
        requiredAmount: data.data.required_amount,
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
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile-stats`, {
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
      const response = await fetch(`${API_BASE_URL}/users/update-profile`, {
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
