const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const yaml = require('js-yaml');
const fs = require('fs');
const ipRangeCheck = require('ip-range-check');

class SecurityMiddleware {
  constructor() {
    this.config = yaml.load(
      fs.readFileSync('../config/security.yaml', 'utf8')
    ).security;
  }

  setupRateLimiting() {
    const limiters = {};
    
    for (const rule of this.config.rate_limiting.rules) {
      limiters[rule.path] = rateLimit({
        windowMs: this.parseTimeWindow(rule.window),
        max: rule.limit,
        message: {
          error: 'Too many requests, please try again later.',
          retryAfter: this.parseTimeWindow(rule.window) / 1000
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        keyGenerator: (req) => {
          return req.ip || req.headers['x-forwarded-for'];
        },
        handler: (req, res) => {
          res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later.',
              retryAfter: this.parseTimeWindow(rule.window) / 1000
            }
          });
          
          // Log rate limit violation
          console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
        }
      });
    }

    return (req, res, next) => {
      const matchingRule = this.config.rate_limiting.rules.find(
        rule => this.pathMatches(req.path, rule.path)
      );
      
      if (matchingRule) {
        return limiters[matchingRule.path](req, res, next);
      }
      
      next();
    };
  }

  setupIpWhitelist() {
    return (req, res, next) => {
      if (!this.config.ip_whitelist.enabled) {
        return next();
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'];
      const path = req.path;

      // Check if path requires IP whitelisting
      const requiredLists = Object.entries(this.config.ip_whitelist.paths)
        .filter(([pattern]) => this.pathMatches(path, pattern))
        .map(([, lists]) => lists)
        .flat();

      if (requiredLists.length === 0) {
        return next();
      }

      // Check if client IP is in any of the required lists
      const allowed = requiredLists.some(listName => {
        const ipList = this.config.ip_whitelist.lists[listName];
        return ipList.some(range => ipRangeCheck(clientIp, range));
      });

      if (!allowed) {
        console.warn(`Unauthorized IP access attempt from ${clientIp} to ${path}`);
        return res.status(403).json({
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'Access denied: IP not in whitelist'
          }
        });
      }

      next();
    };
  }

  setupCors() {
    if (!this.config.cors.enabled) {
      return (req, res, next) => next();
    }

    return cors({
      origin: (origin, callback) => {
        if (!origin || this.config.cors.allowed_origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      methods: this.config.cors.allowed_methods,
      allowedHeaders: this.config.cors.allowed_headers,
      credentials: true,
      maxAge: 86400 // 24 hours
    });
  }

  setupSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    });
  }

  setupInputValidation() {
    return (req, res, next) => {
      const sanitizeInput = (obj) => {
        if (typeof obj !== 'object') return obj;
        
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'string') {
            // Remove any potentially dangerous characters
            obj[key] = obj[key].replace(/[<>]/g, '');
            // Prevent SQL injection
            obj[key] = obj[key].replace(/['";]/g, '');
          } else if (typeof obj[key] === 'object') {
            obj[key] = sanitizeInput(obj[key]);
          }
        });
        return obj;
      };

      req.body = sanitizeInput(req.body);
      req.query = sanitizeInput(req.query);
      req.params = sanitizeInput(req.params);
      
      next();
    };
  }

  setupErrorHandling() {
    return (err, req, res, next) => {
      console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      if (err.type === 'validation') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: err.message,
          },
        });
      }

      if (err.type === 'auth') {
        return res.status(401).json({
          error: {
            code: 'AUTH_ERROR',
            message: 'Authentication failed',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
        },
      });
    };
  }

  setupMonitoring() {
    return (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.info('Request completed:', {
          path: req.path,
          method: req.method,
          status: res.statusCode,
          duration,
          ip: req.ip,
          timestamp: new Date().toISOString(),
        });

        // Alert on slow requests
        if (duration > 1000) {
          console.warn('Slow request detected:', {
            path: req.path,
            duration,
            threshold: 1000,
          });
        }

        // Alert on error responses
        if (res.statusCode >= 400) {
          console.error('Error response:', {
            path: req.path,
            status: res.statusCode,
            ip: req.ip,
          });
        }
      });
      next();
    };
  }

  setupAuditLogging() {
    return (req, res, next) => {
      if (!this.config.compliance.audit_logging.enabled) {
        return next();
      }

      const startTime = Date.now();
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        user: req.user?.id || 'anonymous',
        userAgent: req.headers['user-agent']
      };

      // Capture response using event listener
      res.on('finish', () => {
        logEntry.status = res.statusCode;
        logEntry.duration = Date.now() - startTime;

        // Log entry
        console.log(JSON.stringify(logEntry));

        // Store in audit log storage (implement based on your storage solution)
        this.storeAuditLog(logEntry);
      });

      next();
    };
  }

  async storeAuditLog(logEntry) {
    // Implement your audit log storage logic here
    // Example: Store in database or send to logging service
  }

  parseTimeWindow(window) {
    const unit = window.slice(-1);
    const value = parseInt(window.slice(0, -1));
    
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60000;
      case 'h':
        return value * 3600000;
      default:
        return value;
    }
  }

  pathMatches(requestPath, pattern) {
    const patternParts = pattern.split('/');
    const pathParts = requestPath.split('/');
    
    if (patternParts.length !== pathParts.length && !pattern.endsWith('*')) {
      return false;
    }
    
    return patternParts.every((part, i) => {
      if (part === '*') return true;
      if (i >= pathParts.length) return false;
      return part === pathParts[i];
    });
  }

  setupSecurity(app) {
    app.use(this.setupSecurityHeaders());
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later'
    }));
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || this.config.cors.allowed_origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      methods: this.config.cors.allowed_methods,
      allowedHeaders: this.config.cors.allowed_headers,
      credentials: true,
      maxAge: 86400 // 24 hours
    }));
    app.use(xss());
    app.use(hpp());
    app.use((req, res, next) => {
      const requestId = uuidv4();
      req.id = requestId;
      
      const logData = {
        id: requestId,
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
      };
      
      console.log('Request:', JSON.stringify(logData));
      next();
    });
    app.use((err, req, res, next) => {
      console.error('Error:', {
        requestId: req.id,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });

      res.status(err.status || 500).json({
        error: {
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
          requestId: req.id
        }
      });
    });
  }
}

module.exports = new SecurityMiddleware();
