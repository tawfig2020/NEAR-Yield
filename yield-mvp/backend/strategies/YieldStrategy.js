const { BN } = require('near-api-js');

class YieldStrategy {
  constructor(timeSeriesDB) {
    this.timeSeriesDB = timeSeriesDB;
    this.minStake = new BN('1000000000000000000000000'); // 1 NEAR
    this.maxStake = new BN('1000000000000000000000000000'); // 1000 NEAR
    this.totalStaked = new BN('0');
    this.yieldRate = 0.1; // 10% APY initial rate
  }

  async initialize() {
    try {
      await this.loadState();
      await this.updateYieldRate();
      return true;
    } catch (error) {
      console.error('Failed to initialize strategy:', error);
      throw error;
    }
  }

  async loadState() {
    try {
      const latest = await this.timeSeriesDB.getLatest('strategy_state');
      if (latest) {
        this.totalStaked = new BN(latest.totalStaked || '0');
        this.yieldRate = latest.yieldRate || 0.1;
      }
      return true;
    } catch (error) {
      console.error('Failed to load strategy state:', error);
      throw error;
    }
  }

  async saveState() {
    try {
      await this.timeSeriesDB.store('strategy_state', Date.now(), {
        totalStaked: this.totalStaked.toString(),
        yieldRate: this.yieldRate
      });
      return true;
    } catch (error) {
      console.error('Failed to save strategy state:', error);
      throw error;
    }
  }

  async stake(amount) {
    const stakeAmount = new BN(amount);
    
    if (stakeAmount.lt(this.minStake)) {
      throw new Error('Stake amount below minimum');
    }
    
    if (stakeAmount.gt(this.maxStake)) {
      throw new Error('Stake amount above maximum');
    }

    this.totalStaked = this.totalStaked.add(stakeAmount);
    await this.saveState();
    await this.updateYieldRate();
    
    return true;
  }

  async unstake(amount) {
    const unstakeAmount = new BN(amount);
    
    if (unstakeAmount.gt(this.totalStaked)) {
      throw new Error('Insufficient staked balance');
    }

    this.totalStaked = this.totalStaked.sub(unstakeAmount);
    await this.saveState();
    await this.updateYieldRate();
    
    return true;
  }

  async updateYieldRate() {
    // Simple yield rate calculation based on total staked
    // In practice, this would involve more complex market factors
    const baseRate = 0.1; // 10% base APY
    const utilizationRate = Math.min(this.totalStaked.div(this.maxStake).toNumber(), 1);
    this.yieldRate = baseRate * (1 + utilizationRate);
    
    await this.timeSeriesDB.store('yield_rate', Date.now(), {
      rate: this.yieldRate,
      totalStaked: this.totalStaked.toString()
    });
    
    return this.yieldRate;
  }

  async getYieldRate() {
    return this.yieldRate;
  }

  async calculateRewards(stakedAmount, duration) {
    const amount = new BN(stakedAmount);
    const rewardRate = this.yieldRate / 365 / 24 / 60 / 60; // Convert APY to per-second rate
    const rewards = amount.muln(Math.floor(rewardRate * duration));
    
    return rewards;
  }

  async harvestRewards(accountId) {
    const rewards = await this.calculateRewards(this.totalStaked, 86400); // Daily rewards
    
    await this.timeSeriesDB.store('rewards', Date.now(), {
      accountId,
      amount: rewards.toString()
    });
    
    return rewards;
  }

  async getStats() {
    return {
      totalStaked: this.totalStaked.toString(),
      yieldRate: this.yieldRate,
      minStake: this.minStake.toString(),
      maxStake: this.maxStake.toString()
    };
  }
}

module.exports = { YieldStrategy };
