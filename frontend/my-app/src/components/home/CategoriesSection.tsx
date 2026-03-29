import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Skeleton } from 'antd';

interface CategoryItem {
  categoryId: number;
  icon: string;
  name: string;
  count: number;
}

interface CategoriesSectionProps {
  expand: boolean;
  onToggle: () => void;
  categories: CategoryItem[];
  loading: boolean;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  expand,
  onToggle,
  categories,
  loading,
}) => {
  return (
    <section style={{ background: 'linear-gradient(to right, #f0f5ff, #f9f0ff)', borderBottom: '1px solid #e6f4ff', padding: '16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Button
          block
          onClick={onToggle}
          type="primary"
          size="large"
          style={{
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            borderColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🏷️</span>
          <span>Danh Mục</span>
          <motion.span
            style={{ fontSize: '20px', marginLeft: 'auto' }}
            animate={{ rotate: expand ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ⌄
          </motion.span>
        </Button>

        <AnimatePresence>
          {expand && (
            <motion.div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginTop: '16px',
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <Card key={idx} style={{ borderRadius: '8px' }}>
                      <Skeleton active title={false} paragraph={{ rows: 2 }} />
                    </Card>
                  ))
                : categories.map((cat) => (
                    <Link key={cat.categoryId} to={`/marketplace?category=${cat.categoryId}`}>
                      <Card hoverable style={{ cursor: 'pointer', borderRadius: '8px' }}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                          <p
                            style={{
                              fontWeight: 600,
                              color: '#262626',
                              fontSize: '14px',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              textAlign: 'center',
                            }}
                          >
                            {cat.name}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
