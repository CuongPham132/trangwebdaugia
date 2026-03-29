import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeBid,
  normalizeBidsResponse,
  normalizeCategoriesResponse,
  normalizeCategory,
  normalizeProduct,
  normalizeProductResponse,
  normalizeProductsResponse,
} from './safeData';

describe('safeData normalization', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('normalizes a valid product and applies defaults', () => {
    const normalized = normalizeProduct({
      product_id: '10',
      title: 'Laptop',
      current_price: '1250',
      min_increment: '50',
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-01-02T00:00:00.000Z',
      status: 'active',
      category_id: '3',
      seller_id: '99',
      total_bids: '2',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.product_id).toBe(10);
    expect(normalized?.current_price).toBe(1250);
    expect(normalized?.highest_bid).toBe(1250);
    expect(normalized?.status).toBe('active');
  });

  it('normalizes seller and clamps invalid numeric values', () => {
    const normalized = normalizeProduct({
      product_id: 11,
      current_price: -100,
      highest_bid: -50,
      min_increment: -20,
      total_bids: -1,
      status: 'unknown-status',
      seller: {
        user_id: 'abc',
        username: 123,
      },
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.current_price).toBe(0);
    expect(normalized?.highest_bid).toBe(0);
    expect(normalized?.min_increment).toBe(0);
    expect(normalized?.total_bids).toBe(0);
    expect(normalized?.status).toBe('pending');
    expect(normalized?.seller?.user_id).toBe('abc');
    expect(normalized?.seller?.username).toBe('Unknown seller');
  });

  it('drops invalid product records', () => {
    expect(normalizeProduct({ product_id: 0 })).toBeNull();
    expect(normalizeProduct(null)).toBeNull();
  });

  it('normalizes product list from nested envelope and drops invalid items', () => {
    const result = normalizeProductsResponse({
      data: {
        data: [
          { product_id: 1, title: 'A' },
          { product_id: 0, title: 'Invalid' },
        ],
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith('[safeData] products: dropped 1/2 invalid records');
  });

  it('normalizes single product from envelope', () => {
    const result = normalizeProductResponse({
      data: {
        product_id: 15,
        title: 'Camera',
        current_price: 100,
      },
    });

    expect(result?.product_id).toBe(15);
    expect(result?.title).toBe('Camera');
  });

  it('normalizes bid and applies fallback id when missing', () => {
    const bid = normalizeBid(
      {
        product_id: '2',
        bidder_id: '8',
        bid_amount: '300',
      },
      777
    );

    expect(bid).not.toBeNull();
    expect(bid?.bid_id).toBe(777);
    expect(bid?.bid_amount).toBe(300);
  });

  it('normalizes bids response with data envelope', () => {
    const bids = normalizeBidsResponse({
      data: [
        { bid_id: 1, product_id: 1, bid_amount: 100 },
        null,
      ],
    });

    expect(bids).toHaveLength(1);
    expect(bids[0].bid_id).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith('[safeData] bids: dropped 1/2 invalid records');
  });

  it('normalizes category and falls back to id field', () => {
    const category = normalizeCategory({
      id: '4',
      name: 'Electronics',
      product_count: '9',
    });

    expect(category).not.toBeNull();
    expect(category?.category_id).toBe(4);
    expect(category?.product_count).toBe(9);
  });

  it('normalizes categories response and drops invalid categories', () => {
    const categories = normalizeCategoriesResponse([
      { category_id: 2, name: 'Books' },
      { category_id: -1, name: 'Invalid' },
    ]);

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Books');
    expect(warnSpy).toHaveBeenCalledWith('[safeData] categories: dropped 1/2 invalid records');
  });

  it('normalizes categories from object-map payload fallback', () => {
    const categories = normalizeCategoriesResponse({
      first: { category_id: 7, name: 'Audio' },
      second: { id: 8, name: 'Video' },
      ignored: 'not-an-object',
    });

    expect(categories).toHaveLength(2);
    expect(categories[0].category_id).toBe(7);
    expect(categories[1].category_id).toBe(8);
  });
});
