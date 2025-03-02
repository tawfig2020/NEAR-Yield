const { TimeSeriesDB } = require('../database/timeSeriesDB');
const { calculateAPY, calculateROI } = require('../utils/calculations');

class AnalyticsService {
  constructor() {
    this.timeSeriesDB = new TimeSeriesDB();
    this.metrics = new Map();
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
    this.startMetricsUpdate();
  }

  // Start periodic metrics update
  startMetricsUpdate() {
    setInterval(() => {
      this.updateMetrics();
    }, this.updateInterval);
  }

  // Update all metrics
  async updateMetrics() {
    try {
      const timestamp = Date.now();
      const metrics = await this.calculateMetrics();
      await this.timeSeriesDB.store('metrics', timestamp, metrics);
      this.metrics = metrics;
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
  }

  // Calculate current metrics
  async calculateMetrics() {
    const metrics = new Map();

    // TVL (Total Value Locked)
    metrics.set('tvl', await this.calculateTVL());

    // APY
    metrics.set('apy', await this.calculateCurrentAPY());

    // Protocol Performance
    metrics.set('performance', await this.calculateProtocolPerformance());

    // User Analytics
    metrics.set('userMetrics', await this.calculateUserMetrics());

    return metrics;
  }

  // Calculate Total Value Locked
  async calculateTVL() {
    try {
      const totalStaked = await this.timeSeriesDB.getLatest('totalStaked');
      const nearPrice = await this.getNearPrice();
      return totalStaked * nearPrice;
    } catch (error) {
      console.error('Failed to calculate TVL:', error);
      return 0;
    }
  }

  // Calculate current APY
  async calculateCurrentAPY() {
    try {
      const rewardRate = await this.timeSeriesDB.getLatest('rewardRate');
      const totalStaked = await this.timeSeriesDB.getLatest('totalStaked');
      return calculateAPY(rewardRate, totalStaked);
    } catch (error) {
      console.error('Failed to calculate APY:', error);
      return 0;
    }
  }

  // Calculate protocol performance
  async calculateProtocolPerformance() {
    try {
      const historicalData = await this.timeSeriesDB.getRange('metrics', {
        startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
        endTime: Date.now()
      });

      return {
        dailyROI: calculateROI(historicalData, '1d'),
        weeklyROI: calculateROI(historicalData, '7d'),
        monthlyROI: calculateROI(historicalData, '30d'),
        volatility: this.calculateVolatility(historicalData)
      };
    } catch (error) {
      console.error('Failed to calculate protocol performance:', error);
      return null;
    }
  }

  // Calculate user metrics
  async calculateUserMetrics() {
    try {
      const activeUsers = await this.timeSeriesDB.getLatest('activeUsers');
      const totalUsers = await this.timeSeriesDB.getLatest('totalUsers');
      const averageStake = await this.timeSeriesDB.getLatest('averageStake');

      return {
        activeUsers,
        totalUsers,
        averageStake,
        userGrowth: await this.calculateUserGrowth()
      };
    } catch (error) {
      console.error('Failed to calculate user metrics:', error);
      return null;
    }
  }

  // Calculate user growth rate
  async calculateUserGrowth() {
    try {
      const currentUsers = await this.timeSeriesDB.getLatest('totalUsers');
      const previousUsers = await this.timeSeriesDB.getLatest('totalUsers', {
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
      });

      return (currentUsers - previousUsers) / previousUsers * 100;
    } catch (error) {
      console.error('Failed to calculate user growth:', error);
      return 0;
    }
  }

  // Calculate volatility
  calculateVolatility(historicalData) {
    try {
      const returns = [];
      for (let i = 1; i < historicalData.length; i++) {
        const dailyReturn = (historicalData[i].value - historicalData[i-1].value) / historicalData[i-1].value;
        returns.push(dailyReturn);
      }

      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      return Math.sqrt(variance * 365); // Annualized volatility
    } catch (error) {
      console.error('Failed to calculate volatility:', error);
      return 0;
    }
  }

  // Get latest metrics
  getLatestMetrics() {
    return this.metrics;
  }

  // Get historical metrics
  async getHistoricalMetrics(startTime, endTime) {
    return await this.timeSeriesDB.getRange('metrics', { startTime, endTime });
  }

  // Get user-specific analytics
  async getUserAnalytics(accountId) {
    try {
      const userMetrics = await this.timeSeriesDB.getLatest(`user:${accountId}`);
      const protocolMetrics = this.getLatestMetrics();

      return {
        stake: userMetrics.stake,
        rewards: userMetrics.rewards,
        apy: userMetrics.apy,
        performance: {
          daily: userMetrics.dailyROI,
          weekly: userMetrics.weeklyROI,
          monthly: userMetrics.monthlyROI
        },
        comparisonToProtocol: {
          apy: (userMetrics.apy - protocolMetrics.get('apy')) / protocolMetrics.get('apy') * 100,
          performance: (userMetrics.monthlyROI - protocolMetrics.get('performance').monthlyROI) / protocolMetrics.get('performance').monthlyROI * 100
        }
      };
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      return null;
    }
  }
}

module.exports = AnalyticsService;
