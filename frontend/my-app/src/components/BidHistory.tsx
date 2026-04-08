import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { bidAPI } from '../services/api';

interface BidHistory {
  bid_id: number;
  bidder_username: string;
  bid_amount: number;
  bid_time: string;
}

interface BidHistoryProps {
  productId: number;
}

export const BidHistory: React.FC<BidHistoryProps> = ({ productId }) => {
  const [bids, setBids] = useState<BidHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBidHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await bidAPI.getHistory(productId);
        
        // Map backend response to component interface
        const bidHistoryData = response.data.data.bid_history || [];
        const mappedBids = bidHistoryData.map((bid: any) => ({
          bid_id: bid.bid_id,
          bidder_username: bid.username,
          bid_amount: bid.bid_amount,
          bid_time: bid.bid_time,
        }));
        
        setBids(mappedBids);
      } catch (error) {
        console.error('Error fetching bid history:', error);
        setError('Không thể tải lịch sử đấu giá');
        setBids([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBidHistory();
  }, [productId]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">⏳ Đang tải lịch sử đấu giá...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600">❌ {error}</p>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">Chưa có ai đấu giá</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-3">
      {bids.map((bid, index) => (
        <motion.div
          key={bid.bid_id}
          className={`p-3 rounded-lg flex justify-between items-center ${
            index === 0 ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-100'
          }`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div>
            <p className="font-bold text-sm text-gray-800">
              {index === 0 ? '🥇 ' : ''} {bid.bidder_username}
            </p>
            <p className="text-xs text-gray-600">
              {new Date(bid.bid_time).toLocaleTimeString()}
            </p>
          </div>
          <p className="font-bold text-red-600">${bid.bid_amount}</p>
        </motion.div>
      ))}
    </motion.div>
  );
};
