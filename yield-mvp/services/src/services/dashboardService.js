const { getRedisClient } = require('../utils/redis');
const { getNearConnection } = require('../utils/near');
const { calculateRiskScore } = require('../utils/risk');

class DashboardService {
  constructor() {
    this.redisClient = getRedisClient();
    this.nearConnection = getNearConnection();
  }

  async getStats(userId) {
    try {
      // Get user's portfolio data
      const portfolio = await this.redisClient.get(`portfolio:${userId}`);
      const positions = portfolio ? JSON.parse(portfolio) : [];

      // Calculate total portfolio value and yield
      let totalValue = 0;
      let totalYield = 0;
      const performanceData = [];

      // Get historical data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const position of positions) {
        const { protocol, amount, startDate } = position;
        
        // Get current APY and TVL for the protocol
        const protocolData = await this.redisClient.get(`protocol:${protocol}`);
        const { apy, tvl } = JSON.parse(protocolData);

        // Calculate position value with yield
        const daysInvested = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
        const dailyRate = (apy / 100) / 365;
        const currentValue = amount * Math.pow(1 + dailyRate, daysInvested);

        totalValue += currentValue;
        totalYield += currentValue - amount;
      }

      // Get historical performance data
      const historicalData = await this.redisClient.get(`portfolio:${userId}:history`);
      if (historicalData) {
        const data = JSON.parse(historicalData);
        performanceData.push(...data.filter(item => new Date(item.date) >= thirtyDaysAgo));
      }

      return {
        totalValue,
        totalYield,
        activePositions: positions.length,
        performanceData
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

module.exports = new DashboardService();
