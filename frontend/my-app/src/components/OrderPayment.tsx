import React, { useState } from 'react';
import { orderAPI } from '../services/api';
import type { Order } from '../types';

interface OrderPaymentProps {
  order: Order;
  onPaymentSuccess?: (order: Order) => void;
  onPaymentError?: (error: string) => void;
}

export const OrderPayment: React.FC<OrderPaymentProps> = ({
  order,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 🐛 Debug: log order data on mount
  React.useEffect(() => {
    console.log('🐛 OrderPayment received order:', {
      order_id: order.order_id,
      product_title: order.product_title,
      final_price: order.final_price,
      payment_status: order.payment_status,
    });
  }, [order]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // ⭐ Debug: log EVERYTHING about the order and what we're sending
      const payloadToSend = { order_id: Number(order.order_id) };
      
      console.log('🐛 [OrderPayment] === PAYMENT DEBUG ===');
      console.log('🐛 [OrderPayment] order object:', order);
      console.log('🐛 [OrderPayment] order.order_id:', order.order_id, 'typeof:', typeof order.order_id);
      console.log('🐛 [OrderPayment] Number(order.order_id):', Number(order.order_id));
      console.log('🐛 [OrderPayment] Payload to send:', payloadToSend);
      console.log('🐛 [OrderPayment] JSON.stringify(payload):', JSON.stringify(payloadToSend));

      // Validate order_id exists and is a number
      if (!order.order_id && order.order_id !== 0) {
        const errMsg = `Order ID không hợp lệ: order.order_id = ${order.order_id}`;
        console.error('❌ [OrderPayment] Frontend validation failed:', errMsg);
        throw new Error(errMsg);
      }

      const orderId = Number(order.order_id);
      if (isNaN(orderId) || orderId <= 0) {
        const errMsg = `Order ID phải là số dương: ${orderId}`;
        console.error('❌ [OrderPayment] Number conversion failed:', errMsg);
        throw new Error(errMsg);
      }

      console.log('✅ [OrderPayment] Frontend validation passed. Sending payment request...');
      const response = await orderAPI.paymentOrder({ order_id: orderId });
      
      if (response.data?.data) {
        setSuccess(true);
        onPaymentSuccess?.(response.data.data as Order);
      } else {
        throw new Error('Thanh toán thất bại');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Thanh toán thất bại';
      console.error('❌ [OrderPayment] Payment error:', errorMsg, 'Full error:', err);
      setError(errorMsg);
      onPaymentError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (order.payment_status === 'paid') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-700 font-medium">✓ Đã thanh toán</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Sản phẩm:</span>
          <span className="font-medium">{order.product_title}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Giá cuối cùng:</span>
          <span className="font-bold text-lg text-red-600">
            {order.final_price.toLocaleString()}₫
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trạng thái:</span>
          <span className="badge badge-warning">{order.payment_status}</span>
        </div>
      </div>

      {error && (
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
              d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
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
          <span>Thanh toán thành công!</span>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading || order.payment_status === 'paid'}
        className="btn btn-primary w-full"
      >
        {loading ? 'Đang xử lý...' : 'Thanh toán ngay'}
      </button>
    </div>
  );
};
