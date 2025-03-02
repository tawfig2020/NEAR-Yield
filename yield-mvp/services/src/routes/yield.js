const express = require('express');
const router = express.Router();
const yieldService = require('../services/yieldService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { catchAsync } = require('../middleware/errorHandler');
const cache = require('../utils/cache');
const { metrics } = require('../utils/monitoring');
const ProtocolManager = require('../protocols/ProtocolManager');
const FinancialCalculations = require('../utils/calculations');

const protocolManager = new ProtocolManager();

// Get all yield opportunities with optional filters
router.get('/opportunities', authenticate, asyncHandler(async (req, res) => {
  const { protocol, minApy, maxRisk } = req.query;
  const cacheKey = 'yield:opportunities';
  
  const opportunities = await cache.getOrSet(cacheKey, async () => {
    const start = Date.now();
    const data = await protocolManager.getAllYieldOpportunities();
    
    metrics.protocolDataFetchDuration
      .labels('all')
      .observe((Date.now() - start) / 1000);
    
    return data;
  }, 300); // Cache for 5 minutes

  // Add risk scores and analytics
  const enrichedOpportunities = opportunities.map(opp => ({
    ...opp,
    riskScore: FinancialCalculations.calculateRiskScore({
      apy: opp.apy,
      tvl: opp.tvl,
      volatility: opp.volatility || 0,
      auditScore: opp.auditScore || 0.7,
      timeInMarket: opp.timeInMarket || 180,
      protocolType: opp.type
    }),
    analytics: {
      impermanentLoss: FinancialCalculations.calculateImpermanentLoss(opp.priceRatio || 1),
      compoundedApy: FinancialCalculations.calculateAPY(opp.apy)
    }
  }));

  res.json({
    success: true,
    data: enrichedOpportunities
  });
}));

// Get opportunities for a specific protocol
router.get('/opportunities/:protocol', authenticate, asyncHandler(async (req, res) => {
  const { protocol } = req.params;
  const cacheKey = `yield:opportunities:${protocol}`;

  const opportunities = await cache.getOrSet(cacheKey, async () => {
    const start = Date.now();
    const data = await protocolManager.getProtocolOpportunities(protocol);
    
    metrics.protocolDataFetchDuration
      .labels(protocol)
      .observe((Date.now() - start) / 1000);
    
    return data;
  }, 300);

  res.json({
    success: true,
    data: opportunities
  });
}));

// Get historical data for a specific protocol
router.get('/historical/:protocol', authenticate, asyncHandler(async (req, res) => {
  const { protocol } = req.params;
  const { days = 30 } = req.query;
  const cacheKey = `yield:historical:${protocol}:${days}`;

  const data = await cache.getOrSet(cacheKey, async () => {
    const start = Date.now();
    const data = await protocolManager.getHistoricalData(protocol, days);
    
    metrics.protocolDataFetchDuration
      .labels(protocol)
      .observe((Date.now() - start) / 1000);
    
    return data;
  }, 3600); // Cache for 1 hour

  res.json({
    success: true,
    data
  });
}));

// Get total TVL across all protocols
router.get('/tvl', authenticate, asyncHandler(async (req, res) => {
  const cacheKey = 'yield:tvl';
  
  const tvl = await cache.getOrSet(cacheKey, async () => {
    const start = Date.now();
    const data = await protocolManager.getTotalTVL();
    
    metrics.protocolDataFetchDuration
      .labels('tvl')
      .observe((Date.now() - start) / 1000);
    
    return data;
  }, 300); // Cache for 5 minutes

  res.json({
    success: true,
    data: { tvl }
  });
}));

// Get list of available protocols
router.get('/protocols', authenticate, asyncHandler(async (req, res) => {
  const cacheKey = 'yield:protocols';
  
  const protocols = await cache.getOrSet(cacheKey, async () => {
    const start = Date.now();
    const data = await protocolManager.getProtocolNames();
    
    metrics.protocolDataFetchDuration
      .labels('protocols')
      .observe((Date.now() - start) / 1000);
    
    return data;
  }, 300); // Cache for 5 minutes

  res.json({
    success: true,
    data: protocols
  });
}));

// WebSocket endpoint for real-time updates
router.ws('/updates', (ws, req) => {
  const protocols = new Set();

  ws.on('message', (msg) => {
    const { action, protocol } = JSON.parse(msg);

    if (action === 'subscribe') {
      protocols.add(protocol);
      protocolManager.subscribeToUpdates(protocol, (data) => {
        ws.send(JSON.stringify({ protocol, data }));
      });
    } else if (action === 'unsubscribe') {
      protocols.delete(protocol);
      protocolManager.unsubscribeFromUpdates(protocol);
    }
  });

  ws.on('close', () => {
    protocols.forEach(protocol => {
      protocolManager.unsubscribeFromUpdates(protocol);
    });
  });
});

module.exports = router;
