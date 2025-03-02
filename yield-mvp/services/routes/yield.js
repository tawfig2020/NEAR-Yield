const express = require('express');
const router = express.Router();

// Get all yield opportunities
router.get('/opportunities', async (req, res) => {
  try {
    // Mock data for now - will be replaced with real data from NEAR RPC
    const opportunities = [
      { 
        protocol: 'Ref Finance',
        apy: '12.5',
        tvl: 2400000,
        risk: 'Medium',
        tokens: ['NEAR', 'USDT'],
        lastUpdated: new Date()
      },
      {
        protocol: 'Burrow',
        apy: '8.2',
        tvl: 1800000,
        risk: 'Low',
        tokens: ['NEAR', 'USN'],
        lastUpdated: new Date()
      },
      {
        protocol: 'Pembrock',
        apy: '15.1',
        tvl: 900000,
        risk: 'High',
        tokens: ['NEAR', 'ETH'],
        lastUpdated: new Date()
      }
    ];

    res.json(opportunities);
  } catch (error) {
    console.error('Error fetching yield opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch yield opportunities' });
  }
});

// Get yield analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = {
      averageApy: 11.93,
      totalTvl: 5100000,
      activeProtocols: 3,
      historicalApy: {
        '1d': [/* historical data points */],
        '7d': [/* historical data points */],
        '30d': [/* historical data points */]
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching yield analytics:', error);
    res.status(500).json({ error: 'Failed to fetch yield analytics' });
  }
});

// Get risk analysis
router.get('/risk', async (req, res) => {
  try {
    const riskAnalysis = {
      protocols: [
        {
          name: 'Ref Finance',
          riskScore: 5,
          factors: {
            smartContractRisk: 4,
            liquidityRisk: 2,
            marketRisk: 3
          }
        },
        // Add more protocols...
      ]
    };

    res.json(riskAnalysis);
  } catch (error) {
    console.error('Error fetching risk analysis:', error);
    res.status(500).json({ error: 'Failed to fetch risk analysis' });
  }
});

module.exports = router;
