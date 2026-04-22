const { payOrder, getOrderById, getBuyerOrders, updateOrderStatus, updateShippingInfo } = require('../models/orderModel');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');
const logger = require('../services/logger');

// API: Thanh toán order
async function paymentOrder(req, res) {
  try {
    let { order_id } = req.body;
    const user_id = req.user.user_id;

    // 🐛 Debug log incoming request with detailed info
    logger.info('🐛 paymentOrder API called - INCOMING DATA:', { 
      'req.body': req.body,
      'order_id raw': order_id,
      'typeof order_id': typeof order_id,
      user_id,
      'req.body keys': Object.keys(req.body)
    });

    // Validate & convert to number
    const order_id_num = Number(order_id);
    logger.info('🐛 After Number() conversion:', { 
      order_id_num,
      isNaN: isNaN(order_id_num),
      'order_id_num <= 0': order_id_num <= 0,
      'boolean !order_id_num': !order_id_num
    });
    
    if (!order_id_num || isNaN(order_id_num) || order_id_num <= 0) {
      logger.warn('❌ Invalid order_id received', { 
        order_id_raw: order_id,
        order_id_num,
        body: req.body,
        failureReason: {
          'falsy': !order_id_num,
          'isNaN': isNaN(order_id_num),
          '<= 0': order_id_num <= 0
        }
      });
      return res.status(400).json(
        createErrorResponse('Order ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }
    
    order_id = order_id_num;

    // Lấy thông tin order
    const order = await getOrderById(order_id);
    if (!order) {
      return res.status(404).json(
        createErrorResponse('Order không tồn tại', ERROR_CODES.OPERATION_FAILED, 404)
      );
    }

    // Kiểm tra người dùng là buyer của order này
    if (String(order.buyer_id) !== String(user_id)) {
      return res.status(403).json(
        createErrorResponse('Bạn không có quyền thanh toán order này', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }

    // ⭐ Kiểm tra nếu đã thanh toán rồi - IDEMPOTENT (return 200, not 400)
    if (order.payment_status === 'paid') {
      return res.status(200).json(
        createSuccessResponse({
          order_id,
          product_title: order.product_title,
          final_price: order.final_price,
          payment_status: 'paid'
        }, 'Order đã thanh toán trước đó')
      );
    }

    // ⭐ Check order status - must not be cancelled
    if (order.order_status === 'cancelled') {
      return res.status(400).json(
        createErrorResponse('Order này đã bị hủy. Không thể thanh toán.', ERROR_CODES.OPERATION_FAILED, 400)
      );
    }

    // ⭐ Check product auction is ended
    const { sql } = require('../config/db');
    const productCheck = await sql.query`
      SELECT status, end_time FROM product WHERE product_id = ${order.product_id}
    `;
    
    if (!productCheck.recordset[0]) {
      return res.status(404).json(
        createErrorResponse('Sản phẩm không tồn tại', ERROR_CODES.OPERATION_FAILED, 404)
      );
    }

    const product = productCheck.recordset[0];
    if (product.status !== 'ended' && product.status !== 'sold') {
      return res.status(400).json(
        createErrorResponse('Đấu giá chưa kết thúc. Không thể thanh toán.', ERROR_CODES.OPERATION_FAILED, 400, {
          product_status: product.status
        })
      );
    }

    // ⭐ HYBRID: Check seller wallet exists BEFORE processing payment
    const seller_id = order.seller_id;
    const sellerWalletCheck = await sql.query`
      SELECT wallet_id FROM wallet WHERE user_id = ${seller_id}
    `;
    
    if (!sellerWalletCheck.recordset[0]) {
      logger.error('Seller wallet not found', { seller_id, order_id });
      return res.status(400).json(
        createErrorResponse('Lỗi: Ví của người bán không tồn tại. Không thể xử lý thanh toán.', ERROR_CODES.OPERATION_FAILED, 400)
      );
    }

    // Gọi stored procedure để thanh toán
    logger.info('Processing payment for order', { order_id, buyer_id: user_id, amount: order.final_price });
    
    const paymentResult = await payOrder(order_id);

    if (!paymentResult.success) {
      // SP trả về lỗi
      logger.error('Payment failed', { order_id, error: paymentResult.message });
      
      return res.status(400).json(
        createErrorResponse(paymentResult.message, ERROR_CODES.INSUFFICIENT_BALANCE, 400, {
          order_id,
          final_price: order.final_price
        })
      );
    }

    logger.success('Payment successful', { order_id, buyer_id: user_id, amount: order.final_price });

    // ⭐ Verify payment was actually processed (double-check for idempotency)
    const updatedOrder = await getOrderById(order_id);
    if (updatedOrder.payment_status !== 'paid') {
      logger.error('Payment verification failed', { order_id, payment_status: updatedOrder.payment_status });
      return res.status(500).json(
        createErrorResponse('Lỗi xác thực thanh toán. Vui lòng kiểm tra lại.', ERROR_CODES.OPERATION_FAILED, 500)
      );
    }

    // ⭐ UPDATE order_status to 'confirmed' after successful payment
    try {
      await updateOrderStatus(order_id, 'confirmed');
      logger.info('Order status updated to confirmed', { order_id });
    } catch (updateError) {
      logger.warn('Failed to update order status', { order_id, error: updateError.message });
      // Don't fail the payment - status update is non-critical
    }

    // ⭐ TRANSFER MONEY TO SELLER after successful payment
    try {
      // Add balance to seller wallet
      await sql.query`
        UPDATE wallet 
        SET balance = balance + ${order.final_price}
        WHERE user_id = ${seller_id}
      `;
      
      logger.success('Seller payment processed', { 
        order_id, 
        seller_id, 
        amount: order.final_price,
        buyer_id: user_id
      });
    } catch (sellerError) {
      logger.error('Failed to transfer money to seller', { 
        order_id, 
        seller_id, 
        error: sellerError.message 
      });
      // Don't fail the entire payment - seller payment is non-critical (can retry later)
    }

    // ⭐ EMIT SOCKET EVENT: Thông báo cho user thanh toán thành công
    if (global.io) {
      global.io.to(`user-${user_id}`).emit('payment:completed', {
        order_id,
        product_id: order.product_id,
        product_title: order.product_title,
        amount: order.final_price,
        payment_time: new Date(),
        wallet_status: 'balance_and_locked_deducted',  // ✅ Trạng thái ví sau khi thanh toán
      });
      // ✅ Log chi tiết: balance được trừ + locked được giải phóng
      logger.info('payment:completed event emitted', { 
        user_id, 
        order_id,
        balance_deducted: order.final_price,         // ✅ Tiền thực sự rời khỏi ví
        locked_balance_released: order.final_price,   // ✅ Tiền khóa được giải phóng
        wallet_status: 'payment_finalized',           // ✅ Thanh toán hoàn tất
        final_price: order.final_price
      });
    }

    // Trả về response thành công
    res.json(
      createSuccessResponse({
        order_id,
        product_title: order.product_title,
        final_price: order.final_price,
        payment_status: 'paid'
      }, 'Thanh toán thành công!')
    );

  } catch (error) {
    logger.error('Payment processing error', { error: error.message });
    
    res.status(500).json(
      createErrorResponse(
        'Lỗi xử lý thanh toán. Vui lòng thử lại sau.',
        ERROR_CODES.OPERATION_FAILED,
        500
      )
    );
  }
}

// API: Lấy thông tin order
async function getOrder(req, res) {
  try {
    const { order_id } = req.params;
    const user_id = req.user.user_id;

    if (!order_id || isNaN(order_id)) {
      return res.status(400).json(
        createErrorResponse('Order ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    const order = await getOrderById(order_id);
    if (!order) {
      return res.status(404).json(
        createErrorResponse('Order không tồn tại', ERROR_CODES.OPERATION_FAILED, 404)
      );
    }

    // Kiểm tra quyền: buyer hoặc seller
    if (String(order.buyer_id) !== String(user_id) && String(order.seller_id) !== String(user_id)) {
      return res.status(403).json(
        createErrorResponse('Bạn không có quyền xem order này', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }

    res.json(createSuccessResponse(order, 'Order retrieved successfully'));

  } catch (error) {
    logger.error('Get order error', { error: error.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy thông tin order', ERROR_CODES.OPERATION_FAILED, 500)
    );
  }
}

// API: Lấy danh sách orders của buyer
async function getMyOrders(req, res) {
  try {
    const user_id = req.user.user_id;
    logger.info('getMyOrders called', { user_id });

    const orders = await getBuyerOrders(user_id);
    logger.info('getMyOrders result', { user_id, order_count: orders.length, orders });

    res.json(createSuccessResponse(orders, `Lấy ${orders.length} orders thành công`));

  } catch (error) {
    logger.error('Get my orders error', { 
      error: error.message,
      stack: error.stack,
      user_id: req.user?.user_id
    });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách orders: ' + error.message, ERROR_CODES.OPERATION_FAILED, 500)
    );
  }
}

// API: Cập nhật shipping info
async function updateShipping(req, res) {
  try {
    const { order_id } = req.params;
    const { shipping_name, shipping_phone, shipping_address } = req.body;
    const user_id = req.user.user_id;

    if (!order_id || isNaN(order_id)) {
      return res.status(400).json(
        createErrorResponse('Order ID không hợp lệ', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Validate shipping info
    if (!shipping_name || !shipping_phone || !shipping_address) {
      return res.status(400).json(
        createErrorResponse('Vui lòng nhập đầy đủ thông tin giao hàng', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Lấy order
    const order = await getOrderById(order_id);
    if (!order) {
      return res.status(404).json(
        createErrorResponse('Order không tồn tại', ERROR_CODES.OPERATION_FAILED, 404)
      );
    }

    // Kiểm tra buyer
    if (String(order.buyer_id) !== String(user_id)) {
      return res.status(403).json(
        createErrorResponse('Bạn không có quyền cập nhật shipping info của order này', ERROR_CODES.PERMISSION_DENIED, 403)
      );
    }

    const result = await updateShippingInfo(order_id, shipping_name, shipping_phone, shipping_address);

    if (!result.success) {
      return res.status(400).json(
        createErrorResponse(result.message, ERROR_CODES.OPERATION_FAILED, 400)
      );
    }

    res.json(createSuccessResponse({ order_id }, 'Cập nhật shipping info thành công'));

  } catch (error) {
    logger.error('Update shipping error', { error: error.message });
    res.status(500).json(
      createErrorResponse('Lỗi cập nhật shipping info', ERROR_CODES.OPERATION_FAILED, 500)
    );
  }
}

module.exports = {
  paymentOrder,
  getOrder,
  getMyOrders,
  updateShipping
};
