# Developer Documentation

## 🏗 Architecture Overview

### System Components

```
NEAR Deep Yield Platform
├── Frontend (React)
│   ├── UI Components
│   ├── State Management
│   └── Web3 Integration
├── Backend (Node.js)
│   ├── API Server
│   ├── WebSocket Server
│   └── Time Series DB
└── Smart Contracts (NEAR)
    ├── Yield Strategy
    ├── Token Management
    └── Rewards Distribution
```

### Key Technologies

- **Frontend**: React, WebSocket, near-api-js
- **Backend**: Node.js, Express, InfluxDB
- **Smart Contracts**: NEAR Protocol
- **DevOps**: Docker, GitHub Actions

## 🔧 Development Setup

### Prerequisites

```bash
# Install Node.js (v16+)
nvm install 16
nvm use 16

# Install NEAR CLI
npm install -g near-cli

# Install Docker
# Follow instructions at https://docs.docker.com/get-docker/
```

### Environment Setup

1. **Backend Configuration**

```bash
# Create environment file
cp backend/.env.example backend/.env

# Required environment variables
NEAR_NODE_URL=https://rpc.testnet.near.org
NEAR_NETWORK_ID=testnet
NEAR_CONTRACT_ID=your-contract.testnet
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-token
INFLUX_ORG=your-org
INFLUX_BUCKET=your-bucket
```

2. **Frontend Configuration**

```bash
# Create environment file
cp frontend/.env.example frontend/.env

# Required environment variables
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
REACT_APP_NEAR_NODE_URL=https://rpc.testnet.near.org
REACT_APP_NEAR_NETWORK_ID=testnet
```

## 📚 Code Organization

### Frontend Structure

```
frontend/src/
├── components/           # Reusable UI components
│   ├── common/          # Basic components (Button, Card, etc.)
│   ├── layout/          # Layout components
│   └── feedback/        # Toast, Alert components
├── contexts/            # React contexts
│   ├── ThemeContext.js  # Dark/Light mode
│   └── WalletContext.js # Wallet connection
├── hooks/               # Custom React hooks
│   ├── useRealTimeData.js
│   └── useSecureTransaction.js
├── pages/               # Page components
├── services/           # API and external services
└── utils/              # Helper functions
```

### Backend Structure

```
backend/
├── api/                # API routes and controllers
│   ├── routes/        # Route definitions
│   └── middleware/    # Custom middleware
├── database/          # Database configurations
│   └── timeSeriesDB.js
├── services/          # Business logic
│   ├── AccountService.js
│   └── AnalyticsService.js
└── tests/            # Test suites
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/           # End-to-end tests
```

## 🔍 Code Style Guide

### JavaScript/React

- Use ES6+ features
- Follow React Hooks best practices
- Use PropTypes for component props
- Implement error boundaries
- Use async/await for promises

### CSS/Styling

- Use CSS variables for theming
- Follow BEM naming convention
- Implement mobile-first design
- Use flexbox/grid for layouts

## 🛠 API Integration

### WebSocket Events

```javascript
// Subscribe to updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'yields'
}));

// Handle updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'update') {
    updateUI(data);
  }
};
```

### REST API Integration

```javascript
// Example API call
const fetchMetrics = async () => {
  const response = await fetch('/api/v1/analytics/metrics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

## 🔒 Security Guidelines

1. **Input Validation**
   - Sanitize all user inputs
   - Validate transaction parameters
   - Check array bounds

2. **Authentication**
   - Implement JWT validation
   - Use secure session management
   - Rate limit authentication attempts

3. **Transaction Security**
   - Verify signatures
   - Implement nonce checking
   - Add timeout mechanisms

## 🐛 Debugging

### Tools

- Chrome DevTools for frontend
- VS Code debugger for backend
- NEAR Explorer for transactions

### Common Issues

1. **Transaction Failures**
   - Check gas limits
   - Verify account balance
   - Review error logs

2. **WebSocket Issues**
   - Check connection state
   - Monitor message queue
   - Implement reconnection logic

## 📈 Performance Optimization

1. **Frontend**
   - Implement code splitting
   - Use React.memo for optimization
   - Lazy load components

2. **Backend**
   - Cache frequent queries
   - Optimize database indexes
   - Implement request batching

## 🔄 CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: CI/CD
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          # Deployment steps
```
