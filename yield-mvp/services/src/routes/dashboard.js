const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const stats = await dashboardService.getStats(req.user.id);
  res.json(stats);
}));

module.exports = router;
