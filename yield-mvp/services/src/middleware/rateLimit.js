const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

// Create a limiter with Redis store
const createLimiter = (options = {}) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

// Different rate limits for different endpoints
const limiters = {
  // General API endpoints
  api: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  }),

  // Authentication endpoints
  auth: createLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5
  }),

  // High-frequency endpoints
  realtime: createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30
  })
};

module.exports = limiters;
