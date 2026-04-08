import React from 'react';
import { motion } from 'framer-motion';
import { Card, Skeleton } from 'antd';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        hoverable
        style={{ borderRadius: '8px', overflow: 'hidden' }}
        loading={true}
      >
        {/* Image Skeleton */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#f0f0f0',
            height: '160px',
            marginBottom: '12px',
          }}
        >
          <Skeleton.Avatar
            active
            size={{ width: '100%', height: '160px' }}
            shape="square"
          />
        </div>

        {/* Title Skeleton */}
        <Skeleton active paragraph={{ rows: 2 }} />

        {/* Price Skeleton */}
        <div style={{ marginTop: '12px' }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>

        {/* Button Skeleton */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <Skeleton.Button active style={{ width: '100%', height: '32px' }} />
          <Skeleton.Button active style={{ width: '100%', height: '32px' }} />
        </div>
      </Card>
    </motion.div>
  );
};

export default ProductCardSkeleton;
