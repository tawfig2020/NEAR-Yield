require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('redis');
const { Pool } = require('pg');
const yieldRoutes = require('./routes/yield');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Redis client
const redis = Redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis
(async () => {
  try {
    await redis.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

// PostgreSQL pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  host: process.env.POSTGRES_HOST || 'db',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'postgres'
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    await redis.ping();
    
    // Check PostgreSQL connection
    await pool.query('SELECT NOW()');
    
    res.json({
      status: 'healthy',
      services: {
        api: 'up',
        redis: 'up',
        postgres: 'up'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to NEAR Deep Yield API' });
});

// Sample data for testing
const sampleData = [
  {
    protocol: "Ref Finance",
    apy: "12.5",
    tvl: 2400000,
    risk: "Medium",
    tokens: ["NEAR", "USDT"],
    lastUpdated: new Date()
  },
  {
    protocol: "Burrow",
    apy: "8.2",
    tvl: 1800000,
    risk: "Low",
    tokens: ["NEAR", "USN"],
    lastUpdated: new Date()
  },
  {
    protocol: "Pembrock",
    apy: "15.1",
    tvl: 900000,
    risk: "High",
    tokens: ["NEAR", "ETH"],
    lastUpdated: new Date()
  }
];

// API endpoint to return sample data
app.get('/api/yield/opportunities', async (req, res) => {
  try {
    // Return sample data wrapped in success response
    res.json({
      success: true,
      data: sampleData
    });
  } catch (error) {
    console.error('Error fetching yield opportunities:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Yield routes
app.use('/api/yield', yieldRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`API server running on port ${port}`);
});
