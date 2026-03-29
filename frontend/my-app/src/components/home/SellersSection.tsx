import React from 'react';
import { Card, Col, Row, Skeleton } from 'antd';

interface SellerItem {
  sellerId: string;
  name: string;
  rating: number;
  reviews: number;
  sales: number;
}

interface SellersSectionProps {
  sellers: SellerItem[];
  loading: boolean;
}

export const SellersSection: React.FC<SellersSectionProps> = ({ sellers, loading }) => {
  return (
    <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px', borderBottom: '1px solid #f0f0f0' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#262626', marginBottom: '24px' }}>
        Người bán hàng hàng đầu
      </h2>

      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Col key={idx} xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: '8px' }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : sellers.length > 0 ? (
        <Row gutter={[16, 16]}>
          {sellers.map((seller) => (
            <Col key={seller.sellerId} xs={24} sm={12} lg={6}>
              <Card hoverable style={{ textAlign: 'center', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                <p style={{ fontWeight: 600, color: '#262626', marginBottom: '4px' }}>{seller.name}</p>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  ⭐ {seller.rating.toFixed(1)} ({seller.reviews} đánh giá)
                </p>
                <p style={{ fontSize: '12px', color: '#999' }}>{seller.sales} sản phẩm đã bán</p>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
          <p style={{ fontSize: '16px', color: '#999', margin: 0 }}>Chưa có dữ liệu người bán</p>
        </div>
      )}
    </section>
  );
};
