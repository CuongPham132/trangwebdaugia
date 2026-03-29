import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export const HeroSection: React.FC = () => {
  return (
    <section style={{ borderBottom: '1px solid #f0f0f0', padding: '48px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#262626', marginBottom: '12px' }}>
          Chao mung den AuctionHub
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>
          Tim nhung thoa thuan tuyet voi tren hang trieu san pham
        </p>
        <Link to="/marketplace">
          <Button type="primary" size="large" icon={<SearchOutlined />}>
            Duyet dau gia
          </Button>
        </Link>
      </div>
    </section>
  );
};
