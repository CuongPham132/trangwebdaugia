import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../constants';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

// ============================================
// ⭐ SERVER TIME SYNCHRONIZATION
// ============================================
let serverTimeOffset = 0; // Milliseconds

/**
 * Lấy thời gian hiện tại đã đồng bộ với server
 * Client time + offset = Server time
 */
export function getServerTime(): Date {
  return new Date(new Date().getTime() + serverTimeOffset);
}

/**
 * Lấy offset (ms) giữa server và client
 */
export function getServerTimeOffset(): number {
  return serverTimeOffset;
}

// ============================================
// API CONFIGURATION
// ============================================
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto add JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ⭐ Đồng bộ server time từ response headers
api.interceptors.response.use(
  (response) => {
    // Lấy thời gian server từ response header
    const serverDateHeader = response.headers['date'];
    if (serverDateHeader) {
      const serverTime = new Date(serverDateHeader).getTime();
      const clientTime = new Date().getTime();
      serverTimeOffset = serverTime - clientTime;
      
      // Debug log (optional)
      if (Math.abs(serverTimeOffset) > 1000) {
        console.warn(`⚠️ Server time offset: ${serverTimeOffset}ms`);
      }
    }
    return response;
  },
  (error) => Promise.reject(error)
);

// ============================================
// 1. USER ROUTES (/api/users/)
// ============================================
export const userAPI = {
  register: (data: {
    username: string;
    email: string;
    password: string;
  }) => api.post('/users/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/users/login', data),

  getProfile: () => api.get('/users/profile'),

  getStats: (userId: string | number) => api.get(`/users/${userId}/stats`),
};

// ============================================
// 2. PRODUCT ROUTES (/api/products/)
// ============================================
export const productAPI = {
  // GET
  getAll: () => api.get('/products'),

  getUpcoming: () => api.get('/products/upcoming'),

  getDetail: (productId: number) => api.get(`/products/detail/${productId}`),

  search: (keyword: string) => api.get('/products/search', { params: { keyword } }),

  getByCategory: (categoryId: number) => api.get(`/products/category/${categoryId}`),

  getMyProducts: () => api.get('/products/my-products'),

  // POST
  createProduct: (
    data:
      | {
          title: string;
          description: string;
          start_price: number;
          min_increment: number;
          start_time: string;
          category_id: number;
          end_time?: string;
        }
      | FormData
  ) =>
    api.post('/products', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),

  // PUT
  updateProduct: (
    productId: number,
    data: {
      title?: string;
      description?: string;
      status?: string;
      current_price?: number;
      start_time?: string;
      end_time?: string;
    }
  ) => api.put(`/products/${productId}`, data),

  // DELETE
  deleteProduct: (productId: number) => api.delete(`/products/${productId}`),
};

// ============================================
// 3. BID ROUTES (/api/bids/)
// ============================================
export const bidAPI = {
  // POST
  placeBid: (data: { product_id: number; bid_amount: number }) =>
    api.post('/bids', data),

  // GET
  getHistory: (productId: number) =>
    api.get(`/bids/history/${productId}`),

  getTopBid: (productId: number) => api.get(`/bids/top/${productId}`),

  getMyBids: () => api.get('/bids/my-bids'),
};

// ============================================
// 4. AUCTION ROUTES (/api/auctions/)
// ============================================
export const auctionAPI = {
  getTimeRemaining: (productId: number) =>
    api.get(`/auctions/time/${productId}`),

  getResult: (productId: number) => api.get(`/auctions/result/${productId}`),

  endAuctionEarly: (productId: number) =>
    api.post(`/auctions/end-early/${productId}`),

  updateStatus: () => api.post('/auctions/update-status'),

  completeAuction: (productId: number) =>
    api.post(`/auctions/complete/${productId}`),

  autoComplete: () => api.post('/auctions/auto-complete'),
};

// ============================================
// 5. CATEGORY ROUTES (/api/categories/)
// ============================================
export const categoryAPI = {
  getAll: () => api.get('/categories'),

  getDetail: (categoryId: number) => api.get(`/categories/${categoryId}`),

  createCategory: (data: { name: string }) =>
    api.post('/categories', data),
};

// ============================================
// 6. IMAGE ROUTES (/api/images/)
// ============================================
export const imageAPI = {
  upload: (formData: FormData) =>
    api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  setMain: (data: { image_id: number; product_id: number }) =>
    api.put('/images/set-main', data),

  remove: (data: { image_id: number }) => api.delete('/images/remove', { data }),
};

// ============================================
// 7. WALLET ROUTES (/api/wallet/)
// ============================================
export const walletAPI = {
  // Get wallet info
  getWallet: (userId: number) => api.get(`/wallet/${userId}`),

  // Get transaction history
  getTransactionHistory: (userId: number, limit: number = 50) =>
    api.get(`/wallet/${userId}/transactions`, { params: { limit } }),

  // Check balance
  checkBalance: (userId: number, amount: number) =>
    api.post('/wallet/check-balance', { user_id: userId, amount }),

  // Deposit money
  deposit: (userId: number, amount: number) =>
    api.post('/wallet/deposit', { user_id: userId, amount }),

  // Withdraw money
  withdraw: (userId: number, amount: number) =>
    api.post('/wallet/withdraw', { user_id: userId, amount }),
};

// ============================================
// 8. HOME ROUTES (/api/home/)
// ============================================
export const homeAPI = {
  getHome: () => api.get('/home'),

  getTrending: () => api.get('/home/trending'),
};

// ============================================
// 9. ADMIN ROUTES (/api/admin/)
// ============================================
export const adminAPI = {
  // Dashboard Stats
  getDashboardStats: () => api.get('/admin/dashboard'),

  // Users Management
  getAllUsers: (page: number = 1, limit: number = 10) =>
    api.get('/admin/users', { params: { page, limit } }),

  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),

  updateUserRole: (userId: number, role: 'user' | 'admin') =>
    api.put(`/admin/users/${userId}/role`, { role }),

  // Products Management
  getAllProducts: (page: number = 1, limit: number = 10, status?: string) =>
    api.get('/admin/products', { params: { page, limit, status } }),

  deleteProduct: (productId: number) => api.delete(`/admin/products/${productId}`),

  // Bids Management
  getAllBids: (page: number = 1, limit: number = 20) =>
    api.get('/admin/bids', { params: { page, limit } }),
};

// ============================================
// ERROR HANDLER
// ============================================
export const handleAPIError = (error: AxiosError<unknown>) => {
  if (error.response) {
    const responseData = error.response.data;
    const message = isRecord(responseData) && typeof responseData.message === 'string'
      ? responseData.message
      : 'Server error';

    // Server error
    return {
      status: error.response.status,
      message,
      data: responseData,
    };
  } else if (error.request) {
    // Request error
    return {
      status: 0,
      message: 'No response from server',
      data: null,
    };
  } else {
    // Setup error
    return {
      status: 0,
      message: error.message,
      data: null,
    };
  }
};

export default api;
