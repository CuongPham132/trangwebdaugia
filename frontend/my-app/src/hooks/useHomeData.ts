import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryAPI, productAPI } from '../services/api';
import type { Category, SellerSummary } from '../types';
import type { Product } from '../components/ProductCard';
import { normalizeCategoriesResponse, normalizeProductsResponse } from '../utils/safeData';

interface HomeCategoryItem {
  categoryId: number;
  name: string;
  count: number;
}

interface HomeDataState {
  categories: HomeCategoryItem[];
  sellers: SellerSummary[];
  activeProducts: Product[];
  endingSoonProducts: Product[];
  upcomingProducts: Product[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

export function useHomeData(): HomeDataState {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['home-data'],
    queryFn: async () => {
      const [productsRes, categoriesRes, upcomingRes] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
        productAPI.getUpcoming().catch(() => ({ data: [] })),
      ]);

      return {
        products: normalizeProductsResponse(productsRes.data),
        categoriesRaw: normalizeCategoriesResponse(categoriesRes.data),
        upcomingProducts: normalizeProductsResponse(upcomingRes.data),
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const products = data?.products || [];
  const categoriesRaw = data?.categoriesRaw || [];
  const upcomingProducts = data?.upcomingProducts || [];

  const activeProducts = useMemo<Product[]>(() => {
    return products
      .filter((product) => product.status === 'active')
      .sort((a, b) => (b.total_bids || 0) - (a.total_bids || 0))
      .slice(0, 12);
  }, [products]);

  const endingSoonProducts = useMemo<Product[]>(() => {
    const now = Date.now();
    return products
      .filter((product) => product.status === 'active')
      .map((product) => ({
        product,
        remaining: new Date(product.end_time).getTime() - now,
      }))
      .filter((entry) => Number.isFinite(entry.remaining) && entry.remaining > 0)
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 8)
      .map((entry) => entry.product);
  }, [products]);

  const categoryCountMap = useMemo(() => {
    return products.reduce<Record<number, number>>((acc, product) => {
      const key = toNumber(product.category_id);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [products]);

  const categories = useMemo<HomeCategoryItem[]>(() => {
    return categoriesRaw.map((category) => {
      const categoryId = toNumber(category.category_id);
      const countFromApi = toNumber((category as Category & { product_count?: number }).product_count);
      return {
        categoryId,
        name: category.name || 'Danh mục',
        count: countFromApi || categoryCountMap[categoryId] || 0,
      };
    });
  }, [categoriesRaw, categoryCountMap]);

  const sellers = useMemo<SellerSummary[]>(() => {
    const sellerMap = new Map<string, { username: string; items: number; highestBid: number }>();

    products.forEach((product) => {
      const sellerId = toStringId(product.seller_id);
      if (!sellerId) {
        return;
      }
      const username = product.seller?.username || `Seller #${sellerId}`;
      const prev = sellerMap.get(sellerId);

      if (!prev) {
        sellerMap.set(sellerId, {
          username,
          items: 1,
          highestBid: product.highest_bid || product.current_price || 0,
        });
        return;
      }

      prev.items += 1;
      prev.highestBid = Math.max(prev.highestBid, product.highest_bid || product.current_price || 0);
      sellerMap.set(sellerId, prev);
    });

    return Array.from(sellerMap.entries())
      .sort((a, b) => b[1].items - a[1].items || b[1].highestBid - a[1].highestBid)
      .slice(0, 4)
      .map(([sellerId, value]) => ({
        sellerId,
        name: value.username,
        rating: 4.8,
        reviews: value.items * 25,
        sales: value.items,
      }));
  }, [products]);

  // TODO: Uncomment when backend provides trending/hot products data
  // const hotProducts = useMemo<Product[]>(() => {
  //   return products
  //     .filter((p) => p.status === 'active')
  //     .sort((a, b) => (b.total_bids || 0) - (a.total_bids || 0))
  //     .slice(0, 8);
  // }, [products]);

  return {
    categories,
    sellers,
    activeProducts,
    endingSoonProducts,
    upcomingProducts,
    loading: isLoading,
    error: isError ? 'Không thể tải dữ liệu trang chủ. Vui lòng thử lại.' : null,
    retry: () => {
      void refetch();
    },
  };
}
