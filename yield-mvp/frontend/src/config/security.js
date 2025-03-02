export const securityConfig = {
  // NEAR network configuration
  near: {
    networkId: process.env.REACT_APP_NEAR_NETWORK || 'testnet',
    nodeUrl: process.env.REACT_APP_NEAR_NODE_URL,
    walletUrl: process.env.REACT_APP_NEAR_WALLET_URL,
    contractId: process.env.REACT_APP_CONTRACT_ID,
    // Allowed methods for contract interaction
    allowedMethods: ['stake', 'unstake', 'withdraw_rewards'],
    // Minimum amounts for transactions
    minimumStake: '1000000000000000000000000', // 1 NEAR
    minimumUnstake: '1000000000000000000000000', // 1 NEAR
  },

  // API request configuration
  api: {
    // Request timeout in milliseconds
    timeout: 30000,
    // Maximum retries for failed requests
    maxRetries: 3,
    // Retry delay in milliseconds
    retryDelay: 1000,
    // Headers required for API requests
    requiredHeaders: ['Authorization', 'Content-Type'],
  },

  // Input validation rules
  validation: {
    // Regular expressions for input validation
    patterns: {
      accountId: /^[a-z0-9_-]{2,64}\.(testnet|near)$/,
      amount: /^[0-9]+$/,
      signature: /^[A-Za-z0-9+/=]+$/,
    },
    // Maximum lengths for input fields
    maxLengths: {
      accountId: 64,
      message: 1024,
      signature: 128,
    },
  },

  // Transaction security settings
  transactions: {
    // Gas limits for different operations
    gasLimits: {
      stake: '300000000000000',
      unstake: '300000000000000',
      withdraw: '300000000000000',
    },
    // Required fields for transaction validation
    requiredFields: ['receiverId', 'actions', 'signature'],
  },

  // Error messages
  errors: {
    INVALID_ACCOUNT: 'Invalid NEAR account ID',
    INVALID_AMOUNT: 'Invalid transaction amount',
    INVALID_SIGNATURE: 'Invalid transaction signature',
    UNAUTHORIZED: 'Unauthorized access',
    CONNECTION_ERROR: 'Failed to connect to NEAR network',
    TRANSACTION_ERROR: 'Transaction failed',
  }
};
