import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Select, Spin, message, Tag, Space, Input } from 'antd';
import { DeleteOutlined, SafetyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AdminLayout } from '../layout/AdminLayout';
import { adminAPI, handleAPIError } from '../services/api';

interface User {
  user_id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  status: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async (page: number = 1, limit: number = 10) => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers(page, limit);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      const err = handleAPIError(error as any);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, 10);
  }, []);

  const handleDeleteUser = (user: User) => {
    Modal.confirm({
      title: '⚠️ Xóa User',
      content: `Bạn chắc chắn muốn xóa user "${user.username}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await adminAPI.deleteUser(user.user_id);
          message.success('Xóa user thành công');
          fetchUsers(pagination.page, pagination.limit);
        } catch (error) {
          const err = handleAPIError(error as any);
          message.error(err.message);
        }
      },
    });
  };

  const handleUpdateRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role === 'admin' ? 'user' : 'admin');
    setRoleModalVisible(true);
  };

  const handleConfirmUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      await adminAPI.updateUserRole(selectedUser.user_id, newRole);
      message.success(`Cập nhật role thành ${newRole === 'admin' ? 'Admin' : 'User'} thành công`);
      setRoleModalVisible(false);
      fetchUsers(pagination.page, pagination.limit);
    } catch (error) {
      const err = handleAPIError(error as any);
      message.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 60,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '🛡️ Admin' : '👤 User'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '✅ Active' : '❌ Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<SafetyOutlined />}
            onClick={() => handleUpdateRole(record)}
          >
            Role
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout currentPage="/admin/users">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>👥 Quản lý Users</h1>
        <p style={{ color: '#666' }}>Tổng: {pagination.total} users</p>
      </div>

      <Table
        columns={columns}
        dataSource={users.map((user) => ({ ...user, key: user.user_id }))}
        loading={loading}
        pagination={{
          pageSize: pagination.limit,
          total: pagination.total,
          current: pagination.page,
          onChange: (page, pageSize) => {
            fetchUsers(page, pageSize);
          },
        }}
        scroll={{ x: 800 }}
      />

      {/* Modal Update Role */}
      <Modal
        title="🔄 Thay đổi Role"
        open={roleModalVisible}
        onOk={handleConfirmUpdateRole}
        onCancel={() => setRoleModalVisible(false)}
        confirmLoading={updating}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <div style={{ marginBottom: '16px' }}>
          <p>
            <strong>User:</strong> {selectedUser?.username}
          </p>
          <p>
            <strong>Role hiện tại:</strong>{' '}
            <Tag color={selectedUser?.role === 'admin' ? 'red' : 'blue'}>
              {selectedUser?.role === 'admin' ? 'Admin' : 'User'}
            </Tag>
          </p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Role mới:
          </label>
          <Select
            style={{ width: '100%' }}
            value={newRole}
            onChange={setNewRole}
            options={[
              { label: '👤 User', value: 'user' },
              { label: '🛡️ Admin', value: 'admin' },
            ]}
          />
        </div>
      </Modal>
    </AdminLayout>
  );
};
