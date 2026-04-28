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
  centered?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps & { isDark?: boolean }> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  centered = false,
  isDark = false,
}) => (
  <div style={{ 
    marginBottom: '48px', // Tăng khoảng cách để giao diện "thở"
    textAlign: centered ? 'center' : 'left',
    display: 'flex',
    flexDirection: 'column',
    alignItems: centered ? 'center' : 'flex-start'
  }}>
    <h2 style={{ 
      fontSize: '32px', 
      fontWeight: 850, 
      color: isDark ? '#fff' : '#0f172a', 
      margin: 0,
      letterSpacing: '-1px' 
    }}>
      {title}
    </h2>
    {/* Thanh gạch chân trang trí tạo sự đồng bộ */}
    <div style={{ 
      width: '40px', 
      height: '4px', 
      background: '#3b82f6', 
      marginTop: '12px',
      borderRadius: '2px' 
    }} />
    <p style={{ 
      color: isDark ? '#94a3b8' : '#64748b', 
      fontSize: '16px', 
      marginTop: '16px',
      maxWidth: '600px'
    }}>
      {subtitle}
    </p>
    {actionLabel && (
      <Button 
        type="link" 
        onClick={onAction} 
        style={{ 
          padding: 0, 
          marginTop: '8px', 
          fontWeight: 600, 
          color: isDark ? '#38bdf8' : '#2563eb',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {actionLabel} <ArrowRightOutlined style={{ fontSize: '12px' }} />
      </Button>
    )}
  </div>
);

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
        <section style={{ 
          background: 'radial-gradient(circle at top right, #1d4ed8, #0f172a)', 
          padding: '100px 16px', 
          color: 'white',
          textAlign: 'center' 
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Tag color="#f97316" style={{ borderRadius: '20px', padding: '4px 15px', marginBottom: '24px', border: 'none', fontWeight: 600 }}>
              LIVE AUCTION PLATFORM
            </Tag>
            <h1 style={{ fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 900, lineHeight: 1, marginBottom: '24px', letterSpacing: '-2px' }}>
              Săn đồ độc, chốt <span style={{ color: '#38bdf8' }}>giá hời</span>
            </h1>
            <p style={{ fontSize: '20px', opacity: 0.8, marginBottom: '40px', fontWeight: 400 }}>
              Hệ thống đấu giá thời gian thực minh bạch và tin cậy nhất.
            </p>
            <Space size="large">
              <Button type="primary" size="large" icon={<ThunderboltOutlined />} style={{ height: '56px', borderRadius: '12px', padding: '0 32px', background: '#f97316', border: 'none', fontWeight: 700 }}>
                Bắt đầu ngay
              </Button>
              <Button size="large" ghost style={{ height: '56px', borderRadius: '12px', padding: '0 32px', fontWeight: 600 }}>
                Cách thức hoạt động
              </Button>
            </Space>
          </div>
        </section>

        {error && (
          <div style={{ maxWidth: '1200px', margin: '16px auto', padding: '0 16px' }}>
            <Alert
              type="error"
              showIcon
              title={error}
              action={<Button size="small" onClick={retry}>Thử lại</Button>}
            />
          </div>
        )}
        {/* --- Section Danh mục nổi bật --- */}
        <section style={{ padding: '40px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ 
              display: 'flex', 
              overflowX: 'auto', 
              paddingBottom: '8px', 
              gap: '12px',
              scrollbarWidth: 'none', // Ẩn scrollbar trên Firefox
              msOverflowStyle: 'none'  // Ẩn scrollbar trên IE/Edge
            }} 
            className="hide-scrollbar" // Thêm CSS để ẩn thanh cuộn trên Chrome/Safari
            >
              {/* Nút "Tất cả" luôn đứng đầu */}
              <Button 
                shape="round" 
                size="large" 
                type="primary"
                onClick={() => navigate('/marketplace')}
                style={{ background: '#0f172a', border: 'none', px: '24px' }}
              >
                Tất cả danh mục
              </Button>

              {categories.map((category) => (
                <Button 
                  key={category.categoryId}
                  shape="round" 
                  size="large"
                  onClick={() => navigate(`/marketplace?category=${category.categoryId}`)}
                  style={{ 
                    background: '#f1f5f9', 
                    border: 'none', 
                    color: '#475569',
                    fontWeight: 600,
                    padding: '0 24px'
                  }}
                  className="category-pill"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </section>
        {/* --- Sản phẩm đang đấu giá --- */}
        <section style={{ 
          background: 'white', 
          padding: '80px 16px', // Thống nhất padding với các section khác
          position: 'relative'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
              title="Sản phẩm đang đấu giá"
              subtitle="Tham gia ngay các phiên đấu giá trực tiếp với mức giá hấp dẫn nhất"
              actionLabel="Khám phá toàn bộ sàn"
              onAction={() => navigate('/marketplace?status=active')}
              centered={true} // Giữ centered nếu bạn muốn nó là trung tâm
            />
            
            {/* Layout Grid đồng bộ */}
            <div style={{ marginTop: '20px' }}>
              <ProductGrid
                products={activeProducts.slice(0, 8)}
                loading={loading}
                onViewDetail={(productId) => navigate(`/product/${productId}`)}
              />
            </div>
          </div>
        </section>

        {/* --- Section Sắp kết thúc (Highlight) --- */}
        <section style={{ 
          background: '#0f172a', // Nền xanh đen sâu (rất sang)
          padding: '80px 16px', 
          borderTop: '1px solid #1e293b' 
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* SectionHeader bây giờ sẽ tự căn giữa và đổi màu chữ sang trắng */}
            <SectionHeader
              title="🔥 Sắp kết thúc"
              subtitle="Các phiên còn ít thời gian, phù hợp để chốt nhanh"
              actionLabel="Xem tất cả ưu tiên thời gian"
              onAction={() => navigate('/marketplace?status=active&sortBy=time-remaining')}
              centered={true}
              isDark={true}
            />

            {/* Bọc ProductGrid trong một lớp nền nhẹ để các Card nổi lên */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              padding: '32px', 
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <ProductGrid
                products={endingSoonProducts}
                loading={loading}
                onViewDetail={(productId) => navigate(`/product/${productId}`)}
              />
            </div>
          </div>
        </section>

        <section style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '48px 16px', minHeight: '600px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
              title="Sắp diễn ra"
              subtitle="Theo dõi trước để không bỏ lỡ phiên phù hợp"
              actionLabel="Xem lịch phiên"
              onAction={() => navigate('/marketplace?status=upcoming')}
              centered
            />
            <ProductGrid
              products={upcomingProducts.slice(0, 8)}
              loading={loading}
              onViewDetail={(productId) => navigate(`/product/${productId}`)}
            />
          </div>
        </section>

        <SellersSection sellers={sellers} loading={loading} />

        {/* CTA Section removed */}
      </div>
    </Layout>
  );
};

export default HomePage;
