import { useState, useCallback } from 'react';
import { utils } from 'near-api-js';
import { securityConfig } from '../config/security';
import { walletSecurity } from '../services/security/WalletSecurity';

export const useSecureTransaction = (wallet) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const validateInput = useCallback((input, type) => {
    const { patterns, maxLengths } = securityConfig.validation;
    
    if (!input || typeof input !== 'string') {
      return false;
    }

    if (input.length > maxLengths[type]) {
      return false;
    }

    return patterns[type].test(input);
  }, []);

  const validateAmount = useCallback((amount) => {
    try {
      const amountBN = utils.format.parseNearAmount(amount);
      return amountBN && amountBN.length > 0;
    } catch {
      return false;
    }
  }, []);

  const prepareTransaction = useCallback(async (receiverId, methodName, args = {}, deposit = '0') => {
    try {
      if (!validateInput(receiverId, 'accountId')) {
        throw new Error(securityConfig.errors.INVALID_ACCOUNT);
      }

      if (deposit !== '0' && !validateAmount(deposit)) {
        throw new Error(securityConfig.errors.INVALID_AMOUNT);
      }

      const transaction = {
        receiverId,
        actions: [{
          type: 'FunctionCall',
          params: {
            methodName,
            args,
            gas: securityConfig.transactions.gasLimits[methodName] || '300000000000000',
            deposit: utils.format.parseNearAmount(deposit)
          }
        }]
      };

      return transaction;
    } catch (error) {
      throw new Error(`Failed to prepare transaction: ${error.message}`);
    }
  }, [validateInput, validateAmount]);

  const executeTransaction = useCallback(async (transaction) => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      // Validate transaction
      await walletSecurity.validateTransaction(transaction);

      // Sign and send transaction
      const result = await walletSecurity.signTransaction(wallet, transaction);

      setIsProcessing(false);
      return result;
    } catch (error) {
      setError(error.message);
      setIsProcessing(false);
      throw error;
    }
  }, [wallet]);

  const stake = useCallback(async (amount) => {
    try {
      const transaction = await prepareTransaction(
        securityConfig.near.contractId,
        'stake',
        {},
        amount
      );
      return await executeTransaction(transaction);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [prepareTransaction, executeTransaction]);

  const unstake = useCallback(async (amount) => {
    try {
      const transaction = await prepareTransaction(
        securityConfig.near.contractId,
        'unstake',
        {},
        amount
      );
      return await executeTransaction(transaction);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [prepareTransaction, executeTransaction]);

  const withdrawRewards = useCallback(async () => {
    try {
      const transaction = await prepareTransaction(
        securityConfig.near.contractId,
        'withdraw_rewards',
        {}
      );
      return await executeTransaction(transaction);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [prepareTransaction, executeTransaction]);

  return {
    isProcessing,
    error,
    stake,
    unstake,
    withdrawRewards,
    executeTransaction
  };
};
