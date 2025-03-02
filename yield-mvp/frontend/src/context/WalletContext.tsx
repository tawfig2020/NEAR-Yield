import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connect, WalletConnection, keyStores, Near } from 'near-api-js';

interface WalletContextType {
  wallet: WalletConnection | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initNear();
  }, []);

  const initNear = async () => {
    const near = await connect({
      networkId: 'testnet',
      keyStore: new keyStores.BrowserLocalStorageKeyStore(),
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://wallet.testnet.near.org',
      helperUrl: 'https://helper.testnet.near.org',
    });

    const wallet = new WalletConnection(near, 'near-deep-yield');
    setWallet(wallet);
    setIsConnected(wallet.isSignedIn());
  };

  const connectWallet = async () => {
    if (wallet) {
      wallet.requestSignIn({
        contractId: process.env.REACT_APP_CONTRACT_ID || '',
        methodNames: ['deposit', 'withdraw', 'get_strategy'],
      });
    }
  };

  const disconnectWallet = () => {
    if (wallet) {
      wallet.signOut();
      setIsConnected(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isConnected,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
