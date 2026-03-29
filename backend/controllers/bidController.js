const { createBid, getBidHistory, getHighestBid, getUserBids, getBidStatistics, countBidders } = require('../models/bidModel');
const { getProductById, updateProductPrice } = require('../models/productModel');
const logger = require('../services/logger');

// 1. Đặt giá / Bid
async function placeBid(req, res) {
  try {
    const user_id = req.user.user_id;
    const { product_id, bid_amount } = req.body;

    // Validate
    if (!product_id || !bid_amount) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    if (bid_amount <= 0) {
      return res.status(400).json({ message: 'Mức giá phải lớn hơn 0' });
    }

    // Lấy thông tin sản phẩm
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Kiểm tra seller không thể bid sản phẩm của mình
    if (String(product.seller_id) === String(user_id)) {
      return res.status(400).json({ message: 'Bạn không thể đấu giá sản phẩm của chính mình' });
    }

    // Kiểm tra thời gian đấu giá có hợp lệ không
    const now = new Date();
    if (now < new Date(product.start_time)) {
      return res.status(400).json({ message: 'Đấu giá chưa bắt đầu' });
    }

    if (now > new Date(product.end_time)) {
      return res.status(400).json({ message: 'Đấu giá đã kết thúc' });
    }

    // Kiểm tra trạng thái sản phẩm
    if (product.status !== 'active') {
      return res.status(400).json({ message: 'Sản phẩm không khả dụng để đấu giá' });
    }

    // Lấy bid cao nhất hiện tại
    const highestBid = await getHighestBid(product_id);

    // Giá mới phải cao hơn giá hiện tại + mức tăng tối thiểu
    const minBidAmount = (highestBid ? highestBid.bid_amount : product.start_price) + product.min_increment;

    if (bid_amount < minBidAmount) {
      return res.status(400).json({
        message: `Mức giá phải cao hơn ${minBidAmount.toLocaleString('vi-VN')}`,
        minimum_required: minBidAmount,
      });
    }

    // Tạo bid mới
    await createBid({ product_id, user_id, bid_amount });

    // Cập nhật giá hiện tại của sản phẩm
    await updateProductPrice(product_id, bid_amount);

    logger.success('Bid placed', { product_id, user_id, bid_amount });

    res.status(201).json({
      message: 'Đấu giá thành công',
      data: {
        bid_amount,
        product_id,
        bid_time: new Date(),
      },
    });
  } catch (err) {
    logger.error('Place bid failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// 2. Xem lịch sử đấu giá của sản phẩm
async function viewBidHistory(req, res) {
  try {
    const { product_id } = req.params;

    // Kiểm tra sản phẩm tồn tại
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    // Lấy lịch sử đấu giá
    const bidHistory = await getBidHistory(product_id);

    // Lấy thống kê
    const statistics = await getBidStatistics(product_id);
    const biddersInfo = await countBidders(product_id);

    res.json({
      message: 'Lấy lịch sử đấu giá thành công',
      data: {
        product_id,
        product_title: product.title,
        current_price: product.current_price,
        bid_history: bidHistory,
        statistics: {
          total_bids: statistics.total_bids,
          total_bidders: biddersInfo.bidder_count,
          lowest_bid: statistics.lowest_bid,
          highest_bid: statistics.highest_bid,
          average_bid: statistics.average_bid ? Math.round(statistics.average_bid) : null,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 3. Xem danh sách bids của người dùng
async function viewMyBids(req, res) {
  try {
    const user_id = req.user.user_id;

    const bids = await getUserBids(user_id);

    res.json({
      message: 'Lấy danh sách đấu giá của bạn thành công',
      data: bids,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 4. Xem bid cao nhất hiện tại của sản phẩm
async function getTopBid(req, res) {
  try {
    const { product_id } = req.params;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
    }

    const highestBid = await getHighestBid(product_id);

    res.json({
      message: 'Lấy bid cao nhất thành công',
      data: {
        product_id,
        current_highest_bid: highestBid ? highestBid.bid_amount : product.start_price,
        bidder: highestBid ? highestBid.username : 'Chưa có ai đấu giá',
        bid_time: highestBid ? highestBid.bid_time : null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  placeBid,
  viewBidHistory,
  viewMyBids,
  getTopBid,
};
