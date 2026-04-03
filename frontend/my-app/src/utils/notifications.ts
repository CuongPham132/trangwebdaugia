/**
 * Notification utilities - Quản lý thông báo trong localStorage
 */

export interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

// Add notification to localStorage
export const addNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
  const notifications = getNotifications();
  const newNotif: NotificationItem = {
    id: Date.now().toString(),
    message,
    type,
    timestamp: Date.now(),
  };
  const updated = [newNotif, ...notifications].slice(0, 20); // Keep last 20
  localStorage.setItem('notifications', JSON.stringify(updated));
  
  // Trigger custom event để Header component lắng nghe
  window.dispatchEvent(new CustomEvent('notificationAdded', { detail: newNotif }));
};

// Get all notifications
export const getNotifications = (): NotificationItem[] => {
  try {
    const stored = localStorage.getItem('notifications');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

// Clear all notifications
export const clearNotifications = () => {
  localStorage.removeItem('notifications');
  window.dispatchEvent(new CustomEvent('notificationsCleared'));
};

// Notification helpers
export const notifySuccess = (message: string) => addNotification(message, 'success');
export const notifyError = (message: string) => addNotification(message, 'error');
export const notifyWarning = (message: string) => addNotification(message, 'warning');
export const notifyInfo = (message: string) => addNotification(message, 'info');

// Specific product notifications
export const notifyProductSold = (productTitle: string, totalPrice: number) => {
  notifySuccess(`✅ Sản phẩm "${productTitle}" đã bán được! Tổng giá: $${totalPrice.toLocaleString()}`);
};

export const notifyBidPlaced = (productTitle: string, bidAmount: number) => {
  notifyInfo(`📢 Bạn vừa đặt giá cho "${productTitle}": $${bidAmount.toLocaleString()}`);
};

export const notifyAuctionEnding = (productTitle: string) => {
  notifyWarning(`⏰ Đấu giá cho "${productTitle}" sắp kết thúc! Nhanh tay đặt giá!`);
};

export const notifyAuctionExtended = (productTitle: string) => {
  notifyInfo(`🔄 Đấu giá "${productTitle}" được mở rộng 30 giây!`);
};

export const notifyOutbid = (productTitle: string) => {
  notifyWarning(`😢 Bạn đã bị vượt qua ở "${productTitle}"!`);
};
