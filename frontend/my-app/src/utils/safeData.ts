import type { Bid, Category, Product, ProductImage } from '../types';
import { extractListData, extractObjectData } from './apiResponse';
import { API_BASE_URL } from '../constants';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringValue = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

const toStringId = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const toAbsoluteImageUrl = (value: unknown): string => {
  const raw = toStringValue(value, '').trim();
  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith('/')) {
    try {
      const origin = new URL(API_BASE_URL).origin;
      return `${origin}${raw}`;
    } catch {
      return raw;
    }
  }

  return raw;
};

const normalizeProductImage = (value: unknown, fallbackId: number, productId: number): ProductImage | null => {
  if (!isRecord(value)) {
    return null;
  }

  const imageUrl = toAbsoluteImageUrl(value.image_url);
  if (!imageUrl) {
    return null;
  }

  return {
    image_id: Math.max(1, toNumber(value.image_id, fallbackId)),
    product_id: Math.max(1, toNumber(value.product_id, productId)),
    image_url: imageUrl,
    is_primary: Boolean(value.is_primary),
    is_main: Boolean(value.is_main),
    created_at: toStringValue(value.created_at, ''),
  };
};

const toStatus = (value: unknown): Product['status'] => {
  if (value === 'pending' || value === 'upcoming' || value === 'active' || value === 'ended' || value === 'sold') {
    return value;
  }
  return 'pending';
};

const logDroppedRecords = (label: string, total: number, valid: number): void => {
  const dropped = total - valid;
  if (dropped > 0 && typeof import.meta !== 'undefined' && import.meta.env.DEV) {
    console.warn(`[safeData] ${label}: dropped ${dropped}/${total} invalid records`);
  }
};

export const normalizeProduct = (value: unknown): Product | null => {
  if (!isRecord(value)) {
    return null;
  }

  const productId = toNumber(value.product_id);
  if (productId <= 0) {
    return null;
  }

  const sellerRecord = isRecord(value.seller) ? value.seller : null;
  const sellerUserId = toStringId(sellerRecord?.user_id, '');
  const sellerUsername = toStringValue(sellerRecord?.username, 'Unknown seller');
  const rawImages = Array.isArray(value.images) ? value.images : [];
  const images = rawImages
    .map((item, index) => normalizeProductImage(item, index + 1, productId))
    .filter((item): item is ProductImage => item !== null);
  const primaryImage = images.find((img) => img.is_primary || img.is_main) || images[0];
  const imageUrl = toAbsoluteImageUrl(value.image_url) || primaryImage?.image_url;

  return {
    product_id: productId,
    title: toStringValue(value.title, `San pham #${productId}`),
    description: toStringValue(value.description, ''),
    current_price: Math.max(0, toNumber(value.current_price, 0)),
    highest_bid: Math.max(0, toNumber(value.highest_bid, toNumber(value.current_price, 0))),
    min_increment: Math.max(0, toNumber(value.min_increment, 0)),
    start_time: toStringValue(value.start_time, new Date().toISOString()),
    end_time: toStringValue(value.end_time, new Date().toISOString()),
    status: toStatus(value.status),
    category_id: Math.max(0, toNumber(value.category_id, 0)),
    seller_id: toStringId(value.seller_id, ''),
    image_url: imageUrl || undefined,
    images,
    total_bids: Math.max(0, toNumber(value.total_bids, 0)),
    seller: sellerRecord
      ? {
          user_id: sellerUserId,
          username: sellerUsername,
        }
      : undefined,
  };
};

export const normalizeProductsResponse = (payload: unknown): Product[] => {
  const rawList = extractListData<unknown>(payload);
  const normalized = rawList.map(normalizeProduct).filter((item): item is Product => item !== null);
  logDroppedRecords('products', rawList.length, normalized.length);
  return normalized;
};

export const normalizeProductResponse = (payload: unknown): Product | null => {
  const raw = extractObjectData<unknown>(payload);
  return normalizeProduct(raw);
};

export const normalizeBid = (value: unknown, fallbackId: number): Bid | null => {
  if (!isRecord(value)) {
    return null;
  }

  const productId = Math.max(0, toNumber(value.product_id, 0));
  const bidAmount = Math.max(0, toNumber(value.bid_amount, 0));

  return {
    bid_id: Math.max(1, toNumber(value.bid_id, fallbackId)),
    product_id: productId,
    bidder_id: toStringId(value.bidder_id, ''),
    bid_amount: bidAmount,
    bid_time: toStringValue(value.bid_time, new Date().toISOString()),
    bidder_username: toStringValue(value.bidder_username, 'Anonymous'),
  };
};

export const normalizeBidsResponse = (payload: unknown): Bid[] => {
  const rawList = extractListData<unknown>(payload);
  const normalized = rawList
    .map((item, index) => normalizeBid(item, Date.now() + index))
    .filter((item): item is Bid => item !== null);
  logDroppedRecords('bids', rawList.length, normalized.length);
  return normalized;
};

export const normalizeCategory = (value: unknown): Category | null => {
  if (!isRecord(value)) {
    return null;
  }

  const categoryId = toNumber(value.category_id, toNumber(value.id, 0));
  if (categoryId <= 0) {
    return null;
  }

  return {
    category_id: categoryId,
    name: toStringValue(value.name, 'Danh mục'),
    description: toStringValue(value.description, '') || undefined,
    product_count: Math.max(0, toNumber(value.product_count, 0)),
  };
};

export const normalizeCategoriesResponse = (payload: unknown): Category[] => {
  const rawList = extractListData<unknown>(payload);
  const normalized = rawList.map(normalizeCategory).filter((item): item is Category => item !== null);
  logDroppedRecords('categories', rawList.length, normalized.length);
  return normalized;
};
