const {
  checkAndUpdateProductStatus,
  getEndedProducts,
  determineWinner,
  autoCompleteAuctions,
  getProductTimeInfo,
} = require('../models/auctionModel');
const { getProductById, updateProduct } = require('../models/productModel');
const { getHighestBid } = require('../models/bidModel');
const walletService = require('../services/walletService');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

// 1. Xem thời gian còn lại của sản phẩm
async function checkAuctionTime(req, res) {
  try {
    const { product_id } = req.params;

    const timeInfo = await getProductTimeInfo(product_id);
    if (!timeInfo) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
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

    res.json(
      createSuccessResponse({
        product_id: timeInfo.product_id,
        title: timeInfo.title,
        start_time: timeInfo.start_time,
        end_time: timeInfo.end_time,
        original_end_time: timeInfo.original_end_time,
        time_status: timeInfo.time_status.replace(/_/g, ' ').toUpperCase(),
        status: timeInfo.status,
        seconds_remaining: timeInfo.seconds_remaining > 0 ? timeInfo.seconds_remaining : 0,
        time_remaining: timeRemaining,
        extension_count: timeInfo.extension_count,
        max_extensions: timeInfo.max_extensions,
      }, 'Lấy thông tin thời gian thành công')
    );
  } catch (err) {
    logger.error('Check auction time failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy thông tin thời gian', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 2. Cập nhật trạng thái sản phẩm
async function updateAuctionStatus(req, res) {
  try {
    const result = await checkAndUpdateProductStatus();
    logger.success('Auction statuses updated manually', { message: result.message });
    res.json(
      createSuccessResponse(result, 'Cập nhật trạng thái sản phẩm thành công')
    );
  } catch (err) {
    logger.error('Manual auction status update failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi cập nhật trạng thái', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 3. Xem kết quả đấu giá sản phẩm
async function getAuctionResult(req, res) {
  try {
    const { product_id } = req.params;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }

    // Nếu sản phẩm chưa kết thúc
    if (product.status !== 'ended' && product.status !== 'sold') {
      return res.status(400).json(
        createErrorResponse(
          'Đấu giá chưa kết thúc',
          ERROR_CODES.AUCTION_STILL_ONGOING,
          400,
          {
            status: product.status,
            end_time: product.end_time,
          }
        )
      );
    }

    res.json(
      createSuccessResponse({
        product_id: product.product_id,
        title: product.title,
        final_price: product.current_price,
        start_price: product.start_price,
        end_time: product.end_time,
        status: product.status,
      }, 'Đấu giá đã kết thúc')
    );
  } catch (err) {
    logger.error('Get auction result failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy kết quả đấu giá', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 4. Xác định kết quả đấu giá
async function completeAuction(req, res) {
  try {
    const { product_id } = req.params;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }

    if (product.status === 'sold') {
      return res.status(400).json(
        createErrorResponse(
          'Đấu giá đã được xác định kết quả trước đó',
          ERROR_CODES.OPERATION_ALREADY_COMPLETED,
          400,
          {
            current_status: product.status,
          }
        )
      );
    }

    // Chỉ cho phép complete nếu đã hết thời gian hoặc đã được kết thúc sớm (status ended)
    const now = new Date();
    if (product.status !== 'ended' && now <= new Date(product.end_time)) {
      return res.status(400).json(
        createErrorResponse(
          'Không thể xác định kết quả vì đấu giá vẫn kỳ hạn',
          ERROR_CODES.AUCTION_STILL_ONGOING,
          400,
          {
            end_time: product.end_time,
          }
        )
      );
    }

    const result = await determineWinner(product_id);

    if (result.success) {
      // ⭐ PAYMENT PROCESSING: Xử lý thanh toán nếu có winner
      let paymentResult = null;
      if (result.winner) {
        try {
          // Lấy thông tin bid cao nhất
          const winningBid = await getHighestBid(product_id);
          
          if (winningBid) {
            paymentResult = await walletService.completeAuctionPayment(
              result.winner.user_id,        // winner_id
              product.seller_id,             // seller_id
              winningBid.bid_amount,         // payment_amount
              product_id                     // product_id
            );

            // Cập nhật product.winning_bid_id và status = 'sold'
            await updateProduct(product_id, {
              winning_bid_id: winningBid.bid_id,
              status: 'sold'
            });

            logger.success('Auction payment completed', {
              product_id,
              winner_id: result.winner.user_id,
              seller_id: product.seller_id,
              payment_amount: winningBid.bid_amount,
              payment_status: 'completed'
            });

            // ⭐ EMIT SOCKET EVENT: Thông báo user thắng đấu giá
            if (global.io) {
              global.io.to(`user-${result.winner.user_id}`).emit('auction:won', {
                product_id,
                product_title: product.product_title,
                final_price: winningBid.bid_amount,
                winner_id: result.winner.user_id,
                auction_completed_time: new Date(),
              });
              logger.info('auction:won event emitted', {
                product_id,
                winner_id: result.winner.user_id
              });
            }
          }
        } catch (paymentError) {
          logger.error('Auction payment failed', {
            product_id,
            error: paymentError.message
          });
          // Note: Auction winner xác định đã xong, nhưng payment failed
          // Frontend cần check lại hoặc retry
        }
      }

      res.json(
        createSuccessResponse({
          message: result.message,
          winner: result.winner,
          payment: paymentResult ? {
            status: 'completed',
            winner_wallet: paymentResult.winner_wallet,
            seller_wallet: paymentResult.seller_wallet,
          } : { status: 'no_payment_needed' }
        }, 'Đấu giá hoàn tất')
      );
    } else {
      res.json(
        createSuccessResponse({
          message: result.message,
          winner: result.winner,
          payment: { status: 'no_payment_needed' }
        }, 'Đấu giá không có người mua')
      );
    }
  } catch (err) {
    logger.error('Complete auction failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi hoàn tất đấu giá', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 5. Tự động hoàn tất đấu giá (admin/scheduler)
async function autoCompleteAllAuctions(req, res) {
  try {
    const result = await autoCompleteAuctions();
    logger.success('Auto complete auctions executed');
    res.json(
      createSuccessResponse(result, 'Tự động hoàn tất đấu giá thành công')
    );
  } catch (err) {
    logger.error('Auto complete auctions failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi hoàn tất tự động đấu giá', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// 6. Seller kết thúc đấu giá sớm (mới)
async function endAuctionEarly(req, res) {
  try {
    const { product_id } = req.params;
    const seller_id = req.user.user_id;

    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.PRODUCT_NOT_FOUND, 404)
      );
    }

    // Kiểm tra quyền (chủ sở hữu hoặc admin)
    if (String(product.seller_id) !== String(seller_id) && req.user.role !== 'admin') {
      return res.status(403).json(
        createErrorResponse('Bạn không có quyền kết thúc đấu giá này', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }

    // Kiểm tra trạng thái - chỉ có thể kết thúc khi đang active
    if (product.status !== 'active') {
      return res.status(400).json(
        createErrorResponse(
          `Không thể kết thúc, trạng thái hiện tại: ${product.status}`,
          ERROR_CODES.INVALID_STATUS,
          400,
          {
            current_status: product.status,
          }
        )
      );
    }

    // Lấy bid cao nhất
    const highestBid = await getHighestBid(product_id);

    // Cập nhật status thành 'ended'
    await updateProduct(product_id, { status: 'ended' });

    logger.success('Auction ended early', { product_id, user_id: seller_id, has_winner: !!highestBid });

    // Chốt kết quả ngay sau khi seller kết thúc sớm
    const completionResult = await determineWinner(product_id);

    // Trả về thông tin người thắng
    res.json(
      createSuccessResponse({
        product_id,
        title: product.title,
        ended_by: 'seller_early_termination',
        ended_at: new Date(),
        final_price: highestBid ? highestBid.bid_amount : product.start_price,
        winner: completionResult.winner
          ? {
              user_id: completionResult.winner.user_id,
              username: completionResult.winner.username,
              winning_bid: completionResult.winner.bid_amount,
            }
          : {
              user_id: null,
              username: 'Không có người mua',
              winning_bid: product.start_price,
            },
        final_status: completionResult.success ? 'sold' : 'ended',
        highest_bid_snapshot: highestBid
          ? {
              user_id: highestBid.user_id,
              username: highestBid.username,
              winning_bid: highestBid.bid_amount,
            }
          : null,
      }, 'Đấu giá kết thúc sớm')
    );
  } catch (err) {
    logger.error('End auction early failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi kết thúc sớm đấu giá', ERROR_CODES.INTERNAL_ERROR, 500)
    );
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
