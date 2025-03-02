import { connect, keyStores, utils } from 'near-api-js';

class WalletSecurity {
  constructor() {
    this.connectionConfig = {
      networkId: process.env.REACT_APP_NEAR_NETWORK || 'testnet',
      nodeUrl: process.env.REACT_APP_NEAR_NODE_URL,
      walletUrl: process.env.REACT_APP_NEAR_WALLET_URL,
      helperUrl: process.env.REACT_APP_NEAR_HELPER_URL,
      explorerUrl: process.env.REACT_APP_NEAR_EXPLORER_URL,
      keyStore: new keyStores.BrowserLocalStorageKeyStore()
    };
  }

  async connectWallet() {
    try {
      const near = await connect(this.connectionConfig);
      const wallet = new near.WalletConnection(near);
      
      if (!wallet.isSignedIn()) {
        // Request full access for transactions
        await wallet.requestSignIn({
          contractId: process.env.REACT_APP_CONTRACT_ID,
          methodNames: ['stake', 'unstake', 'withdraw_rewards'], // Specify allowed methods
          successUrl: `${window.location.origin}/dashboard`,
          failureUrl: `${window.location.origin}/error`
        });
      }
      
      return wallet;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  async validateTransaction(transaction) {
    const requiredFields = ['receiverId', 'actions'];
    if (!requiredFields.every(field => transaction[field])) {
      throw new Error('Invalid transaction format');
    }

    // Validate receiver ID format
    if (!utils.format.isValidAccountId(transaction.receiverId)) {
      throw new Error('Invalid receiver account ID');
    }

    // Validate actions
    for (const action of transaction.actions) {
      if (!this.isValidAction(action)) {
        throw new Error('Invalid transaction action');
      }
    }

    return true;
  }

  isValidAction(action) {
    const validMethods = ['stake', 'unstake', 'withdraw_rewards'];
    const validTokenAmount = /^[0-9]+$/;

    if (!action.methodName || !validMethods.includes(action.methodName)) {
      return false;
    }

    if (action.deposit && !validTokenAmount.test(action.deposit)) {
      return false;
    }

    return true;
  }

  async signTransaction(wallet, transaction) {
    try {
      await this.validateTransaction(transaction);
      return await wallet.signAndSendTransaction(transaction);
    } catch (error) {
      console.error('Transaction signing error:', error);
      throw error;
    }
  }

  verifySignature(message, signature, publicKey) {
    try {
      return utils.key_pair.verify(message, signature, publicKey);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }
}

export const walletSecurity = new WalletSecurity();
