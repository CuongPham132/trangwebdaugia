import React, { useState } from 'react';
import { Menu, Button, Dropdown, Input, Space, Badge, Avatar } from 'antd';
import { SearchOutlined, LoginOutlined, UserOutlined, LogoutOutlined, ShoppingOutlined, BellOutlined, HomeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';

interface HeaderProps {
  isLoggedIn?: boolean;
  username?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isLoggedIn = false,
  username = 'User',
  onLogout = () => {},
}) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">Trang chủ</Link>,
    },
    {
      key: '/marketplace',
      icon: <ShoppingOutlined />,
      label: <Link to="/marketplace">Duyệt đấu giá</Link>,
    },
    {
      key: '/seller',
      icon: <ShoppingOutlined />,
      label: <Link to="/seller-dashboard">Đăng bán</Link>,
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">Hồ sơ của tôi</Link>,
    },
    {
      key: 'purchases',
      label: <Link to="/purchases">Mua hàng của tôi</Link>,
    },
    {
      key: 'sales',
      label: <Link to="/sales">Hàng bán của tôi</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      onClick: onLogout,
    },
  ];

  const handleSearch = () => {
    if (searchValue.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchValue)}`);
    }
  };

  return (
    <header
      style={{
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        height: '64px',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1890ff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '180px',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: '28px' }}>🔨</span>
        AuctionHub
      </Link>

      {/* Navigation Menu */}
      <Menu
        mode="horizontal"
        items={menuItems}
        style={{
          border: 'none',
          flex: 1,
          backgroundColor: 'transparent',
        }}
      />

      {/* Search Bar */}
      <div style={{ width: '280px' }}>
        <Input
          placeholder="Tìm kiếm sản phẩm..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ borderRadius: '20px', paddingRight: '12px' }}
        />
      </div>

      {/* Right Section */}
      <Space size="large">
        {isLoggedIn ? (
          <>
            {/* Notifications */}
            <Badge count={3} offset={[-5, 5]}>
              <BellOutlined
                style={{
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1890ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#666';
                }}
              />
            </Badge>

            {/* User Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={40}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#1890ff',
                    cursor: 'pointer',
                    fontSize: '20px',
                  }}
                />
                <span style={{ color: '#262626', fontWeight: 500 }}>{username}</span>
              </Space>
            </Dropdown>
          </>
        ) : (
          <>
            <Button
              type="text"
              icon={<LoginOutlined />}
              onClick={() => navigate('/login')}
              style={{ fontSize: '16px' }}
            >
              Đăng nhập
            </Button>
            <Button
              type="primary"
              icon={<UserOutlined />}
              onClick={() => navigate('/register')}
            >
              Đăng ký
            </Button>
          </>
        )}
      </Space>
    </header>
  );
};
