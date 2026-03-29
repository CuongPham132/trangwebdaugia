import { useQuery } from '@tanstack/react-query';
import { categoryAPI, productAPI } from '../services/api';
import type { Category } from '../types';
import type { Product } from '../components/ProductCard';
import { normalizeCategoriesResponse, normalizeProductsResponse } from '../utils/safeData';

interface MarketplaceDataState {
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useMarketplaceData(categoryId?: number): MarketplaceDataState {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['marketplace-data', categoryId ?? 'all'],
    queryFn: async () => {
      const [productsRes, categoriesRes] = await Promise.all([
        categoryId ? productAPI.getByCategory(categoryId) : productAPI.getAll(),
        categoryAPI.getAll(),
      ]);

      return {
        products: normalizeProductsResponse(productsRes.data),
        categories: normalizeCategoriesResponse(categoriesRes.data),
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    products: data?.products || [],
    categories: data?.categories || [],
    loading: isLoading,
    error: isError ? 'Không thể tải dữ liệu marketplace. Vui lòng thử lại.' : null,
    retry: () => {
      void refetch();
    },
  };
}
