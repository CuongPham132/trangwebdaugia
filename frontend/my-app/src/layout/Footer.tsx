import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Input, Button, Divider, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');

  const footerSections = [
    {
      title: 'About',
      links: [
        { label: 'About Us', link: '#' },
        { label: 'Blog', link: '#' },
        { label: 'Careers', link: '#' },
        { label: 'Contact', link: '#' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', link: '#' },
        { label: 'Buyer Guide', link: '#' },
        { label: 'Seller Guide', link: '#' },
        { label: 'Privacy Policy', link: '#' },
        { label: 'Terms of Service', link: '#' },
      ],
    },
  ];

  return (
    <footer style={{ background: '#fafafa', borderTop: '1px solid #f0f0f0', padding: '32px 0', marginTop: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
        {/* Main Content */}
        <Row gutter={[32, 32]} style={{ marginBottom: '32px' }}>
          {/* Brand */}
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff', margin: 0 }}>
                  🔨 AuctionHub
                </h3>
              </Link>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                The leading online auction platform with millions of products and the best prices.
              </p>
            </Space>
          </Col>

          {/* Links Sections */}
          {footerSections.map((section) => (
            <Col xs={24} sm={12} md={6} key={section.title}>
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#262626', margin: 0 }}>
                  {section.title}
                </h4>
                {section.links.map((item) => (
                  <a
                    key={item.label}
                    href={item.link}
                    style={{
                      fontSize: '14px',
                      color: '#666',
                      textDecoration: 'none',
                      transition: 'color 0.3s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                  >
                    {item.label}
                  </a>
                ))}
              </Space>
            </Col>
          ))}

          {/* Newsletter */}
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#262626', margin: 0 }}>
                📰 Newsletter
              </h4>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                Subscribe to get latest deals
              </p>
              <Space.Compact style={{ display: 'flex', width: '100%' }}>
                <Input
                  placeholder="Your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => {
                    setEmail('');
                  }}
                />
              </Space.Compact>
            </Space>
          </Col>
        </Row>

        {/* Divider */}
        <Divider style={{ margin: '24px 0' }} />

        {/* Bottom */}
        <Row align="middle" justify="center" style={{ fontSize: '13px' }}>
          <Col>
            <p style={{ color: '#666', margin: 0 }}>
              © 2024 AuctionHub. All rights reserved.
            </p>
          </Col>
        </Row>
      </div>
    </footer>
  );
};
