const express = require('express');
const router = express.Router();
const { validateAccountId, validatePublicKey } = require('../../utils/validation');

// Create new account
router.post('/', async (req, res, next) => {
  try {
    const { accountId, publicKey } = req.body;
    validateAccountId(accountId);
    validatePublicKey(publicKey);

    const account = await req.accountService.createAccount(accountId, publicKey);
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Get account details
router.get('/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    validateAccountId(accountId);

    const account = await req.accountService.getAccount(accountId);
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Add access key
router.post('/:accountId/keys', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { publicKey, allowance, contractId } = req.body;
    
    validateAccountId(accountId);
    validatePublicKey(publicKey);

    await req.accountService.addAccessKey(accountId, publicKey, allowance, contractId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete access key
router.delete('/:accountId/keys/:publicKey', async (req, res, next) => {
  try {
    const { accountId, publicKey } = req.params;
    
    validateAccountId(accountId);
    validatePublicKey(publicKey);

    await req.accountService.deleteAccessKey(accountId, publicKey);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get account balance
router.get('/:accountId/balance', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    validateAccountId(accountId);

    const balance = await req.accountService.getBalance(accountId);
    res.json(balance);
  } catch (error) {
    next(error);
  }
});

module.exports = { accountRoutes: router };
