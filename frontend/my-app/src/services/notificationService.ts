/**
 * Notification Service - Quản lý notifications qua Socket.io events
 * Lắng nghe các sự kiện từ backend và trigger notification tương ứng
 */

import { getSocket, connectSocket } from './socketService';
import {
  notifyBidPlaced,
  notifyOutbid,
  notifyAuctionEnding,
  notifySuccess,
  notifyWarning,
  notifyInfo,
  addNotification,
} from '../utils/notifications';

/**
 * Initialize notification listeners
 * Gọi khi app load hoặc user đăng nhập thành công
 */
export function initializeNotificationService(): void {
  const socket = getSocket() || connectSocket();

  console.log('🔔 Initializing Notification Service...');

  /**
   * Event: User đặt giá thành công
   * From: bidController.js - placeBid()
   */
  socket.on('new-bid', (data: any) => {
    console.log('📢 Event: new-bid received', data);
    
    const { product_id, bidder_username, bid_amount, bid_time, is_winning } = data;
    
    // Hiển thị notification
    notifyBidPlaced(
      `Sản phẩm #${product_id}`,
      bid_amount
    );
  });

  /**
   * Event: User bị vượt qua
   * From: Backend khi có bid mới cao hơn
   */
  socket.on('bid:outbid', (data: any) => {
    console.log('😢 Event: bid:outbid received', data);
    
    const { product_id, product_title, new_bid_amount } = data;
    
    notifyOutbid(product_title || `Sản phẩm #${product_id}`);
  });

  /**
   * Event: Đấu giá sắp kết thúc
   * From: Backend scheduler/countdown
   */
  socket.on('auction:ending-soon', (data: any) => {
    console.log('⏰ Event: auction:ending-soon received', data);
    
    const { product_id, product_title, time_remaining } = data;
    
    notifyAuctionEnding(product_title || `Sản phẩm #${product_id}`);
  });

  /**
   * Event: Kéo dài thời gian đấu giá (auto-extend)
   * From: Backend khi bid trong 10s cuối
   */
  socket.on('auction:extended', (data: any) => {
    console.log('🔄 Event: auction:extended received', data);
    
    const { product_id, product_title, new_end_time } = data;
    
    notifyInfo(
      `⏱️ Đấu giá "${product_title || `Sản phẩm #${product_id}`}" được mở rộng 30 giây!`
    );
  });

  /**
   * Event: User chiến thắng đấu giá
   * From: Backend khi đấu giá kết thúc
   */
  socket.on('auction:won', (data: any) => {
    console.log('🏆 Event: auction:won received', data);
    
    const { product_id, product_title, final_price } = data;
    
    notifySuccess(
      `🏆 Chúc mừng! Bạn đã chiến thắng đấu giá "${product_title || `Sản phẩm #${product_id}`}" với giá: ${final_price?.toLocaleString()}₫`
    );
  });

  /**
   * Event: Đấu giá kết thúc (user không thắng)
   * From: Backend khi đấu giá kết thúc
   */
  socket.on('auction:ended', (data: any) => {
    console.log('⏹️ Event: auction:ended received', data);
    
    const { product_id, product_title, winner_username } = data;
    
    notifyInfo(
      `Đấu giá "${product_title || `Sản phẩm #${product_id}`}" đã kết thúc. Người thắng: ${winner_username}`
    );
  });

  /**
   * Event: Cần thanh toán
   * From: Backend khi user thắng và chờ thanh toán
   */
  socket.on('payment:pending', (data: any) => {
    console.log('⏳ Event: payment:pending received', data);
    
    const { product_id, product_title, amount, order_id } = data;
    
    notifyWarning(
      `⏳ Vui lòng thanh toán cho đơn hàng #${order_id}: "${product_title || `Sản phẩm #${product_id}`}" - ${amount?.toLocaleString()}₫`
    );
  });

  /**
   * Event: Đã thanh toán thành công
   * From: orderController.js khi thanh toán xong
   */
  socket.on('payment:completed', (data: any) => {
    console.log('✅ Event: payment:completed received', data);
    
    const { product_id, product_title, order_id, amount } = data;
    
    notifySuccess(
      `✅ Bạn đã thanh toán thành công cho đơn hàng #${order_id}: "${product_title || `Sản phẩm #${product_id}`}" - ${amount?.toLocaleString()}₫`
    );
  });

  /**
   * Event: Đơn hàng được xác nhận
   * From: orderController.js khi seller xác nhận
   */
  socket.on('order:confirmed', (data: any) => {
    console.log('📦 Event: order:confirmed received', data);
    
    const { order_id, product_title, seller_username } = data;
    
    notifySuccess(
      `📦 Người bán "${seller_username}" đã xác nhận đơn hàng #${order_id}: "${product_title}"`
    );
  });

  /**
   * Event: Hàng đã gửi
   * From: orderController.js khi seller gửi hàng
   */
  socket.on('order:shipped', (data: any) => {
    console.log('🚚 Event: order:shipped received', data);
    
    const { order_id, product_title, tracking_number } = data;
    
    notifyInfo(
      `🚚 Hàng đơn #${order_id} ("${product_title}") đã được gửi. Mã vận đơn: ${tracking_number}`
    );
  });

  /**
   * Event: Hàng đã nhận
   * From: orderController.js khi buyer nhận hàng
   */
  socket.on('order:received', (data: any) => {
    console.log('✅ Event: order:received received', data);
    
    const { order_id, product_title } = data;
    
    notifySuccess(
      `✅ Bạn đã xác nhận nhận hàng đơn #${order_id}: "${product_title}"`
    );
  });

  /**
   * Event: Wallet updated
   * From: walletController.js khi deposit/withdraw
   */
  socket.on('wallet:updated', (data: any) => {
    console.log('💳 Event: wallet:updated received', data);
    
    const { action, amount, new_balance, reference_id } = data;
    
    if (action === 'deposit') {
      notifySuccess(
        `💳 Nạp tiền thành công: +${amount?.toLocaleString()}₫. Số dư hiện tại: ${new_balance?.toLocaleString()}₫`
      );
    } else if (action === 'withdraw') {
      notifySuccess(
        `💳 Rút tiền thành công: -${amount?.toLocaleString()}₫. Số dư hiện tại: ${new_balance?.toLocaleString()}₫`
      );
    }
  });

  /**
   * Event: Lỗi chung
   * From: Backend khi có lỗi cần thông báo cho user
   */
  socket.on('error:notification', (data: any) => {
    console.log('❌ Event: error:notification received', data);
    
    const { message, code } = data;
    
    addNotification(
      `❌ ${message}`,
      'error'
    );
  });

  console.log('✅ Notification Service initialized successfully');
}

/**
 * Cleanup notification listeners (khi user logout)
 */
export function cleanupNotificationService(): void {
  const socket = getSocket();
  if (!socket) return;

  console.log('🔔 Cleaning up Notification Service...');

  socket.off('new-bid');
  socket.off('bid:outbid');
  socket.off('auction:ending-soon');
  socket.off('auction:extended');
  socket.off('auction:won');
  socket.off('auction:ended');
  socket.off('payment:pending');
  socket.off('payment:completed');
  socket.off('order:confirmed');
  socket.off('order:shipped');
  socket.off('order:received');
  socket.off('wallet:updated');
  socket.off('error:notification');

  console.log('✅ Notification Service cleaned up');
}
