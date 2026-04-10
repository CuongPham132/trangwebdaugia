import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin, Button, message } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  DollarOutlined,
  FireOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../layout/AdminLayout';
import { adminAPI, handleAPIError } from '../services/api';

interface DashboardStats {
  total_users: number;
  total_products: number;
  total_bids: number;
  total_categories: number;
  active_products: number;
  sold_products: number;
  total_revenue: number;
  timestamp: string;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      const err = handleAPIError(error as any);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.data);
      message.success('Làm mới thành công');
    } catch (error) {
      const err = handleAPIError(error as any);
      message.error(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout currentPage="/admin">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" tip="Đang tải..." />
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: 'Tổng Users',
      value: stats?.total_users || 0,
      icon: <UserOutlined />,
      color: '#1890ff',
      prefix: '👥',
    },
    {
      title: 'Tổng Sản phẩm',
      value: stats?.total_products || 0,
      icon: <ShoppingOutlined />,
      color: '#eb2f96',
      prefix: '📦',
    },
    {
      title: 'Sản phẩm Active',
      value: stats?.active_products || 0,
      icon: <FireOutlined />,
      color: '#faad14',
      prefix: '🔥',
    },
    {
      title: 'Sản phẩm Đã bán',
      value: stats?.sold_products || 0,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
      prefix: '✅',
    },
    {
      title: 'Tổng Bids',
      value: stats?.total_bids || 0,
      icon: <FileTextOutlined />,
      color: '#13c2c2',
      prefix: '💰',
    },
    {
      title: 'Tổng Doanh số',
      value: `₫${(stats?.total_revenue || 0).toLocaleString('vi-VN')}`,
      icon: <DollarOutlined />,
      color: '#552583',
      prefix: '💵',
    },
  ];

  return (
    <AdminLayout currentPage="/admin">
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            📊 Dashboard
          </h1>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            {refreshing ? 'Đang cập nhật...' : 'Làm mới'}
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          {statCards.map((card, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card
                hoverable
                style={{
                  borderTop: `4px solid ${card.color}`,
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      {card.title}
                    </div>
                    <Statistic
                      value={card.value}
                      prefix={card.prefix}
                      styles={{ content: { color: card.color, fontSize: '24px' } }}
                    />
                  </div>
                  <div style={{ fontSize: '32px', opacity: 0.3 }}>{card.icon}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} md={12}>
          <Card
            title="📈 Tỉ lệ Hoàn thành"
            hoverable
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                {stats && stats.total_products > 0
                  ? `${Math.round((stats.sold_products / stats.total_products) * 100)}%`
                  : '0%'}
              </div>
              <div style={{ color: '#666', marginTop: '8px' }}>
                {stats?.sold_products || 0} / {stats?.total_products || 0} sản phẩm đã bán
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="💬 Hoạt động Đấu giá"
            hoverable
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats?.total_bids || 0}
              </div>
              <div style={{ color: '#666', marginTop: '8px' }}>
                Tổng số bids từ người dùng
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Info Card */}
      <Card
        title="ℹ️ Thông tin"
        style={{ marginTop: '24px' }}
      >
        <div style={{ lineHeight: 1.8, color: '#666' }}>
          <p>
            <strong>Cập nhật lần cuối:</strong> {new Date(stats?.timestamp || '').toLocaleString('vi-VN')}
          </p>
          <p>
            <strong>Danh mục:</strong> {stats?.total_categories || 0}
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Mô tả:</strong> Đây là trang quản trị hệ thống đấu giá. Bạn có thể xem thống kê, quản lý users, sản phẩm, và bids.
          </p>
        </div>
      </Card>
    </AdminLayout>
  );
};
