const prometheus = require('prom-client');
const { logger } = require('../middleware/errorHandler');

// Create a Registry to register the metrics
const register = new prometheus.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'near-deep-yield'
});

// Enable the collection of default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const protocolDataFetchDuration = new prometheus.Histogram({
  name: 'protocol_data_fetch_duration_seconds',
  help: 'Duration of protocol data fetching in seconds',
  labelNames: ['protocol'],
  buckets: [1, 2, 5, 10, 20]
});

const cacheHits = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits'
});

const cacheMisses = new prometheus.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses'
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users',
  help: 'Number of currently active users'
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(protocolDataFetchDuration);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(activeUsers);

// Monitoring middleware
const monitoringMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Record response
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration / 1000); // Convert to seconds
  });

  next();
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRate: 0.05, // 5% error rate
  responseTime: 2000, // 2 seconds
  failedProtocolFetches: 3 // 3 consecutive failures
};

// Alert manager
class AlertManager {
  constructor() {
    this.errorCounts = new Map();
    this.protocolFailures = new Map();
  }

  checkErrorRate(route, statusCode) {
    if (statusCode >= 400) {
      const key = `${route}_${Math.floor(Date.now() / (5 * 60 * 1000))}`; // 5-minute window
      const currentCount = this.errorCounts.get(key) || 0;
      this.errorCounts.set(key, currentCount + 1);

      // Check if error rate exceeds threshold
      if (currentCount / 100 > ALERT_THRESHOLDS.errorRate) {
        this.triggerAlert('error_rate', {
          route,
          errorRate: currentCount / 100
        });
      }
    }
  }

  checkResponseTime(route, duration) {
    if (duration > ALERT_THRESHOLDS.responseTime) {
      this.triggerAlert('response_time', {
        route,
        duration
      });
    }
  }

  checkProtocolFailure(protocol) {
    const failures = (this.protocolFailures.get(protocol) || 0) + 1;
    this.protocolFailures.set(protocol, failures);

    if (failures >= ALERT_THRESHOLDS.failedProtocolFetches) {
      this.triggerAlert('protocol_failure', {
        protocol,
        consecutiveFailures: failures
      });
    }
  }

  resetProtocolFailures(protocol) {
    this.protocolFailures.set(protocol, 0);
  }

  triggerAlert(type, data) {
    logger.error({
      type: 'alert',
      alertType: type,
      data
    });

    // Here you could integrate with external alerting systems
    // like email, Slack, PagerDuty, etc.
  }
}

const alertManager = new AlertManager();

module.exports = {
  register,
  monitoringMiddleware,
  metrics: {
    httpRequestDurationMicroseconds,
    protocolDataFetchDuration,
    cacheHits,
    cacheMisses,
    activeUsers
  },
  alertManager
};
