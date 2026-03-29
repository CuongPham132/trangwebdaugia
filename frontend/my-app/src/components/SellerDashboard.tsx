import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  totalAuctions?: number;
  activeAuctions?: number;
  totalRevenue?: number;
  totalBids?: number;
  chartData?: Array<{
    name: string;
    revenue: number;
    bids: number;
  }>;
}

interface SellerDashboardProps {
  stats: DashboardStats;
}

const COLORS = ['#FF6B6B', '#FFA500', '#4ECDC4', '#44AF69'];

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ stats }) => {
  const chartData = stats.chartData || [
    { name: 'Tuần 1', revenue: 400, bids: 24 },
    { name: 'Tuần 2', revenue: 300, bids: 13 },
    { name: 'Tuần 3', revenue: 200, bids: 9 },
    { name: 'Tuần 4', revenue: 278, bids: 39 },
  ];

  const pieData = [
    { name: 'Đang diễn', value: stats.activeAuctions || 5 },
    { name: 'Kết thúc', value: (stats.totalAuctions || 20) - (stats.activeAuctions || 5) },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: '📊 Tổng đấu giá', value: stats.totalAuctions || 0, icon: '🏆' },
          { title: '🔥 Đang diễn', value: stats.activeAuctions || 0, icon: '⚡' },
          { title: '💰 Doanh thu', value: `$${stats.totalRevenue || 0}`, icon: '💵' },
          { title: '💬 Lượt đấu giá', value: stats.totalBids || 0, icon: '🎯' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            className="bg-gradient-to-br from-blue-500 to-purple-500 text-white p-6 rounded-xl shadow-lg"
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">{stat.title}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          className="col-span-2 bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Doanh thu theo tuần</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FF6B6B"
                strokeWidth={2}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Auction Status Pie */}
        <motion.div
          className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">🥧 Trạng thái đấu giá</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(e) => e.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bids Chart */}
      <motion.div
        className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow"
        whileHover={{ y: -5 }}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Lượt đấu giá theo tuần</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="bids" fill="#FFA500" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
};
