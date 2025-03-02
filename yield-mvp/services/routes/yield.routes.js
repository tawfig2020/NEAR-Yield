const express = require('express');
const router = express.Router();
const nearService = require('../services/near.service');
const logger = require('../utils/logger');

// Get all yield opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const data = await nearService.getProtocolData();
    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching yield opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch yield opportunities'
    });
  }
});

// Get protocol-specific opportunities
router.get('/opportunities/:protocol', async (req, res) => {
  try {
    const data = await nearService.getProtocolData();
    const filteredData = data.filter(item => 
      item.protocol.toLowerCase() === req.params.protocol.toLowerCase()
    );
    
    res.json({
      success: true,
      data: filteredData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error fetching ${req.params.protocol} opportunities:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch ${req.params.protocol} opportunities`
    });
  }
});

// Get aggregated statistics
router.get('/stats', async (req, res) => {
  try {
    const data = await nearService.getProtocolData();
    
    const stats = {
      totalTVL: data.reduce((sum, item) => sum + item.tvl, 0),
      averageAPY: data.reduce((sum, item) => sum + item.apy, 0) / data.length,
      totalProtocols: new Set(data.map(item => item.protocol)).size,
      opportunities: data.length,
      riskDistribution: {
        low: data.filter(item => item.riskLevel === 'Low').length,
        medium: data.filter(item => item.riskLevel === 'Medium').length,
        high: data.filter(item => item.riskLevel === 'High').length
      }
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching yield statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch yield statistics'
    });
  }
});

module.exports = router;
