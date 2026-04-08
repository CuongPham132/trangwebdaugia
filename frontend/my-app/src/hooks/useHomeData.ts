import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { homeAPI, categoryAPI } from '../services/api';
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
  // 🚀 OPTIMIZED: Backend handles filtering, sorting, limiting
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['home-data'],
    queryFn: async () => {
      // Single API call: GET /api/home/optimized?limit=8
      // Backend returns only needed data
      const response = await homeAPI.getOptimized(8);

      return {
        activeProducts: normalizeProductsResponse(response.data.data.activeProducts || []),
        endingSoonProducts: normalizeProductsResponse(response.data.data.endingSoonProducts || []),
        upcomingProducts: normalizeProductsResponse(response.data.data.upcomingProducts || []),
        categoriesRaw: response.data.data.categories || [],
      };
    },
    staleTime: 60 * 1000, // 60s cache
    gcTime: 5 * 60 * 1000, // 5min garbage collection
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const activeProducts = useMemo<Product[]>(() => {
    return data?.activeProducts || [];
  }, [data?.activeProducts]);

  const endingSoonProducts = useMemo<Product[]>(() => {
    return data?.endingSoonProducts || [];
  }, [data?.endingSoonProducts]);

  const upcomingProducts = useMemo<Product[]>(() => {
    return data?.upcomingProducts || [];
  }, [data?.upcomingProducts]);

  const categoriesRaw = data?.categoriesRaw || [];

  // 📊 Build sellers list from response (if needed, can be from API too)
  const sellers = useMemo<SellerSummary[]>(() => {
    // Placeholder - could be fetched from backend separately
    return [];
  }, []);

  const categories = useMemo<HomeCategoryItem[]>(() => {
    return categoriesRaw.map((category: any) => {
      const categoryId = toNumber(category.category_id);
      return {
        categoryId,
        name: category.name || 'Danh mục',
        count: toNumber(category.product_count) || 0,
      };
    });
  }, [categoriesRaw]);

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
