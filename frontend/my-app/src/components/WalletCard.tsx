import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Row, Col, Button, Space, Spin, message, Modal, Input } from 'antd';
import { WalletOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import type { RootState } from '../stores';
import { fetchWallet } from '../stores/thunks';
import apiClient from '../services/api';
import './WalletCard.css';

interface Wallet {
  wallet_id: number;
  user_id: number;
  balance: number;
  locked_balance: number;
  total_spent?: number;
  updated_at: string;
}

interface WalletCardProps {
  user_id: number;
  onShowHistory?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ user_id, onShowHistory }) => {
  const dispatch = useDispatch();
  const reduxWallet = useSelector((state: RootState) => state.wallet.wallet);
  const isLoading = useSelector((state: RootState) => state.wallet.isLoading);
  
  console.log('🐛 WalletCard render:', { user_id, reduxWallet, isLoading });
  
  // Use Redux wallet state, fallback to local state if needed
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Sync Redux wallet state to local state for backward compatibility
    if (reduxWallet) {
      setWallet(reduxWallet as Wallet);
    }
  }, [reduxWallet]);

  useEffect(() => {
    // Fetch wallet from Redux on mount - only if user_id is valid
    console.log('🐛 WalletCard: useEffect triggered for user_id:', user_id);
    
    if (!user_id || !Number.isFinite(user_id) || user_id <= 0) {
      console.log('⚠️ WalletCard: Skipping fetch - invalid user_id:', user_id);
      return;
    }
    
    console.log('🐛 WalletCard: Fetching wallet for user_id:', user_id);
    dispatch(fetchWallet({ user_id }) as any);
  }, [user_id, dispatch]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      message.error('Nhập số tiền hợp lệ');
      return;
    }

    try {
      setProcessing(true);
      const response = await apiClient.post('/wallet/deposit', {
        user_id,
        amount: parseFloat(depositAmount),
      });

      if (response.data.success) {
        message.success(`Nạp ${depositAmount}đ thành công!`);
        setWallet(response.data.data);
        setDepositAmount('');
        setDepositModalVisible(false);
        dispatch(fetchWallet({ user_id }) as any);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Lỗi nạp tiền');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      message.error('Nhập số tiền hợp lệ');
      return;
    }

    try {
      setProcessing(true);
      const response = await apiClient.post('/wallet/withdraw', {
        user_id,
        amount: parseFloat(withdrawAmount),
      });

      if (response.data.success) {
        message.success(`Rút ${withdrawAmount}đ thành công!`);
        setWallet(response.data.data);
        setWithdrawAmount('');
        setWithdrawModalVisible(false);
        dispatch(fetchWallet({ user_id }) as any);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Lỗi rút tiền');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    console.log('🐛 WalletCard: Loading...');
    return <Spin />;
  }

  if (!wallet) {
    console.log('🐛 WalletCard: No wallet data!', { reduxWallet, isLoading });
    return <div>Lỗi tải ví</div>;
  }

  console.log('🐛 WalletCard: Wallet loaded:', wallet);

  return (
    <>
      <Card className="wallet-card" variant="borderless" style={{ borderRadius: '8px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              <div className="wallet-header">
                <WalletOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <span style={{ marginLeft: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                  Ví của tôi
                </span>
              </div>

              <div className="balance-section">
                <div className="balance-item">
                  <span className="balance-label">Số dư khả dụng:</span>
                  <span className="balance-value">${wallet.balance.toFixed(2)}</span>
                </div>
                <div className="balance-item">
                  <span className="balance-label">Tiền khóa (Bidding):</span>
                  <span className="balance-locked">${wallet.locked_balance.toFixed(2)}</span>
                </div>
                <div className="balance-item" style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px', marginTop: '8px' }}>
                  <span className="balance-label">Tổng cộng:</span>
                  <span className="balance-total" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    ${(wallet.balance + wallet.locked_balance).toFixed(2)}
                  </span>
                </div>
              </div>
            </Space>
          </Col>

          <Col xs={24} sm={12}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                block
                onClick={() => setDepositModalVisible(true)}
              >
                Nạp tiền
              </Button>
              <Button
                icon={<MinusOutlined />}
                size="large"
                block
                onClick={() => setWithdrawModalVisible(true)}
              >
                Rút tiền
              </Button>
              <Button
                type="dashed"
                size="large"
                block
                onClick={onShowHistory}
              >
                Lịch sử giao dịch
              </Button>
            </Space>
          </Col>
        </Row>

        {wallet.total_spent > 0 && (
          <div style={{ marginTop: '16px', padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <span className="balance-label">Tổng đã chi:\n</span>
            <span style={{ fontSize: '14px' }}>${(wallet.total_spent || 0).toFixed(2)}</span>
          </div>
        )}
      </Card>

      {/* Deposit Modal */}
      <Modal
        title="Nạp tiền vào ví"
        open={depositModalVisible}
        onCancel={() => {
          setDepositModalVisible(false);
          setDepositAmount('');
        }}
        onOk={handleDeposit}
        confirmLoading={processing}
      >
        <Input
          type="number"
          placeholder="Nhập số tiền (đô la)"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          prefix="$"
          min={0}
          step={0.01}
        />
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        title="Rút tiền từ ví"
        open={withdrawModalVisible}
        onCancel={() => {
          setWithdrawModalVisible(false);
          setWithdrawAmount('');
        }}
        onOk={handleWithdraw}
        confirmLoading={processing}
      >
        <Input
          type="number"
          placeholder="Nhập số tiền (đô la)"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          prefix="$"
          min={0}
          step={0.01}
          max={wallet.balance}
        />
        <div style={{ marginTop: '12px', color: '#999' }}>
          Tối đa: ${wallet.balance.toFixed(2)}
        </div>
      </Modal>
    </>
  );
};

export default WalletCard;
