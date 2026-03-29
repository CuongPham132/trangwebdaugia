import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Row, Col, Checkbox, Progress, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { Layout } from '../layout';
import { userAPI } from '../services/api';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  terms: boolean;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormData>();
  const [step, setStep] = useState<'info' | 'complete'>('info');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: RegisterFormData) => {
    setLoading(true);
    try {
      await userAPI.register({
        username: values.username,
        email: values.email,
        password: values.password,
      });
      setStep('complete');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (_error) {
      message.error('Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'complete') {
    return (
      <Layout>
        <div style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
          <motion.div
            style={{ textAlign: 'center' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              style={{ fontSize: '64px', marginBottom: '16px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              ✅
            </motion.div>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#262626', marginBottom: '8px' }}>
              Đăng ký thành công!
            </h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Tài khoản của bạn đã được tạo. Chuyển hướng đến trang đăng nhập...
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              style={{
                background: 'linear-gradient(135deg, #ff7a45 0%, #d9534f 100%)',
                borderColor: 'transparent',
              }}
            >
              Đi đến Đăng Nhập
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <motion.div
          style={{ width: '100%', maxWidth: '700px' }}
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
              style={{ textAlign: 'center', marginBottom: '24px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#262626', margin: '0 0 8px 0' }}>Tạo Tài Khoản</h1>
              <p style={{ color: '#666', margin: '8px 0 0 0' }}>Bắt đầu hành trình đấu giá của bạn</p>
            </motion.div>

            {/* Progress Bar */}
            <Progress
              percent={50}
              showInfo={false}
              strokeColor={{ from: '#ff7a45', to: '#d9534f' }}
              style={{ marginBottom: '24px' }}
            />

            {/* Form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              size="large"
              requiredMark={false}
            >
              <Row gutter={16}>
                {/* Username */}
                <Col xs={24} sm={12}>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Form.Item
                      label="👤 Tên người dùng"
                      name="username"
                      rules={[
                        { required: true, message: 'Tên người dùng không được để trống' },
                        { min: 3, message: 'Tên người dùng phải ít nhất 3 ký tự' },
                      ]}
                    >
                      <Input
                        placeholder="username123"
                        prefix={<UserOutlined />}
                      />
                    </Form.Item>
                  </motion.div>
                </Col>

                {/* Full Name */}
                <Col xs={24} sm={12}>
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Form.Item
                      label="📝 Tên đầy đủ"
                      name="fullName"
                      rules={[
                        { required: true, message: 'Tên đầy đủ không được để trống' },
                      ]}
                    >
                      <Input placeholder="Nguyễn Văn A" />
                    </Form.Item>
                  </motion.div>
                </Col>

                {/* Email */}
                <Col xs={24} sm={12}>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
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
                </Col>

                {/* Phone */}
                <Col xs={24} sm={12}>
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <Form.Item
                      label="📱 Số điện thoại"
                      name="phone"
                      rules={[
                        { required: true, message: 'Số điện thoại không được để trống' },
                      ]}
                    >
                      <Input
                        placeholder="0123456789"
                        prefix={<PhoneOutlined />}
                      />
                    </Form.Item>
                  </motion.div>
                </Col>

                {/* Password */}
                <Col xs={24} sm={12}>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
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
                </Col>

                {/* Confirm Password */}
                <Col xs={24} sm={12}>
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                    <Form.Item
                      label="🔒 Xác nhận mật khẩu"
                      name="confirmPassword"
                      rules={[
                        { required: true, message: 'Xác nhận mật khẩu không được để trống' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Mật khẩu không khớp'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        placeholder="••••••••"
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>
                  </motion.div>
                </Col>

                <Col xs={24}>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                    <div style={{ marginBottom: '8px', color: '#666', fontSize: '13px' }}>
                      👥 Loại tài khoản: Thành viên
                    </div>
                  </motion.div>
                </Col>
              </Row>

              {/* Terms */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <Form.Item
                  name="terms"
                  valuePropName="checked"
                  rules={[
                    { required: true, message: 'Bạn phải đồng ý với điều khoản dịch vụ' },
                  ]}
                >
                  <Checkbox>
                    Tôi đồng ý với{' '}
                    <span style={{ color: '#ff7a45', fontWeight: 'bold', cursor: 'pointer' }}>
                      Điều khoản dịch vụ
                    </span>{' '}
                    và{' '}
                    <span style={{ color: '#ff7a45', fontWeight: 'bold', cursor: 'pointer' }}>
                      Chính sách bảo mật
                    </span>
                  </Checkbox>
                </Form.Item>
              </motion.div>

              {/* Register Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #ff7a45 0%, #d9534f 100%)',
                    borderColor: 'transparent',
                    fontWeight: 'bold',
                  }}
                >
                  {loading ? '⏳ Đang xử lý...' : '🚀 Tạo Tài Khoản'}
                </Button>
              </motion.div>
            </Form>

            {/* Footer */}
            <motion.div
              style={{ marginTop: '16px', textAlign: 'center' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p style={{ color: '#262626', margin: 0 }}>
                Đã có tài khoản?{' '}
                <Link to="/login" style={{ color: '#ff7a45', fontWeight: 'bold', textDecoration: 'none' }}>
                  Đăng nhập ngay
                </Link>
              </p>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};
