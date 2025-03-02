const { getRedisClient } = require('../utils/redis');
const { getNearConnection } = require('../utils/near');
const { calculateRiskScore } = require('../utils/risk');
const WebSocket = require('ws');

class YieldService {
  constructor() {
    this.redisClient = getRedisClient();
    this.nearConnection = getNearConnection();
    this.priceFeeds = new Map();
    this.subscribers = new Map();
    this.initializePriceFeeds();
  }

  async initializePriceFeeds() {
    // Initialize WebSocket connections for price feeds
    const protocols = ['ref-finance', 'burrow', 'jumbo'];
    
    protocols.forEach(protocol => {
      const ws = new WebSocket(`wss://api.${protocol}.near/ws/v1/prices`);
      
      ws.on('message', async (data) => {
        const priceData = JSON.parse(data);
        await this.updateProtocolData(protocol, priceData);
        this.notifySubscribers(protocol);
      });

      this.priceFeeds.set(protocol, ws);
    });
  }

  async getOpportunities(filters = {}) {
    try {
      const { protocol, minApy, maxRisk } = filters;
      
      // Get all protocol data from Redis
      const protocolKeys = await this.redisClient.keys('protocol:*');
      let opportunities = [];

      for (const key of protocolKeys) {
        const protocolData = JSON.parse(await this.redisClient.get(key));
        const protocolName = key.split(':')[1];

        // Apply filters
        if (protocol && protocol !== 'all' && protocol !== protocolName) continue;
        if (minApy && protocolData.apy < parseFloat(minApy)) continue;

        // Calculate risk score
        const riskScore = calculateRiskScore({
          liquidityScore: protocolData.liquidity,
          volatilityScore: protocolData.volatility,
          protocolScore: protocolData.security,
          auditsScore: protocolData.audits
        });

        if (maxRisk && maxRisk !== 'all') {
          const riskThresholds = {
            low: 30,
            medium: 60,
            high: 100
          };
          if (riskScore > riskThresholds[maxRisk]) continue;
        }

        opportunities.push({
          id: `${protocolName}-${protocolData.pool}`,
          protocol: protocolName,
          pool: protocolData.pool,
          apy: protocolData.apy,
          tvl: protocolData.tvl,
          riskScore,
          tokens: protocolData.tokens
        });
      }

      return opportunities;
    } catch (error) {
      console.error('Error getting yield opportunities:', error);
      throw error;
    }
  }

  async updateProtocolData(protocol, priceData) {
    try {
      const protocolKey = `protocol:${protocol}`;
      const currentData = JSON.parse(await this.redisClient.get(protocolKey) || '{}');

      // Update APY based on new price data
      const newApy = this.calculateApy(currentData, priceData);
      
      const updatedData = {
        ...currentData,
        apy: newApy,
        lastUpdated: new Date().toISOString()
      };

      await this.redisClient.set(protocolKey, JSON.stringify(updatedData));
    } catch (error) {
      console.error(`Error updating protocol data for ${protocol}:`, error);
    }
  }

  calculateApy(currentData, priceData) {
    // Implement APY calculation based on price data
    // This is a simplified example
    const { baseApy, rewardApy } = currentData;
    const priceImpact = priceData.priceChange24h || 0;
    
    return baseApy + rewardApy + (priceImpact * 0.1);
  }

  subscribeToUpdates(protocol, callback) {
    if (!this.subscribers.has(protocol)) {
      this.subscribers.set(protocol, new Set());
    }
    this.subscribers.get(protocol).add(callback);
  }

  unsubscribeFromUpdates(protocol, callback) {
    if (this.subscribers.has(protocol)) {
      this.subscribers.get(protocol).delete(callback);
    }
  }

  notifySubscribers(protocol) {
    if (this.subscribers.has(protocol)) {
      this.subscribers.get(protocol).forEach(callback => {
        callback(protocol);
      });
    }
  }

  async getHistoricalPerformance(protocol, days = 30) {
    try {
      const historicalKey = `protocol:${protocol}:history`;
      const data = await this.redisClient.get(historicalKey);
      
      if (!data) return [];

      const history = JSON.parse(data);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return history.filter(item => new Date(item.date) >= startDate);
    } catch (error) {
      console.error('Error getting historical performance:', error);
      throw error;
    }
  }
}

module.exports = new YieldService();
