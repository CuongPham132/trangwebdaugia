import React, { useRef } from 'react';
import { Layout, Row, Col, Card } from 'antd';
import { WalletCard } from '../components/WalletCard';
import { TransactionHistory } from '../components/TransactionHistory';

const WalletPage: React.FC = () => {
  // Get user_id from localStorage or context
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const user_id = user?.user_id ? Number(user.user_id) : null;

  // Debug logs
  console.log('🐛 WalletPage Debug:', {
    token: token ? 'exists' : 'missing',
    userStr,
    user,
    user_id,
    isFinite: Number.isFinite(user_id),
  });

  // Ref for smooth scroll to transaction history
  const historyRef = useRef<HTMLDivElement>(null);

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!user_id || !Number.isFinite(user_id) || user_id <= 0) {
    return (
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <div style={{ textAlign: 'center', paddingTop: '50px' }}>
          <h1>Vui lòng đăng nhập</h1>
          <p>user_id: {user_id || 'null'}</p>
          <p>Token: {token ? 'exists' : 'missing'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ marginBottom: '24px' }}>Quản lý ví</h1>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <WalletCard user_id={user_id} onShowHistory={scrollToHistory} />
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Thông tin nhanh">
              <div style={{ lineHeight: '1.8' }}>
                <p>
                  <strong>Số dư khả dụng:</strong> Là tiền bạn có thể dùng để nạp hoặc rút đi.
                </p>
                <p>
                  <strong>Tiền khóa (Bidding):</strong> Là tiền đang được giữ lại khi bạn đấu giá.
                  Nếu bạn bị overbid, tiền này sẽ được trả lại.
                </p>
                <p>
                  <strong>Tổng cộng:</strong> Số dư khả dụng + Tiền khóa.
                </p>
                <hr />
                <h3>Hướng dẫn:</h3>
                <ol>
                  <li>Nạp tiền vào ví để bắt đầu đấu giá</li>
                  <li>Khi bạn đặt giá, tiền sẽ bị khóa tạm thời</li>
                  <li>Nếu có ai bid cao hơn, tiền của bạn sẽ được hoàn lại</li>
                  <li>Nếu bạn thắng, tiền sẽ được chuyển đến người bán</li>
                </ol>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: '48px' }}>
          <Col xs={24}>
            <div ref={historyRef}>
              <TransactionHistory user_id={user_id} limit={100} />
            </div>
          </Col>
        </Row>
      </div>
    </Layout>
  );
};

export default WalletPage;
