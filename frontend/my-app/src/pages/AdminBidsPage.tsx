import React, { useEffect, useState } from 'react';
import { Table, Spin, message, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AdminLayout } from '../layout/AdminLayout';
import { adminAPI, handleAPIError } from '../services/api';

interface Bid {
  bid_id: number;
  product_id: number;
  user_id: number;
  bid_amount: number;
  bid_time: string;
  bidder_name: string;
  product_title: string;
  current_price: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const AdminBidsPage: React.FC = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });

  const fetchBids = async (page: number = 1, limit: number = 20) => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllBids(page, limit);
      setBids(response.data.data.bids);
      setPagination(response.data.data.pagination);
    } catch (error) {
      const err = handleAPIError(error as any);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids(1, 20);
  }, []);

  const columns: ColumnsType<Bid> = [
    {
      title: 'ID Bid',
      dataIndex: 'bid_id',
      key: 'bid_id',
      width: 70,
      render: (id: number) => <Tag color="blue">#{id}</Tag>,
    },
    {
      title: 'Người đấu giá',
      dataIndex: 'bidder_name',
      key: 'bidder_name',
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'product_title',
      key: 'product_title',
      render: (title: string) => <span>{title.substring(0, 40)}</span>,
    },
    {
      title: 'Số tiền đấu',
      dataIndex: 'bid_amount',
      key: 'bid_amount',
      render: (amount: number) => (
        <strong style={{ color: '#faad14' }}>
          ₫{amount.toLocaleString('vi-VN')}
        </strong>
      ),
      sorter: (a, b) => a.bid_amount - b.bid_amount,
    },
    {
      title: 'Giá hiện tại',
      dataIndex: 'current_price',
      key: 'current_price',
      render: (price: number) => (
        <span>₫{price.toLocaleString('vi-VN')}</span>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'bid_time',
      key: 'bid_time',
      render: (time: string) => (
        <span>{new Date(time).toLocaleString('vi-VN')}</span>
      ),
      sorter: (a, b) =>
        new Date(a.bid_time).getTime() - new Date(b.bid_time).getTime(),
    },
    {
      title: 'Product ID',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 80,
      render: (id: number) => <Tag>{id}</Tag>,
    },
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80,
      render: (id: number) => <Tag color="cyan">{id}</Tag>,
    },
  ];

  return (
    <AdminLayout currentPage="/admin/bids">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>💬 Quản lý Bids</h1>
        <p style={{ color: '#666' }}>Tổng: {pagination.total} bids</p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f0f5ff',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Tổng Bids
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
            {pagination.total}
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: '#f6ffed',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Page {pagination.page} / {pagination.total_pages}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
            {pagination.page * pagination.limit > pagination.total
              ? pagination.total
              : pagination.page * pagination.limit}
            /{pagination.total}
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={bids.map((bid) => ({ ...bid, key: bid.bid_id }))}
        loading={loading}
        pagination={{
          pageSize: pagination.limit,
          total: pagination.total,
          current: pagination.page,
          onChange: (page, pageSize) => {
            fetchBids(page, pageSize);
          },
        }}
        scroll={{ x: 1200 }}
      />
    </AdminLayout>
  );
};
