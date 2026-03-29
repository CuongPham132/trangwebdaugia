import React from 'react';
import { Alert, Button, Card, Col, Row, Space, Tag } from 'antd';
import { ArrowRightOutlined, FireOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../layout';
import { useHomeData } from '../hooks/useHomeData';
import { ProductGrid } from '../components/ProductGrid';
import { SellersSection } from '../components/home';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#172554', margin: 0 }}>{title}</h2>
        <p style={{ color: '#475569', margin: '6px 0 0' }}>{subtitle}</p>
      </div>
      {actionLabel && onAction ? (
        <Button type="default" onClick={onAction} icon={<ArrowRightOutlined />}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    categories,
    sellers,
    activeProducts,
    endingSoonProducts,
    upcomingProducts,
    loading,
    error,
    retry,
  } = useHomeData();

  return (
    <Layout>
      <div style={{ width: '100%', background: '#f8fafc' }}>
        <section
          style={{
            background: 'linear-gradient(120deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)',
            color: 'white',
            padding: '64px 16px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Tag color="gold" style={{ borderRadius: '999px', padding: '4px 12px', marginBottom: '18px' }}>
              Nền tảng đấu giá minh bạch
            </Tag>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 52px)', lineHeight: 1.1, fontWeight: 800 }}>
              Đấu giá nhanh, công khai,
              <br />
              chốt giao dịch trong vài phút
            </h1>
            <p style={{ fontSize: '18px', opacity: 0.92, maxWidth: '700px', margin: '18px 0 28px' }}>
              Săn sản phẩm hot mỗi ngày, theo dõi giá real-time và tham gia phiên đấu giá chỉ với một chạm.
            </p>
            <Space size="middle" wrap>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={() => navigate('/marketplace?status=active')}
                style={{
                  background: '#f97316',
                  borderColor: '#f97316',
                  fontWeight: 700,
                }}
              >
                Tham gia ngay
              </Button>
              <Button
                size="large"
                onClick={() => navigate('/seller-dashboard')}
                style={{
                  borderColor: 'rgba(255,255,255,0.45)',
                  color: '#0f172a',
                  background: '#f8fafc',
                  fontWeight: 700,
                }}
              >
                Đăng bán sản phẩm
              </Button>
            </Space>
          </div>
        </section>

        {error && (
          <div style={{ maxWidth: '1200px', margin: '16px auto', padding: '0 16px' }}>
            <Alert
              type="error"
              showIcon
              message={error}
              action={<Button size="small" onClick={retry}>Thử lại</Button>}
            />
          </div>
        )}

        <section style={{ padding: '32px 16px', background: '#f8fafc' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
              title="Danh mục nổi bật"
              subtitle="Khám phá nhanh theo nhóm sản phẩm bạn quan tâm"
            />

            <Row gutter={[16, 16]}>
              {categories.slice(0, 8).map((category) => (
                <Col key={category.categoryId} xs={12} md={8} lg={6}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/marketplace?category=${category.categoryId}`)}
                    style={{ borderRadius: '14px', border: '1px solid #dbeafe' }}
                  >
                    <div>
                      <p style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>{category.name}</p>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </section>

        <section style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '40px 16px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
              title="Sản phẩm đang đấu giá"
              subtitle="Phiên đang hoạt động với mức cạnh tranh cao"
              actionLabel="Xem tất cả"
              onAction={() => navigate('/marketplace?status=active')}
            />
            <ProductGrid
              products={activeProducts.slice(0, 8)}
              loading={loading}
              onViewDetail={(productId) => navigate(`/product/${productId}`)}
              onBidClick={(productId) => navigate(`/product/${productId}`)}
            />
          </div>
        </section>

        <section style={{ background: '#fef7ed', borderTop: '1px solid #fed7aa', padding: '40px 16px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
              title="Sắp kết thúc"
              subtitle="Các phiên còn ít thời gian, phù hợp để chốt nhanh"
              actionLabel="Ưu tiên theo thời gian"
              onAction={() => navigate('/marketplace?status=active&sortBy=time-remaining')}
            />
            <ProductGrid
              products={endingSoonProducts}
              loading={loading}
              onViewDetail={(productId) => navigate(`/product/${productId}`)}
              onBidClick={(productId) => navigate(`/product/${productId}`)}
            />
          </div>
        </section>

        <section style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '40px 16px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
              title="Sắp diễn ra"
              subtitle="Theo dõi trước để không bỏ lỡ phiên phù hợp"
              actionLabel="Xem lịch phiên"
              onAction={() => navigate('/marketplace?status=upcoming')}
            />
            <ProductGrid
              products={upcomingProducts.slice(0, 8)}
              loading={loading}
              onViewDetail={(productId) => navigate(`/product/${productId}`)}
              onBidClick={(productId) => navigate(`/product/${productId}`)}
            />
          </div>
        </section>

        <SellersSection sellers={sellers} loading={loading} />

        <section
          style={{
            background: 'linear-gradient(120deg, #082f49 0%, #0f766e 100%)',
            padding: '52px 16px',
            color: 'white',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '34px', fontWeight: 800, margin: 0 }}>Tham gia đấu giá ngay hôm nay</h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: '12px 0 24px', fontSize: '16px' }}>
              Đăng ký để nhận cảnh báo phiên hot, theo dõi lịch sử giá và đấu giá theo thời gian thực.
            </p>
            <Button
              type="primary"
              size="large"
              icon={<FireOutlined />}
              style={{
                background: '#f97316',
                borderColor: '#f97316',
                fontWeight: 700,
              }}
              onClick={() => navigate('/register')}
            >
              Đăng ký ngay
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default HomePage;
