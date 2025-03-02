import { connect, keyStores, utils } from 'near-api-js';
import { useState, useEffect, useCallback } from 'react';

const config = {
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://explorer.testnet.near.org',
  contractName: process.env.REACT_APP_CONTRACT_NAME,
};

export const useNearContract = () => {
  const [near, setNear] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);

  // Initialize NEAR connection
  useEffect(() => {
    const initNear = async () => {
      try {
        const keyStore = new keyStores.BrowserLocalStorageKeyStore();
        const nearConnection = await connect({ ...config, keyStore });
        setNear(nearConnection);

        // Get account
        const accountId = window.localStorage.getItem('accountId');
        if (accountId) {
          const account = await nearConnection.account(accountId);
          setAccount(account);

          // Initialize contract
          const contract = new nearConnection.Contract(account, config.contractName, {
            viewMethods: ['get_state', 'get_transaction_history', 'get_yield_stats'],
            changeMethods: ['update_strategy', 'execute_trade'],
          });
          setContract(contract);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error initializing NEAR:', err);
      }
    };

    initNear();
  }, []);

  const getContractState = useCallback(async () => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const state = await contract.get_state();
      return {
        status: state.status,
        totalValue: utils.format.formatNearAmount(state.total_value),
        activeStrategies: state.active_strategies,
        lastUpdate: new Date(state.last_update / 1000000),
      };
    } catch (err) {
      console.error('Error getting contract state:', err);
      throw err;
    }
  }, [contract]);

  const getTransactionHistory = useCallback(async (limit = 10) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const history = await contract.get_transaction_history({ limit });
      return history.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: utils.format.formatNearAmount(tx.amount),
        timestamp: new Date(tx.timestamp / 1000000),
        status: tx.status,
      }));
    } catch (err) {
      console.error('Error getting transaction history:', err);
      throw err;
    }
  }, [contract]);

  const getYieldStats = useCallback(async () => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const stats = await contract.get_yield_stats();
      return {
        apy: stats.apy,
        totalYield: utils.format.formatNearAmount(stats.total_yield),
        strategyPerformance: stats.strategy_performance,
      };
    } catch (err) {
      console.error('Error getting yield stats:', err);
      throw err;
    }
  }, [contract]);

  const updateStrategy = useCallback(async (strategyId, params) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      await contract.update_strategy({
        strategy_id: strategyId,
        params: params,
      });
    } catch (err) {
      console.error('Error updating strategy:', err);
      throw err;
    }
  }, [contract]);

  const executeTrade = useCallback(async (tradeParams) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      await contract.execute_trade({
        ...tradeParams,
        amount: utils.format.parseNearAmount(tradeParams.amount),
      });
    } catch (err) {
      console.error('Error executing trade:', err);
      throw err;
    }
  }, [contract]);

  return {
    near,
    account,
    contract,
    error,
    getContractState,
    getTransactionHistory,
    getYieldStats,
    updateStrategy,
    executeTrade,
  };
};
