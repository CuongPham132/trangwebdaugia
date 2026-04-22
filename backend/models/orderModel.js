const { sql } = require('../config/db');

// Tạo order khi user thắng đấu giá
async function createOrder({ product_id, buyer_id, seller_id, bid_id, final_price }) {
  try {
    const result = await sql.query`
      INSERT INTO [order] (product_id, buyer_id, seller_id, bid_id, final_price, order_status, payment_status)
      VALUES (${product_id}, ${buyer_id}, ${seller_id}, ${bid_id}, ${final_price}, 'pending', 'unpaid')
    `;
    
    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      throw new Error('Không thể tạo order');
    }
    
    return {
      success: true,
      order_id: result.identity[0].value,
      message: 'Order created successfully'
    };
  } catch (error) {
    throw error;
  }
}

// Lấy thông tin order
async function getOrderById(order_id) {
  try {
    const result = await sql.query`
      SELECT 
        o.order_id,
        o.product_id,
        o.buyer_id,
        o.seller_id,
        o.bid_id,
        o.final_price,
        o.order_status,
        o.payment_status,
        o.shipping_address,
        o.shipping_phone,
        o.shipping_name,
        o.notes,
        o.created_at,
        o.confirmed_at,
        o.shipped_at,
        o.delivered_at,
        o.cancelled_at,
        p.title as product_title,
        p.current_price,
        bu.username as buyer_username,
        bu.email as buyer_email,
        se.username as seller_username,
        se.email as seller_email
      FROM [order] o
      LEFT JOIN product p ON o.product_id = p.product_id
      LEFT JOIN [user] bu ON o.buyer_id = bu.user_id
      LEFT JOIN [user] se ON o.seller_id = se.user_id
      WHERE o.order_id = ${order_id}
    `;
    
    const order = result.recordset[0];
    console.log('✅ getOrderById SQL result:', {
      order_id,
      order: order ? { order_id: order.order_id, product_id: order.product_id, bid_id: order.bid_id } : null
    });
    
    return order;
  } catch (error) {
    console.error('❌ getOrderById SQL error:', {
      order_id,
      error: error.message
    });
    throw error;
  }
}

// Lấy orders của buyer
async function getBuyerOrders(buyer_id) {
  try {
    const result = await sql.query`
      SELECT 
        o.order_id,
        o.bid_id as product_id,
        o.buyer_id,
        o.seller_id,
        o.final_price,
        o.order_status as status,
        o.payment_status,
        o.created_at,
        COALESCE(p.title, 'Unknown Product') as product_title
      FROM [order] o
      LEFT JOIN bid b ON o.bid_id = b.bid_id
      LEFT JOIN product p ON b.product_id = p.product_id
      WHERE o.buyer_id = ${buyer_id}
      ORDER BY o.created_at DESC
    `;
    
    console.log('✅ getBuyerOrders SQL result:', {
      buyer_id,
      recordCount: result.recordset.length,
      firstRecord: result.recordset[0]
    });
    
    return result.recordset;
  } catch (error) {
    console.error('❌ getBuyerOrders SQL error:', {
      buyer_id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Gọi stored procedure để thanh toán order (với improved error handling)
async function payOrder(order_id) {
  try {
    const result = await sql.query`
      EXEC sp_PayOrder @order_id = ${order_id}
    `;
    
    return {
      success: true,
      message: 'Thanh toán thành công',
      order_id: order_id
    };
  } catch (error) {
    // SQL Server RAISERROR message format: 'Số dư ví không đủ' hoặc 'Order không tồn tại'
    // Error object sẽ có message từ SP
    let errorMessage = error.message || 'Thanh toán thất bại';
    let errorType = 'PAYMENT_ERROR';
    
    // Parse message từ SQL error để xác định loại lỗi
    if (errorMessage.includes('Số dư ví không đủ')) {
      errorType = 'INSUFFICIENT_BALANCE';
    } else if (errorMessage.includes('Order không tồn tại')) {
      errorType = 'ORDER_NOT_FOUND';
    } else if (errorMessage.includes('lỗi giá')) {
      errorType = 'INVALID_PRICE';
    }
    
    return {
      success: false,
      message: errorMessage,
      error_type: errorType,
      error: error.message
    };
  }
}

// Update order status
async function updateOrderStatus(order_id, order_status) {
  try {
    let updateQuery;
    
    if (order_status === 'confirmed') {
      updateQuery = sql.query`UPDATE [order] SET order_status = ${order_status}, confirmed_at = GETDATE() WHERE order_id = ${order_id}`;
    } else if (order_status === 'shipped') {
      updateQuery = sql.query`UPDATE [order] SET order_status = ${order_status}, shipped_at = GETDATE() WHERE order_id = ${order_id}`;
    } else if (order_status === 'delivered') {
      updateQuery = sql.query`UPDATE [order] SET order_status = ${order_status}, delivered_at = GETDATE() WHERE order_id = ${order_id}`;
    } else if (order_status === 'cancelled') {
      updateQuery = sql.query`UPDATE [order] SET order_status = ${order_status}, cancelled_at = GETDATE() WHERE order_id = ${order_id}`;
    } else {
      updateQuery = sql.query`UPDATE [order] SET order_status = ${order_status} WHERE order_id = ${order_id}`;
    }
    
    const result = await updateQuery;
    
    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      console.warn('❌ updateOrderStatus: No rows affected', { order_id, order_status });
      return { success: false, message: 'Order không tồn tại' };
    }
    
    console.log('✅ updateOrderStatus success', { order_id, order_status });
    return { success: true, message: `Order status updated to ${order_status}` };
  } catch (error) {
    console.error('❌ updateOrderStatus error:', { order_id, order_status, error: error.message });
    throw error;
  }
}

// Update shipping info
async function updateShippingInfo(order_id, shipping_name, shipping_phone, shipping_address) {
  try {
    const result = await sql.query`
      UPDATE [order]
      SET shipping_name = ${shipping_name},
          shipping_phone = ${shipping_phone},
          shipping_address = ${shipping_address}
      WHERE order_id = ${order_id}
    `;
    
    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return { success: false, message: 'Order không tồn tại' };
    }
    
    return { success: true, message: 'Shipping info updated' };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createOrder,
  getOrderById,
  getBuyerOrders,
  payOrder,
  updateOrderStatus,
  updateShippingInfo
};
