import React, { useEffect, useState } from 'react';
import { Card, Button, InputNumber, Select, Radio, Space, Badge, Collapse, Divider } from 'antd';
import { ClearOutlined, CheckOutlined, FilterOutlined } from '@ant-design/icons';
import type { CollapseProps } from 'antd';
import { AUCTION_STATUS_FILTER_OPTIONS } from '../constants/status';
import type { AuctionStatus } from '../types';

interface FilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  categories: Array<{ category_id: number; name: string }>;
  value?: FilterOptions;
}

export interface FilterOptions {
  priceMin?: number;
  priceMax?: number;
  categoryId?: number;
  status?: AuctionStatus;
  sortBy?: 'price-asc' | 'price-desc' | 'time-remaining' | 'newest' | 'popular';
  condition?: 'new' | 'used' | 'refurbished';
  location?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  categories,
  value,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({});

  useEffect(() => {
    if (value) {
      setFilters(value);
    }
  }, [value]);

  const isSortByOption = (value: string): value is NonNullable<FilterOptions['sortBy']> => {
    return ['price-asc', 'price-desc', 'time-remaining', 'newest', 'popular'].includes(value);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  const items: CollapseProps['items'] = [
    {
      key: 'price',
      label: <span style={{ fontSize: '16px', fontWeight: 'bold' }}>💰 Khoảng Giá Thầu</span>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                Giá Tối Thiểu
              </label>
              <InputNumber
                placeholder="0"
                style={{ width: '100%' }}
                value={filters.priceMin}
                onChange={(value) =>
                  handleFilterChange({ priceMin: value || undefined })
                }
                min={0}
              />
            </div>
            <span style={{ color: '#d9d9d9', fontWeight: 'bold' }}>—</span>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                Giá Tối Đa
              </label>
              <InputNumber
                placeholder="999999"
                style={{ width: '100%' }}
                value={filters.priceMax}
                onChange={(value) =>
                  handleFilterChange({ priceMax: value || undefined })
                }
                min={0}
              />
            </div>
          </div>
        </Space>
      ),
    },
    {
      key: 'category',
      label: <span style={{ fontSize: '16px', fontWeight: 'bold' }}>📦 Danh Mục</span>,
      children: (
        <Select
          placeholder="Chọn danh mục"
          style={{ width: '100%' }}
          value={filters.categoryId || undefined}
          onChange={(value) =>
            handleFilterChange({ categoryId: value })
          }
          allowClear
          options={[
            { label: 'Tất Cả Danh Mục', value: undefined },
            ...categories.map((cat) => ({
              label: cat.name,
              value: cat.category_id,
            })),
          ]}
        />
      ),
    },
    {
      key: 'status',
      label: <span style={{ fontSize: '16px', fontWeight: 'bold' }}>⏱️ Trạng Thái</span>,
      children: (
        <Radio.Group
          value={filters.status}
          onChange={(e) =>
            handleFilterChange({ status: e.target.value })
          }
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {AUCTION_STATUS_FILTER_OPTIONS.map((option, idx) => (
              <Radio
                key={option.value}
                value={option.value}
                style={{ marginBottom: idx < AUCTION_STATUS_FILTER_OPTIONS.length - 1 ? '8px' : undefined }}
              >
                {option.label}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      ),
    },
    {
      key: 'sort',
      label: <span style={{ fontSize: '16px', fontWeight: 'bold' }}>🔀 Sắp Xếp Theo</span>,
      children: (
        <Select
          placeholder="Sắp xếp theo"
          style={{ width: '100%' }}
          value={filters.sortBy || 'default'}
          onChange={(value) =>
            handleFilterChange({ sortBy: isSortByOption(value) ? value : undefined })
          }
          allowClear
          options={[
            { label: 'Mặc Định', value: 'default' },
            { label: '💸 Giá: Thấp đến Cao', value: 'price-asc' },
            { label: '💰 Giá: Cao đến Thấp', value: 'price-desc' },
            { label: '⏰ Kết Thúc Sớm Nhất', value: 'time-remaining' },
            { label: '✨ Mới Nhất', value: 'newest' },
          ]}
        />
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FilterOutlined style={{ fontSize: '22px', color: '#1890ff' }} />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#262626' }}>
              Bộ Lọc Sản Phẩm
            </div>
            {activeFilterCount > 0 && (
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                {activeFilterCount} bộ lọc đang được áp dụng
              </div>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Badge count={activeFilterCount} style={{ marginLeft: 'auto', backgroundColor: '#1890ff' }} />
          )}
        </div>
      }
      bordered={false}
      style={{
        borderRadius: '8px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Collapse 
        items={items} 
        defaultActiveKey={['price', 'category']}
        style={{ borderRadius: '6px' }}
      />

      <Divider style={{ margin: '16px 0' }} />

      <Space style={{ width: '100%' }} direction="vertical" size="middle">
        <Button
          block
          icon={<ClearOutlined />}
          onClick={clearFilters}
          size="large"
        >
          Xóa Bộ Lọc
        </Button>
        <Button
          block
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => onFilterChange(filters)}
          size="large"
          style={{
            background: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)',
            borderColor: 'transparent',
          }}
        >
          Áp Dụng Bộ Lọc
        </Button>
      </Space>
    </Card>
  );
};
