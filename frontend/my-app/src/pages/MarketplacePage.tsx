import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Row, Space, Tag, message } from 'antd';
import { ClockCircleOutlined, FireOutlined, ScheduleOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { SearchBar } from '../components/SearchBar';
import type { FilterOptions } from '../components/FilterBar';
import { FilterBar } from '../components/FilterBar';
import { ProductGrid } from '../components/ProductGrid';
import { BidModal } from '../components/BidModal';
import type { Product } from '../components/ProductCard';
import { Layout } from '../layout';
import type { Category } from '../types';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { bidAPI, productAPI } from '../services/api';
import { normalizeBidsResponse, normalizeProductResponse } from '../utils/safeData';
import { getAuctionStatusLabel } from '../constants/status';

type ApiErrorPayload = {
  message?: string;
  minimum_required?: number;
};

const readCurrentUserId = (): string => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { user_id?: string | number };
    if (typeof parsed.user_id === 'string') {
      return parsed.user_id;
    }
    if (typeof parsed.user_id === 'number' && Number.isFinite(parsed.user_id)) {
      return String(parsed.user_id);
    }
    return '';
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
  const details =
    typeof data.details === 'object' && data.details !== null
      ? (data.details as Record<string, unknown>)
      : undefined;
  const minimum = Number(data.minimum_required ?? details?.minimum_required);

  return {
    message: typeof data.message === 'string' ? data.message : undefined,
    minimum_required: Number.isFinite(minimum) ? minimum : undefined,
  };
};

const getEffectivePrice = (product: Product): number => {
  const current = Number.isFinite(product.current_price) ? product.current_price : 0;
  const highest = Number.isFinite(product.highest_bid) ? product.highest_bid : 0;
  return Math.max(current, highest);
};

