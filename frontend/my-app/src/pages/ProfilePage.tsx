import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Spin, Avatar, Row, Col, Statistic, Input, Form, message, Popconfirm } from 'antd';
import { LogoutOutlined, EditOutlined, SaveOutlined, CloseOutlined, UserOutlined, ShoppingOutlined, BarsOutlined } from '@ant-design/icons';
import { Layout } from '../layout';
import { userAPI } from '../services/api';
import { extractObjectData } from '../utils/apiResponse';

interface UserProfile {
  id?: string;
  username?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  totalBids?: number;
  totalSales?: number;
  joinDate?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringId = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const toStringValue = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

const normalizeProfilePayload = (payload: unknown): UserProfile => {
  const profile = isRecord(payload) ? payload : {};
  return {
    id: toStringId(profile.user_id, toStringId(profile.id, '')) || undefined,
    username: toStringValue(profile.username, 'user123'),
    email: toStringValue(profile.email, 'user@example.com'),
    fullName: toStringValue(profile.fullName, toStringValue(profile.full_name, 'Nguyễn Văn A')),
    phone: toStringValue(profile.phone, '0123456789'),
    avatar: toStringValue(profile.avatar, '') || undefined,
    bio: toStringValue(profile.bio, '👋 Chào mừng đến với hồ sơ của tôi'),
    role: toStringValue(profile.role, 'user'),
    totalBids: 0,
    totalSales: 0,
    joinDate: toStringValue(profile.created_at, toStringValue(profile.joinDate, 'Chưa cập nhật')),
  };
};

const normalizeStatsPayload = (payload: unknown): { totalBids: number; totalSales: number } => {
  const stats = isRecord(payload) ? payload : {};
  return {
    totalBids: Math.max(0, toNumber(stats.total_bids, 0)),
    totalSales: Math.max(0, toNumber(stats.total_sales, 0)),
  };
};

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      const profileRaw = extractObjectData<unknown>(response.data);
      let profileData = normalizeProfilePayload(profileRaw);

      if (profileData.id) {
        try {
          const statsResponse = await userAPI.getStats(profileData.id);
          const statsRaw = extractObjectData<unknown>(statsResponse.data);
          const statsData = normalizeStatsPayload(statsRaw);
          profileData = {
            ...profileData,
            totalBids: statsData.totalBids,
            totalSales: statsData.totalSales,
          };
        } catch (_statsError) {
          console.log('Không thể tải thống kê');
        }
      }

