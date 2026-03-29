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
    <motion.form
      style={{ width: '100%' }}
      onSubmit={handleSearch}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
        <Input
          type="text"
          placeholder="🔍 Tìm kiếm sản phẩm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<SearchOutlined />}
          size="large"
          style={{
            borderRadius: '20px',
            flex: 1,
          }}
        />
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            style={{
              background: 'linear-gradient(135deg, #ff7a45 0%, #d9534f 100%)',
              borderColor: 'transparent',
              fontWeight: 'bold',
              borderRadius: '20px',
              minWidth: '100px',
            }}
          >
            Tìm kiếm
          </Button>
        </motion.div>
      </div>
    </motion.form>
  );
};
