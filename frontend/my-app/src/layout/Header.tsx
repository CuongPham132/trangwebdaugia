import React, { useState, useMemo, useEffect } from 'react';
import { Button, Dropdown, Space, Badge, Avatar, Card, Spin, Tooltip } from 'antd';
import { LoginOutlined, UserOutlined, LogoutOutlined, BellOutlined, DashboardOutlined, WalletOutlined, DownOutlined, MoreOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { categoryAPI } from '../services/api';
import { normalizeCategoriesResponse } from '../utils/safeData';
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
  const [notifications, setNotifications] = useState<Array<{id: string; message: string; type: 'success' | 'info' | 'warning'; timestamp: number}>>([]);
  const [wallet, setWallet] = useState<{wallet_id: number; balance: number; locked_balance: number} | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Responsive helper: hide some elements on narrow viewports
  const [isNarrow, setIsNarrow] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isCompactNav, setIsCompactNav] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 1500 : false);
  useEffect(() => {
    const onResize = () => {
      setIsNarrow(window.innerWidth < 1024);
      setIsCompactNav(window.innerWidth < 1500);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Determine active menu key from current location
  // Fetch categories for the header dropdown (uses server-side categories)
  const { data: headerCategories = [] } = useQuery({
    queryKey: ['header-categories'],
    queryFn: async () => {
      const res = await categoryAPI.getAll();
      return normalizeCategoriesResponse(res.data);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const categoriesMenuItems = headerCategories.map((cat) => ({
    key: String(cat.category_id),
    label: (
      <Link to={`/marketplace?category=${cat.category_id}`}>{cat.name}</Link>
    ),
  }));

  const auctionMenuItems = [
    { key: 'upcoming', label: <Link to="/marketplace?status=upcoming">Phiên đấu giá sắp đấu giá</Link> },
    { key: 'active', label: <Link to="/marketplace?status=active">Phiên đấu giá đang diễn ra</Link> },
    { key: 'ended', label: <Link to="/marketplace?status=ended">Phiên đấu giá đã kết thúc</Link> },
  ];

  const overflowMenuItems = [
    { key: 'marketplace', label: <Link to="/marketplace">Danh mục đấu giá</Link> },
    { key: 'orders', label: <Link to="/orders">Đơn của tôi</Link> },
    { key: 'seller', label: <Link to="/seller-dashboard">Đăng bán</Link> },
    ...(isAuthenticated ? [{ key: 'wallet', label: <Link to="/wallet">Ví</Link> }] : []),
  ];

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

  return (
    <header
      style={{
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        padding: '0',
        position: 'sticky',
        top: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        minHeight: '64px',
      }}
    >
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0, padding: '0 12px' }}>
        <Link
          to="/"
          style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#d32f2f',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 'auto',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '26px' }}>🔨</span>
          <span>BidVN</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: 0, marginLeft: '24px', whiteSpace: 'nowrap' }}>
          <Dropdown menu={{ items: categoriesMenuItems }} placement="bottomLeft">
            <Button type="text" style={{ padding: '6px 0' }}>
              Tài sản đấu giá <DownOutlined />
            </Button>
          </Dropdown>

          <Dropdown menu={{ items: auctionMenuItems }} placement="bottomLeft">
            <Button type="text" style={{ padding: '6px 0' }}>
              Phiên đấu giá <DownOutlined />
            </Button>
          </Dropdown>

          {!isCompactNav ? (
            <>
              <Link to="/marketplace" style={{ color: '#262626', textDecoration: 'none' }}>Danh mục đấu giá</Link>
              <Link to="/orders" style={{ color: '#262626', textDecoration: 'none' }}>Đơn của tôi</Link>
              <Link to="/seller-dashboard" style={{ color: '#262626', textDecoration: 'none' }}>Đăng bán</Link>
              {!isNarrow && (
                <Link to="/wallet" style={{ color: '#262626', textDecoration: 'none' }}>Ví</Link>
              )}
            </>
          ) : (
            <Dropdown
              menu={{ items: overflowMenuItems }}
              placement="bottomLeft"
              trigger={['click']}
            >
              <Button type="text" style={{ padding: '6px 0', color: '#262626' }} icon={<MoreOutlined />}>
                Thêm
              </Button>
            </Dropdown>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {isAuthenticated && user ? (
            <Tooltip title="Quản lý ví">
              <Link
                to="/wallet"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 14px',
                  backgroundColor: '#fff3e0',
                  borderRadius: '6px',
                  border: '1px solid #ffe0b2',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  minWidth: 'auto',
                  flexShrink: 0,
                  display: isNarrow ? 'none' : 'flex',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#ffe8cc';
                  (e.currentTarget as HTMLElement).style.borderColor = '#ffcc99';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fff3e0';
                  (e.currentTarget as HTMLElement).style.borderColor = '#ffe0b2';
                }}
              >
                <WalletOutlined style={{ fontSize: '16px', color: '#f57c00', flexShrink: 0 }} />
                {walletLoading ? (
                  <Spin size="small" />
                ) : wallet ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>Số dư:</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f57c00', whiteSpace: 'nowrap' }}>
                      {wallet.balance.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: '#666' }}>Ví</span>
                )}
              </Link>
            </Tooltip>
          ) : null}

          {isAuthenticated && user ? (
            <Space size="middle">
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
                      fontSize: '18px',
                      cursor: 'pointer',
                      color: '#666',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#d32f2f';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#666';
                    }}
                  />
                </Badge>
              </Dropdown>

              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer', gap: '8px' }}>
                  <Avatar
                    size={36}
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor: '#d32f2f',
                      cursor: 'pointer',
                      fontSize: '18px',
                    }}
                  />
                  <span style={{ color: '#262626', fontWeight: 500, fontSize: '13px' }}>{user.username}</span>
                </Space>
              </Dropdown>
            </Space>
          ) : (
            <Space size="small" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <Button
                type="text"
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
                style={{ fontSize: '14px', color: '#666' }}
              >
                Đăng nhập
              </Button>
              <Button
                type="primary"
                onClick={() => navigate('/register')}
                style={{ backgroundColor: '#d32f2f', borderColor: '#d32f2f', fontSize: '14px' }}
              >
                Đăng ký
              </Button>
            </Space>
          )}
        </div>
      </div>
    </header>
  );
};
