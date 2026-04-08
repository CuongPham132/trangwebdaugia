const { createBid, getBidHistory, getHighestBid, getUserBids, getBidStatistics, countBidders, createBidWithAtomicUpdate, getCurrentPrice, getBidById, deleteBid } = require('../models/bidModel');
const { getProductById, updateProductPrice } = require('../models/productModel');
const { extendAuctionTime } = require('../models/auctionModel');
const walletService = require('../services/walletService');
const logger = require('../services/logger');
const { isAuctionStillOpen, isAuctionStarted, NETWORK_BUFFER_SECONDS } = require('../utils/timeUtils');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

// 1. Đặt giá / Bid (FIX: Race Condition Prevention)
async function placeBid(req, res) {
  try {
    const user_id = req.user.user_id;
    const { product_id, bid_amount } = req.body;

    // Validate
    if (!product_id || !bid_amount) {
      return res.status(400).json(
        createErrorResponse('Vui lòng nhập đầy đủ thông tin', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    if (bid_amount <= 0) {
      return res.status(400).json(
        createErrorResponse('Mức giá phải lớn hơn 0', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Lấy thông tin sản phẩm
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }

    // Kiểm tra seller không thể bid sản phẩm của mình
    if (String(product.seller_id) === String(user_id)) {
      return res.status(403).json(
        createErrorResponse('Bạn không thể đấu giá sản phẩm của chính mình', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }

    // Kiểm tra thời gian đấu giá có hợp lệ không (⭐ CÓ BUFFER)
    const now = new Date();
    
    // Kiểm tra đã bắt đầu chưa
    const startCheck = isAuctionStarted(now, new Date(product.start_time));
    if (!startCheck.isStarted) {
      return res.status(400).json(
        createErrorResponse(startCheck.message, ERROR_CODES.AUCTION_NOT_STARTED, 400, {
          seconds_until_start: startCheck.secondsUntilStart,
        })
      );
    }

    // Kiểm tra có còn thời gian không (⭐ VỚI BUFFER 2 GIÂY)
    const endCheck = isAuctionStillOpen(now, new Date(product.end_time));
    if (!endCheck.isValid) {
      return res.status(400).json(
        createErrorResponse(endCheck.message, ERROR_CODES.AUCTION_ENDED, 400, {
          reason: endCheck.reason,
          seconds_remaining_actual: endCheck.secondsRemaining,
          network_buffer_seconds: NETWORK_BUFFER_SECONDS,
        })
      );
    }

    // Kiểm tra trạng thái sản phẩm
    if (product.status !== 'active') {
      return res.status(400).json(
        createErrorResponse('Sản phẩm không khả dụng để đấu giá', ERROR_CODES.INVALID_STATUS, 400, {
          current_status: product.status,
        })
      );
    }

    // ⭐ WALLET CHECK: Kiểm tra người dùng có đủ tiền không
    try {
      const balanceCheck = await walletService.checkSufficientBalance(user_id, bid_amount);
      if (!balanceCheck.sufficient) {
        const shortage = bid_amount - balanceCheck.total_available;
        return res.status(400).json(
          createErrorResponse(
            `Số dư không đủ. Ví của bạn: ${balanceCheck.total_available.toLocaleString('vi-VN')}₫, cần thêm: ${shortage.toLocaleString('vi-VN')}₫`,
            ERROR_CODES.INSUFFICIENT_BALANCE,
            400,
            {
              current_balance: balanceCheck.balance,
              locked_balance: balanceCheck.locked_balance,
              total_available: balanceCheck.total_available,
              required_amount: bid_amount,
              shortage: shortage,
            }
          )
        );
      }
    } catch (walletError) {
      logger.error('Wallet check failed', { user_id, bid_amount, error: walletError.message });
      return res.status(500).json(
        createErrorResponse('Lỗi kiểm tra ví. Vui lòng thử lại sau', ERROR_CODES.WALLET_ERROR, 500)
      );
    }

    // Lấy bid cao nhất hiện tại (để kiểm tra điều kiện)
    const highestBid = await getHighestBid(product_id);

    // Giá mới phải cao hơn giá hiện tại + mức tăng tối thiểu
    const minBidAmount = (highestBid ? highestBid.bid_amount : product.start_price) + product.min_increment;

    if (bid_amount < minBidAmount) {
      const shortage = minBidAmount - bid_amount;
      return res.status(400).json(
        createErrorResponse(
          `Mức giá không đủ. Hiện tại: ${(highestBid ? highestBid.bid_amount : product.start_price).toLocaleString('vi-VN')}₫ + mức tăng tối thiểu: ${product.min_increment.toLocaleString('vi-VN')}₫ = ${minBidAmount.toLocaleString('vi-VN')}₫. Bạn cần đặt cao hơn ${shortage.toLocaleString('vi-VN')}₫`,
          ERROR_CODES.BID_BELOW_MINIMUM,
          400,
          {
            minimum_required: minBidAmount,
            current_highest: highestBid ? highestBid.bid_amount : product.start_price,
            min_increment: product.min_increment,
            attempted_bid: bid_amount,
            shortage: shortage,
          }
        )
      );
    }

    // AUTO-EXTEND: Kiểm tra xem có cần kéo dài thời gian không (< 10 giây cuối)
    // ⭐ IMPROVED: Giới hạn bởi tổng thời gian (600s) thay vì số lần
    const extensionResult = await extendAuctionTime(product_id);
    if (extensionResult.extended) {
      logger.success('Auction extended (total limit)', {
        product_id,
        user_id,
        extension_count: extensionResult.extension_count,
        total_extended_seconds: extensionResult.total_extended_seconds,
      });
    } else if (extensionResult.reason === 'EXTENSION_TIME_LIMIT_REACHED') {
      logger.warn('Extension limit reached', {
        product_id,
        total_extended_seconds: extensionResult.total_extended_seconds,
      });
    }

    // ⭐ FIX RACE CONDITION: Tạo bid + Update price ATOMIC
    // Nếu có race condition, hàm này sẽ detect và thông báo
    const bidResult = await createBidWithAtomicUpdate({
      product_id,
      user_id,
      bid_amount,
      min_increment: product.min_increment,
    });

    // Nếu bị race condition (có ai nhanh tay hơn)
    if (!bidResult.success && bidResult.reason === 'RACE_CONDITION') {
      logger.warn('Race condition detected', { product_id, user_id, attempted_bid: bid_amount });
      
      // Lấy giá hiện tại sau race condition
      const currentData = await getCurrentPrice(product_id);
      const newMinBid = currentData.current_price + currentData.min_increment;
      const shortage = newMinBid - bid_amount;

      return res.status(400).json(
        createErrorResponse(
          `Có ai đặt giá cao hơn! Giá hiện tại: ${currentData.current_price.toLocaleString('vi-VN')}₫, bạn cần đặt ít nhất: ${newMinBid.toLocaleString('vi-VN')}₫ (cần thêm ${shortage.toLocaleString('vi-VN')}₫)`,
          ERROR_CODES.RACE_CONDITION,
          400,
          {
            current_price: currentData.current_price,
            minimum_required: newMinBid,
            min_increment: currentData.min_increment,
            attempted_bid: bid_amount,
            shortage: shortage,
          }
        )
      );
    }

    // ⭐ LOCK BALANCE: Sau khi bid thành công, lock tiền của user
    try {
      await walletService.lockBalanceForBid(user_id, bid_amount, product_id);
      logger.success('Balance locked for bid', { user_id, bid_amount, product_id });
    } catch (walletError) {
      logger.error('Failed to lock balance after bid', { user_id, bid_amount, error: walletError.message });
      // Note: Bid đã được tạo, chỉ lock balance failed. Frontend nên báo cho user check lại wallet
    }

    // ✅ Thành công
    logger.success('Bid placed (atomic)', { product_id, user_id, bid_amount });

    res.status(201).json(
      createSuccessResponse({
        bid_amount,
        product_id,
        bid_time: new Date(),
        auction_extended: extensionResult.extended,
        extension_info: extensionResult.extended
          ? {
              extension_count: extensionResult.extension_count,
              total_extended_seconds: extensionResult.total_extended_seconds,
              total_extended_minutes: Math.ceil(extensionResult.total_extended_seconds / 60),
              message: extensionResult.message,
            }
          : null,
      }, 'Đấu giá thành công')
    );
  } catch (err) {
    logger.error('Place bid failed', { error: err.message });
    return res.status(500).json(
      createErrorResponse('Lỗi đấu giá', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 2. Xem lịch sử đấu giá của sản phẩm
async function viewBidHistory(req, res) {
  try {
    const { product_id } = req.params;

    // Kiểm tra sản phẩm tồn tại
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }

    // Lấy lịch sử đấu giá
    const bidHistory = await getBidHistory(product_id);

    // Lấy thống kê
    const statistics = await getBidStatistics(product_id);
    const biddersInfo = await countBidders(product_id);

    res.json(
      createSuccessResponse({
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
      }, 'Lấy lịch sử đấu giá thành công')
    );
  } catch (err) {
    logger.error('View bid history failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy lịch sử đấu giá', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 3. Xem danh sách bids của người dùng
async function viewMyBids(req, res) {
  try {
    const user_id = req.user.user_id;

    const bids = await getUserBids(user_id);

    res.json(
      createSuccessResponse(bids, 'Lấy danh sách đấu giá của bạn thành công')
    );
  } catch (err) {
    logger.error('View my bids failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách đấu giá', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 4. Xem bid cao nhất hiện tại của sản phẩm
async function getTopBid(req, res) {
  try {
    const { product_id } = req.params;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }

    const highestBid = await getHighestBid(product_id);

    res.json(
      createSuccessResponse({
        product_id,
        current_highest_bid: highestBid ? highestBid.bid_amount : product.start_price,
        bidder: highestBid ? highestBid.username : 'Chưa có ai đấu giá',
        bid_time: highestBid ? highestBid.bid_time : null,
      }, 'Lấy bid cao nhất thành công')
    );
  } catch (err) {
    logger.error('Get top bid failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy bid cao nhất', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 5. Hủy/Rút lại bid - DELETE /api/bids/:bid_id
async function retractBid(req, res) {
  try {
    const { bid_id } = req.params;
    const user_id = req.user.user_id;

    // Validate input
    if (!bid_id || isNaN(bid_id)) {
      return res.status(400).json(
        createErrorResponse('Bid ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Lấy thông tin bid
    const bid = await getBidById(bid_id);
    if (!bid) {
      return res.status(404).json(
        createErrorResponse('Bid không tồn tại', ERROR_CODES.BID_NOT_FOUND, 404)
      );
    }

    // Kiểm tra người dùng có phải là người đặt bid không
    if (String(bid.user_id) !== String(user_id)) {
      return res.status(403).json(
        createErrorResponse('Bạn không có quyền hủy bid này', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }

    // Thực hiện xóa bid
    const deleteResult = await deleteBid(bid_id);

    if (!deleteResult.success) {
      // Xác định lý do không thể xóa
      let message = 'Không thể hủy bid';
      let code = ERROR_CODES.OPERATION_FAILED;

      if (deleteResult.reason === 'WINNING_BID_CANNOT_BE_DELETED') {
        message = 'Không thể hủy bid vì bạn đang thắng đấu giá';
        code = ERROR_CODES.WINNING_BID_CANNOT_DELETE;
      } else if (deleteResult.reason === 'AUCTION_ENDED_CANNOT_DELETE') {
        message = 'Không thể hủy bid vì đấu giá đã kết thúc';
        code = ERROR_CODES.AUCTION_ENDED;
      } else if (deleteResult.reason === 'BID_NOT_FOUND') {
        message = 'Bid không tồn tại';
        code = ERROR_CODES.BID_NOT_FOUND;
      }

      return res.status(400).json(
        createErrorResponse(message, code, 400)
      );
    }

    // Nếu bid được xóa thành công, hoàn lại tiền cho user
    try {
      await walletService.unlockBalanceFromBid(user_id, bid.bid_amount, bid.product_id);
      logger.success('Bid retracted and balance unlocked', { bid_id, user_id, bid_amount: bid.bid_amount });
    } catch (walletError) {
      logger.warn('Failed to unlock balance for retracted bid', { bid_id, user_id, error: walletError.message });
      // Note: Bid đã bị xóa, nhưng unlock balance failed. Cần manual check
    }

    res.json(
      createSuccessResponse({
        bid_id,
        product_id: bid.product_id,
        refunded_amount: bid.bid_amount
      }, 'Hủy bid thành công. Tiền đã được hoàn lại.')
    );
  } catch (err) {
    logger.error('Retract bid failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi hủy bid', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

module.exports = {
  placeBid,
  viewBidHistory,
  viewMyBids,
  getTopBid,
  retractBid,
};
