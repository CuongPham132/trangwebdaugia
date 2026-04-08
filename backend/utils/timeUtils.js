/**
 * Time utility functions to handle network latency
 */
const moment = require('moment-timezone');

// Buffer time in seconds (để bù đắp độ trễ mạng)
const NETWORK_BUFFER_SECONDS = 2;

// Timezone used for application (Asia/Ho_Chi_Minh - UTC+7)
const APP_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format datetime to app timezone (Asia/Ho_Chi_Minh)
 * @param {Date|string} datetime 
 * @returns {string} Formatted as YYYY-MM-DD HH:mm:ss
 */
function formatToAppTimezone(datetime) {
  if (!datetime) return null;
  return moment(datetime).tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Get current time in app timezone
 * @returns {Date}
 */
function getCurrentTimeInAppTimezone() {
  return moment().tz(APP_TIMEZONE).toDate();
}

/**
 * Kiểm tra xem bid có hợp lệ về thời gian không (có bao gồm buffer)
 * @param {Date} now - Thời gian hiện tại
 * @param {Date} endTime - Thời gian kết thúc đấu giá
 * @returns {Object} { isValid: boolean, reason?: string, secondsRemaining?: number }
 */
function isAuctionStillOpen(now, endTime) {
  // Tính thời gian còn lại (không có buffer)
  const actualSecondsRemaining = Math.floor((endTime - now) / 1000);
  
  // Deadline với buffer (trừ đi buffer để bù latency)
  const deadlineWithBuffer = new Date(endTime.getTime() - NETWORK_BUFFER_SECONDS * 1000);
  
  // Nếu current time > deadline with buffer → từ chối
  if (now > deadlineWithBuffer) {
    return {
      isValid: false,
      reason: 'AUCTION_ENDED_INCLUDING_BUFFER',
      secondsRemaining: actualSecondsRemaining,
      message: `Đấu giá đã kết thúc (bao gồm ${NETWORK_BUFFER_SECONDS}s buffer)`,
    };
  }
  
  // OK
  return {
    isValid: true,
    secondsRemaining: actualSecondsRemaining,
    message: `Còn ${actualSecondsRemaining} giây`,
  };
}

/**
 * Kiểm tra xem auction đã bắt đầu chưa
 * @param {Date} now 
 * @param {Date} startTime 
 * @returns {Object}
 */
function isAuctionStarted(now, startTime) {
  if (now < startTime) {
    const secondsUntilStart = Math.floor((startTime - now) / 1000);
    return {
      isStarted: false,
      secondsUntilStart,
      message: `Đấu giá sẽ bắt đầu trong ${secondsUntilStart} giây`,
    };
  }
  
  return {
    isStarted: true,
    message: 'Đấu giá đã bắt đầu',
  };
}

/**
 * Kiểm tra xem còn bao lâu nữa thì hết buffer (để auto-extend check)
 * @param {Date} now 
 * @param {Date} endTime 
 * @returns {number} Số giây còn lại trước khi vào buffer zone (ví dụ: 2s)
 */
function secondsUntilBufferZone(now, endTime) {
  const bufferStartTime = new Date(endTime.getTime() - NETWORK_BUFFER_SECONDS * 1000);
  const secondsUntilBuffer = Math.floor((bufferStartTime - now) / 1000);
  return secondsUntilBuffer;
}

/**
 * Lấy thời gian deadline với buffer
 * @param {Date} endTime 
 * @returns {Date}
 */
function getDeadlineWithBuffer(endTime) {
  return new Date(endTime.getTime() - NETWORK_BUFFER_SECONDS * 1000);
}

module.exports = {
  NETWORK_BUFFER_SECONDS,
  APP_TIMEZONE,
  formatToAppTimezone,
  getCurrentTimeInAppTimezone,
  isAuctionStillOpen,
  isAuctionStarted,
  secondsUntilBufferZone,
  getDeadlineWithBuffer,
};
