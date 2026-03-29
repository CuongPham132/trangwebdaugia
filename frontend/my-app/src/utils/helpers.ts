// Utility functions
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US').format(price);
};

export const formatCurrency = (price: number): string => {
  return `$${formatPrice(price)}`;
};

export const getStatusColor = (status: 'pending' | 'upcoming' | 'active' | 'ended' | 'sold'): string => {
  switch (status) {
    case 'pending':
      return 'bg-orange-500';
    case 'active':
      return 'bg-green-500';
    case 'ended':
      return 'bg-red-500';
    case 'upcoming':
      return 'bg-yellow-500';
    case 'sold':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

export const getStatusText = (status: 'pending' | 'upcoming' | 'active' | 'ended' | 'sold'): string => {
  switch (status) {
    case 'pending':
      return '🟠 Chờ duyệt';
    case 'active':
      return '🔴 Đang diễn ra';
    case 'ended':
      return '✅ Đã kết thúc';
    case 'upcoming':
      return '⏳ Sắp diễn ra';
    case 'sold':
      return '🔵 Đã bán';
    default:
      return 'Không xác định';
  }
};

export const formatTimeRemaining = (endTime: string): string => {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const diff = end - now;

  if (diff <= 0) return 'Kết thúc';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const validateBidAmount = (
  bidAmount: number,
  currentPrice: number,
  minIncrement: number
): { valid: boolean; message?: string } => {
  const minBid = currentPrice + minIncrement;

  if (bidAmount < minBid) {
    return {
      valid: false,
      message: `Bid tối thiểu là $${minBid}`,
    };
  }

  return { valid: true };
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
