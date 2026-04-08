import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, Tag, Space } from 'antd';
import { CountdownTimer } from './CountdownTimer';
import {
  getAuctionActionText,
  getAuctionStatusBadgeText,
  getAuctionStatusTagColor,
  isAuctionActive,
} from '../constants/status';

export interface Product {
  product_id: number;
  title: string;
  description: string;
  current_price: number;
  highest_bid: number;
  min_increment: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'upcoming' | 'active' | 'ended' | 'sold';
  category_id: number;
  seller_id: string;
  image_url?: string;
  total_bids?: number;
  seller?: {
    user_id: string;
    username: string;
    rating?: number;
    badge?: 'verified' | 'trusted' | 'new';
  };
  rating?: number;
  views?: number;
}

interface ProductCardProps {
  product: Product;
  onViewDetail: (productId: number) => void;
  onPrefetchDetail?: (productId: number) => void;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  onViewDetail,
  onPrefetchDetail,
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  // 🎯 Memoize expensive calculations
  const { safeCurrentPrice, safeHighestBid, safeTotalBids, safeTitle } = useMemo(
    () => ({
      safeCurrentPrice: Number.isFinite(product.current_price) ? product.current_price : 0,
      safeHighestBid: Number.isFinite(product.highest_bid) ? product.highest_bid : 0,
      safeTotalBids: Number.isFinite(product.total_bids) ? product.total_bids : 0,
      safeTitle: product.title || 'Sản phẩm đang cập nhật',
    }),
    [product.current_price, product.highest_bid, product.total_bids, product.title]
  );

  // 🎯 Memoize callbacks
  const handleViewDetail = useCallback(() => {
    onViewDetail(product.product_id);
  }, [product.product_id, onViewDetail]);

  const handleWishlistClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsWishlisted((prev) => !prev);
    },
    []
  );

  const handleMouseEnter = useCallback(() => {
    onPrefetchDetail?.(product.product_id);
  }, [product.product_id, onPrefetchDetail]);

  return (
    <motion.div
      whileHover={{ y: -8 }}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
      onClick={handleViewDetail}
    >
      <Card
        hoverable
        cover={
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: '#f0f0f0',
              height: '160px',
            }}
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={safeTitle}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.3s',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #d3d3d3 0%, #c0c0c0 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>
                  Chưa có ảnh
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
              <Tag color={getAuctionStatusTagColor(product.status)}>
                {getAuctionStatusBadgeText(product.status)}
              </Tag>
            </div>

            {/* Wishlist Button */}
            <motion.button
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                zIndex: 10,
              }}
              whileHover={{ scale: 1.2 }}
              onClick={handleWishlistClick}
            >
              {isWishlisted ? '❤️' : '🤍'}
            </motion.button>
          </div>
        }
        style={{ borderRadius: '8px', overflow: 'hidden' }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#262626',
            marginBottom: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {safeTitle}
        </div>

        {/* Price */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff7a45' }}>
            ₫{safeCurrentPrice.toLocaleString('vi-VN')}
          </div>
          {safeHighestBid > safeCurrentPrice && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              Giá cao nhất: ₫{safeHighestBid.toLocaleString('vi-VN')}
            </div>
          )}
        </div>

        {/* Time & Bids */}
        <Space size="small" style={{ marginBottom: '12px', width: '100%' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            ⏱ {safeTotalBids} lượt đấu
          </span>
          <CountdownTimer
            endTime={product.end_time}
            status={product.status}
            extensionCount={product.extension_count}
            maxExtensions={product.max_extensions}
          />
        </Space>
      </Card>
    </motion.div>
  );
};

// 🚀 Memoize component with custom comparison
// Only re-render if product data or callbacks actually change
export const ProductCard = React.memo(
  ProductCardComponent,
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    // Return false if props are different (do re-render)
    return (
      prevProps.product.product_id === nextProps.product.product_id &&
      prevProps.product.title === nextProps.product.title &&
      prevProps.product.current_price === nextProps.product.current_price &&
      prevProps.product.highest_bid === nextProps.product.highest_bid &&
      prevProps.product.total_bids === nextProps.product.total_bids &&
      prevProps.product.status === nextProps.product.status &&
      prevProps.product.image_url === nextProps.product.image_url &&
      prevProps.onViewDetail === nextProps.onViewDetail
    );
  }
);
