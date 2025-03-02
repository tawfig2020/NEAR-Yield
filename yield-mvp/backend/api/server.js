const express = require('express');
const WebSocket = require('ws');
const { TimeSeriesDB } = require('../database/timeSeriesDB');
const { YieldStrategy } = require('../strategies/YieldStrategy');
const { rateLimit } = require('express-rate-limit');

class Server {
  constructor() {
    this.app = express();
    this.wss = null;
    this.server = null;
    this.timeSeriesDB = new TimeSeriesDB();
    this.yieldStrategy = new YieldStrategy(this.timeSeriesDB);
    this.subscribers = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    this.app.use(limiter);
    
    // Authentication middleware
    this.app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader && req.path !== '/api/v1/health') {
        return res.status(401).json({ error: 'No authorization header' });
      }
      next();
    });
    
    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(err.status || 500).json({
        error: {
          message: err.message || 'Internal server error'
        }
      });
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/v1/health', async (req, res) => {
      try {
        const health = await this.timeSeriesDB.checkConnection();
        res.json({ status: 'ok', influxdb: health });
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    });

    // Invalid JSON handling
    this.app.use((err, req, res, next) => {
      if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: { message: 'Invalid JSON' } });
      }
      next(err);
    });
  }

  setupWebSocket(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'subscribe') {
            const { channel } = data.payload;
            if (!this.subscribers.has(channel)) {
              this.subscribers.set(channel, new Set());
            }
            this.subscribers.get(channel).add(ws);
            
            // Send initial data
            if (channel === 'yields') {
              const stats = await this.yieldStrategy.getStats();
              ws.send(JSON.stringify({
                type: 'update',
                channel: 'yields',
                data: stats
              }));
            }
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('Client disconnected');
        this.subscribers.forEach((subscribers) => {
          subscribers.delete(ws);
        });
      });
    });
  }

  async start(port = 8081) {
    try {
      await this.timeSeriesDB.checkConnection();
      await this.yieldStrategy.initialize();
      
      this.server = this.app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
      
      this.setupWebSocket(this.server);
      return true;
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop() {
    if (this.server) {
      this.server.close();
      console.log('Server stopped');
    }
    if (this.wss) {
      this.wss.close();
    }
    await this.timeSeriesDB.close();
  }

  async broadcastUpdate(channel, data) {
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      const message = JSON.stringify({
        type: 'update',
        channel,
        data
      });
      
      subscribers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
}

module.exports = { Server };
