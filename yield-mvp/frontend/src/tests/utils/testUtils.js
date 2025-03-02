import React from 'react';
import { render, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create base theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Helper to wait for promises to resolve
export const waitForPromises = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

// Helper to wait for WebSocket connection
export const waitForWebSocket = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    jest.runOnlyPendingTimers();
  });
};

// Mock NEAR wallet
export const mockNearWallet = {
  connected: true,
  loading: false,
  error: null,
  signAndSendTransaction: jest.fn(),
  balance: '1000000000000000000000000', // 1 NEAR
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  getBalance: jest.fn(),
  accountId: 'test.near',
  network: 'testnet',
  account: {
    accountId: 'test.near',
  },
};

// Mock WebSocket with enhanced functionality
export const mockWebSocket = {
  connected: true,
  error: null,
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  addMessageListener: jest.fn(),
  removeMessageListener: jest.fn(),
  reconnect: jest.fn(),
  messageListeners: new Set(),
  simulateMessage: function(data) {
    this.messageListeners.forEach(listener => listener(data));
  },
  simulateDisconnect: function() {
    this.connected = false;
    this.error = 'Connection lost';
  },
  simulateReconnect: function() {
    this.connected = true;
    this.error = null;
  }
};

// Mock API responses
export const mockApiResponse = {
  data: {
    id: 'test-pool-1',
    protocol: 'test-protocol',
    pool: 'Test Pool',
    apy: 15.5,
    tvl: 1000000,
    volume24h: 100000,
    priceHistory: [1.0, 1.1, 1.05, 1.08],
    tokens: ['NEAR', 'USDC'],
    protocol: {
      age: 365,
      totalValueLocked: 10000000,
      uniqueUsers: 5000,
      auditCount: 3,
      hackHistory: 0,
      communitySize: 50000,
      riskScore: 85,
      lastUpdate: new Date().toISOString(),
    }
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
};

// Mock error responses
export const mockApiError = {
  response: {
    data: { message: 'Test error message' },
    status: 400,
    statusText: 'Bad Request',
  },
};

// Mock yield opportunity
export const mockYieldOpportunity = {
  protocol: 'Test Protocol',
  pool: 'Test Pool',
  apy: '10.5',
  tvl: '1000000',
  contractAddress: 'test.protocol.near',
  poolId: '1',
};

// Mock strategy data
export const mockStrategy = {
  name: 'Test Strategy',
  targetApy: 10,
  rebalanceThreshold: 5,
  status: 'active',
  deployedAt: new Date().toISOString(),
  lastRebalance: new Date().toISOString(),
  currentApy: 9.8,
};

// Wrapper component with providers
const AllTheProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Custom render with providers
export const renderWithProviders = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Test data generators
export const generateMockPool = (overrides = {}) => ({
  ...mockYieldOpportunity,
  ...overrides,
  id: `test-pool-${Math.random().toString(36).substr(2, 9)}`,
});

export const generateMockProtocol = (overrides = {}) => ({
  id: `test-protocol-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Protocol',
  description: 'Test protocol description',
  website: 'https://test.protocol',
  tvl: 1000000,
  ...overrides,
});

// Re-export everything
export * from '@testing-library/react';
