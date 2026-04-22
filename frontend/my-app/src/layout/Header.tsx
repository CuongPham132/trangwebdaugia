import React, { useState, useMemo, useEffect } from 'react';
import { Menu, Button, Dropdown, Input, Space, Badge, Avatar, Card, Spin, Tooltip } from 'antd';
import { SearchOutlined, LoginOutlined, UserOutlined, LogoutOutlined, ShoppingOutlined, BellOutlined, HomeOutlined, DashboardOutlined, WalletOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearNotifications as clearAllNotifications } from '../utils/notifications';
import { logoutUser } from '../stores/thunks';
import apiClient from '../services/api';
import type { AppDispatch, RootState } from '../stores';
import type { MenuProps } from 'antd';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [searchValue, setSearchValue] = useState('');
  const [notifications, setNotifications] = useState<Array<{id: string; message: string; type: 'success' | 'info' | 'warning'; timestamp: number}>>([]);
  const [wallet, setWallet] = useState<{wallet_id: number; balance: number; locked_balance: number} | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Determine active menu key from current location
  const activeMenuKey = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path.startsWith('/marketplace')) return '/marketplace';
    if (path.startsWith('/seller')) return '/seller';
    if (path.startsWith('/wallet')) return '/wallet';
    if (path.startsWith('/orders')) return '/orders';
    return '/';
  }, [location.pathname]);

  // Load notifications from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        // ignore
      }
    }

    // Listen for notification changes
    const handleNotificationAdded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newNotif = customEvent.detail;
      setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
    };

    const handleNotificationsCleared = () => {
      setNotifications([]);
    };

    window.addEventListener('notificationAdded', handleNotificationAdded);
    window.addEventListener('notificationsCleared', handleNotificationsCleared);

    return () => {
      window.removeEventListener('notificationAdded', handleNotificationAdded);
      window.removeEventListener('notificationsCleared', handleNotificationsCleared);
    };
  }, []);

  // Fetch wallet data when authenticated
  React.useEffect(() => {
    const userId = Number(user?.user_id);
    if (isAuthenticated && Number.isFinite(userId) && userId > 0) {
      const fetchWallet = async () => {
        try {
          setWalletLoading(true);
          const response = await apiClient.get(`/wallet/${userId}`);
          if (response.data.success) {
            setWallet(response.data.data);
          }
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            setWallet(null);
            dispatch(logoutUser());
            navigate('/login');
            return;
          }
          console.error('Failed to fetch wallet:', error);
        } finally {
          setWalletLoading(false);
        }
      };
      fetchWallet();
    } else {
      setWallet(null);
    }
  }, [isAuthenticated, user?.user_id, dispatch, navigate]);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return user?.role === 'admin';
  }, [user]);

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
    ...(isAuthenticated ? [
      {
        key: '/orders',
        icon: <ShoppingCartOutlined />,
        label: <Link to="/orders">Đơn hàng</Link>,
      },
    ] : []),
    {
      key: '/seller',
      icon: <ShoppingOutlined />,
      label: <Link to="/seller-dashboard">Đăng bán</Link>,
    },
    ...(isAuthenticated ? [
      {
        key: '/wallet',
        icon: <WalletOutlined />,
        label: <Link to="/wallet">Ví</Link>,
      },
    ] : []),
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">Hồ sơ của tôi</Link>,
    },
    ...(isAdmin ? [
      {
        type: 'divider' as const,
      },
      {
        key: 'admin',
        icon: <DashboardOutlined />,
        label: <Link to="/admin">🛡️ Admin Panel</Link>,
      },
    ] : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      onClick: () => {
        dispatch(logoutUser());
        navigate('/login');
      },
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
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
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
        <span style={{ fontSize: '28px' }}>�</span>
        BidVN
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
        selectedKeys={[activeMenuKey]}
        theme="light"
      />

      {/* Wallet Display - Thay cho Search Bar */}
      {isAuthenticated && user ? (
        <Tooltip title="Quản lý ví">
          <Link
            to="/wallet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              backgroundColor: '#f0f5ff',
              borderRadius: '8px',
              border: '1px solid #d9e8ff',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.3s',
              minHeight: '40px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#e6f7ff';
              (e.currentTarget as HTMLElement).style.borderColor = '#91d5ff';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f5ff';
              (e.currentTarget as HTMLElement).style.borderColor = '#d9e8ff';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <WalletOutlined style={{ fontSize: '18px', color: '#1890ff', flexShrink: 0 }} />
            {walletLoading ? (
              <Spin size="small" />
            ) : wallet ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>Số dư:</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1890ff', whiteSpace: 'nowrap' }}>
                  {wallet.balance.toLocaleString('vi-VN')}₫
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: '#666' }}>Ví</span>
            )}
          </Link>
        </Tooltip>
      ) : (
        // Search bar for non-authenticated users
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
      )}

      {/* Right Section */}
      <Space size="large">
        {isAuthenticated && user ? (
          <>
            {/* Notifications Dropdown */}
            <Dropdown 
              menu={{
                items: [
                  ...notifications.map((notif) => ({
                    key: notif.id,
                    label: (
                      <div style={{ maxWidth: '300px', padding: '8px 0' }}>
                        <div style={{ fontSize: '13px' }}>{notif.message}</div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          {new Date(notif.timestamp).toLocaleTimeString('vi-VN')}
                        </div>
                      </div>
                    ),
                  })),
                  ...(notifications.length > 0 ? [
                    { type: 'divider' as const },
                    {
                      key: 'clear-all',
                      label: 'Xóa tất cả',
                      onClick: () => {
                        clearAllNotifications();
                        setNotifications([]);
                      },
                    },
                  ] : [
                    {
                      key: 'no-notif',
                      label: 'Chưa có thông báo',
                      disabled: true,
                    },
                  ]),
                ],
              }}
              placement="bottomRight"
            >
              <Badge count={notifications.length} offset={[-5, 5]}>
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
            </Dropdown>

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
                <span style={{ color: '#262626', fontWeight: 500 }}>{user.username}</span>
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
