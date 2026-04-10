import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Space, Divider, Row, Col, Alert } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { Layout } from '../layout';
import { loginUser } from '../stores/thunks';
import type { AppDispatch, RootState } from '../stores';

export const LoginPage: React.FC = () => {
  const [form] = Form.useForm<{ email: string; password: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const result = await dispatch(loginUser(values)).unwrap();
      if (result) {
        // Redirect based on role
        const redirectUrl = result.user.role === 'admin' ? '/admin' : '/marketplace';
        setTimeout(() => {
          navigate(redirectUrl);
        }, 800);
      }
    } catch (err) {
      // Error is handled by Redux slice
    }
  };

  return (
    <Layout>
      <div style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <motion.div
          style={{ width: '100%', maxWidth: '420px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            style={{
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header */}
            <motion.div
              style={{ textAlign: 'center', marginBottom: '32px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔥</div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#262626', margin: '0 0 8px 0' }}>Đăng Nhập</h1>
              <p style={{ color: '#666', margin: '8px 0 0 0' }}>Chào mừng quay lại AuctionHub</p>
            </motion.div>

            {/* Error Alert */}
            {error && (
              <Alert
                title={error}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            {/* Form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              size="large"
              requiredMark={false}
            >
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Form.Item
                  label="📧 Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Email không được để trống' },
                    { type: 'email', message: 'Email không hợp lệ' },
                  ]}
                >
                  <Input
                    placeholder="you@example.com"
                    prefix={<MailOutlined />}
                  />
                </Form.Item>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Form.Item
                  label="🔒 Mật khẩu"
                  name="password"
                  rules={[
                    { required: true, message: 'Mật khẩu không được để trống' },
                    { min: 6, message: 'Mật khẩu phải ít nhất 6 ký tự' },
                  ]}
                >
                  <Input.Password
                    placeholder="••••••••"
                    prefix={<LockOutlined />}
                  />
                </Form.Item>
              </motion.div>

              {/* Login Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isLoading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #ff7a45 0%, #d9534f 100%)',
                    borderColor: 'transparent',
                    fontWeight: 'bold',
                  }}
                >
                  {isLoading ? '⏳ Đang xử lý...' : '🚀 Đăng Nhập'}
                </Button>
              </motion.div>
            </Form>

            {/* Divider */}
            <Divider style={{ margin: '24px 0' }}>hoặc</Divider>

            {/* Social Login */}
            <Row gutter={12}>
              <Col span={12}>
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Button
                    block
                    size="large"
                    style={{
                      borderColor: '#d9d9d9',
                    }}
                  >
                    Google
                  </Button>
                </motion.div>
              </Col>
              <Col span={12}>
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Button
                    block
                    size="large"
                    style={{
                      borderColor: '#d9d9d9',
                    }}
                  >
                    Facebook
                  </Button>
                </motion.div>
              </Col>
            </Row>

            {/* Footer Links */}
            <motion.div
              style={{ marginTop: '24px', textAlign: 'center' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <div>
                  <Link to="/forgot-password" style={{ color: '#ff7a45', fontWeight: 'bold', textDecoration: 'none' }}>
                    Quên mật khẩu?
                  </Link>
                </div>
                <div style={{ color: '#262626' }}>
                  Chưa có tài khoản?{' '}
                  <Link to="/register" style={{ color: '#ff7a45', fontWeight: 'bold', textDecoration: 'none' }}>
                    Đăng ký ngay
                  </Link>
                </div>
              </Space>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};
