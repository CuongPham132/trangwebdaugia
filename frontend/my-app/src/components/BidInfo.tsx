import React from 'react';
import { motion } from 'framer-motion';

interface BidInfoProps {
  currentPrice: number;
  highestBid: number;
  minIncrement: number;
  totalBids: number;
}

export const BidInfo: React.FC<BidInfoProps> = ({
  currentPrice,
  highestBid,
  minIncrement,
  totalBids,
}) => {
  return (
    <div className="space-y-2">
      <motion.div
        className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-3 rounded-lg"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-xs text-gray-200">Giá hiện tại</p>
        <p className="text-xl font-bold">${currentPrice.toLocaleString()}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-100 p-2 rounded">
          <p className="text-xs text-gray-500">Bid cao nhất</p>
          <p className="text-lg font-bold text-gray-800">
            ${highestBid.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-100 p-2 rounded">
          <p className="text-xs text-gray-500">Lượt đấu giá</p>
          <p className="text-lg font-bold text-gray-800">{totalBids}</p>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        💬 Bid tối thiểu: ${(currentPrice + minIncrement).toLocaleString()}
      </div>
    </div>
  );
};
