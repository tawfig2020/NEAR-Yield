import { mockYieldOpportunity } from '../utils/testUtils';

// Mock API module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: mockYieldOpportunity }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    put: jest.fn().mockResolvedValue({ data: { success: true } }),
    delete: jest.fn().mockResolvedValue({ data: { success: true } })
  },
  yieldApi: {
    getOpportunities: jest.fn().mockResolvedValue([mockYieldOpportunity]),
    getProtocolOpportunities: jest.fn().mockResolvedValue(mockYieldOpportunity),
    getHistoricalPerformance: jest.fn().mockResolvedValue({
      days: 30,
      data: Array(30).fill().map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        apy: 15 + Math.random() * 2
      }))
    }),
    simulateLPPosition: jest.fn().mockResolvedValue({
      estimatedReturns: 1500,
      risks: ['impermanent_loss', 'smart_contract_risk'],
      recommendations: ['diversify_pools', 'monitor_closely']
    })
  }
}));

// Mock WebSocket module
jest.mock('../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: () => ({
    connected: true,
    error: null,
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    addMessageListener: jest.fn(),
    removeMessageListener: jest.fn(),
    reconnect: jest.fn()
  })
}));
