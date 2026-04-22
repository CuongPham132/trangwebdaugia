const { sql } = require('../config/db');

// Lấy lịch sử đấu giá của sản phẩm (bỏ qua cancelled bids)
async function getBidHistory(product_id) {
  const result = await sql.query`
    SELECT 
      b.bid_id,
      b.product_id,
      b.user_id,
      b.bid_amount,
      b.bid_time,
      b.is_winning,
      b.is_cancelled,
      u.username
    FROM bid b
    JOIN [user] u ON b.user_id = u.user_id
    WHERE b.product_id = ${product_id} AND b.is_cancelled = 0
    ORDER BY b.bid_time DESC
  `;
  return result.recordset;
}

// Lấy bid cao nhất của sản phẩm (bỏ qua cancelled bids)
async function getHighestBid(product_id) {
  const result = await sql.query`
    SELECT TOP 1
      b.bid_id,
      b.product_id,
      b.user_id,
      b.bid_amount,
      b.bid_time,
      u.username
    FROM bid b
    JOIN [user] u ON b.user_id = u.user_id
    WHERE b.product_id = ${product_id} AND b.is_cancelled = 0
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

// Lấy bids của user (bỏ qua cancelled bids)
async function getUserBids(user_id) {
  const result = await sql.query`
    SELECT 
      b.bid_id,
      b.product_id,
      b.bid_amount,
      b.bid_time,
      b.is_winning,
      b.is_cancelled,
      p.title,
      p.current_price,
      p.end_time,
      p.status
    FROM bid b
    JOIN product p ON b.product_id = p.product_id
    WHERE b.user_id = ${user_id} AND b.is_cancelled = 0
    ORDER BY b.bid_time DESC
  `;
  return result.recordset;
}

// Lấy thống kê đấu giá của sản phẩm (bỏ qua cancelled bids)
async function getBidStatistics(product_id) {
  const result = await sql.query`
    SELECT 
      COUNT(*) as total_bids,
      MIN(bid_amount) as lowest_bid,
      MAX(bid_amount) as highest_bid,
      AVG(bid_amount) as average_bid
    FROM bid
    WHERE product_id = ${product_id} AND is_cancelled = 0
  `;
  return result.recordset[0];
}

// Đếm số người đã đấu giá (bỏ qua cancelled bids)
async function countBidders(product_id) {
  const result = await sql.query`
    SELECT COUNT(DISTINCT user_id) as bidder_count
    FROM bid
    WHERE product_id = ${product_id} AND is_cancelled = 0
  `;
  return result.recordset[0];
}

// ⭐ CHECK: Kiểm tra sản phẩm có bid nào chưa (dùng cho delete check)
async function hasBids(product_id) {
  const result = await sql.query`
    SELECT COUNT(*) as bid_count
    FROM bid
    WHERE product_id = ${product_id}
  `;
  return result.recordset[0].bid_count > 0;
}

// ⭐ FIX RACE CONDITION: Atomic Bid Creation + Price Update
// Tạo bid VÀ cập nhật giá trong một lệnh khóa (không bị race condition)
async function createBidWithAtomicUpdate({ product_id, user_id, bid_amount, min_increment }) {
  try {
    // Trigger DB sẽ tự validate giá bid, cập nhật winner/current_price.
    // BE chỉ cần insert bid.
    const bidResult = await sql.query`
      INSERT INTO bid (product_id, user_id, bid_amount)
      VALUES (${product_id}, ${user_id}, ${bid_amount})
    `;
    
    if (!bidResult.rowsAffected || bidResult.rowsAffected[0] === 0) {
      throw new Error('Không thể tạo bid');
    }

    // ✅ Thành công, phần còn lại do trigger xử lý.
    return {
      success: true,
      message: 'Bid placed successfully',
      bid_created: true,
    };

  } catch (err) {
    throw new Error(`Atomic bid creation failed: ${err.message}`);
  }
}

// Lấy current price của sản phẩm (để kiểm tra lại sau race condition)
async function getCurrentPrice(product_id) {
  const result = await sql.query`
    SELECT current_price, min_increment
    FROM product
    WHERE product_id = ${product_id}
  `;
  return result.recordset[0];
}

// Lấy thông tin bid theo ID
async function getBidById(bid_id) {
  const result = await sql.query`
    SELECT 
      b.bid_id,
      b.product_id,
      b.user_id,
      b.bid_amount,
      b.bid_time,
      b.is_winning,
      u.username,
      p.title as product_title,
      p.current_price,
      p.status as product_status
    FROM bid b
    JOIN [user] u ON b.user_id = u.user_id
    JOIN product p ON b.product_id = p.product_id
    WHERE b.bid_id = ${bid_id}
  `;
  return result.recordset[0];
}

// ⭐ SOFT DELETE: Hủy bid (set is_cancelled = 1) thay vì xóa vĩnh viễn
async function cancelBid(bid_id) {
  try {
    // Lấy thông tin bid trước khi hủy
    const bid = await getBidById(bid_id);
    
    if (!bid) {
      return { success: false, reason: 'BID_NOT_FOUND' };
    }

    // Không cho hủy nếu bid đã winning
    if (bid.is_winning) {
      return { success: false, reason: 'WINNING_BID_CANNOT_BE_CANCELLED' };
    }

    // Không cho hủy nếu auction đã ended hoặc sold
    if (bid.product_status === 'ended' || bid.product_status === 'sold') {
      return { success: false, reason: 'AUCTION_ENDED_CANNOT_CANCEL' };
    }

    // Soft delete: cập nhật is_cancelled = 1
    const cancelResult = await sql.query`
      UPDATE bid
      SET is_cancelled = 1
      WHERE bid_id = ${bid_id}
    `;

    if (!cancelResult.rowsAffected || cancelResult.rowsAffected[0] === 0) {
      return { success: false, reason: 'CANCEL_FAILED' };
    }

    return {
      success: true,
      bid: bid,
      message: 'Bid hủy thành công'
    };
  } catch (error) {
    throw error;
  }
}

// Xóa bid - chỉ có thể xóa nếu chưa winning
async function deleteBid(bid_id) {
  try {
    // Lấy thông tin bid trước khi xóa
    const bid = await getBidById(bid_id);
    
    if (!bid) {
      return { success: false, reason: 'BID_NOT_FOUND' };
    }

    // Không cho xóa nếu bid đã winning
    if (bid.is_winning) {
      return { success: false, reason: 'WINNING_BID_CANNOT_BE_DELETED' };
    }

    // Không cho xóa nếu auction đã ended hoặc sold
    if (bid.product_status === 'ended' || bid.product_status === 'sold') {
      return { success: false, reason: 'AUCTION_ENDED_CANNOT_DELETE' };
    }

    // Xóa bid
    const deleteResult = await sql.query`
      DELETE FROM bid
      WHERE bid_id = ${bid_id}
    `;

    if (!deleteResult.rowsAffected || deleteResult.rowsAffected[0] === 0) {
      return { success: false, reason: 'DELETE_FAILED' };
    }

    return {
      success: true,
      bid: bid,
      message: 'Bid xóa thành công'
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getBidHistory,
  getHighestBid,
  createBid,
  getUserBids,
  getBidStatistics,
  countBidders,
  hasBids,
  createBidWithAtomicUpdate,
  getCurrentPrice,
  getBidById,
  cancelBid,
  deleteBid,
};
