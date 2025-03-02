const { MongoMemoryServer } = require('mongodb-memory-server');
const { TimeSeriesDB } = require('../database/timeSeriesDB');
const { ApiServer } = require('../api/server');

let mongoServer;
let timeSeriesDB;
let apiServer;

// Setup test environment
async function setupTestEnv() {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  // Setup InfluxDB connection
  process.env.INFLUX_URL = 'http://localhost:8086';
  process.env.INFLUX_TOKEN = 'your-super-secret-auth-token';
  process.env.INFLUX_ORG = 'near_yield';
  process.env.INFLUX_BUCKET = 'yield_metrics';

  // Wait for InfluxDB to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Initialize TimeSeriesDB
  timeSeriesDB = new TimeSeriesDB();

  // Initialize API server
  apiServer = new ApiServer();
  await apiServer.start(8081); // Use port 8081 instead of random port

  return {
    mongoUri: process.env.MONGODB_URI,
    apiPort: apiServer.server.address().port,
    timeSeriesDB,
    apiServer
  };
}

// Teardown test environment
async function teardownTestEnv() {
  try {
    // Stop API server
    if (apiServer && apiServer.server) {
      await apiServer.stop();
    }

    // Close TimeSeriesDB connection
    if (timeSeriesDB) {
      await timeSeriesDB.close();
    }

    // Stop MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error during test environment teardown:', error);
  }
}

module.exports = {
  setupTestEnv,
  teardownTestEnv,
  getTimeSeriesDB: () => timeSeriesDB,
  getApiServer: () => apiServer
};
