const express = require('express');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

// Get user's portfolio
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const portfolio = await portfolioService.getPortfolio(req.user.id);
  res.json(portfolio);
}));

// Make a new investment
router.post('/invest', authenticate, asyncHandler(async (req, res) => {
  const { protocol, amount, poolId } = req.body;
  const result = await portfolioService.invest(req.user.id, {
    protocol,
    amount,
    poolId
  });
  res.json(result);
}));

// Withdraw from a position
router.post('/withdraw/:positionId', authenticate, asyncHandler(async (req, res) => {
  const { positionId } = req.params;
  const result = await portfolioService.withdraw(req.user.id, positionId);
  res.json(result);
}));

// Get transaction history
router.get('/transactions', authenticate, asyncHandler(async (req, res) => {
  const transactions = await portfolioService.getTransactions(req.user.id);
  res.json(transactions);
}));

module.exports = router;
