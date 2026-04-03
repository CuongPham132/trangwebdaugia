/**
 * Initialize server time synchronization
 * Call this once on app load to sync server time
 */
import { productAPI, getServerTime, getServerTimeOffset } from '../services/api';

/**
 * Sync server time by making a simple API call
 * This will trigger the response interceptor and set serverTimeOffset
 */
export async function syncServerTime(): Promise<void> {
  try {
    // Try fetching a lightweight endpoint to get server time
    // Using getUpcoming which is lightweight
    await productAPI.getUpcoming();
    
    const offset = getServerTimeOffset();
    if (Math.abs(offset) > 100) {
      console.info(`ℹ️ Server time synced. Offset: ${offset}ms`);
    }
  } catch (error) {
    console.warn('⚠️ Could not sync server time:', error);
    // Không throw error, continue anyway
  }
}

/**
 * Get time remaining in seconds until a deadline (server-synced)
 */
export function getSecondsRemaining(endTime: string | Date): number {
  const end = new Date(endTime).getTime();
  const now = getServerTime().getTime();
  const remaining = Math.floor((end - now) / 1000);
  return Math.max(0, remaining);
}

/**
 * Check if auction can still accept bids (with buffer)
 * Buffer = 2 seconds (built-in on backend)
 */
export function canBidNow(endTime: string | Date): boolean {
  return getSecondsRemaining(endTime) > 0;
}

/**
 * Format seconds to human-readable countdown
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Hết giờ';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default {
  syncServerTime,
  getSecondsRemaining,
  canBidNow,
  formatCountdown,
};
