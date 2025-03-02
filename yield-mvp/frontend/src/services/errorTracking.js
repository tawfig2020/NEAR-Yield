import axios from 'axios';

class ErrorTrackingService {
  constructor() {
    this.endpoint = process.env.REACT_APP_ERROR_TRACKING_ENDPOINT || '/api/errors';
    this.analyticsEndpoint = process.env.REACT_APP_ERROR_ANALYTICS_ENDPOINT || '/api/errors/analytics';
    this.batchSize = 10;
    this.batchTimeout = 5000;
    this.errorQueue = [];
    this.analyticsData = {
      errorCount: 0,
      errorTypes: {},
      recoveryRate: 0,
      lastUpdate: Date.now()
    };
  }

  async sendError(error, context = {}) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        type: error.type || 'unknown',
        timestamp: new Date().toISOString(),
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...context
        }
      };

      this.errorQueue.push(errorData);
      this.updateAnalytics(errorData);

      if (this.errorQueue.length >= this.batchSize) {
        await this.flushErrorQueue();
      }
    } catch (err) {
      console.error('Failed to send error:', err);
    }
  }

  async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    try {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      await axios.post(this.endpoint, { errors });
    } catch (err) {
      console.error('Failed to flush error queue:', err);
      // Restore errors to queue
      this.errorQueue = [...this.errorQueue, ...errors];
    }
  }

  updateAnalytics(errorData) {
    this.analyticsData.errorCount++;
    this.analyticsData.errorTypes[errorData.type] = 
      (this.analyticsData.errorTypes[errorData.type] || 0) + 1;
    this.analyticsData.lastUpdate = Date.now();
  }

  async sendAnalytics() {
    try {
      await axios.post(this.analyticsEndpoint, this.analyticsData);
      this.analyticsData = {
        errorCount: 0,
        errorTypes: {},
        recoveryRate: 0,
        lastUpdate: Date.now()
      };
    } catch (err) {
      console.error('Failed to send analytics:', err);
    }
  }

  // Network error tracking
  setupNetworkErrorTracking() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.sendError(new Error(`HTTP ${response.status}`), {
            type: 'network',
            url: args[0],
            status: response.status
          });
        }
        return response;
      } catch (error) {
        this.sendError(error, {
          type: 'network',
          url: args[0]
        });
        throw error;
      }
    };

    // Axios interceptor
    axios.interceptors.response.use(
      response => response,
      error => {
        this.sendError(error, {
          type: 'network',
          url: error.config?.url,
          status: error.response?.status
        });
        return Promise.reject(error);
      }
    );
  }

  // Recovery strategies
  recoveryStrategies = {
    network: async (error, context) => {
      const maxRetries = 3;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const response = await axios(context.url);
          return response;
        } catch (err) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
      throw error;
    },
    
    state: (error, context) => {
      if (context.fallbackState) {
        return context.fallbackState;
      }
      throw error;
    },
    
    default: (error) => {
      throw error;
    }
  };

  async attemptRecovery(error, context) {
    const strategy = this.recoveryStrategies[context.type] || this.recoveryStrategies.default;
    try {
      const result = await strategy(error, context);
      this.analyticsData.recoveryRate = 
        (this.analyticsData.recoveryRate * this.analyticsData.errorCount + 1) / 
        (this.analyticsData.errorCount + 1);
      return result;
    } catch (err) {
      this.analyticsData.recoveryRate = 
        (this.analyticsData.recoveryRate * this.analyticsData.errorCount) / 
        (this.analyticsData.errorCount + 1);
      throw err;
    }
  }
}

export const errorTrackingService = new ErrorTrackingService();
