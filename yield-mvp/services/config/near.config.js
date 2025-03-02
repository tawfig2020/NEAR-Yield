require('dotenv').config();

module.exports = {
  networkId: process.env.NEAR_NETWORK_ID || 'mainnet',
  nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.mainnet.near.org',
  walletUrl: process.env.NEAR_WALLET_URL || 'https://wallet.mainnet.near.org',
  helperUrl: process.env.NEAR_HELPER_URL || 'https://helper.mainnet.near.org',
  explorerUrl: process.env.NEAR_EXPLORER_URL || 'https://explorer.mainnet.near.org',
  
  // Protocol Contract Addresses
  protocols: {
    ref_finance: {
      contract: 'v2.ref-finance.near',
      pools: 'spot.ref-finance.near',
      farm: 'boostfarm.ref-finance.near'
    },
    jumbo: {
      contract: 'v1.jumbo_exchange.near',
      farm: 'farming.jumbo_exchange.near'
    },
    pembrock: {
      contract: 'pembrock.near'
    },
    burrow: {
      contract: 'contract.main.burrow.near'
    },
    linear: {
      contract: 'linear-protocol.near'
    }
  },

  // Cache settings
  cache: {
    ttl: 300, // 5 minutes
    checkperiod: 60 // 1 minute
  },

  // Update intervals
  updateIntervals: {
    prices: 60000, // 1 minute
    tvl: 300000, // 5 minutes
    apy: 300000 // 5 minutes
  }
};
