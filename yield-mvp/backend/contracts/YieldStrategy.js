const { Contract } = require('near-api-js');

class YieldStrategy extends Contract {
  // Strategy parameters
  constructor(accountId, networkId, wallet) {
    super(accountId, networkId, wallet, {
      viewMethods: ['getYieldRate', 'getTotalStaked', 'getUserStake', 'getRewards'],
      changeMethods: ['stake', 'unstake', 'harvestRewards', 'updateStrategy']
    });
    
    this.MIN_STAKE_AMOUNT = '1'; // in NEAR
    this.MAX_STAKE_AMOUNT = '10000'; // in NEAR
    this.REWARD_RATE = '0.1'; // 10% APY base rate
  }

  // View methods
  async getYieldRate() {
    return this.REWARD_RATE;
  }

  async getTotalStaked() {
    return await this.contract.get_total_staked();
  }

  async getUserStake(accountId) {
    return await this.contract.get_user_stake({ account_id: accountId });
  }

  async getRewards(accountId) {
    return await this.contract.get_rewards({ account_id: accountId });
  }

  // Change methods
  async stake(amount) {
    if (amount < this.MIN_STAKE_AMOUNT || amount > this.MAX_STAKE_AMOUNT) {
      throw new Error(`Stake amount must be between ${this.MIN_STAKE_AMOUNT} and ${this.MAX_STAKE_AMOUNT} NEAR`);
    }
    
    return await this.contract.stake({
      args: { amount },
      gas: '300000000000000', // 300 TGas
      amount: amount
    });
  }

  async unstake(amount) {
    return await this.contract.unstake({
      args: { amount },
      gas: '300000000000000'
    });
  }

  async harvestRewards() {
    return await this.contract.harvest_rewards({
      gas: '300000000000000'
    });
  }

  async updateStrategy(params) {
    if (!this.isOwner()) {
      throw new Error('Only contract owner can update strategy parameters');
    }
    
    return await this.contract.update_strategy({
      args: params,
      gas: '300000000000000'
    });
  }

  // Helper methods
  async isOwner() {
    const owner = await this.contract.get_owner();
    return owner === this.accountId;
  }
}

module.exports = YieldStrategy;
