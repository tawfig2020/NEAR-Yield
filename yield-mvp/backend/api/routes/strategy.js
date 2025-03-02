const express = require('express');
const router = express.Router();
const { validateStrategyParams } = require('../../utils/validation');
const YieldStrategy = require('../../contracts/YieldStrategy');

// Get strategy details
router.get('/:strategyId', async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const strategy = new YieldStrategy(strategyId);
    
    const [yieldRate, totalStaked] = await Promise.all([
      strategy.getYieldRate(),
      strategy.getTotalStaked()
    ]);

    res.json({
      strategyId,
      yieldRate,
      totalStaked,
      minStake: strategy.MIN_STAKE_AMOUNT,
      maxStake: strategy.MAX_STAKE_AMOUNT
    });
  } catch (error) {
    next(error);
  }
});

// Stake in strategy
router.post('/:strategyId/stake', async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const { amount } = req.body;
    const strategy = new YieldStrategy(strategyId);

    const result = await strategy.stake(amount);
    res.json({ success: true, transaction: result });
  } catch (error) {
    next(error);
  }
});

// Unstake from strategy
router.post('/:strategyId/unstake', async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const { amount } = req.body;
    const strategy = new YieldStrategy(strategyId);

    const result = await strategy.unstake(amount);
    res.json({ success: true, transaction: result });
  } catch (error) {
    next(error);
  }
});

// Harvest rewards
router.post('/:strategyId/harvest', async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const strategy = new YieldStrategy(strategyId);

    const result = await strategy.harvestRewards();
    res.json({ success: true, transaction: result });
  } catch (error) {
    next(error);
  }
});

// Update strategy parameters (admin only)
router.put('/:strategyId', async (req, res, next) => {
  try {
    const { strategyId } = req.params;
    const params = req.body;
    
    validateStrategyParams(params);
    const strategy = new YieldStrategy(strategyId);

    const result = await strategy.updateStrategy(params);
    res.json({ success: true, transaction: result });
  } catch (error) {
    next(error);
  }
});

// Get user position in strategy
router.get('/:strategyId/position/:accountId', async (req, res, next) => {
  try {
    const { strategyId, accountId } = req.params;
    const strategy = new YieldStrategy(strategyId);

    const [stake, rewards] = await Promise.all([
      strategy.getUserStake(accountId),
      strategy.getRewards(accountId)
    ]);

    res.json({ stake, rewards });
  } catch (error) {
    next(error);
  }
});

module.exports = { strategyRoutes: router };
