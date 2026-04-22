const { sql } = require('../config/db');
const logger = require('./logger');

// Function update status sản phẩm
async function updateProductStatuses() {
  try {
    // Update upcoming → active
    const activeResult = await sql.query`
      UPDATE product 
      SET status = 'active'
      WHERE status = 'upcoming' 
      AND start_time <= GETDATE()
      AND end_time > GETDATE()
    `;
    
    // Update active → ended
    const endedResult = await sql.query`
      UPDATE product 
      SET status = 'ended'
      WHERE status = 'active' 
      AND end_time <= GETDATE()
    `;

    logger.success('Product statuses updated', {
      activated: activeResult.rowsAffected[0] || 0,
      ended: endedResult.rowsAffected[0] || 0,
    });
  } catch (err) {
    logger.error('Product status update failed', { error: err.message });
  }
}

// ⭐ NEW: Function to create orders for ended auctions
async function createOrdersForEndedAuctions() {
  try {
    // Find ended products with winning bids but no order yet
    const endedProducts = await sql.query`
      SELECT 
        p.product_id,
        p.title,
        p.seller_id,
        p.winning_bid_id,
        p.current_price,
        b.user_id as buyer_id,
        b.bid_amount as final_price
      FROM product p
      INNER JOIN bid b ON b.bid_id = p.winning_bid_id
      WHERE p.status = 'ended'
        AND p.winning_bid_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM [order] o 
          WHERE o.product_id = p.product_id
        )
    `;

    if (!endedProducts.recordset || endedProducts.recordset.length === 0) {
      logger.info('No ended auctions to create orders for');
      return;
    }

    // Create orders for each ended auction
    let createdCount = 0;
    for (const product of endedProducts.recordset) {
      try {
        const orderResult = await sql.query`
          INSERT INTO [order] (
            product_id,
            buyer_id,
            seller_id,
            bid_id,
            final_price,
            order_status,
            payment_status,
            created_at
          )
          VALUES (
            ${product.product_id},
            ${product.buyer_id},
            ${product.seller_id},
            ${product.winning_bid_id},
            ${product.final_price},
            'pending',
            'unpaid',
            GETDATE()
          )
        `;

        // Update product status to sold
        await sql.query`
          UPDATE product
          SET status = 'sold'
          WHERE product_id = ${product.product_id}
        `;

        createdCount++;
        logger.success('Order created for ended auction', {
          product_id: product.product_id,
          product_title: product.title,
          buyer_id: product.buyer_id,
          final_price: product.final_price,
        });
      } catch (orderErr) {
        logger.error('Failed to create order for ended auction', {
          product_id: product.product_id,
          error: orderErr.message,
        });
      }
    }

    if (createdCount > 0) {
      logger.success('Orders created for ended auctions', { count: createdCount });
    }
  } catch (err) {
    logger.error('Create orders for ended auctions failed', { error: err.message });
  }
}

// Chạy mỗi 1 phút
function startScheduler() {
  logger.info('Product status scheduler started', { intervalMs: 60000 });
  
  // Chạy ngay lần đầu
  updateProductStatuses();
  createOrdersForEndedAuctions();
  
  // Chạy mỗi 1 phút (60000ms)
  setInterval(() => {
    updateProductStatuses();
    createOrdersForEndedAuctions();
  }, 60000);
}

module.exports = { startScheduler };
