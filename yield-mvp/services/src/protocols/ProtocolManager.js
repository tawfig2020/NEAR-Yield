const RefFinance = require('./RefFinance');
const JumboExchange = require('./JumboExchange');

class ProtocolManager {
  constructor() {
    this.protocols = new Map();
    this.initialize();
  }

  initialize() {
    this.registerProtocol(new RefFinance());
    this.registerProtocol(new JumboExchange());
  }

  registerProtocol(protocol) {
    this.protocols.set(protocol.name, protocol);
  }

  async getAllYieldOpportunities() {
    const opportunities = [];
    for (const protocol of this.protocols.values()) {
      try {
        const protocolOpps = await protocol.getYieldOpportunities();
        opportunities.push(...protocolOpps);
      } catch (error) {
        console.error(`Error fetching opportunities from ${protocol.name}:`, error);
      }
    }
    return opportunities;
  }

  async getProtocolOpportunities(protocolName) {
    const protocol = this.protocols.get(protocolName);
    if (!protocol) {
      throw new Error(`Protocol ${protocolName} not found`);
    }
    return protocol.getYieldOpportunities();
  }

  async getHistoricalData(protocolName, days = 30) {
    const protocol = this.protocols.get(protocolName);
    if (!protocol) {
      throw new Error(`Protocol ${protocolName} not found`);
    }
    return protocol.getHistoricalData(days);
  }

  async getTotalTVL() {
    let totalTVL = 0;
    for (const protocol of this.protocols.values()) {
      try {
        const tvl = await protocol.getTVL();
        totalTVL += tvl;
      } catch (error) {
        console.error(`Error fetching TVL from ${protocol.name}:`, error);
      }
    }
    return totalTVL;
  }

  getProtocolNames() {
    return Array.from(this.protocols.keys());
  }
}

module.exports = new ProtocolManager();