      setUser(profileData);
      editForm.setFieldsValue({
        email: profileData.email,
        fullName: profileData.fullName,
        phone: profileData.phone,
        bio: profileData.bio,
      });
    } catch (error) {
      message.error('Không thể tải thông tin hồ sơ');
      // Fallback to mock data if API fails
      setUser({
        username: 'user123',
        email: 'user@example.com',
        fullName: 'Nguyễn Văn A',
        phone: '0123456789',
        bio: '🎯 Nhà sưu tập hàng hiếm | Luôn tìm kiếm những thứ tốt nhất',
        role: 'user',
        totalBids: 0,
        totalSales: 0,
        joinDate: 'Chưa cập nhật',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Đã đăng xuất thành công');
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  const handleSaveProfile = async (values: Partial<UserProfile>) => {
    try {
      setSubmitting(true);
      // TODO: Call API to update profile
      // await userAPI.updateProfile(values);
      setUser(prev => prev ? { ...prev, ...values } : null);
      setIsEditing(false);
      message.success('Cập nhật hồ sơ thành công');
    } catch (error) {
      message.error('Cập nhật hồ sơ thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', color: '#262626', marginBottom: '16px' }}>Không thể tải thông tin hồ sơ</h2>
          <Button type="primary" onClick={() => window.location.href = '/login'}>
            Quay lại đăng nhập
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Header Section */}
        <motion.div
          style={{
            background: 'linear-gradient(135deg, #ff7a45 0%, #d9534f 100%)',
            borderRadius: '12px',
            padding: '32px',
            color: 'white',
            marginBottom: '32px',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} sm={6} md={4} style={{ textAlign: 'center' }}>
              <Avatar
                size={120}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px',
                }}
              >
                👤
              </Avatar>
            </Col>

            <Col xs={24} sm={18} md={20}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                {user.fullName || user.username}
              </h1>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', margin: '0 0 16px 0' }}>
                @{user.username}
              </p>

              <Row gutter={[32, 16]}>
                <Col>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>👤 Vai trò</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                  </div>
                </Col>
                <Col>                  <div style={{ fontSize: '14px', opacity: 0.9 }}>🏷️ Tổng đấu giá</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{user.totalBids ?? 0}</div>
                </Col>
                <Col>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>📦 Tổng bán</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{user.totalSales ?? 0}</div>
                </Col>
                <Col>                  <div style={{ fontSize: '14px', opacity: 0.9 }}>📅 Tham gia từ</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{user.joinDate}</div>
                </Col>
              </Row>
            </Col>

            <Col xs={24} style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {isEditing ? (
                <>
                  <Button
                    icon={<SaveOutlined />}
                    loading={submitting}
                    onClick={() => editForm.submit()}
                    style={{ fontWeight: 'bold' }}
                  >
                    Lưu
                  </Button>
                  <Button
                    icon={<CloseOutlined />}
                    onClick={() => setIsEditing(false)}
                    style={{ fontWeight: 'bold' }}
                  >
                    Hủy
                  </Button>
                </>
              ) : (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                  style={{ fontWeight: 'bold' }}
                >
                  Chỉnh sửa
                </Button>
              )}

              <Popconfirm
                title="Xác nhận đăng xuất"
                description="Bạn chắc chắn muốn đăng xuất?"
                onConfirm={handleLogout}
                okText="Có"
                cancelText="Không"
              >
                <Button
                  danger
                  icon={<LogoutOutlined />}
                  style={{ fontWeight: 'bold' }}
                >
                  Đăng xuất
                </Button>
              </Popconfirm>
            </Col>
          </Row>
        </motion.div>

        {/* Main Content */}
        <Row gutter={[24, 24]}>
          {/* Left Column - Profile Info */}
          <Col xs={24} lg={16}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card
                title="📋 Thông tin cá nhân"
                style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                extra={
                  !isEditing && (
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => setIsEditing(true)}
                    />
                  )
                }
              >
                {isEditing ? (
                  <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleSaveProfile}
                  >
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, message: 'Email không được để trống' },
                        { type: 'email', message: 'Email không hợp lệ' },
                      ]}
                    >
                      <Input placeholder="you@example.com" />
                    </Form.Item>

                    <Form.Item
                      label="Tên đầy đủ"
                      name="fullName"
                      rules={[{ required: true, message: 'Tên không được để trống' }]}
                    >
                      <Input placeholder="Nguyễn Văn A" />
                    </Form.Item>

                    <Form.Item
                      label="Số điện thoại"
                      name="phone"
                    >
                      <Input placeholder="0123456789" />
                    </Form.Item>

                    <Form.Item
                      label="Bio"
                      name="bio"
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Giới thiệu về bạn..."
                      />
                    </Form.Item>
                  </Form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#666', fontSize: '14px' }}>Email</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#262626' }}>
                        {user.email || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontWeight: '600', color: '#666', fontSize: '14px' }}>Tên đầy đủ</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#262626' }}>
                        {user.fullName || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontWeight: '600', color: '#666', fontSize: '14px' }}>Số điện thoại</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#262626' }}>
                        {user.phone || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontWeight: '600', color: '#666', fontSize: '14px' }}>Bio</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#262626' }}>
                        {user.bio || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </Col>

          {/* Right Column - Stats & Actions */}
          <Col xs={24} lg={8}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                title="📊 Thống kê"
                style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Statistic
                      title="👤 Vai trò"
                      value={user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                      valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic                      title="🏷️ Tổng đấu giá"
                      value={user.totalBids ?? 0}
                      valueStyle={{ color: '#ff7a45', fontSize: '24px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="📦 Tổng bán"
                      value={user.totalSales ?? 0}
                      valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic                      title="📅 Tham gia từ"
                      value={user.joinDate}
                      valueStyle={{ color: '#666', fontSize: '16px' }}
                    />
                  </Col>
                </Row>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ marginTop: '24px' }}
            >
              <Card
                title="⚡ Hành động nhanh"
                style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button block icon={<ShoppingOutlined />}>
                    Xem mua hàng của tôi
                  </Button>
                  <Button block icon={<BarsOutlined />}>
                    Xem bán hàng của tôi
                  </Button>
                </div>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </div>
    </Layout>
  );
};

export default ProfilePage;
