import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Spin, message, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import apiClient from '../services/api';

interface Transaction {
  transaction_id: number;
  wallet_id: number;
  amount: number;
  transaction_type: string;
  reference_id: number | null;
  description: string;
  created_at: string;
}

interface TransactionHistoryProps {
  user_id: number;
  limit?: number;
}

const getTransactionTypeTag = (type: string) => {
  const typeMap: Record<string, { label: string; color: string }> = {
    deposit: { label: 'Nạp tiền', color: 'green' },
    withdraw: { label: 'Rút tiền', color: 'orange' },
    bid_hold: { label: 'Khóa (Bid)', color: 'blue' },
    bid_refund: { label: 'Hoàn tiền bid', color: 'cyan' },
    payment: { label: 'Thanh toán', color: 'red' },
  };
  return typeMap[type] || { label: type, color: 'default' };
};

const getAmountColor = (amount: number) => {
  if (amount > 0) return '#52c41a';
  if (amount < 0) return '#f5222d';
  return '#000';
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ user_id, limit = 50 }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/wallet/${user_id}/transactions`, {
        params: { limit },
      });

      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      message.error('Lỗi tải lịch sử giao dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user_id]);

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('vi-VN'),
    },
    {
      title: 'Loại giao dịch',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      width: 120,
      render: (type: string) => {
        const { label, color } = getTransactionTypeTag(type);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ color: getAmountColor(amount), fontWeight: 'bold' }}>
          {amount > 0 ? '+' : ''} ${Math.abs(amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 250,
    },
    {
      title: 'Tham chiếu',
      dataIndex: 'reference_id',
      key: 'reference_id',
      width: 80,
      render: (ref_id: number | null) => ref_id ? `#${ref_id}` : '-',
    },
  ];

  return (
    <Card
      title="Lịch sử giao dịch"
      extra={
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={fetchTransactions}
          loading={loading}
        >
          Tải lại
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="transaction_id"
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 800 }}
        />
      </Spin>
    </Card>
  );
};

export default TransactionHistory;
