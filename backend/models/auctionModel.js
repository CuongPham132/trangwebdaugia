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

module.exports = {
  checkAndUpdateProductStatus,
  getEndedProducts,
  determineWinner,
  autoCompleteAuctions,
  getProductTimeInfo,
};
