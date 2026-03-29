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

// Chạy mỗi 1 phút
function startScheduler() {
  logger.info('Product status scheduler started', { intervalMs: 60000 });
  
  // Chạy ngay lần đầu
  updateProductStatuses();
  
  // Chạy mỗi 1 phút (60000ms)
  setInterval(updateProductStatuses, 60000);
}

module.exports = { startScheduler };
