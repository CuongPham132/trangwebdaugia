import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getServerTime } from '../services/api';
import type { AuctionStatus } from '../types';

interface CountdownTimerProps {
  endTime: string;
  status: AuctionStatus;
  extensionCount?: number;
  maxExtensions?: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimerComponent: React.FC<CountdownTimerProps> = ({
  endTime,
  status,
  extensionCount = 0,
  maxExtensions = 3,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Do not set state instantly - calculate on mount
    const calculateTimeLeft = () => {
      const targetDate = new Date(endTime).getTime();
      const now = getServerTime().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();

    // Only update every second if status is active
    if (status === 'active') {
      const timer = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [endTime, status]);

  // 🎯 Memoize static text renders
  const statusText = useMemo(() => {
    if (status === 'ended') {
      return <div className="text-red-600 font-bold text-sm">⏱️ Đã kết thúc</div>;
    }
    if (status === 'upcoming') {
      return <div className="text-yellow-600 font-bold text-sm">⏰ Sắp bắt đầu</div>;
    }
    if (status === 'pending') {
      return <div className="text-yellow-600 font-bold text-sm">⏳ Chờ duyệt</div>;
    }
    if (status === 'sold') {
      return <div className="text-blue-600 font-bold text-sm">✅ Đã bán</div>;
    }
    return null;
  }, [status]);

  if (statusText) {
    return <>{statusText}</>;
  }

  const isInFinalTen = timeLeft.minutes === 0 && timeLeft.seconds < 10;
  const timeString = `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;

  return (
    <div className="flex flex-col gap-2">
      <motion.div
        className="text-orange-600 font-bold text-sm"
        animate={{ scale: isInFinalTen ? [1, 1.05, 1] : 1 }}
        transition={{ duration: 2, repeat: Infinity }}
        key={`timer-${timeString}`}
      >
        ⏳ {timeString}
      </motion.div>
      {extensionCount > 0 && (
        <div className="text-xs text-purple-600">
          🔄 Mở rộng: {extensionCount}/{maxExtensions} lần
        </div>
      )}
      {isInFinalTen && extensionCount < maxExtensions && (
        <div className="text-xs text-red-500 animate-pulse">
          ⚠️ Đấu giá sẽ được mở rộng nếu có bid
        </div>
      )}
    </div>
  );
};

// 🚀 Memoize with shallow comparison
// Only re-render if endTime, status, or extension counts change
export const CountdownTimer = React.memo(
  CountdownTimerComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.endTime === nextProps.endTime &&
      prevProps.status === nextProps.status &&
      prevProps.extensionCount === nextProps.extensionCount &&
      prevProps.maxExtensions === nextProps.maxExtensions
    );
  }
);
