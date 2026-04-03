import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Drawer, message, Space } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuOutlined,
  HomeOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentPage }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Đã đăng xuất');
    navigate('/');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => {
        navigate('/admin');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: 'Quản lý Users',
      onClick: () => {
        navigate('/admin/users');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined />,
      label: 'Quản lý Sản phẩm',
      onClick: () => {
        navigate('/admin/products');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/admin/bids',
      icon: <FileTextOutlined />,
      label: 'Quản lý Bids',
      onClick: () => {
        navigate('/admin/bids');
        setMobileDrawerOpen(false);
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        breakpoint="lg"
        collapsedWidth={80}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: collapsed ? '20px' : '18px',
            textAlign: 'center',
          }}
        >
          {collapsed ? '🛡️' : '🛡️ Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* Main Content */}
      <Layout style={{ marginLeft: collapsed ? 80 : 220 }}>
        {/* Top Header */}
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Admin Dashboard
            </h2>
          </Space>

          <Space>
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={handleHomeClick}
            >
              Về Trang chủ
            </Button>
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
          </Space>
        </Header>

        {/* Main Content Area */}
        <Content
          style={{
            margin: '24px 16px',
            padding: '24px',
            background: '#fafafa',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            {children}
          </div>
        </Content>
      </Layout>

      {/* Mobile Drawer */}
      <Drawer
        title="Admin Menu"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        placement="left"
      >
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
        />
      </Drawer>
    </Layout>
  );
};
