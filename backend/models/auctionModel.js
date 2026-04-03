const { sql } = require('../config/db');

// Kiểm tra và cập nhật trạng thái sản phẩm dựa trên thời gian
async function checkAndUpdateProductStatus() {
  const now = new Date();

  // Cập nhật sản phẩm từ 'upcoming' -> 'active' nếu đã tới thời gian bắt đầu
  await sql.query`
    UPDATE product
    SET status = 'active'
    WHERE status = 'upcoming'
    AND start_time <= GETDATE()
    AND end_time > GETDATE()
  `;

  // Cập nhật sản phẩm từ 'active' -> 'ended' nếu đã hết thời gian
  await sql.query`
    UPDATE product
    SET status = 'ended'
    WHERE status = 'active'
    AND end_time <= GETDATE()
  `;

  return { message: 'Cập nhật trạng thái sản phẩm thành công' };
}

// Lấy danh sách sản phẩm hết hạn yêu cầu xác định kết quả
async function getEndedProducts() {
  const result = await sql.query`
    SELECT * FROM product
    WHERE status = 'ended'
    ORDER BY end_time DESC
  `;
  return result.recordset;
}

// Xác định người chiến thắng và cập nhật kết quả
async function determineWinner(product_id) {
  // Lấy bid cao nhất
  const bidResult = await sql.query`
    SELECT TOP 1 
      b.bid_id,
      b.user_id,
      b.bid_amount,
      u.username,
      u.email
    FROM bid b
    JOIN [user] u ON b.user_id = u.user_id
    WHERE b.product_id = ${product_id}
    ORDER BY b.bid_amount DESC, b.bid_time DESC
  `;

  const winner = bidResult.recordset[0];

  if (!winner) {
    // Không có ai đấu giá
    return { success: false, message: 'Không có ai đấu giá sản phẩm này', winner: null };
  }

  // Cập nhật trạng thái sản phẩm thành 'sold'
  await sql.query`
    UPDATE product
    SET status = 'sold'
    WHERE product_id = ${product_id}
  `;

  return {
    success: true,
    message: 'Xác định kết quả thành công',
    winner: {
      user_id: winner.user_id,
      username: winner.username,
      email: winner.email,
      bid_amount: winner.bid_amount,
      product_id: product_id,
    },
  };
}

// Auto determine winners cho tất cả sản phẩm hết hạn
async function autoCompleteAuctions() {
  try {
    // Cập nhật trạng thái sản phẩm
    await checkAndUpdateProductStatus();

    // Lấy sản phẩm hết hạn nhưng chưa xác định kết quả
    const endedProducts = await getEndedProducts();

    const results = [];
    for (const product of endedProducts) {
      if (product.status === 'ended') {
        const result = await determineWinner(product.product_id);
        results.push(result);
      }
    }

    return {
      message: 'Tự động hoàn tất đấu giá thành công',
      total_completed: results.length,
      results,
    };
  } catch (err) {
    throw err;
  }
}

// Lấy thông tin về thời gian còn lại của sản phẩm
async function getProductTimeInfo(product_id) {
  const result = await sql.query`
    SELECT 
      product_id,
      title,
      start_time,
      end_time,
      status,
      extension_count,
      max_extensions,
      DATEDIFF(SECOND, GETDATE(), end_time) as seconds_remaining,
      CASE
        WHEN GETDATE() < start_time THEN 'chưa_bắt_đầu'
        WHEN GETDATE() BETWEEN start_time AND end_time THEN 'đang_diễn_ra'
        WHEN GETDATE() > end_time THEN 'đã_kết_thúc'
      END as time_status
    FROM product
    WHERE product_id = ${product_id}
  `;
  return result.recordset[0];
}

// ⭐ IMPROVED: Tự động kéo dài thời gian đấu giá nếu có bid trong 10 giây cuối
// Thay vì giới hạn số lần, giới hạn TỔNG THỜI GIAN kéo dài
async function extendAuctionTime(product_id) {
  try {
    // Lấy thông tin sản phẩm hiện tại
    const timeInfo = await getProductTimeInfo(product_id);
    
    if (!timeInfo) {
      return { extended: false, message: 'Sản phẩm không tồn tại' };
    }

    const secondsRemaining = timeInfo.seconds_remaining;
    const extensionCount = timeInfo.extension_count;
    const maxExtensions = timeInfo.max_extensions;
    
    // ⭐ LIMIT: Tổng thời gian extension tối đa (600s = 10 phút)
    const MAX_TOTAL_EXTENSION_SECONDS = 600;
    const totalExtendedSeconds = extensionCount * 30; // Mỗi lần +30s
    
    // Kiểm tra điều kiện: nếu còn < 10 giây
    if (secondsRemaining < 10) {
      // Nếu chưa tới giới hạn tổng thời gian
      if (totalExtendedSeconds < MAX_TOTAL_EXTENSION_SECONDS) {
        // ⭐ TÌM HiỆU: Kéo dài thêm 30 giây
        const result = await sql.query`
          UPDATE product
          SET 
            end_time = DATEADD(SECOND, 30, end_time),
            extension_count = extension_count + 1
          WHERE product_id = ${product_id}
        `;

        return {
          extended: true,
          extension_count: extensionCount + 1,
          message: `Đấu giá được kéo dài thêm 30 giây (lần ${extensionCount + 1})`,
          total_extended_time: `${(totalExtendedSeconds + 30) / 60} phút`,
          total_extended_seconds: totalExtendedSeconds + 30,
        };
      } else {
        // ⭐ Đã tới giới hạn tổng thời gian
        return {
          extended: false,
          reason: 'EXTENSION_TIME_LIMIT_REACHED',
          message: `Không thể kéo dài nữa. Đã kéo dài tổng cộng ${totalExtendedSeconds / 60} phút`,
          total_extended_seconds: totalExtendedSeconds,
          max_total: MAX_TOTAL_EXTENSION_SECONDS,
        };
      }
    } else {
      // Còn >= 10 giây, không cần kéo dài
      return {
        extended: false,
        reason: 'STILL_TIME_REMAINING',
        message: `Không cần kéo dài. Còn ${secondsRemaining}s`,
        seconds_remaining: secondsRemaining,
      };
    }
  } catch (err) {
    throw err;
  }
}

module.exports = {
  checkAndUpdateProductStatus,
  getEndedProducts,
  determineWinner,
  autoCompleteAuctions,
  getProductTimeInfo,
  extendAuctionTime,
};
