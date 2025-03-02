const express = require('express');
const router = express.Router();

// Get current metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await req.analyticsService.getLatestMetrics();
    res.json(Object.fromEntries(metrics));
  } catch (error) {
    next(error);
  }
});

// Get historical metrics
router.get('/history', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const startTime = parseInt(start) || Date.now() - 7 * 24 * 60 * 60 * 1000; // Default 7 days
    const endTime = parseInt(end) || Date.now();

    const history = await req.analyticsService.getHistoricalMetrics(startTime, endTime);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Get user analytics
router.get('/user/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const analytics = await req.analyticsService.getUserAnalytics(accountId);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Get protocol performance
router.get('/performance', async (req, res, next) => {
  try {
    const performance = await req.analyticsService.calculateProtocolPerformance();
    res.json(performance);
  } catch (error) {
    next(error);
  }
});

// Get TVL history
router.get('/tvl/history', async (req, res, next) => {
  try {
    const { period } = req.query;
    const endTime = Date.now();
    let startTime;

    switch (period) {
      case '1d':
        startTime = endTime - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = endTime - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = endTime - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = endTime - 7 * 24 * 60 * 60 * 1000;
    }

    const history = await req.timeSeriesDB.getRange('tvl', { startTime, endTime });
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Get yield rates history
router.get('/yields/history', async (req, res, next) => {
  try {
    const { period } = req.query;
    const endTime = Date.now();
    let startTime;

    switch (period) {
      case '1d':
        startTime = endTime - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = endTime - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = endTime - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = endTime - 7 * 24 * 60 * 60 * 1000;
    }

    const history = await req.timeSeriesDB.getRange('yields', { startTime, endTime });
    res.json(history);
  } catch (error) {
    next(error);
  }
});

module.exports = { analyticsRoutes: router };
