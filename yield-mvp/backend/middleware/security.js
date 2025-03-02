const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const { utils } = require('near-api-js');

// Rate limiting configuration
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// DDoS protection middleware
const ddosProtection = (req, res, next) => {
  // Implement request size limits
  const MAX_PAYLOAD_SIZE = '10kb';
  if (req.headers['content-length'] > MAX_PAYLOAD_SIZE) {
    return res.status(413).json({
      error: 'Payload too large'
    });
  }

  // Add request timestamp for rate tracking
  req.requestTime = Date.now();
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  try {
    if (req.body) {
      // Sanitize each field in the request body
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key].trim());
        }
      });
    }

    // Validate NEAR account IDs if present
    if (req.body.accountId && !utils.format.isValidAccountId(req.body.accountId)) {
      return res.status(400).json({
        error: 'Invalid NEAR account ID format'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// NEAR protocol security middleware
const nearSecurity = {
  // Validate transaction format and contents
  validateTransaction: (req, res, next) => {
    try {
      const { signedTransaction } = req.body;
      if (!signedTransaction) {
        return res.status(400).json({
          error: 'Missing signed transaction'
        });
      }

      // Add additional transaction validation logic here
      next();
    } catch (error) {
      next(error);
    }
  },

  // Verify transaction signatures
  verifySignature: (req, res, next) => {
    try {
      const { signature, publicKey, message } = req.body;
      if (!signature || !publicKey || !message) {
        return res.status(400).json({
          error: 'Missing signature verification parameters'
        });
      }

      const isValid = utils.key_pair.verify(
        Buffer.from(message),
        Buffer.from(signature, 'base64'),
        publicKey
      );

      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid signature'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  }
};

// Security middleware configuration
const securityConfig = {
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", process.env.REACT_APP_NEAR_NODE_URL],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }),
  hpp: hpp(),
  rateLimiter: createRateLimiter(),
  ddosProtection,
  sanitizeInput,
  nearSecurity
};

module.exports = securityConfig;
