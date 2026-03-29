import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Space,
  Divider,
  Avatar,
  Rate,
  Table,
  InputNumber,
  Modal,
  Alert,
  message,
  Statistic,
  Skeleton,
} from 'antd';
import {
  HeartOutlined,
  HeartFilled,
  ShareAltOutlined,
} from '@ant-design/icons';
import { CountdownTimer } from '../components/CountdownTimer';
import { BidPriceTable } from '../components/BidPriceTable';
import type { Product, Bid } from '../types';
import { productAPI, bidAPI } from '../services/api';
import {
  getAuctionInactiveMessage,
  getAuctionStatusBadgeText,
  getAuctionStatusTagColor,
} from '../constants/status';
import {
  normalizeBidsResponse,
  normalizeProductResponse,
  normalizeProductsResponse,
} from '../utils/safeData';

type ApiErrorPayload = {
  message?: string;
  minimum_required?: number;
};

const readCurrentUserId = (): string => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { user_id?: string };
    return typeof parsed.user_id === 'string' ? parsed.user_id : '';
  } catch {
    return '';
  }
};

const getApiErrorPayload = (error: unknown): ApiErrorPayload => {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const maybeAxios = error as { response?: { data?: unknown } };
  const responseData = maybeAxios.response?.data;

  if (typeof responseData !== 'object' || responseData === null) {
    return {};
  }

  const data = responseData as Record<string, unknown>;
  const minimum = Number(data.minimum_required);

  return {
    message: typeof data.message === 'string' ? data.message : undefined,
    minimum_required: Number.isFinite(minimum) ? minimum : undefined,
  };
};

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const resolvedProductId = Number(productId || 0);
  const queryClient = useQueryClient();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  const productQuery = useQuery({
    queryKey: ['product-detail', resolvedProductId],
    queryFn: async () => {
      const response = await productAPI.getDetail(resolvedProductId);
      const data = normalizeProductResponse(response.data);
      if (!data) {
        throw new Error('Không tìm thấy dữ liệu sản phẩm.');
      }
      return data;
    },
    enabled: resolvedProductId > 0,
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const bidHistoryQuery = useQuery({
    queryKey: ['product-bid-history', resolvedProductId],
    queryFn: async () => {
      const response = await bidAPI.getHistory(resolvedProductId);
      return normalizeBidsResponse(response.data);
    },
    enabled: resolvedProductId > 0,
    staleTime: 15 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const relatedProductsQuery = useQuery({
    queryKey: ['related-products', productQuery.data?.category_id, resolvedProductId],
    queryFn: async () => {
      const categoryId = productQuery.data?.category_id;
      if (!categoryId) {
        return [] as Product[];
      }
      const response = await productAPI.getByCategory(categoryId);
      return normalizeProductsResponse(response.data)
        .filter((p) => p.product_id !== resolvedProductId)
        .slice(0, 3);
    },
    enabled: Boolean(productQuery.data?.category_id),
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const product = productQuery.data ?? null;
  const productImages = useMemo(() => {
    if (!product?.images || product.images.length === 0) {
      return [];
    }
    return product.images.filter((img) => Boolean(img.image_url));
  }, [product]);
  const preferredImageUrl = useMemo(() => {
    const primary = productImages.find((img) => img.is_primary || img.is_main);
    return primary?.image_url || productImages[0]?.image_url || product?.image_url || '';
  }, [product?.image_url, productImages]);

  useEffect(() => {
    setSelectedImageUrl(preferredImageUrl);
  }, [preferredImageUrl]);

  const bidHistory = bidHistoryQuery.data ?? [];
  const relatedProducts = relatedProductsQuery.data ?? [];
  const loading = productQuery.isLoading || bidHistoryQuery.isLoading;
  const hasError = productQuery.isError || bidHistoryQuery.isError;
  const currentUserId = readCurrentUserId();
  const isOwner = Boolean(currentUserId && product?.seller_id === currentUserId);

  const handleBidSubmit = () => {
    if (!bidAmount) {
      message.warning('Vui lòng nhập số tiền đấu giá');
      return;
    }
    if (!product) return;

    if (isOwner) {
      message.warning('Bạn không thể đấu giá sản phẩm của chính mình');
      return;
    }

    if (product.status !== 'active') {
      message.warning('Sản phẩm không khả dụng để đấu giá');
      return;
    }

    if (bidAmount < product.highest_bid + product.min_increment) {
      message.warning(
        `Số tiền đấu giá phải tối thiểu ₫${((product.highest_bid || 0) + (product.min_increment || 0)).toLocaleString('vi-VN')}`
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const nextBidHistoryEntry: Bid = {
      bid_id: Date.now(),
      product_id: product.product_id,
      bidder_id: 'current-user',
      bidder_username: 'Bạn',
      bid_amount: bidAmount,
      bid_time: nowIso,
    };

    void Promise.all([productAPI.getDetail(product.product_id), bidAPI.getTopBid(product.product_id)])
      .then(([detailResponse, topBidResponse]) => {
        const latestProduct = normalizeProductResponse(detailResponse.data) || product;
        if (latestProduct.status !== 'active') {
          message.warning('Sản phẩm không khả dụng để đấu giá');
          return;
        }

        const topPayload = topBidResponse.data as Record<string, unknown>;
        const topBidValue = Number(
          (topPayload.data as Record<string, unknown> | undefined)?.highest_bid ??
            topPayload.highest_bid ??
            latestProduct.highest_bid ??
            latestProduct.current_price
        );
        const basePrice = Number.isFinite(topBidValue)
          ? topBidValue
          : latestProduct.highest_bid || latestProduct.current_price;
        const minimumRequired = basePrice + latestProduct.min_increment;

        if (bidAmount < minimumRequired) {
          message.warning(`Mức giá phải cao hơn ₫${minimumRequired.toLocaleString('vi-VN')}`);
          return;
        }

        return bidAPI.placeBid({ product_id: product.product_id, bid_amount: bidAmount });
      })
      .then(() => {
        if (!product) {
          return;
        }

        queryClient.setQueryData<Product | null>(['product-detail', resolvedProductId], (prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            highest_bid: Math.max(prev.highest_bid || 0, bidAmount),
            total_bids: (prev.total_bids || 0) + 1,
          };
        });

        queryClient.setQueryData<Bid[]>(['product-bid-history', resolvedProductId], (prev) => {
          const next = prev ? [...prev] : [];
          next.unshift(nextBidHistoryEntry);
          return next;
        });

        message.success('Đặt giá thành công');
        setIsBidModalOpen(false);
        setBidAmount(null);
      })
      .catch((error: unknown) => {
        const apiError = getApiErrorPayload(error);
        if (apiError.minimum_required) {
          message.error(
            `${apiError.message || 'Đặt giá thất bại'} (Tối thiểu: ₫${apiError.minimum_required.toLocaleString('vi-VN')})`
          );
        } else {
          const fallbackError = error instanceof Error ? error.message : 'Không rõ lỗi';
          message.error(`Đặt giá thất bại: ${apiError.message || fallbackError}`);
        }
      });
  };

  const bidColumns = [
    {
      title: '👤 Người đấu giá',
      dataIndex: 'bidder_username',
      key: 'bidder_username',
    },
    {
      title: '💰 Số tiền',
      dataIndex: 'bid_amount',
      key: 'bid_amount',
      render: (amount: number) => '₫' + amount.toLocaleString('vi-VN'),
    },
    {
      title: '⏰ Thời gian',
      dataIndex: 'bid_time',
      key: 'bid_time',
      render: (time: string) => {
        const parsed = new Date(time);
        return Number.isNaN(parsed.getTime()) ? '--' : parsed.toLocaleString('vi-VN');
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <Skeleton active paragraph={{ rows: 8 }} />
          <Card style={{ marginTop: '16px' }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 16px' }}>
          <Alert
            type="error"
            showIcon
            message="Không thể tải chi tiết sản phẩm. Vui lòng thử lại."
            action={
              <Button
                onClick={() => {
                  void productQuery.refetch();
                  void bidHistoryQuery.refetch();
                  void relatedProductsQuery.refetch();
                }}
              >
                Thử lại
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
          <h2>Sản phẩm không tìm thấy</h2>
          <Button type="primary" href="/">
            Quay lại trang chủ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Product Main Section */}
          <Row gutter={[32, 32]} style={{ marginBottom: '32px' }}>
            {/* Image Gallery */}
            <Col xs={24} sm={24} md={12}>
              <Card style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    height: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedImageUrl ? (
                    <img
                      src={selectedImageUrl}
                      alt={product.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '64px' }}>📷</div>
                  )}
                </div>

                {/* Image Thumbnails (Placeholder) */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px',
                    overflow: 'auto',
                  }}
                >
                  {productImages.length > 0 ? (
                    productImages.map((img) => (
                      <img
                        key={img.image_id}
                        src={img.image_url}
                        alt={product.title}
                        onClick={() => setSelectedImageUrl(img.image_url)}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border: img.image_url === selectedImageUrl ? '2px solid #ff7a45' : '1px solid #d9d9d9',
                        }}
                      />
                    ))
                  ) : (
                    <div style={{ color: '#999', fontSize: '12px' }}>Không có ảnh bổ sung</div>
                  )}
                </div>

                {/* Share & Wishlist */}
                <Space style={{ marginTop: '16px', width: '100%' }}>
                  <Button
                    type="text"
                    icon={<ShareAltOutlined />}
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    Chia sẻ
                  </Button>
                  <Button
                    type="text"
                    icon={isWishlisted ? <HeartFilled /> : <HeartOutlined />}
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    style={{
                      flex: 1,
                      color: isWishlisted ? '#ff4d4f' : 'inherit',
                      textAlign: 'center',
                    }}
                  >
                    {isWishlisted ? 'Đã lưu' : 'Lưu'}
                  </Button>
                </Space>
              </Card>
            </Col>

            {/* Product Info */}
            <Col xs={24} sm={24} md={12}>
              <Card style={{ borderRadius: '12px' }}>
                {/* Title */}
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    color: '#222',
                  }}
                >
                  {product.title}
                </h1>

                {/* Rating & Views */}
                <Space style={{ marginBottom: '16px' }}>
                  <Rate
                    value={5}
                    disabled
                    style={{ fontSize: '14px' }}
                  />
                  <span style={{ color: '#666', fontSize: '14px' }}>
                    4.8 (2340 lượt xem)
                  </span>
                </Space>

                <Divider />

                {/* Price Section */}
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '16px',
                    backgroundColor: '#fff8f0',
                    borderRadius: '8px',
                    border: '1px solid #ffd9bf',
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={12}>
                      <Statistic
                        title="💰 Giá khởi điểm"
                        value={product?.current_price || 0}
                        prefix="₫"
                        valueStyle={{ color: '#ff7a45', fontSize: '20px' }}
                        formatter={(value) =>
                          (value as number).toLocaleString('vi-VN')
                        }
                      />
                    </Col>
                    <Col xs={12}>
                      <Statistic
                        title="🔥 Giá cao nhất"
                        value={product?.highest_bid || product?.current_price || 0}
                        prefix="₫"
                        valueStyle={{ color: '#d9534f', fontSize: '20px' }}
                        formatter={(value) =>
                          (value as number).toLocaleString('vi-VN')
                        }
                      />
                    </Col>
                  </Row>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                    ⬆️ Mức tăng tối thiểu: {(product?.min_increment || 0).toLocaleString('vi-VN')} VND
                  </div>
                </div>

                {/* Status & Time */}
                <Row gutter={16} style={{ marginBottom: '16px' }}>
                  <Col xs={12}>
                    <Card style={{ background: '#f0f0f0' }} bordered={false}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Tag
                            color={getAuctionStatusTagColor(product.status)}
                          >
                            {getAuctionStatusBadgeText(product.status)}
                          </Tag>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          📊 {product?.total_bids || 0} lượt đấu
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={12}>
                    <Card style={{ background: '#f0f0f0' }} bordered={false}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                          ⏱️ Thời gian còn lại
                        </div>
                        <CountdownTimer endTime={product.end_time} status={product.status} />
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Seller Info */}
                <Card
                  style={{
                    marginBottom: '16px',
                    background: '#f8f8f8',
                    border: '1px solid #e0e0e0',
                  }}
                  bordered={false}
                >
                  <Space>
                    <Avatar size={48} style={{ background: '#ff7a45' }}>👤</Avatar>
                    <div>
                      <div style={{ fontWeight: 600 }}>{product.seller?.username}</div>
                      <Rate
                        value={5}
                        disabled
                        style={{ fontSize: '12px' }}
                      />
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        4.8 ⭐ Người bán đáng tin cậy
                      </div>
                    </div>
                  </Space>
                </Card>

                {/* Bid Button */}
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => setIsBidModalOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #ff7a45 0%, #d9534f 100%)',
                    borderColor: 'transparent',
                    fontWeight: 'bold',
                    height: '48px',
                    fontSize: '16px',
                  }}
                  disabled={product.status !== 'active' || isOwner}
                >
                  {isOwner ? 'Không thể tự đấu giá' : '🔥 Đặt giá ngay'}
                </Button>

                {product.status !== 'active' && (
                  <Alert
                    message={getAuctionInactiveMessage(product.status)}
                    type="warning"
                    style={{ marginTop: '12px' }}
                    showIcon
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* Description Section */}
          <Card
            title="📝 Mô tả chi tiết"
            style={{ marginBottom: '24px', borderRadius: '12px' }}
          >
            <div style={{ lineHeight: '1.8', color: '#555' }}>
              {product.description}
            </div>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>📦 Điều kiện sản phẩm</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
                    <li>Chưa từng sử dụng, còn nguyên seal</li>
                    <li>Bao gồm tất cả phụ kiện gốc</li>
                    <li>Hộp, sạc, cáp đầy đủ</li>
                  </ul>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>🛡️ Bảo hành</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
                    <li>Bảo hành 2 năm từ nhà bán</li>
                    <li>Hỗ trợ kỹ thuật 24/7</li>
                    <li>Hoàn tiền nếu không hài lòng</li>
                  </ul>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Bid Price Table */}
          <BidPriceTable
            currentPrice={product?.current_price || 0}
            highestBid={product?.highest_bid || product?.current_price || 0}
            minIncrement={product?.min_increment || 0}
            totalBids={product?.total_bids || 0}
            status={product.status}
          />

          {/* Bid History */}
          <Card
            title="📊 Lịch sử đấu giá"
            style={{ marginBottom: '24px', borderRadius: '12px' }}
          >
            <Table
              dataSource={bidHistory}
              columns={bidColumns}
              pagination={{ pageSize: 10 }}
              rowKey="bid_id"
              size="small"
            />
          </Card>

          {/* Related Products */}
          <Card
            title="🔗 Sản phẩm liên quan"
            style={{ marginBottom: '24px', borderRadius: '12px' }}
          >
            <Row gutter={[16, 16]}>
              {relatedProducts.map((relatedProduct) => (
                <Col key={relatedProduct.product_id} xs={24} sm={12} md={8}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card hoverable style={{ borderRadius: '8px' }}>
                      <div
                        style={{
                          backgroundColor: '#f0f0f0',
                          height: '160px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '12px',
                          overflow: 'hidden',
                        }}
                      >
                        {relatedProduct.image_url ? (
                          <img
                            src={relatedProduct.image_url}
                            alt={relatedProduct.title}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '32px' }}>📷</div>
                        )}
                      </div>

                      <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '14px', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {relatedProduct.title}
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#d9534f' }}>
                          ₫{(relatedProduct?.highest_bid || relatedProduct?.current_price || 0).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ⏱ {relatedProduct.total_bids} lượt đấu
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </Card>
        </motion.div>
      </div>

      {/* Bid Modal */}
      <Modal
        title="🔥 Đặt Giá Đấu Giá"
        open={isBidModalOpen}
        onOk={handleBidSubmit}
        onCancel={() => {
          setIsBidModalOpen(false);
          setBidAmount(null);
        }}
        okText="Đặt giá"
        cancelText="Hủy"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message={`Giá hiện tại: ₫${product.highest_bid.toLocaleString('vi-VN')}`}
            type="info"
            showIcon
          />

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              💰 Nhập số tiền đấu giá (tối thiểu: ₫
              {(product.highest_bid + product.min_increment).toLocaleString(
                'vi-VN'
              )}
              )
            </label>
            <InputNumber
              value={bidAmount}
              onChange={setBidAmount}
              formatter={(value) =>
                value ? value.toLocaleString('vi-VN') : ''
              }
              parser={(value) =>
                parseInt(value?.replace(/\D/g, '') || '0')
              }
              style={{ width: '100%' }}
              size="large"
              placeholder="Nhập số tiền"
            />
          </div>

          <Alert
            message="⚠️ Khi bạn đặt giá, bạn cam kết sẽ mua sản phẩm này nếu trúng đấu giá"
            type="warning"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
};

export default ProductDetailPage;
