const { setupTestEnv, teardownTestEnv, getTimeSeriesDB } = require('../setup');
const { YieldStrategy } = require('../../contracts/YieldStrategy');

describe('YieldStrategy Integration Tests', () => {
  let timeSeriesDB;
  let strategy;

  beforeAll(async () => {
    const env = await setupTestEnv();
    timeSeriesDB = getTimeSeriesDB();
    strategy = new YieldStrategy(timeSeriesDB);
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  describe('Strategy Parameters', () => {
    it('should have valid initial parameters', async () => {
      const params = await strategy.getParameters();
      expect(params.minStake).toBeGreaterThan(0);
      expect(params.maxStake).toBeGreaterThan(params.minStake);
      expect(params.yieldRate).toBeGreaterThan(0);
    });

    it('should get current yield rate', async () => {
      const rate = await strategy.getCurrentYieldRate();
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('Staking Operations', () => {
    const testAccount = 'test.near';
    const stakeAmount = 1000;

    it('should stake tokens successfully', async () => {
      const result = await strategy.stake(testAccount, stakeAmount);
      expect(result.success).toBe(true);
      expect(result.stakedAmount).toBe(stakeAmount);
    });

    it('should fail staking below minimum', async () => {
      const params = await strategy.getParameters();
      await expect(
        strategy.stake(testAccount, params.minStake - 1)
      ).rejects.toThrow('Below minimum stake amount');
    });

    it('should fail staking above maximum', async () => {
      const params = await strategy.getParameters();
      await expect(
        strategy.stake(testAccount, params.maxStake + 1)
      ).rejects.toThrow('Above maximum stake amount');
    });

    it('should unstake tokens successfully', async () => {
      const result = await strategy.unstake(testAccount, stakeAmount);
      expect(result.success).toBe(true);
      expect(result.unstakedAmount).toBe(stakeAmount);
    });
  });

  describe('Reward Distribution', () => {
    const testAccount = 'test.near';
    const stakeAmount = 1000;

    beforeEach(async () => {
      await strategy.stake(testAccount, stakeAmount);
    });

    afterEach(async () => {
      await strategy.unstake(testAccount, stakeAmount);
    });

    it('should accumulate rewards over time', async () => {
      // Wait for rewards to accumulate
      await new Promise(resolve => setTimeout(resolve, 1000));

      const rewards = await strategy.getAccumulatedRewards(testAccount);
      expect(rewards).toBeGreaterThan(0);
    });

    it('should harvest rewards successfully', async () => {
      // Wait for rewards to accumulate
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await strategy.harvestRewards(testAccount);
      expect(result.success).toBe(true);
      expect(result.harvestedAmount).toBeGreaterThan(0);
    });
  });

  describe('Strategy Updates', () => {
    const ownerAccount = 'owner.near';
    const nonOwnerAccount = 'user.near';

    it('should update strategy parameters as owner', async () => {
      const newParams = {
        minStake: 100,
        maxStake: 10000,
        yieldRate: 0.1
      };

      const result = await strategy.updateParameters(ownerAccount, newParams);
      expect(result.success).toBe(true);

      const params = await strategy.getParameters();
      expect(params).toEqual(newParams);
    });

    it('should fail updating strategy as non-owner', async () => {
      const newParams = {
        minStake: 200,
        maxStake: 20000,
        yieldRate: 0.2
      };

      await expect(
        strategy.updateParameters(nonOwnerAccount, newParams)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Total Stats', () => {
    it('should track total staked amount', async () => {
      const total = await strategy.getTotalStaked();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should calculate APY correctly', async () => {
      const apy = await strategy.calculateAPY();
      expect(typeof apy).toBe('number');
      expect(apy).toBeGreaterThan(0);
    });
  });
});
