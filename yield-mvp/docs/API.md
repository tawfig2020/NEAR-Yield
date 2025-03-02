# NEAR Deep Yield API Documentation

## Overview
This document describes the API endpoints and services available in the NEAR Deep Yield platform.

## Base URLs
- Production: `https://api.nearyield.com`
- Staging: `https://staging-api.nearyield.com`
- Development: `http://localhost:3001`

## Authentication
All API requests require authentication using a JWT token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## API Endpoints

### Contract Monitoring

#### Get Contract State
```http
GET /api/v1/contract/state
```

Response:
```json
{
  "timestamp": "2025-02-23T15:46:47Z",
  "state": {
    "totalDeposits": "1000000000000000000000000",
    "activeStrategies": 5,
    "yieldRate": "0.15",
    "lastUpdate": "2025-02-23T15:45:00Z"
  }
}
```

#### Get Transaction Volume
```http
GET /api/v1/contract/transactions
```

Parameters:
- `startTime` (ISO date string): Start of time range
- `endTime` (ISO date string): End of time range

Response:
```json
{
  "count": 150,
  "volume": "5000000000000000000000000",
  "timeRange": {
    "startTime": "2025-02-22T15:46:47Z",
    "endTime": "2025-02-23T15:46:47Z"
  }
}
```

### Security Monitoring

#### Get Security Status
```http
GET /api/v1/security/status
```

Response:
```json
{
  "timestamp": "2025-02-23T15:46:47Z",
  "checks": [
    {
      "name": "code_hash",
      "status": "passed",
      "value": "Hk8RM3g..."
    },
    {
      "name": "access_keys",
      "status": "warning",
      "value": 3,
      "details": "Multiple full access keys detected"
    }
  ],
  "overall": "warning"
}
```

#### Get Security Alerts
```http
GET /api/v1/security/alerts
```

Parameters:
- `limit` (number): Maximum number of alerts to return
- `severity` (string): Filter by severity (critical, warning, info)

Response:
```json
{
  "alerts": [
    {
      "id": "alert_123",
      "severity": "critical",
      "message": "Unauthorized access attempt detected",
      "timestamp": "2025-02-23T15:40:00Z",
      "details": {
        "sourceIp": "203.0.113.1",
        "method": "AddKey"
      }
    }
  ],
  "total": 1
}
```

#### Acknowledge Alert
```http
POST /api/v1/security/alerts/{alertId}/acknowledge
```

Request:
```json
{
  "notes": "Investigated and resolved",
  "resolvedBy": "admin@example.com"
}
```

Response:
```json
{
  "status": "success",
  "alertId": "alert_123",
  "acknowledgedAt": "2025-02-23T15:46:47Z"
}
```

### Key Management

#### Get Key Status
```http
GET /api/v1/keys/status
```

Response:
```json
{
  "activeKeys": [
    {
      "publicKey": "ed25519:Hk8RM3g...",
      "permission": "FullAccess",
      "lastUsed": "2025-02-23T15:40:00Z"
    }
  ],
  "lastRotation": "2025-02-23T00:00:00Z",
  "nextScheduledRotation": "2025-02-24T00:00:00Z"
}
```

#### Initiate Key Rotation
```http
POST /api/v1/keys/rotate
```

Request:
```json
{
  "force": false,
  "backupKey": "ed25519:backup123..."
}
```

Response:
```json
{
  "status": "success",
  "newKey": {
    "publicKey": "ed25519:new123...",
    "expiresAt": "2025-03-23T15:46:47Z"
  }
}
```

### Audit Logs

#### Get Audit Logs
```http
GET /api/v1/audit/logs
```

Parameters:
- `startDate` (ISO date string): Start date
- `endDate` (ISO date string): End date
- `type` (string): Log type filter

Response:
```json
{
  "logs": [
    {
      "id": "log_123",
      "timestamp": "2025-02-23T15:40:00Z",
      "type": "KEY_ROTATION",
      "details": {
        "oldKey": "ed25519:old...",
        "newKey": "ed25519:new..."
      },
      "severity": "info"
    }
  ],
  "total": 1
}
```

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://api.nearyield.com/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_token'
  }));
};
```

### Events

#### Security Alert
```json
{
  "type": "SECURITY_ALERT",
  "data": {
    "id": "alert_123",
    "severity": "critical",
    "message": "Unauthorized access attempt",
    "timestamp": "2025-02-23T15:46:47Z"
  }
}
```

#### Contract State Update
```json
{
  "type": "CONTRACT_STATE",
  "data": {
    "timestamp": "2025-02-23T15:46:47Z",
    "state": {
      "totalDeposits": "1000000000000000000000000",
      "activeStrategies": 5
    }
  }
}
```

## Error Handling

All API endpoints use standard HTTP status codes and return errors in the following format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": {
      "requiredScopes": ["read:security", "write:security"]
    }
  }
}
```

Common error codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Rate Limiting

API requests are limited to:
- 100 requests per minute for regular endpoints
- 1000 requests per minute for WebSocket connections

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708705607
```
