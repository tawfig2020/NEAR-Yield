# API Documentation

## 🔑 Authentication

All API endpoints require authentication using a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## 🛣 Endpoints

### Account Management

#### `POST /api/v1/account/connect`
Connect a NEAR wallet.

**Request:**
```json
{
  "accountId": "example.near",
  "publicKey": "ed25519:..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here"
}
```

#### `GET /api/v1/account/balance`
Get account balance and staking information.

**Response:**
```json
{
  "available": "100000000000000000000000",
  "staked": "50000000000000000000000",
  "rewards": "5000000000000000000000"
}
```

### Yield Strategies

#### `POST /api/v1/strategy/stake`
Stake tokens in the yield strategy.

**Request:**
```json
{
  "amount": "1000000000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "..."
}
```

#### `POST /api/v1/strategy/unstake`
Unstake tokens from the yield strategy.

**Request:**
```json
{
  "amount": "1000000000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "..."
}
```

### Analytics

#### `GET /api/v1/analytics/metrics`
Get current platform metrics.

**Response:**
```json
{
  "tvl": "5000000000000000000000000",
  "apy": "12.5",
  "totalUsers": 150
}
```

#### `GET /api/v1/analytics/history`
Get historical performance data.

**Query Parameters:**
- `start`: Start timestamp (ISO format)
- `end`: End timestamp (ISO format)
- `interval`: Data interval (hourly/daily/weekly)

**Response:**
```json
{
  "timestamps": [...],
  "tvl": [...],
  "apy": [...]
}
```

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://api.example.com/ws');
```

### Subscribe to Updates
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'yields'
}));
```

### Message Types

#### Yield Updates
```json
{
  "type": "update",
  "channel": "yields",
  "data": {
    "apy": "12.5",
    "tvl": "5000000000000000000000000"
  }
}
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Invalid stake amount"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication required
- `INVALID_PARAMS`: Invalid request parameters
- `INSUFFICIENT_FUNDS`: Insufficient account balance
- `CONTRACT_ERROR`: Smart contract execution error

## Rate Limiting

- 100 requests per IP per 15 minutes for most endpoints
- 10 requests per IP per minute for high-cost operations

## SDK Usage

```javascript
const { NearDeepYield } = require('near-deep-yield-sdk');

const client = new NearDeepYield({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org'
});

// Connect wallet
await client.connect(accountId, privateKey);

// Stake tokens
await client.stake('1000000000000000000000000');
```
