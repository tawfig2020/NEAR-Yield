const { setupTestEnv, teardownTestEnv } = require('../setup');
const { ApiServer } = require('../../api/server');
const { TimeSeriesDB } = require('../../database/timeSeriesDB');
const YieldStrategy = require('../../contracts/YieldStrategy');
const { AccountService } = require('../../services/AccountService');
const { TransactionService } = require('../../services/TransactionService');
const { AnalyticsService } = require('../../services/AnalyticsService');
const WebSocket = require('ws');
const request = require('supertest');

describe('Backend Integration Tests', () => {
  let config;
  let apiServer;
  let timeSeriesDB;
  let accountService;
  let transactionService;
  let analyticsService;
  let yieldStrategy;
  let testAccount;

  beforeAll(async () => {
    // Setup test environment
    config = await setupTestEnv();
    
    // Initialize services
    timeSeriesDB = new TimeSeriesDB();
    apiServer = new ApiServer();
    accountService = new AccountService(config.near, 'testnet');
    transactionService = new TransactionService(config.near, testAccount);
    analyticsService = new AnalyticsService();
    
    // Create test account
    const keyPair = await accountService.generateKeyPair();
    testAccount = await accountService.createAccount('test.near', keyPair.publicKey);
    
    // Initialize yield strategy
    yieldStrategy = new YieldStrategy('test.near', 'testnet', testAccount);
    
    // Start API server
    await apiServer.start(config.apiPort);
  });

  afterAll(async () => {
    await apiServer.stop();
    await teardownTestEnv();
  });

  describe('Account Management Flow', () => {
    it('should create and manage account successfully', async () => {
      // Create new account
      const keyPair = await accountService.generateKeyPair();
      const newAccount = await accountService.createAccount('user1.near', keyPair.publicKey);
      expect(newAccount).toBeTruthy();

      // Verify account exists
      const exists = await accountService.accountExists('user1.near');
      expect(exists).toBe(true);

      // Add access key
      await accountService.addAccessKey('user1.near', keyPair.publicKey, '1000000000000', 'test.near');
      
      // Get account details
      const details = await accountService.getAccount('user1.near');
      expect(details.accountId).toBe('user1.near');
      expect(details.status).toBe('active');
    });
  });

  describe('Transaction Processing Flow', () => {
    it('should process transactions correctly', async () => {
      // Queue transaction
      const transaction = {
        type: 'transfer',
        amount: '100',
        receiver: 'user1.near'
      };

      const txHash = await transactionService.queueTransaction(transaction);
      expect(txHash).toBeTruthy();

      // Check transaction status
      const status = await transactionService.getTransactionStatus(txHash);
      expect(status.status).toBe('pending');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify transaction completed
      const finalStatus = await transactionService.getTransactionStatus(txHash);
      expect(finalStatus.status).toBe('completed');
    });
  });

  describe('Yield Strategy Flow', () => {
    it('should handle complete yield strategy lifecycle', async () => {
      // Initial stake
      const stakeResult = await yieldStrategy.stake('100');
      expect(stakeResult).toBeTruthy();

      // Check stake amount
      const userStake = await yieldStrategy.getUserStake('test.near');
      expect(userStake).toBe('100');

      // Wait for rewards accumulation
      jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 1 day

      // Check rewards
      const rewards = await yieldStrategy.getRewards('test.near');
      expect(parseFloat(rewards)).toBeGreaterThan(0);

      // Harvest rewards
      const harvestResult = await yieldStrategy.harvestRewards();
      expect(harvestResult).toBeTruthy();

      // Unstake
      const unstakeResult = await yieldStrategy.unstake('50');
      expect(unstakeResult).toBeTruthy();

      // Verify final stake
      const finalStake = await yieldStrategy.getUserStake('test.near');
      expect(finalStake).toBe('50');
    });
  });

  describe('Analytics Integration', () => {
    it('should track and report metrics correctly', async () => {
      // Store test metrics
      await timeSeriesDB.store('metrics', Date.now(), {
        tvl: 1000000,
        apy: 15.5,
        activeUsers: 100
      });

      // Get latest metrics
      const metrics = await analyticsService.getLatestMetrics();
      expect(metrics.get('tvl')).toBeTruthy();
      expect(metrics.get('apy')).toBeTruthy();

      // Get historical metrics
      const history = await analyticsService.getHistoricalMetrics(
        Date.now() - 24 * 60 * 60 * 1000,
        Date.now()
      );
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('API Integration', () => {
    let ws;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${config.apiPort}`);
      ws.on('open', done);
    });

    afterEach(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should handle REST and WebSocket communications', async () => {
      // Test REST endpoints
      const strategyResponse = await request(apiServer.app)
        .get('/api/v1/strategy/test.near')
        .expect(200);
      expect(strategyResponse.body).toHaveProperty('yieldRate');

      // Test WebSocket subscription
      return new Promise((resolve) => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel: 'yields' }
        }));

        ws.on('message', (data) => {
          const message = JSON.parse(data);
          expect(message.type).toBe('update');
          expect(message.channel).toBe('yields');
          resolve();
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle and recover from errors properly', async () => {
      // Test invalid transaction
      const invalidTx = {
        type: 'transfer',
        amount: '-100' // Invalid amount
      };
      await expect(transactionService.queueTransaction(invalidTx)).rejects.toThrow();

      // Test invalid stake amount
      await expect(yieldStrategy.stake('0')).rejects.toThrow();

      // Test invalid account creation
      await expect(accountService.createAccount('', '')).rejects.toThrow();

      // Test API error handling
      await request(apiServer.app)
        .post('/api/v1/strategy/test.near/stake')
        .send({ amount: '-100' })
        .expect(400);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [];

      // Create multiple stake operations
      for (let i = 0; i < 10; i++) {
        operations.push(yieldStrategy.stake('10'));
      }

      // Create multiple analytics queries
      for (let i = 0; i < 10; i++) {
        operations.push(analyticsService.getLatestMetrics());
      }

      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);
      
      // Check all operations completed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(operations.length);
    });

    it('should maintain response times under load', async () => {
      const start = Date.now();

      // Make 50 concurrent API requests
      const requests = Array(50).fill().map(() =>
        request(apiServer.app)
          .get('/api/v1/strategy/test.near')
      );

      await Promise.all(requests);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
