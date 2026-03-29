const { sql } = require('../config/db');

// Lấy lịch sử đấu giá của sản phẩm
async function getBidHistory(product_id) {
  const result = await sql.query`
    SELECT 
      b.bid_id,
      b.product_id,
      b.user_id,
      b.bid_amount,
      b.bid_time,
      u.username
    FROM bid b
    JOIN [user] u ON b.user_id = u.user_id
    WHERE b.product_id = ${product_id}
    ORDER BY b.bid_time DESC
  `;
  return result.recordset;
}

// Lấy bid cao nhất của sản phẩm
async function getHighestBid(product_id) {
  const result = await sql.query`
    SELECT TOP 1 * FROM bid 
    WHERE product_id = ${product_id}
    ORDER BY bid_amount DESC, bid_time DESC
  `;
  return result.recordset[0];
}

// Tạo bid mới
async function createBid({ product_id, user_id, bid_amount }) {
  const result = await sql.query`
    INSERT INTO bid (product_id, user_id, bid_amount)
    VALUES (${product_id}, ${user_id}, ${bid_amount})
  `;
  return result;
}

// Lấy bids của user
async function getUserBids(user_id) {
  const result = await sql.query`
    SELECT 
      b.bid_id,
      b.product_id,
      b.bid_amount,
      b.bid_time,
      p.title,
      p.current_price,
      p.end_time
    FROM bid b
    JOIN product p ON b.product_id = p.product_id
    WHERE b.user_id = ${user_id}
    ORDER BY b.bid_time DESC
  `;
  return result.recordset;
}

// Lấy thống kê đấu giá của sản phẩm
async function getBidStatistics(product_id) {
  const result = await sql.query`
    SELECT 
      COUNT(*) as total_bids,
      MIN(bid_amount) as lowest_bid,
      MAX(bid_amount) as highest_bid,
      AVG(bid_amount) as average_bid
    FROM bid
    WHERE product_id = ${product_id}
  `;
  return result.recordset[0];
}

// Đếm số người đã đấu giá
async function countBidders(product_id) {
  const result = await sql.query`
    SELECT COUNT(DISTINCT user_id) as bidder_count
    FROM bid
    WHERE product_id = ${product_id}
  `;
  return result.recordset[0];
}

module.exports = {
  getBidHistory,
  getHighestBid,
  createBid,
  getUserBids,
  getBidStatistics,
  countBidders,
};
