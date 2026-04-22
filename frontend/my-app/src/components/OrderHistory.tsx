import React, { useEffect, useState } from 'react';
import { orderAPI } from '../services/api';
import type { Order } from '../types';
import { OrderPayment } from './OrderPayment';

interface OrderHistoryProps {
  showPaymentModal?: boolean;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ showPaymentModal = false }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getMyOrders();
        console.log('🐛 Raw API response:', response.data);
        
        if (response.data?.data) {
          const ordersData = response.data.data as Order[];
          console.log('🐛 Parsed orders:', ordersData);
          console.log('🐛 First order structure:', ordersData[0]);
          setOrders(ordersData);
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Không thể lấy danh sách orders';
        setError(errorMsg);
        console.error('Fetch orders error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handlePaymentSuccess = (updatedOrder: Order) => {
    setOrders(orders.map(o => o.order_id === updatedOrder.order_id ? updatedOrder : o));
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 6v2"
          />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Bạn chưa có order nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.order_id} className="card bg-base-100 shadow-md border border-gray-200">
          <div className="card-body">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="card-title text-lg mb-2">{order.product_title}</h3>
                <p className="text-sm text-gray-500">Order #{order.order_id}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">
                  {order.final_price.toLocaleString()}₫
                </div>
                <div className="mt-2 space-x-2">
                  <span className={`badge ${
                    order.payment_status === 'paid'
                      ? 'badge-success'
                      : order.payment_status === 'failed'
                      ? 'badge-error'
                      : 'badge-warning'
                  }`}>
                    {order.payment_status}
                  </span>
                  <span className={`badge ${
                    order.status === 'delivered'
                      ? 'badge-success'
                      : order.status === 'cancelled'
                      ? 'badge-error'
                      : 'badge-info'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="divider my-2"></div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-600">Giao hàng:</p>
                <p className="font-medium">
                  {order.shipping_name || 'Chưa cập nhật'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Ngày tạo:</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="card-actions justify-end gap-2">
              {order.payment_status !== 'paid' && (
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="btn btn-primary btn-sm"
                >
                  Thanh toán
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(order)}
                className="btn btn-ghost btn-sm"
              >
                Chi tiết
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Payment Modal */}
      {selectedOrder && (
        <div className="modal modal-open">
          <div className="modal-box w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">
              {selectedOrder.payment_status === 'paid'
                ? 'Chi tiết Order'
                : 'Thanh toán Order'}
            </h3>

            <OrderPayment
              order={selectedOrder}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={() => {}}
            />

            <div className="modal-action mt-6">
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn btn-ghost"
              >
                Đóng
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setSelectedOrder(null)}
          ></div>
        </div>
      )}
    </div>
  );
};
