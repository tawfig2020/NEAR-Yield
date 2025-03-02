import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Ramp up to 20 users
    { duration: '3m', target: 20 }, // Stay at 20 users
    { duration: '1m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete within 500ms
    'errors': ['rate<0.1'],            // Error rate must be less than 10%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const CONTRACT_ID = __ENV.CONTRACT_ID || 'test.near';

export function setup() {
  // Authenticate and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, {
    username: __ENV.USERNAME || 'test@example.com',
    password: __ENV.PASSWORD || 'test123',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  return {
    token: loginRes.json('token'),
  };
}

export default function(data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
    },
  };

  // Test contract state endpoint
  const contractState = http.get(
    `${BASE_URL}/api/v1/contract/state`,
    params
  );
  
  check(contractState, {
    'contract state status 200': (r) => r.status === 200,
    'contract state has data': (r) => r.json('state') !== undefined,
  });
  errorRate.add(contractState.status !== 200);

  sleep(1);

  // Test security status endpoint
  const securityStatus = http.get(
    `${BASE_URL}/api/v1/security/status`,
    params
  );
  
  check(securityStatus, {
    'security status 200': (r) => r.status === 200,
    'has security checks': (r) => r.json('checks').length > 0,
  });
  errorRate.add(securityStatus.status !== 200);

  sleep(1);

  // Test transaction volume endpoint
  const now = new Date();
  const hourAgo = new Date(now - 3600000);
  
  const txVolume = http.get(
    `${BASE_URL}/api/v1/contract/transactions?` +
    `startTime=${hourAgo.toISOString()}&` +
    `endTime=${now.toISOString()}`,
    params
  );
  
  check(txVolume, {
    'transaction volume status 200': (r) => r.status === 200,
    'has transaction data': (r) => r.json('volume') !== undefined,
  });
  errorRate.add(txVolume.status !== 200);

  sleep(1);

  // Test alerts endpoint
  const alerts = http.get(
    `${BASE_URL}/api/v1/security/alerts?limit=10`,
    params
  );
  
  check(alerts, {
    'alerts status 200': (r) => r.status === 200,
    'has alerts data': (r) => Array.isArray(r.json('alerts')),
  });
  errorRate.add(alerts.status !== 200);

  sleep(1);

  // Test audit logs endpoint
  const auditLogs = http.get(
    `${BASE_URL}/api/v1/audit/logs?` +
    `startDate=${hourAgo.toISOString()}&` +
    `endDate=${now.toISOString()}`,
    params
  );
  
  check(auditLogs, {
    'audit logs status 200': (r) => r.status === 200,
    'has logs data': (r) => Array.isArray(r.json('logs')),
  });
  errorRate.add(auditLogs.status !== 200);

  sleep(1);
}

export function teardown(data) {
  // Cleanup (if needed)
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
    },
  };

  http.post(`${BASE_URL}/auth/logout`, {}, params);
}
