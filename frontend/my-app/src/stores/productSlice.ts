import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchProducts,
  searchProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
} from './thunks';

export interface Product {
  product_id: number;
  product_name: string;
  description: string;
  category_id: number;
  seller_id: number;
  status: 'active' | 'paused' | 'ended' | 'upcoming';
  created_at: string;
  main_image_url?: string;
  images?: string[];
}

export interface ProductDetail extends Product {
  current_bid_price?: number;
  bid_count?: number;
  auction_end_time?: string;
  starting_price?: number;
}

interface ProductState {
  products: Product[];
  selectedProduct: ProductDetail | null;
  myProducts: Product[];
  filters: {
    category_id?: number;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    sortBy?: string;
  };
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
}

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  myProducts: [],
  filters: {},
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProductState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.currentPage = 1;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch products';
      });

    // Search Products
    builder
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Search failed';
      });

    // Get Product Detail
    builder
      .addCase(getProductDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProductDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(getProductDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch product details';
      });

    // Create Product
    builder
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myProducts.push(action.payload);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to create product';
      });

    // Update Product
    builder
      .addCase(updateProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const idx = state.myProducts.findIndex((p) => p.product_id === action.payload.product_id);
        if (idx !== -1) {
          state.myProducts[idx] = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to update product';
      });

    // Delete Product
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myProducts = state.myProducts.filter((p) => p.product_id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to delete product';
      });

    // Get My Products
    builder
      .addCase(getMyProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMyProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myProducts = action.payload;
      })
      .addCase(getMyProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch your products';
      });
  },
});

export const { setFilters, clearFilters, setCurrentPage, clearError } = productSlice.actions;
export default productSlice.reducer;
