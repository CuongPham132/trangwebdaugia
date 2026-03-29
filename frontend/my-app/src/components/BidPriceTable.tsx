import React from 'react';
import { Table, Card, Statistic, Row, Col, Tag, Divider } from 'antd';
import type { TableColumnsType } from 'antd';
import { getAuctionStatusLabel } from '../constants/status';
import type { AuctionStatus } from '../types';

interface BidPriceTableProps {
  currentPrice: number;
  highestBid: number;
  minIncrement: number;
  totalBids: number;
  status: AuctionStatus;
}

export const BidPriceTable: React.FC<BidPriceTableProps> = ({
  currentPrice,
  highestBid,
  minIncrement,
  totalBids,
  status,
}) => {
  interface PriceTier {
    key: number;
    currentBid: string;
    nextBid: string;
    minIncrement: string;
    status: string;
  }

  // Generate price tiers based on current bid
  const generatePriceTiers = (): PriceTier[] => {
    const baseBid = highestBid || currentPrice;
    return [
      {
        key: 1,
        currentBid: baseBid.toLocaleString('vi-VN'),
        nextBid: (baseBid + minIncrement).toLocaleString('vi-VN'),
        minIncrement: minIncrement.toLocaleString('vi-VN'),
        status: '✓ Hiện tại',
      },
      {
        key: 2,
        currentBid: (baseBid + minIncrement).toLocaleString('vi-VN'),
        nextBid: (baseBid + minIncrement * 2).toLocaleString('vi-VN'),
        minIncrement: minIncrement.toLocaleString('vi-VN'),
        status: 'Tiếp theo',
      },
      {
        key: 3,
        currentBid: (baseBid + minIncrement * 2).toLocaleString('vi-VN'),
        nextBid: (baseBid + minIncrement * 3).toLocaleString('vi-VN'),
        minIncrement: minIncrement.toLocaleString('vi-VN'),
        status: 'Tiếp theo',
      },
      {
        key: 4,
        currentBid: (baseBid + minIncrement * 3).toLocaleString('vi-VN'),
        nextBid: (baseBid + minIncrement * 4).toLocaleString('vi-VN'),
        minIncrement: minIncrement.toLocaleString('vi-VN'),
        status: 'Tiếp theo',
      },
    ];
  };

  const columns: TableColumnsType<PriceTier> = [
    {
      title: '💰 Giá Hiện Tại',
      dataIndex: 'currentBid',
      key: 'currentBid',
      width: '25%',
      render: (text: string, record: PriceTier) => (
        <span style={{ fontWeight: 'bold', color: record.status === '✓ Hiện tại' ? '#d9534f' : '#333' }}>
          ₫{text}
        </span>
      ),
    },
    {
      title: '⬆️ Bước Nhảy',
      dataIndex: 'minIncrement',
      key: 'minIncrement',
      width: '25%',
      render: (text: string) => (
        <span style={{ color: '#ff7a45', fontWeight: 600 }}>
          ₫{text}
        </span>
      ),
    },
    {
      title: '👉 Giá Đặt Tiếp',
      dataIndex: 'nextBid',
      key: 'nextBid',
      width: '30%',
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
          ₫{text}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: '20%',
      render: (text: string) => (
        <Tag color={text === '✓ Hiện tại' ? 'red' : 'green'}>
          {text}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ marginTop: '24px' }}>
      <Card
        title="📊 Bảng Giá Đấu Giá"
        style={{ borderRadius: '12px' }}
        bodyStyle={{ padding: '16px' }}
      >
        {/* Summary Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#fff8f0', border: '1px solid #ffd9bf' }} bordered={false}>
              <Statistic
                title="💵 Giá Hiện Tại"
                value={highestBid || currentPrice}
                prefix="₫"
                valueStyle={{ color: '#d9534f', fontSize: '18px' }}
                formatter={(value) =>
                  (value as number).toLocaleString('vi-VN')
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#fff8f0', border: '1px solid #ffd9bf' }} bordered={false}>
              <Statistic
                title="📈 Bước Nhảy"
                value={minIncrement}
                prefix="₫"
                valueStyle={{ color: '#ff7a45', fontSize: '18px' }}
                formatter={(value) =>
                  (value as number).toLocaleString('vi-VN')
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f0f9ff', border: '1px solid #b5d8ff' }} bordered={false}>
              <Statistic
                title="🎯 Đặt Tối Thiểu"
                value={(highestBid || currentPrice) + minIncrement}
                prefix="₫"
                valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                formatter={(value) =>
                  (value as number).toLocaleString('vi-VN')
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f0f5ff', border: '1px solid #d9e8fc' }} bordered={false}>
              <Statistic
                title="🔥 Tổng Lượt Đấu"
                value={totalBids}
                valueStyle={{ color: '#1890ff', fontSize: '18px' }}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Price Tiers Table */}
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ marginBottom: '12px', fontWeight: 600, color: '#222' }}>
            📋 Cấp Độ Giá Đấu Giá
          </h4>
          <Table
            dataSource={generatePriceTiers()}
            columns={columns}
            pagination={false}
            size="small"
            bordered
            style={{ background: 'white' }}
          />
        </div>

        {/* Info Box */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '6px',
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            ℹ️ <strong>Hướng dẫn:</strong> Khi bạn đặt giá mới, nó phải cao hơn giá hiện tại ít nhất{' '}
            <span style={{ color: '#ff7a45', fontWeight: 'bold' }}>
              ₫{minIncrement.toLocaleString('vi-VN')}
            </span>{' '}
            (bước nhảy tối thiểu). Bảng trên cho thấy các mức giá có thể đặt tiếp theo.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#8c8c8c' }}>
            Trạng thái phiên: {getAuctionStatusLabel(status)}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BidPriceTable;
