const winston = require('winston');
const Sentry = require('@sentry/node');
const { performance } = require('perf_hooks');
const os = require('os');

class MonitoringSystem {
  constructor() {
    this.setupLogger();
    this.setupSentry();
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      lastReset: Date.now()
    };
  }

  setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  setupSentry() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0
      });
    }
  }

  // Performance monitoring
  startRequest(req) {
    req.startTime = performance.now();
  }

  endRequest(req, res) {
    const duration = performance.now() - req.startTime;
    this.metrics.requests++;
    this.metrics.responseTime.push(duration);

    this.logger.info('Request completed', {
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode
    });
  }

  // Error tracking
  trackError(error, req = null) {
    this.metrics.errors++;

    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    if (req) {
      errorData.request = {
        method: req.method,
        path: req.path,
        headers: req.headers,
        query: req.query,
        body: req.body
      };
    }

    this.logger.error('Error occurred', errorData);

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }

  // System metrics
  getSystemMetrics() {
    return {
      cpu: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      uptime: os.uptime()
    };
  }

  // Application metrics
  getApplicationMetrics() {
    const now = Date.now();
    const timeWindow = (now - this.metrics.lastReset) / 1000; // in seconds

    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      requestsPerSecond: this.metrics.requests / timeWindow,
      errorsPerSecond: this.metrics.errors / timeWindow,
      averageResponseTime: avgResponseTime,
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors
    };
  }

  // Alert system
  async sendAlert(type, message, data = {}) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      data
    };

    this.logger.warn('Alert triggered', alert);

    // Send to configured alert channels
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert);
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      await this.sendDiscordAlert(alert);
    }

    if (process.env.ALERT_EMAIL) {
      await this.sendEmailAlert(alert);
    }
  }

  // Reset metrics (call periodically, e.g., every hour)
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      lastReset: Date.now()
    };
  }

  // Middleware for Express
  middleware() {
    return (req, res, next) => {
      this.startRequest(req);

      res.on('finish', () => {
        this.endRequest(req, res);
      });

      next();
    };
  }
}

module.exports = new MonitoringSystem();
