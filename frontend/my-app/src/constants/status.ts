import type { AuctionStatus } from '../types';

export const AUCTION_STATUS_FILTER_OPTIONS: Array<{ value: AuctionStatus; label: string }> = [
  { value: 'pending', label: '🟠 Chờ Duyệt' },
  { value: 'active', label: '🟢 Đang Diễn Ra' },
  { value: 'upcoming', label: '🟡 Sắp Diễn Ra' },
  { value: 'ended', label: '🔴 Đã Kết Thúc' },
  { value: 'sold', label: '🔵 Đã Bán' },
];

export const getAuctionStatusTagColor = (status: AuctionStatus): string => {
  switch (status) {
    case 'active':
      return 'green';
    case 'upcoming':
    case 'pending':
      return 'gold';
    case 'sold':
      return 'blue';
    case 'ended':
      return 'red';
    default:
      return 'default';
  }
};

export const getAuctionStatusLabel = (status: AuctionStatus): string => {
  switch (status) {
    case 'pending':
      return 'Chờ duyệt';
    case 'active':
      return 'Đang diễn ra';
    case 'upcoming':
      return 'Sắp diễn ra';
    case 'ended':
      return 'Đã kết thúc';
    case 'sold':
      return 'Đã bán';
    default:
      return 'Đang cập nhật';
  }
};

export const getAuctionStatusBadgeText = (status: AuctionStatus): string => {
  switch (status) {
    case 'pending':
      return '⏳ Chờ duyệt';
    case 'active':
      return '🔴 Đang diễn ra';
    case 'upcoming':
      return '⏳ Sắp diễn ra';
    case 'ended':
      return '✓ Đã kết thúc';
    case 'sold':
      return '✅ Đã bán';
    default:
      return 'Đang cập nhật';
  }
};

export const getAuctionActionText = (status: AuctionStatus): string => {
  switch (status) {
    case 'active':
      return 'Đặt giá';
    case 'upcoming':
    case 'pending':
      return 'Sắp mở đấu giá';
    case 'sold':
      return 'Đã bán';
    case 'ended':
      return 'Đã kết thúc';
    default:
      return 'Không khả dụng';
  }
};

export const getAuctionInactiveMessage = (status: AuctionStatus): string => {
  switch (status) {
    case 'upcoming':
    case 'pending':
      return 'Phiên đấu giá này chưa bắt đầu';
    case 'sold':
      return 'Sản phẩm đã được bán thành công';
    case 'ended':
      return 'Phiên đấu giá này đã kết thúc';
    default:
      return 'Phiên đấu giá không khả dụng';
  }
};

export const isAuctionActive = (status: AuctionStatus): boolean => status === 'active';
