const fs = require('fs');
const path = require('path');

const envContent = `# InfluxDB Configuration
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-super-secret-auth-token
INFLUX_ORG=near_yield
INFLUX_BUCKET=yield_metrics

# NEAR Network Configuration
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org

# Security
JWT_SECRET=dev-jwt-secret-123
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Server Configuration
PORT=3000
NODE_ENV=development

# Analytics Configuration
METRICS_UPDATE_INTERVAL_MS=60000
PERFORMANCE_CALCULATION_INTERVAL_MS=300000`;

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('Created .env file with development configuration');
} else {
  console.log('.env file already exists, skipping creation');
}

// Check if Docker is running
const { execSync } = require('child_process');
try {
  execSync('docker info', { stdio: 'ignore' });
  console.log('Docker is running');
} catch (error) {
  console.error('Docker is not running. Please start Docker and try again.');
  process.exit(1);
}

console.log('\nNext steps:');
console.log('1. Start InfluxDB:');
console.log('   docker-compose up -d');
console.log('\n2. Run the tests:');
console.log('   npm run test:integration');
