import React from 'react';
import { OrderHistory } from '../components';

const OrdersPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đơn hàng của tôi</h1>
          <p className="text-gray-600">Quản lý các đơn hàng và thanh toán</p>
        </div>

        {/* Tabs or Filter Options could go here */}
        <div className="mb-6">
          <div className="tabs tabs-bordered">
            <input
              type="radio"
              name="order_tabs"
              className="tab"
              label="Tất cả"
              defaultChecked
            />
            <div className="tab-content p-4">
              <OrderHistory />
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Hướng dẫn</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click "Thanh toán" để thanh toán đơn hàng chưa thanh toán</li>
            <li>• Cập nhật địa chỉ giao hàng sau khi thanh toán thành công</li>
            <li>• Theo dõi trạng thái giao hàng của đơn hàng</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
