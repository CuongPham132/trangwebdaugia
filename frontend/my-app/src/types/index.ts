// Auth Types
export interface User {
  user_id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type AuctionStatus = 'pending' | 'upcoming' | 'active' | 'ended' | 'sold';

// Product Types
export interface Product {
  product_id: number;
  title: string;
  description: string;
  current_price: number;
  highest_bid: number;
  min_increment: number;
  start_time: string;
  end_time: string;
  status: AuctionStatus;
  category_id: number;
  seller_id: string;
  image_url?: string;
  images?: ProductImage[];
  total_bids?: number;
  seller?: {
    user_id: string;
    username: string;
  };
}

// Bid Types
export interface Bid {
  bid_id: number;
  product_id: number;
  bidder_id: string;
  bid_amount: number;
  bid_time: string;
  bidder_username?: string;
}

export interface BidHistory {
  bid_id: number;
  bidder_username: string;
  bid_amount: number;
  bid_time: string;
}

export interface BidStatistics {
  total_bids: number;
  highest_bid: number;
  lowest_bid: number;
  average_bid: number;
}

// Category Types
export interface Category {
  category_id: number;
  name: string;
  description?: string;
  product_count?: number;
}

export interface SellerSummary {
  sellerId: string;
  name: string;
  rating: number;
  reviews: number;
  sales: number;
}

// Auction Types
export interface AuctionResult {
  product_id: number;
  winner_id: string;
  winner_username: string;
  winning_bid: number;
  status: 'completed' | 'pending';
}

export interface TimeRemaining {
  product_id: number;
  time_left_seconds: number;
  status: AuctionStatus;
}

// Image Types
export interface ProductImage {
  image_id: number;
  product_id: number;
  image_url: string;
  is_primary?: boolean;
  is_main?: boolean;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
}

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
