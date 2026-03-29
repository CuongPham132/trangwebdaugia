// API Constants
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Auth Constants
export const TOKEN_STORAGE_KEY = 'token';
export const USER_STORAGE_KEY = 'user';

// Pagination
export const ITEMS_PER_PAGE = 12;
export const DEFAULT_PAGE = 1;

// Auction
export const DEFAULT_AUCTION_DURATION_MINUTES = 30;
export const MIN_BID_INCREMENT = 5;

// Status
export const AUCTION_STATUS = {
  PENDING: 'pending',
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  ENDED: 'ended',
  SOLD: 'sold',
} as const;

// Roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

// Messages
export const MESSAGES = {
  SUCCESS: {
    BID_PLACED: '✅ Đặt giá thành công!',
    PRODUCT_CREATED: '✅ Tạo sản phẩm thành công!',
    PRODUCT_UPDATED: '✅ Cập nhật sản phẩm thành công!',
    PRODUCT_DELETED: '✅ Xóa sản phẩm thành công!',
    LOGIN_SUCCESS: '✅ Đăng nhập thành công!',
    LOGOUT_SUCCESS: '✅ Đăng xuất thành công!',
  },
  ERROR: {
    INVALID_BID: '❌ Giá đấu không hợp lệ!',
    SELLER_CANNOT_BID: '❌ Người bán không thể đấu giá sản phẩm của mình!',
    AUCTION_ENDED: '❌ Đấu giá đã kết thúc!',
    UNAUTHORIZED: '❌ Bạn không có quyền thực hiện hành động này!',
    SERVER_ERROR: '❌ Lỗi máy chủ. Vui lòng thử lại!',
    NETWORK_ERROR: '❌ Lỗi kết nối. Vui lòng kiểm tra internet!',
  },
  LOADING: {
    FETCHING_PRODUCTS: '⏳ Đang tải sản phẩm...',
    PLACING_BID: '⏳ Đang đặt giá...',
    CREATING_PRODUCT: '⏳ Đang tạo sản phẩm...',
  },
} as const;
