const request = require('supertest');
const WebSocket = require('ws');
const { setupTestEnv, teardownTestEnv, getApiServer } = require('../setup');
const { ApiServer } = require('../../api/server');

describe('API Integration Tests', () => {
  let apiServer;
  let apiPort;

  beforeAll(async () => {
    const env = await setupTestEnv();
    apiServer = getApiServer();
    apiPort = env.apiPort;
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  describe('REST API', () => {
    describe('Health Check', () => {
      it('should return healthy status', async () => {
        const response = await request(apiServer.app)
          .get('/health')
          .expect(200);

        expect(response.body).toEqual({ status: 'healthy' });
      });
    });

    describe('Strategy Endpoints', () => {
      const strategyId = 'test.near';

      it('should get strategy details', async () => {
        const response = await request(apiServer.app)
          .get(`/api/v1/strategy/${strategyId}`)
          .expect(200);

        expect(response.body).toHaveProperty('yieldRate');
        expect(response.body).toHaveProperty('totalStaked');
        expect(response.body).toHaveProperty('minStake');
        expect(response.body).toHaveProperty('maxStake');
      });

      it('should stake in strategy', async () => {
        const response = await request(apiServer.app)
          .post(`/api/v1/strategy/${strategyId}/stake`)
          .send({ amount: '100' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('transaction');
      });

      it('should fail staking with invalid amount', async () => {
        await request(apiServer.app)
          .post(`/api/v1/strategy/${strategyId}/stake`)
          .send({ amount: '-100' })
          .expect(400);
      });
    });

    describe('Analytics Endpoints', () => {
      it('should get current metrics', async () => {
        const response = await request(apiServer.app)
          .get('/api/v1/analytics/metrics')
          .expect(200);

        expect(response.body).toHaveProperty('tvl');
        expect(response.body).toHaveProperty('apy');
        expect(response.body).toHaveProperty('performance');
      });

      it('should get historical metrics', async () => {
        const response = await request(apiServer.app)
          .get('/api/v1/analytics/history')
          .query({
            start: Date.now() - 7 * 24 * 60 * 60 * 1000,
            end: Date.now()
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toHaveProperty('timestamp');
        expect(response.body[0]).toHaveProperty('metrics');
      });
    });
  });

  describe('WebSocket API', () => {
    let ws;

    beforeEach((done) => {
      ws = new WebSocket(`ws://localhost:${apiPort}`);
      ws.on('open', done);
    });

    afterEach((done) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      done();
    });

    it('should subscribe to price updates', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { channel: 'prices' }
      }));

      ws.on('message', (data) => {
        const message = JSON.parse(data);
        expect(message.type).toBe('update');
        expect(message.channel).toBe('prices');
        expect(message).toHaveProperty('data');
        done();
      });
    });

    it('should subscribe to yield updates', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { channel: 'yields' }
      }));

      ws.on('message', (data) => {
        const message = JSON.parse(data);
        expect(message.type).toBe('update');
        expect(message.channel).toBe('yields');
        expect(message).toHaveProperty('data');
        done();
      });
    });

    it('should handle invalid subscription', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { channel: 'invalid' }
      }));

      ws.on('message', (data) => {
        const message = JSON.parse(data);
        expect(message.type).toBe('error');
        expect(message).toHaveProperty('error');
        done();
      });
    });

    it('should unsubscribe from updates', (done) => {
      // First subscribe
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { channel: 'prices' }
      }));

      // Then unsubscribe
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        payload: { channel: 'prices' }
      }));

      // Should not receive updates after unsubscribe
      let messageCount = 0;
      ws.on('message', () => {
        messageCount++;
      });

      // Wait a bit to ensure no messages are received
      setTimeout(() => {
        expect(messageCount).toBe(1); // Only the initial subscription message
        done();
      }, 1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limit
      const requests = Array(150).fill().map(() =>
        request(apiServer.app)
          .get('/api/v1/analytics/metrics')
          .set('Authorization', 'Bearer test-token')
      );

      const responses = await Promise.all(requests);
      expect(responses.some(res => res.status === 429)).toBe(true);
    });

    it('should handle invalid JSON', async () => {
      const response = await request(apiServer.app)
        .post('/api/v1/strategy/stake')
        .set('Authorization', 'Bearer test-token')
        .send('invalid json');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid JSON');
    });

    it('should handle unauthorized access', async () => {
      const response = await request(apiServer.app)
        .get('/api/v1/analytics/metrics');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No authorization header');
    });
  });
});
