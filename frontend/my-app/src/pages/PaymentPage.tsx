import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { orderAPI } from '../services/api';
import { OrderPayment } from '../components/OrderPayment';
import type { Order } from '../types';
import type { RootState } from '../stores';

const PaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || isNaN(Number(orderId))) {
        setError('Order ID không hợp lệ');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await orderAPI.getOrder(Number(orderId));
        if (response.data?.data) {
          const fetchedOrder = response.data.data as Order;
          
          // Verify user is buyer
          if (fetchedOrder.buyer_id !== user?.user_id) {
            setError('Bạn không có quyền thanh toán order này');
            return;
          }
          
          setOrder(fetchedOrder);
        } else {
          setError('Order không tồn tại');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Không thể lấy thông tin order';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user?.user_id]);

  const handlePaymentSuccess = (updatedOrder: Order) => {
    // Show success page
    setOrder(updatedOrder);
    
    // Auto redirect after 3 seconds
    setTimeout(() => {
      navigate('/orders');
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card bg-white shadow-lg w-full max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title text-error justify-center mb-4">Lỗi</h2>
            <p className="text-error mb-6">{error}</p>
            <button
              onClick={() => navigate('/orders')}
              className="btn btn-primary w-full"
            >
              Quay lại Đơn hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card bg-white shadow-lg w-full max-w-md">
          <div className="card-body text-center">
            <p className="text-gray-500">Order không tìm thấy</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/orders')}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {order.payment_status === 'paid' ? '✓ Thanh toán thành công' : 'Thanh toán Order'}
          </h1>
          <p className="text-gray-600 mt-2">Order #{order.order_id}</p>
        </div>

        {/* Main Card */}
        <div className="card bg-white shadow-lg border border-gray-200">
          <div className="card-body">
            {/* Product Info */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Sản phẩm</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-2">Tên sản phẩm</p>
                <p className="text-lg font-semibold mb-4">{order.product_title}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600 text-sm">Giá cuối cùng</p>
                    <p className="text-2xl font-bold text-red-600">
                      {order.final_price.toLocaleString()}₫
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Trạng thái thanh toán</p>
                    <p className={`badge badge-lg mt-1 ${
                      order.payment_status === 'paid'
                        ? 'badge-success'
                        : order.payment_status === 'failed'
                        ? 'badge-error'
                        : 'badge-warning'
                    }`}>
                      {order.payment_status}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  Ngày tạo: {new Date(order.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="divider"></div>
            
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Thanh toán</h2>
              <OrderPayment
                order={order}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={() => {}}
              />
            </div>

            {/* Success Message */}
            {order.payment_status === 'paid' && (
              <div className="alert alert-success mb-4">
                <svg
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="font-bold">Thanh toán thành công!</h3>
                  <div className="text-sm">Chúc mừng bạn đã trúng đấu giá. Vui lòng cập nhật địa chỉ giao hàng.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => navigate('/orders')}
            className="btn btn-ghost flex-1"
          >
            Danh sách đơn hàng
          </button>
          {order.payment_status === 'paid' && (
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary flex-1"
            >
              Tiếp tục mua sắm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
