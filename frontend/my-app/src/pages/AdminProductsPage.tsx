import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Select, Spin, message, Tag, Space, Input } from 'antd';
import { DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AdminLayout } from '../layout/AdminLayout';
import { adminAPI, handleAPIError } from '../services/api';

interface Product {
  product_id: number;
  title: string;
  start_price: number;
  current_price: number;
  start_time: string;
  end_time: string;
  status: string;
  seller_id: number;
  seller_name: string;
  category_name: string;
  bid_count: number;
  extension_count: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  const fetchProducts = async (page: number = 1, limit: number = 10, status?: string) => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllProducts(page, limit, status);
      setProducts(response.data.data.products);
      setPagination(response.data.data.pagination);
    } catch (error) {
      const err = handleAPIError(error as any);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, 10, filterStatus);
  }, [filterStatus]);

  const handleDeleteProduct = (product: Product) => {
    Modal.confirm({
      title: '⚠️ Xóa Sản phẩm',
      content: `Bạn chắc chắn muốn xóa "${product.title}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await adminAPI.deleteProduct(product.product_id);
          message.success('Xóa sản phẩm thành công');
          fetchProducts(pagination.page, pagination.limit, filterStatus);
        } catch (error) {
          const err = handleAPIError(error as any);
          message.error(err.message);
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'default',
      upcoming: 'blue',
      active: 'green',
      ended: 'orange',
      sold: 'purple',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '⏳ Chờ duyệt',
      upcoming: '⏰ Sắp diễn ra',
      active: '🔥 Đang mở',
      ended: '⏱️ Kết thúc',
      sold: '✅ Đã bán',
    };
    return labels[status] || status;
  };

  const columns: ColumnsType<Product> = [
    {
      title: 'ID',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 60,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <strong>{text.substring(0, 30)}</strong>,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: 'Người bán',
      dataIndex: 'seller_name',
      key: 'seller_name',
    },
    {
      title: 'Giá',
      key: 'price',
      render: (_, record) => (
        <div>
          <div>₫{record.current_price.toLocaleString('vi-VN')}</div>
          <small style={{ color: '#666' }}>
            (Gốc: ₫{record.start_price.toLocaleString('vi-VN')})
          </small>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Bids',
      dataIndex: 'bid_count',
      key: 'bid_count',
      render: (count: number) => <strong>{count}</strong>,
    },
    {
      title: 'Extend',
      dataIndex: 'extension_count',
      key: 'extension_count',
      render: (count: number) => (count > 0 ? `🔄 ${count}` : '-'),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteProduct(record)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout currentPage="/admin/products">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>📦 Quản lý Sản phẩm</h1>
        <p style={{ color: '#666' }}>Tổng: {pagination.total} sản phẩm</p>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold', marginBottom: 0 }}>
          <FilterOutlined /> Filter Status:
        </label>
        <Select
          style={{ width: '200px' }}
          placeholder="Chọn status..."
          allowClear
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { label: '⏳ Chờ duyệt', value: 'pending' },
            { label: '⏰ Sắp diễn ra', value: 'upcoming' },
            { label: '🔥 Đang mở', value: 'active' },
            { label: '⏱️ Kết thúc', value: 'ended' },
            { label: '✅ Đã bán', value: 'sold' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={products.map((product) => ({ ...product, key: product.product_id }))}
        loading={loading}
        pagination={{
          pageSize: pagination.limit,
          total: pagination.total,
          current: pagination.page,
          onChange: (page, pageSize) => {
            fetchProducts(page, pageSize, filterStatus);
          },
        }}
        scroll={{ x: 1000 }}
      />
    </AdminLayout>
  );
};