const getRemainingMs = (endTime: string): number => {
  const end = new Date(endTime).getTime();
  if (!Number.isFinite(end)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return end - Date.now();
};

const isEndingSoon = (product: Product): boolean => {
  if (product.status !== 'active') {
    return false;
  }
  const remaining = getRemainingMs(product.end_time);
  return remaining > 0 && remaining <= 6 * 60 * 60 * 1000;
};

const sectionCardStyle: React.CSSProperties = {
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
};

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const selectedCategoryId = Number(searchParams.get('category') || 0) || undefined;
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isUrlHydrated, setIsUrlHydrated] = useState(false);
  const { products, categories: categoryData, loading, error, retry } = useMarketplaceData(selectedCategoryId);

  const categories: Category[] = categoryData.map((cat) => ({
    category_id: cat.category_id,
    name: cat.name || 'Danh mục',
  }));

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [placingBid, setPlacingBid] = useState(false);

  const statusCount = useMemo(() => {
    return {
      active: products.filter((p) => p.status === 'active').length,
      upcoming: products.filter((p) => p.status === 'upcoming').length,
      ended: products.filter((p) => p.status === 'ended').length,
    };
  }, [products]);

  const sortLabelMap: Record<NonNullable<FilterOptions['sortBy']>, string> = {
    'price-asc': 'Giá tăng dần',
    'price-desc': 'Giá giảm dần',
    'time-remaining': 'Sắp kết thúc',
    newest: 'Mới nhất',
    popular: 'Phổ biến',
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    if (searchQuery.trim()) {
      chips.push({ key: 'search', label: `Tìm kiếm: ${searchQuery.trim()}` });
    }
    if (filters.categoryId) {
      const matchedCategory = categories.find((cat) => cat.category_id === filters.categoryId);
      chips.push({ key: 'categoryId', label: `Danh mục: ${matchedCategory?.name || filters.categoryId}` });
    }
    if (filters.priceMin !== undefined) {
      chips.push({ key: 'priceMin', label: `Giá từ: ${filters.priceMin.toLocaleString('vi-VN')}` });
    }
    if (filters.priceMax !== undefined) {
      chips.push({ key: 'priceMax', label: `Giá đến: ${filters.priceMax.toLocaleString('vi-VN')}` });
    }
    if (filters.status) {
      chips.push({ key: 'status', label: `Trạng thái: ${getAuctionStatusLabel(filters.status)}` });
    }
    if (filters.sortBy) {
      chips.push({ key: 'sortBy', label: `Sắp xếp: ${sortLabelMap[filters.sortBy]}` });
    }
    return chips;
  }, [categories, filters, searchQuery]);

  const clearOneFilter = (key: string) => {
    if (key === 'search') {
      setSearchQuery('');
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [key]: undefined,
    }));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters({});
  };

  useEffect(() => {
    const queryFromUrl = searchParams.get('search') || '';
    const categoryFromUrl = Number(searchParams.get('category') || 0);
    const priceMinFromUrl = Number(searchParams.get('priceMin') || 0);
    const priceMaxFromUrl = Number(searchParams.get('priceMax') || 0);
    const statusFromUrl = searchParams.get('status');
    const sortByFromUrl = searchParams.get('sortBy');

    setSearchQuery(queryFromUrl);
    setFilters({
      priceMin: priceMinFromUrl > 0 ? priceMinFromUrl : undefined,
      priceMax: priceMaxFromUrl > 0 ? priceMaxFromUrl : undefined,
      categoryId: categoryFromUrl > 0 ? categoryFromUrl : undefined,
      status:
        statusFromUrl === 'pending' ||
        statusFromUrl === 'active' ||
        statusFromUrl === 'upcoming' ||
        statusFromUrl === 'ended' ||
        statusFromUrl === 'sold'
          ? statusFromUrl
          : undefined,
      sortBy:
        sortByFromUrl === 'price-asc' ||
        sortByFromUrl === 'price-desc' ||
        sortByFromUrl === 'time-remaining' ||
        sortByFromUrl === 'newest' ||
        sortByFromUrl === 'popular'
          ? sortByFromUrl
          : undefined,
    });

    setIsUrlHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isUrlHydrated) {
      return;
    }

    const nextParams = new URLSearchParams();
    if (searchQuery.trim()) {
      nextParams.set('search', searchQuery.trim());
    }
    if (filters.categoryId) {
      nextParams.set('category', String(filters.categoryId));
    }
    if (filters.priceMin !== undefined) {
      nextParams.set('priceMin', String(filters.priceMin));
    }
    if (filters.priceMax !== undefined) {
      nextParams.set('priceMax', String(filters.priceMax));
    }
    if (filters.status) {
      nextParams.set('status', filters.status);
    }
    if (filters.sortBy) {
      nextParams.set('sortBy', filters.sortBy);
    }

    const current = searchParams.toString();
    const next = nextParams.toString();
    if (current !== next) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [isUrlHydrated, searchQuery, filters, searchParams, setSearchParams]);

  const prefetchProductDetail = async (productId: number) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['product-detail', productId],
        queryFn: async () => {
          const response = await productAPI.getDetail(productId);
          return normalizeProductResponse(response.data);
        },
        staleTime: 30 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['product-bid-history', productId],
        queryFn: async () => {
          const response = await bidAPI.getHistory(productId);
          return normalizeBidsResponse(response.data);
        },
        staleTime: 15 * 1000,
      }),
    ]);
  };

  useEffect(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.title.toLowerCase().includes(normalizedSearch) ||
          product.description.toLowerCase().includes(normalizedSearch)
      );
    }

    if (filters.priceMin !== undefined) {
      filtered = filtered.filter((product) => getEffectivePrice(product) >= filters.priceMin!);
    }
    if (filters.priceMax !== undefined) {
      filtered = filtered.filter((product) => getEffectivePrice(product) <= filters.priceMax!);
    }

    if (filters.categoryId) {
      filtered = filtered.filter((product) => product.category_id === filters.categoryId);
    }

    if (filters.status) {
      filtered = filtered.filter((product) => product.status === filters.status);
    }

    if (filters.sortBy === 'price-asc') {
      filtered.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (filters.sortBy === 'price-desc') {
      filtered.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else if (filters.sortBy === 'time-remaining') {
      filtered.sort((a, b) => getRemainingMs(a.end_time) - getRemainingMs(b.end_time));
    } else if (filters.sortBy === 'popular') {
      filtered.sort((a, b) => (b.total_bids || 0) - (a.total_bids || 0));
    }

    setFilteredProducts(filtered);
  }, [filters, searchQuery, products]);

  // Use case: Click product card to navigate to product detail

  const handleBidSubmit = async (amount: number) => {
    if (!selectedProduct) return;

    try {
      setPlacingBid(true);

      const currentUserId = readCurrentUserId();
      if (currentUserId && String(selectedProduct.seller_id) === currentUserId) {
        message.warning('Bạn không thể đấu giá sản phẩm của chính mình');
        return;
      }

      const [detailResponse, topBidResponse] = await Promise.all([
        productAPI.getDetail(selectedProduct.product_id),
        bidAPI.getTopBid(selectedProduct.product_id),
      ]);

      const latestProduct = normalizeProductResponse(detailResponse.data) || selectedProduct;
      if (latestProduct.status !== 'active') {
        message.warning('Sản phẩm không khả dụng để đấu giá');
        return;
      }

      const topPayload = topBidResponse.data as Record<string, unknown>;
      const topData = topPayload.data as Record<string, unknown> | undefined;
      const topBidValue = Number(
        topData?.current_highest_bid ??
          topData?.highest_bid ??
          topPayload.highest_bid ??
          latestProduct.highest_bid ??
          latestProduct.current_price
      );
      const basePrice = Number.isFinite(topBidValue)
        ? topBidValue
        : latestProduct.highest_bid || latestProduct.current_price;
      const minimumRequired = basePrice + latestProduct.min_increment;

      if (amount < minimumRequired) {
        message.warning(`Mức giá phải cao hơn ₫${minimumRequired.toLocaleString('vi-VN')}`);
        return;
      }

      await bidAPI.placeBid({
        product_id: selectedProduct.product_id,
        bid_amount: amount,
      });

      const targetProductId = selectedProduct.product_id;

      queryClient.setQueryData<
        { products: Product[]; categories: Category[] } | undefined
      >(['marketplace-data', selectedCategoryId ?? 'all'], (prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          products: prev.products.map((product) => {
            if (product.product_id !== targetProductId) {
              return product;
            }

            const highestBid = Math.max(product.highest_bid || 0, amount);
            return {
              ...product,
              current_price: Math.max(product.current_price || 0, highestBid),
              highest_bid: highestBid,
              total_bids: (product.total_bids || 0) + 1,
            };
          }),
        };
      });

      message.success(`Đặt giá thành công cho "${selectedProduct.title}"`);
      setSelectedProductId(null);
      setSelectedProduct(null);
    } catch (error: unknown) {
      const apiError = getApiErrorPayload(error);
      if (apiError.minimum_required) {
        message.error(
          `${apiError.message || 'Đặt giá thất bại'} (Tối thiểu: ₫${apiError.minimum_required.toLocaleString('vi-VN')})`
        );
      } else {
        const fallbackError = error instanceof Error ? error.message : 'Không rõ lỗi';
        message.error(`Đặt giá thất bại: ${apiError.message || fallbackError}`);
      }
    } finally {
      setPlacingBid(false);
    }
  };

  const endingSoonProducts = useMemo(() => {
    return filteredProducts
      .filter((product) => isEndingSoon(product))
      .sort((a, b) => getRemainingMs(a.end_time) - getRemainingMs(b.end_time));
  }, [filteredProducts]);

  const endingSoonIdSet = useMemo(() => new Set(endingSoonProducts.map((product) => product.product_id)), [endingSoonProducts]);

  const activeProducts = useMemo(() => {
    return filteredProducts
      .filter((product) => product.status === 'active' && !endingSoonIdSet.has(product.product_id))
      .sort((a, b) => (b.total_bids || 0) - (a.total_bids || 0));
  }, [filteredProducts, endingSoonIdSet]);

  const upcomingProducts = useMemo(() => {
    return filteredProducts
      .filter((product) => product.status === 'upcoming')
      .sort((a, b) => getRemainingMs(a.start_time) - getRemainingMs(b.start_time));
  }, [filteredProducts]);

  const fallbackProducts = useMemo(() => {
    return filteredProducts.filter((product) => product.status === 'pending' || product.status === 'ended' || product.status === 'sold');
  }, [filteredProducts]);

  const shouldShowActiveSection = loading || activeProducts.length > 0;
  const shouldShowEndingSoonSection = loading || endingSoonProducts.length > 0;
  const shouldShowUpcomingSection = loading || upcomingProducts.length > 0;
  const shouldShowFallbackSection = fallbackProducts.length > 0;

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <section
          style={{
            background: 'linear-gradient(115deg, #0f172a 0%, #1e3a8a 60%, #0369a1 100%)',
            color: 'white',
            padding: '36px 16px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Tag color="gold" style={{ borderRadius: '999px', padding: '4px 12px', marginBottom: '14px' }}>
              Chợ đấu giá thời gian thực
            </Tag>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800 }}>
              Khám phá và đấu giá theo nhịp thị trường
            </h1>
            <p style={{ margin: '12px 0 22px', fontSize: '16px', color: 'rgba(255,255,255,0.9)', maxWidth: '760px' }}>
              Tìm đúng sản phẩm, theo dõi phiên sắp kết thúc và đặt giá nhanh với bộ lọc chuyên sâu.
            </p>
            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <Card style={{ ...sectionCardStyle, background: 'rgba(255,255,255,0.95)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Đang đấu giá</p>
                  <p style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 800, color: '#b91c1c' }}>{statusCount.active}</p>
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card style={{ ...sectionCardStyle, background: 'rgba(255,255,255,0.95)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Sắp diễn ra</p>
                  <p style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 800, color: '#1d4ed8' }}>{statusCount.upcoming}</p>
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card style={{ ...sectionCardStyle, background: 'rgba(255,255,255,0.95)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Đã kết thúc</p>
                  <p style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 800, color: '#334155' }}>{statusCount.ended}</p>
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card style={{ ...sectionCardStyle, background: 'rgba(255,255,255,0.95)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Kết quả lọc</p>
                  <p style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{filteredProducts.length}</p>
                </Card>
              </Col>
            </Row>
          </div>
        </section>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 40px' }}>
          <Card style={{ ...sectionCardStyle, marginBottom: '16px' }} styles={{ body: { padding: '16px' } }}>
            <SearchBar onSearch={setSearchQuery} initialQuery={searchQuery} />

            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <Button
                type={!filters.status ? 'primary' : 'default'}
                onClick={() => setFilters((prev) => ({ ...prev, status: undefined }))}
              >
                Tất cả
              </Button>
              <Button
                icon={<FireOutlined />}
                type={filters.status === 'active' ? 'primary' : 'default'}
                onClick={() => setFilters((prev) => ({ ...prev, status: 'active' }))}
              >
                Đang diễn ra
              </Button>
              <Button
                icon={<ScheduleOutlined />}
                type={filters.status === 'upcoming' ? 'primary' : 'default'}
                onClick={() => setFilters((prev) => ({ ...prev, status: 'upcoming' }))}
              >
                Sắp diễn ra
              </Button>
              <Button
                icon={<ClockCircleOutlined />}
                type={filters.sortBy === 'time-remaining' ? 'primary' : 'default'}
                onClick={() => setFilters((prev) => ({ ...prev, sortBy: 'time-remaining', status: 'active' }))}
              >
                Sắp kết thúc
              </Button>
            </div>

            {activeFilterChips.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <Space size={[8, 8]} wrap>
                  {activeFilterChips.map((chip) => (
                    <Tag
                      key={chip.key}
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        clearOneFilter(chip.key);
                      }}
                      color="blue"
                    >
                      {chip.label}
                    </Tag>
                  ))}
                  <Button size="small" onClick={clearAllFilters}>
                    Xóa tất cả
                  </Button>
                </Space>
              </div>
            )}
          </Card>

          {error && (
            <Alert
              type="error"
              showIcon
              title={error}
              style={{ marginBottom: '16px' }}
              action={<Button size="small" onClick={retry}>Thử lại</Button>}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <FilterBar
                categories={categories}
                onFilterChange={setFilters}
                value={filters}
              />
            </div>

            <div className="lg:col-span-3 space-y-8">
              {shouldShowActiveSection && (
                <section>
                  <div style={{ marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>🔥 Đang đấu giá</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Các phiên đang mở bid với hoạt động mạnh</p>
                  </div>
                  <ProductGrid
                    products={activeProducts}
                    loading={loading}
                    onViewDetail={(productId) => navigate(`/product/${productId}`)}
                    onPrefetchDetail={(productId) => {
                      void prefetchProductDetail(productId);
                    }}
                  />
                </section>
              )}

              {shouldShowEndingSoonSection && (
                <section>
                  <div style={{ marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#9a3412' }}>⏰ Sắp kết thúc</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Ưu tiên các phiên còn dưới 6 giờ</p>
                  </div>
                  <ProductGrid
                    products={endingSoonProducts}
                    loading={loading}
                    onViewDetail={(productId) => navigate(`/product/${productId}`)}
                    onPrefetchDetail={(productId) => {
                      void prefetchProductDetail(productId);
                    }}
                  />
                </section>
              )}

              {shouldShowUpcomingSection && (
                <section>
                  <div style={{ marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1d4ed8' }}>📅 Sắp diễn ra</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Theo dõi phiên để chuẩn bị ngân sách và thời điểm vào lệnh</p>
                  </div>
                  <ProductGrid
                    products={upcomingProducts}
                    loading={loading}
                    onViewDetail={(productId) => navigate(`/product/${productId}`)}
                    onPrefetchDetail={(productId) => {
                      void prefetchProductDetail(productId);
                    }}
                  />
                </section>
              )}

              {shouldShowFallbackSection && (
                <section>
                  <div style={{ marginBottom: '14px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#334155' }}>🧾 Phiên khác</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Bao gồm chờ duyệt, đã bán hoặc đã kết thúc</p>
                  </div>
                  <ProductGrid
                    products={fallbackProducts}
                    loading={loading}
                    onViewDetail={(productId) => navigate(`/product/${productId}`)}
                    onPrefetchDetail={(productId) => {
                      void prefetchProductDetail(productId);
                    }}
                  />
                </section>
              )}

              {!loading && filteredProducts.length === 0 && (
                <Alert
                  type="info"
                  showIcon
                  title="Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại"
                  description="Hãy xóa bớt điều kiện hoặc chuyển sang trạng thái khác để xem thêm phiên đấu giá."
                  action={<Button onClick={clearAllFilters}>Đặt lại bộ lọc</Button>}
                />
              )}
            </div>
          </div>
        </div>

        {selectedProduct && (
          <BidModal
            isOpen={selectedProductId !== null}
            productTitle={selectedProduct.title}
            currentPrice={selectedProduct.current_price}
            minBid={Math.max(selectedProduct.current_price, selectedProduct.highest_bid || 0) + selectedProduct.min_increment}
            loading={placingBid}
            onClose={() => {
              setSelectedProductId(null);
              setSelectedProduct(null);
            }}
            onSubmit={handleBidSubmit}
          />
        )}
      </div>
    </Layout>
  );
};
