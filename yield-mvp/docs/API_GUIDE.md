# NEAR Deep Yield Platform - API Documentation

## Overview
This document provides comprehensive documentation for the NEAR Deep Yield Platform API endpoints, authentication, and integration points.

## Authentication
All API requests require authentication using JWT tokens.

```typescript
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per user
- Bulk operations: 10 requests per minute

## API Endpoints

### 1. Strategy Management

#### Create Strategy
```http
POST /api/v1/strategies
Content-Type: application/json

{
  "name": "High Yield Strategy",
  "bearishThreshold": 30,
  "bullishThreshold": 70,
  "allocations": {
    "bearish": {
      "staking": 70,
      "stablecoin": 20,
      "defi": 10
    },
    "bullish": {
      "staking": 20,
      "stablecoin": 0,
      "defi": 80
    }
  }
}
```

#### Get Strategy
```http
GET /api/v1/strategies/:id
```

### 2. Sentiment Analysis

#### Get Current Sentiment
```http
GET /api/v1/sentiment
```

#### Update Source Weights
```http
PUT /api/v1/sentiment/weights
Content-Type: application/json

{
  "twitter": 40,
  "reddit": 30,
  "santiment": 30
}
```

### 3. Asset Management

#### Get Portfolio
```http
GET /api/v1/portfolio
```

#### Execute Rebalance
```http
POST /api/v1/portfolio/rebalance
```

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 429  | Rate Limit Exceeded |
| 500  | Internal Server Error |

## WebSocket Events

### Subscribe to Updates
```javascript
ws.subscribe('sentiment-updates');
ws.subscribe('portfolio-updates');
```

### Event Types
1. `SENTIMENT_UPDATE`
2. `PORTFOLIO_CHANGE`
3. `REBALANCE_TRIGGER`
4. `ALERT_NOTIFICATION`

## Smart Contract Integration

### Contract Methods

#### Read Methods
```typescript
// Get current strategy
function getStrategy(accountId: string): Strategy

// Get sentiment data
function getSentiment(): SentimentData

// Get portfolio state
function getPortfolio(accountId: string): Portfolio
```

#### Write Methods
```typescript
// Update strategy
function updateStrategy(strategy: Strategy): void

// Execute rebalance
function executeRebalance(): void

// Update sentiment weights
function updateSentimentWeights(weights: SentimentWeights): void
```

## Security Considerations

### API Security
1. All endpoints use HTTPS
2. JWT token required for authentication
3. Rate limiting per IP and user
4. Input validation on all parameters

### Smart Contract Security
1. Access control checks
2. Reentrancy protection
3. Integer overflow protection
4. Gas optimization

## Integration Guide

### 1. Frontend Integration
```typescript
import { NearDeepYield } from '@near-deep-yield/sdk';

const client = new NearDeepYield({
  apiKey: 'your-api-key',
  network: 'mainnet',
});

// Create strategy
await client.createStrategy({
  name: 'My Strategy',
  // ... strategy config
});
```

### 2. Wallet Integration
```typescript
import { connect, WalletConnection } from 'near-api-js';

// Connect to NEAR
const near = await connect(config);
const wallet = new WalletConnection(near);

// Sign transaction
await wallet.signAndSendTransaction({
  receiverId: contract.contractId,
  actions: [/* ... */],
});
```

### 3. Sentiment API Integration
```typescript
// Subscribe to sentiment updates
client.subscribe('sentiment-updates', (data) => {
  console.log('New sentiment data:', data);
});

// Update sentiment weights
await client.updateSentimentWeights({
  twitter: 40,
  reddit: 30,
  santiment: 30,
});
```

## Error Handling

### API Errors
```typescript
try {
  await client.createStrategy(config);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation errors
  }
}
```

### Contract Errors
```typescript
try {
  await contract.executeRebalance();
} catch (error) {
  if (error.type === 'GasError') {
    // Handle gas errors
  } else if (error.type === 'ExecutionError') {
    // Handle execution errors
  }
}
```

## Monitoring and Alerts

### Performance Monitoring
- Response time tracking
- Error rate monitoring
- Gas usage tracking
- Transaction success rate

### Alert Configuration
```typescript
client.setAlertThresholds({
  responseTime: 1000, // ms
  errorRate: 0.01,    // 1%
  gasUsage: 100_000_000_000_000, // 100 TGas
});
```

## Best Practices

1. **Rate Limiting**
   - Implement exponential backoff
   - Cache responses when possible
   - Use bulk operations

2. **Error Handling**
   - Always handle errors gracefully
   - Provide meaningful error messages
   - Log errors for debugging

3. **Security**
   - Keep API keys secure
   - Validate all input
   - Use HTTPS
   - Implement proper access control

4. **Performance**
   - Minimize contract calls
   - Batch operations when possible
   - Cache frequently used data
