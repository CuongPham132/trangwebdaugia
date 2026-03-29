import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AuctionStatus } from '../types';

interface CountdownTimerProps {
  endTime: string;
  status: AuctionStatus;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  status,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetDate = new Date(endTime).getTime();
      const now = new Date().getTime();
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
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (status === 'ended') {
    return (
      <div className="text-red-600 font-bold text-sm">
        ⏱️ Đã kết thúc
      </div>
    );
  }

  if (status === 'upcoming') {
    return (
      <div className="text-yellow-600 font-bold text-sm">
        ⏰ Sắp bắt đầu
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="text-yellow-600 font-bold text-sm">
        ⏳ Chờ duyệt
      </div>
    );
  }

  if (status === 'sold') {
    return (
      <div className="text-blue-600 font-bold text-sm">
        ✅ Đã bán
      </div>
    );
  }

  return (
    <motion.div
      className="text-orange-600 font-bold text-sm"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      ⏳ {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </motion.div>
  );
};
