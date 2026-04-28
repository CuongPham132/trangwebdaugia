import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
  initialQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  debounceMs = 300,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query.trim());
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form
      style={{ width: '100%' }}
      onSubmit={handleSearch}
    >
      <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
        <Input
          type="text"
          placeholder="🔍 Tìm kiếm theo tên hoặc mô tả sản phẩm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<SearchOutlined />}
          size="large"
          style={{
            borderRadius: '8px',
            flex: 1,
          }}
        />
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          style={{
            borderRadius: '8px',
            minWidth: '100px',
          }}
        >
          Tìm kiếm
        </Button>
      </div>
    </form>
  );
};
