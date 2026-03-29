import React from 'react';
import { motion } from 'framer-motion';
import type { Product } from './ProductCard';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onViewDetail: (productId: number) => void;
  onBidClick: (productId: number) => void;
  onPrefetchDetail?: (productId: number) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  onViewDetail,
  onBidClick,
  onPrefetchDetail,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          className="text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-xl font-bold text-gray-600">⏳ Đang tải...</p>
        </motion.div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-2xl font-bold text-gray-600">😕 Không có sản phẩm</p>
          <p className="text-gray-500 mt-2">Hãy thử thay đổi bộ lọc</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {products.map((product, index) => (
        <motion.div
          key={product.product_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <ProductCard
            product={product}
            onViewDetail={onViewDetail}
            onBidClick={onBidClick}
            onPrefetchDetail={onPrefetchDetail}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};
