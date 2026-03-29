const {
  checkAndUpdateProductStatus,
  getEndedProducts,
  determineWinner,
  autoCompleteAuctions,
  getProductTimeInfo,
} = require('../models/auctionModel');
const { getProductById, updateProduct } = require('../models/productModel');
const { getHighestBid } = require('../models/bidModel');
const logger = require('../services/logger');

// 1. Xem thời gian còn lại của sản phẩm
async function checkAuctionTime(req, res) {
  try {
    const { product_id } = req.params;

    const timeInfo = await getProductTimeInfo(product_id);
    if (!timeInfo) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Format thời gian còn lại thành ngôn ngữ thân thiện
    let timeRemaining = '';
    if (timeInfo.seconds_remaining > 0) {
      const days = Math.floor(timeInfo.seconds_remaining / 86400);
      const hours = Math.floor((timeInfo.seconds_remaining % 86400) / 3600);
      const minutes = Math.floor((timeInfo.seconds_remaining % 3600) / 60);
      const seconds = timeInfo.seconds_remaining % 60;

      if (days > 0) {
        timeRemaining = `${days} ngày, ${hours} giờ`;
      } else if (hours > 0) {
        timeRemaining = `${hours} giờ, ${minutes} phút`;
      } else if (minutes > 0) {
        timeRemaining = `${minutes} phút, ${seconds} giây`;
      } else {
        timeRemaining = `${seconds} giây`;
      }
    } else {
      timeRemaining = 'Đã kết thúc';
    }

    res.json({
      message: 'Lấy thông tin thời gian thành công',
      data: {
        product_id: timeInfo.product_id,
        title: timeInfo.title,
        start_time: timeInfo.start_time,
        end_time: timeInfo.end_time,
        time_status: timeInfo.time_status.replace(/_/g, ' ').toUpperCase(),
        status: timeInfo.status,
        seconds_remaining: timeInfo.seconds_remaining > 0 ? timeInfo.seconds_remaining : 0,
        time_remaining: timeRemaining,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 2. Cập nhật trạng thái sản phẩm
async function updateAuctionStatus(req, res) {
  try {
    const result = await checkAndUpdateProductStatus();
    logger.success('Auction statuses updated manually', { message: result.message });
    res.json({
      message: result.message,
    });
  } catch (err) {
    logger.error('Manual auction status update failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// 3. Xem kết quả đấu giá sản phẩm
async function getAuctionResult(req, res) {
  try {
    const { product_id } = req.params;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Nếu sản phẩm chưa kết thúc
    if (product.status !== 'ended' && product.status !== 'sold') {
      return res.status(400).json({
        message: 'Đấu giá chưa kết thúc',
        status: product.status,
        end_time: product.end_time,
      });
    }

    res.json({
      message: 'Đấu giá đã kết thúc',
      data: {
        product_id: product.product_id,
        title: product.title,
        final_price: product.current_price,
        start_price: product.start_price,
        end_time: product.end_time,
        status: product.status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 4. Xác định kết quả đấu giá
async function completeAuction(req, res) {
  try {
    const { product_id } = req.params;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Nếu sản phẩm chưa hết hạn
    const now = new Date();
    if (now <= new Date(product.end_time)) {
      return res.status(400).json({
        message: 'Không thể xác định kết quả vì đấu giá vẫn kỳ hạn',
        end_time: product.end_time,
      });
    }

    const result = await determineWinner(product_id);

    if (result.success) {
      res.json({
        message: result.message,
        winner: result.winner,
      });
    } else {
      res.json({
        message: result.message,
        winner: result.winner,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 5. Tự động hoàn tất đấu giá (admin/scheduler)
async function autoCompleteAllAuctions(req, res) {
  try {
    const result = await autoCompleteAuctions();
    logger.success('Auto complete auctions executed');
    res.json(result);
  } catch (err) {
    logger.error('Auto complete auctions failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// 6. Seller kết thúc đấu giá sớm (mới)
async function endAuctionEarly(req, res) {
  try {
    const { product_id } = req.params;
    const seller_id = req.user.user_id;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Kiểm tra quyền (chủ sở hữu hoặc admin)
    if (String(product.seller_id) !== String(seller_id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền kết thúc đấu giá này' });
    }

    // Kiểm tra trạng thái - chỉ có thể kết thúc khi đang active
    if (product.status !== 'active') {
      return res.status(400).json({
        message: `Không thể kết thúc, trạng thái hiện tại: ${product.status}`,
        current_status: product.status,
      });
    }

    // Lấy bid cao nhất
    const highestBid = await getHighestBid(product_id);

    // Cập nhật status thành 'ended'
    await updateProduct(product_id, { status: 'ended' });

    logger.success('Auction ended early', { product_id, user_id: seller_id, has_winner: !!highestBid });

    // Trả về thông tin người thắng
    res.json({
      message: 'Đấu giá kết thúc sớm',
      data: {
        product_id,
        title: product.title,
        ended_by: 'seller_early_termination',
        ended_at: new Date(),
        final_price: highestBid ? highestBid.bid_amount : product.start_price,
        winner: highestBid
          ? {
              user_id: highestBid.user_id,
              username: highestBid.username,
              winning_bid: highestBid.bid_amount,
            }
          : {
              user_id: null,
              username: 'Không có người mua',
              winning_bid: product.start_price,
            },
      },
    });
  } catch (err) {
    logger.error('End auction early failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  checkAuctionTime,
  updateAuctionStatus,
  getAuctionResult,
  completeAuction,
  autoCompleteAllAuctions,
  endAuctionEarly,
};
