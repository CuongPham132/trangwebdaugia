import React from 'react';
import { motion } from 'framer-motion';
import { message } from 'antd';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface BidModalProps {
  isOpen: boolean;
  productTitle: string;
  currentPrice: number;
  minBid: number;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  loading?: boolean;
  error?: string;
  errorCode?: string;
  walletBalance?: number;
  lockedBalance?: number;
}

export const BidModal: React.FC<BidModalProps> = ({
  isOpen,
  productTitle,
  currentPrice,
  minBid,
  onClose,
  onSubmit,
  loading = false,
  error,
  errorCode,
  walletBalance = 0,
  lockedBalance = 0,
}) => {
  const [bidAmount, setBidAmount] = React.useState(minBid);
  const totalAvailable = walletBalance + lockedBalance;

  React.useEffect(() => {
    setBidAmount(minBid);
  }, [minBid, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (bidAmount < minBid) {
      message.warning(`Bid toi thieu la $${minBid}`);
      return;
    }
    onSubmit(bidAmount);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">💰 Đặt giá</h2>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Error Messages */}
        {error && (
          <motion.div
            className={`mb-6 p-4 rounded-lg border-2 ${
              errorCode === 'RACE_CONDITION'
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-red-50 border-red-300'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex gap-2">
              <WarningOutlined
                className={
                  errorCode === 'RACE_CONDITION'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }
                style={{ fontSize: '18px' }}
              />
              <div>
                <p
                  className={
                    errorCode === 'RACE_CONDITION'
                      ? 'text-sm text-yellow-700'
                      : 'text-sm text-red-700'
                  }
                >
                  {error}
                </p>
                {errorCode === 'RACE_CONDITION' && (
                  <p className="text-xs text-yellow-600 mt-2">
                    💡 Hãy cập nhật giá và thử lại
                  </p>
                )}
                {errorCode === 'INSUFFICIENT_BALANCE' && (
                  <p className="text-xs text-red-600 mt-2">
                    💰 <a href="/wallet/page">Nạp tiền vào ví</a> để tiếp tục đấu giá
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Wallet Info */}
        {walletBalance !== undefined && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-6">
            <p className="text-xs text-blue-700">
              💳 Số dư ví: <span className="font-bold">${totalAvailable.toFixed(2)}</span>
              {' '}(Khả dụng: ${walletBalance.toFixed(2)}, Khóa: $
              {lockedBalance.toFixed(2)})
            </p>
          </div>
        )}

        {/* Product Info */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl mb-6">
          <p className="text-sm text-gray-600">Sản phẩm</p>
          <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
            {productTitle}
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Giá hiện tại: <span className="font-bold text-red-600">${currentPrice}</span>
          </p>
        </div>

        {/* Bid Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            💵 Nhập giá đấu
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              min={minBid}
              className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-lg font-bold"
              placeholder="0.00"
              disabled={loading}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            ⚠️ Giá tối thiểu: <span className="font-bold">${minBid}</span>
          </p>
        </div>

        {/* Info */}
        {bidAmount > minBid && (
          <motion.div
            className="bg-green-50 border border-green-200 p-3 rounded-lg mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-green-700">
              ✅ Giá hợp lệ! Bạn sẽ đặt giá ${bidAmount.toLocaleString()}
            </p>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <motion.button
            className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </motion.button>
          <motion.button
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '⏳ Đang xử lý...' : '🎯 Đặt giá'}
          </motion.button>
        </div>

        {/* Warning */}
        <p className="text-xs text-gray-500 text-center mt-4">
          ⚠️ Khi đặt giá, bạn sẽ cam kết mua sản phẩm này nếu thắng đấu giá
        </p>
      </motion.div>
    </motion.div>
  );
};
