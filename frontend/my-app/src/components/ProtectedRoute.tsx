import React from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Button } from 'antd';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // Optional - nếu không pass, không check role
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  // Không có token -> redirect to login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    // Chỉ kiểm tra role nếu có pass requiredRole
    if (requiredRole && user.role !== requiredRole) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status="403"
            title="Truy cập bị từ chối"
            subTitle={`Bạn không có quyền truy cập. Chỉ ${requiredRole} mới có thể vào trang này.`}
            extra={
              <Button type="primary" href="/marketplace">
                Về Marketplace
              </Button>
            }
          />
        </div>
      );
    }

    // Có token + (không yêu cầu role hoặc role đúng) -> render children
    return <>{children}</>;
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
};
