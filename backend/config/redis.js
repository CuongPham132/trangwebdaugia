/**
 * Socket.io + Redis Configuration
 * Enables real-time bid updates across multiple server instances
 * using Redis adapter for pub/sub across servers
 */

const redis = require('redis');

// Create Redis client for Socket.io adapter
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('❌ Redis connection refused. Falling back to in-memory adapter.');
      return new Error('End redis client');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

redisClient.on('error', (err) => {
  console.warn('⚠️ Redis error:', err.message);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis for Socket.io adapter');
});

module.exports = redisClient;
