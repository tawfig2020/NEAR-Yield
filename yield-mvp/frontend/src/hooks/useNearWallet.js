import { useState, useEffect, useCallback } from 'react';
import { connect, keyStores, WalletConnection } from 'near-api-js';

const NETWORK_ID = process.env.REACT_APP_NEAR_NETWORK || 'testnet';
const CONFIG = {
  networkId: NETWORK_ID,
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: `https://rpc.${NETWORK_ID}.near.org`,
  walletUrl: `https://wallet.${NETWORK_ID}.near.org`,
  helperUrl: `https://helper.${NETWORK_ID}.near.org`,
  explorerUrl: `https://explorer.${NETWORK_ID}.near.org`,
};

export const useNearWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      setLoading(true);
      const near = await connect(CONFIG);
      const wallet = new WalletConnection(near, 'near-deep-yield');
      setWallet(wallet);
      setConnected(wallet.isSignedIn());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = useCallback(async () => {
    if (!wallet) return;
    try {
      await wallet.requestSignIn({
        contractId: process.env.REACT_APP_CONTRACT_ID,
        methodNames: ['deposit', 'withdraw'], // list of contract methods to authorize
      });
      setConnected(true);
    } catch (err) {
      setError(err.message);
    }
  }, [wallet]);

  const disconnectWallet = useCallback(() => {
    if (!wallet) return;
    wallet.signOut();
    setConnected(false);
  }, [wallet]);

  const getBalance = useCallback(async () => {
    if (!wallet || !connected) return '0';
    try {
      const account = await wallet.account();
      const balance = await account.getAccountBalance();
      return balance.available;
    } catch (err) {
      setError(err.message);
      return '0';
    }
  }, [wallet, connected]);

  const signAndSendTransaction = useCallback(async (transaction) => {
    if (!wallet || !connected) throw new Error('Wallet not connected');
    try {
      const account = await wallet.account();
      return await account.functionCall({
        contractId: transaction.receiverId,
        methodName: transaction.actions[0].params.methodName,
        args: transaction.actions[0].params.args,
        gas: transaction.actions[0].params.gas,
        attachedDeposit: transaction.actions[0].params.deposit,
      });
    } catch (err) {
      throw new Error(`Transaction failed: ${err.message}`);
    }
  }, [wallet, connected]);

  return {
    wallet,
    connected,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    getBalance,
    signAndSendTransaction,
  };
};

export default useNearWallet;
