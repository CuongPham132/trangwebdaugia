/**
 * AUTO-EXTEND LOGIC DOCUMENTATION
 * ================================
 * 
 * PROBLEM (Gemini's concern):
 * - Giới hạn 3 lần kéo dài → Sniper có thể bid lần 4 mà không bị kéo dài
 * - User không công bằng nếu bị "snipe" cuối cùng mà không có cơ phản ứng
 * 
 * SOLUTION (Implemented):
 * - Thay vì giới hạn SỐ LẦN, giới hạn TỔNG THỜI GIAN kéo dài
 * - Tối đa 10 phút = 600 giây extended time
 * - Mỗi lần bid trong 10s cuối → +30s
 * - Cứ bid ≤ 600s thì vẫn kéo dài
 * 
 * LOGIC FLOW:
 * 
 * 1. User bid khi secondsRemaining < 10
 *    ↓
 * 2. Check: totalExtendedSeconds < 600?
 *    ↓
 *    YES → Kéo dài +30s, extensionCount++
 *    ↓
 *    NO → Từ chối, đã tới giới hạn
 * 
 * EXAMPLE:
 * end_time = 12:00:00
 * original_end_time = 12:00:00
 * 
 * 11:59:55 - User A bid
 *   └─ totalExtended = 0 (< 600) ✅
 *   └─ Kéo dài: 12:00:00 → 12:00:30
 *   └─ extension_count = 1
 * 
 * 12:00:25 - User B bid
 *   └─ totalExtended = 30 (< 600) ✅
 *   └─ Kéo dài: 12:00:30 → 12:01:00
 *   └─ extension_count = 2
 * 
 * ... (tiếp tục bid...)
 * 
 * 12:09:55 - User X bid (20 lần extend)
 *   └─ totalExtended = 600 (= 600) ❌
 *   └─ KHÔNG kéo dài
 *   └─ Đấu giá kết thúc lúc đó
 * 
 * BENEFITS:
 * ✅ Công bằng: Ai cũng có cơ hội phản ứng miễn là < 600s
 * ✅ Không vô hạn: Giới hạn 10 phút extension tránh kéo dài mãi
 * ✅ Linh hoạt: Nếu có bid liên tục, vẫn kéo dài
 * ✅ Sniper-proof: Sniper không thể bypass kèyle trong 10s cuối
 * 
 * EDGE CASES:
 * 
 * Case 1: secondsRemaining >= 10
 *   └─ Không kéo dài (còn thời gian)
 * 
 * Case 2: Total extended = 600
 *   └─ Bid lần cuối cùng có thể lúc (original_end_time + 600s)
 *   └─ Sau đó không kéo dài nữa
 * 
 * Case 3: Nếu muốn linh hoạt hơn
 *   └─ Có thể tăng MAX_TOTAL_EXTENSION_SECONDS lên tùy theo nhu cầu
 */

// Constants
const AUTO_EXTEND_WINDOW_SECONDS = 10; // Bid within last 10 seconds
const AUTO_EXTEND_INCREMENT_SECONDS = 30; // Add 30 seconds each time
const MAX_TOTAL_EXTENSION_SECONDS = 600; // Max 10 minutes total

// Formulas
// totalExtendedSeconds = extensionCount * AUTO_EXTEND_INCREMENT_SECONDS
// canExtend = totalExtendedSeconds < MAX_TOTAL_EXTENSION_SECONDS

export const AutoExtendConfig = {
  bidWindowSeconds: AUTO_EXTEND_WINDOW_SECONDS,
  incrementSeconds: AUTO_EXTEND_INCREMENT_SECONDS,
  maxTotalSeconds: MAX_TOTAL_EXTENSION_SECONDS,
  
  getMaxExtensions: function() {
    return this.maxTotalSeconds / this.incrementSeconds;
  },
  
  getTotalExtendedSeconds: function(extensionCount) {
    return extensionCount * this.incrementSeconds;
  },
  
  canStillExtend: function(extensionCount) {
    return this.getTotalExtendedSeconds(extensionCount) < this.maxTotalSeconds;
  },
};

// Export for frontend use
export default AutoExtendConfig;
