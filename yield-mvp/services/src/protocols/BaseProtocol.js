class BaseProtocol {
  constructor(name) {
    this.name = name;
  }

  async getYieldOpportunities() {
    throw new Error('Method not implemented');
  }

  async getHistoricalData(days = 30) {
    throw new Error('Method not implemented');
  }

  async getTVL() {
    throw new Error('Method not implemented');
  }

  async getAPY() {
    throw new Error('Method not implemented');
  }

  normalizeData(data) {
    throw new Error('Method not implemented');
  }
}

module.exports = BaseProtocol;
