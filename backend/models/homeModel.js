const { sql } = require('../config/db');

// Lấy dữ liệu trang chủ
async function getHomePageData() {
  try {
    // 1. Sản phẩm đang đấu giá (active) - limit 10 mới nhất
    const activeProducts = await sql.query`
      SELECT TOP 10
        p.product_id,
        p.title,
        p.current_price,
        p.start_price,
        p.end_time,
        pi.image_url,
        DATEDIFF(SECOND, GETDATE(), p.end_time) as seconds_remaining
      FROM product p
      LEFT JOIN product_image pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
    `;

    // 2. Sản phẩm sắp diễn ra (upcoming) - limit 10
    const upcomingProducts = await sql.query`
      SELECT TOP 10
        p.product_id,
        p.title,
        p.start_price,
        p.start_time,
        pi.image_url
      FROM product p
      LEFT JOIN product_image pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.status = 'upcoming'
      AND p.start_time > GETDATE()
      ORDER BY p.start_time ASC
    `;

    // 3. Sản phẩm bán chạy nhất (nhiều bids nhất) - limit 5
    const topProducts = await sql.query`
      SELECT TOP 5
        p.product_id,
        p.title,
        p.current_price,
        COUNT(b.bid_id) as bid_count,
        pi.image_url
      FROM product p
      LEFT JOIN bid b ON p.product_id = b.product_id
      LEFT JOIN product_image pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.status = 'active' OR p.status = 'ended'
      GROUP BY p.product_id, p.title, p.current_price, pi.image_url
      ORDER BY bid_count DESC
    `;

    // 4. Danh mục sản phẩm
    const categories = await sql.query`
      SELECT 
        c.category_id,
        c.name,
        COUNT(p.product_id) as product_count
      FROM category c
      LEFT JOIN product p ON c.category_id = p.category_id AND (p.status = 'active' OR p.status = 'upcoming')
      GROUP BY c.category_id, c.name
      ORDER BY product_count DESC
    `;

    // 5. Thống kê tổng quát
    const statistics = await sql.query`
      SELECT
        (SELECT COUNT(*) FROM product WHERE status = 'active') as active_products,
        (SELECT COUNT(*) FROM product WHERE status = 'upcoming') as upcoming_products,
        (SELECT COUNT(*) FROM product WHERE status = 'sold') as sold_products,
        (SELECT COUNT(DISTINCT user_id) FROM bid) as total_bidders,
        (SELECT COUNT(*) FROM bid) as total_bids
    `;

    return {
      active_products: activeProducts.recordset,
      upcoming_products: upcomingProducts.recordset,
      top_products: topProducts.recordset,
      categories: categories.recordset,
      statistics: statistics.recordset[0],
    };
  } catch (err) {
    throw err;
  }
}

// 🚀 Lấy dữ liệu Homepage tối ưu (Backend-driven)
async function getOptimizedHomeData(limit = 8) {
  try {
    // 1. ✅ Active Products (Đang đấu giá) - sorted by bid count
    const activeProducts = await sql.query`
      SELECT TOP 8
        p.product_id,
        p.title,
        p.current_price,
        p.end_time,
        pi.image_url,
        (SELECT COUNT(*) FROM bid WHERE product_id = p.product_id) as total_bids,
        DATEDIFF(SECOND, GETDATE(), p.end_time) as seconds_remaining
      FROM product p
      LEFT JOIN product_image pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.status = 'active'
        AND GETDATE() >= p.start_time 
        AND GETDATE() < p.end_time
      ORDER BY (SELECT COUNT(*) FROM bid WHERE product_id = p.product_id) DESC, p.created_at DESC
    `;

    // 2. ✅ Ending Soon Products (Sắp kết thúc - sorted by time)
    const endingSoonProducts = await sql.query`
      SELECT TOP 8
        p.product_id,
        p.title,
        p.current_price,
        p.end_time,
        pi.image_url,
        (SELECT COUNT(*) FROM bid WHERE product_id = p.product_id) as total_bids,
        DATEDIFF(SECOND, GETDATE(), p.end_time) as seconds_remaining
      FROM product p
      LEFT JOIN product_image pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.status = 'active'
        AND GETDATE() >= p.start_time 
        AND GETDATE() < p.end_time
      ORDER BY p.end_time ASC
    `;

    // 3. ✅ Upcoming Products (Sắp diễn ra)
    const upcomingProducts = await sql.query`
      SELECT TOP 8
        p.product_id,
        p.title,
        p.current_price,
        p.start_time,
        pi.image_url
      FROM product p
      LEFT JOIN product_image pi ON p.product_id = pi.product_id AND pi.is_primary = 1
      WHERE p.status = 'upcoming'
        AND p.start_time > GETDATE()
      ORDER BY p.start_time ASC
    `;

    // 4. ✅ Categories (Danh mục)
    const categories = await sql.query`
      SELECT TOP 8
        c.category_id,
        c.name,
        COUNT(p.product_id) as product_count
      FROM category c
      LEFT JOIN product p ON c.category_id = p.category_id 
        AND (p.status = 'active' OR p.status = 'upcoming')
      GROUP BY c.category_id, c.name
      ORDER BY COUNT(p.product_id) DESC
    `;

    return {
      activeProducts: activeProducts.recordset,
      endingSoonProducts: endingSoonProducts.recordset,
      upcomingProducts: upcomingProducts.recordset,
      categories: categories.recordset,
    };
  } catch (err) {
    throw err;
  }
}

// Lấy sản phẩm hot/trending
async function getTrendingProducts() {
  const result = await sql.query`
    SELECT TOP 5
      p.product_id,
      p.title,
      p.current_price,
      COUNT(b.bid_id) as bid_count,
      COUNT(DISTINCT b.user_id) as bidder_count,
      pi.image_url
    FROM product p
    LEFT JOIN bid b ON p.product_id = b.product_id
    LEFT JOIN product_image pi ON p.product_id = pi.product_id AND pi.is_primary = 1
    WHERE p.status = 'active'
    GROUP BY p.product_id, p.title, p.current_price, pi.image_url
    ORDER BY bid_count DESC
  `;
  return result.recordset;
}

module.exports = {
  getHomePageData,
  getOptimizedHomeData,
  getTrendingProducts,
};
