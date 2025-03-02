const { keyStores, KeyPair } = require('near-api-js');
const { validateAccountId } = require('../utils/validation');

class AccountService {
  constructor(near, networkId) {
    this.near = near;
    this.networkId = networkId;
    this.keyStore = new keyStores.InMemoryKeyStore();
    this.accounts = new Map();
  }

  // Create new account
  async createAccount(accountId, publicKey) {
    try {
      validateAccountId(accountId);

      // Check if account exists
      const accountExists = await this.accountExists(accountId);
      if (accountExists) {
        throw new Error(`Account ${accountId} already exists`);
      }

      // Create account
      const account = await this.near.createAccount(accountId, publicKey);
      
      // Store account info
      this.accounts.set(accountId, {
        accountId,
        publicKey,
        createdAt: Date.now(),
        status: 'active'
      });

      return account;
    } catch (error) {
      throw new Error(`Failed to create account: ${error.message}`);
    }
  }

  // Get account details
  async getAccount(accountId) {
    try {
      const account = await this.near.account(accountId);
      const state = await account.state();
      const balance = await account.getAccountBalance();

      return {
        accountId,
        state,
        balance,
        ...this.accounts.get(accountId)
      };
    } catch (error) {
      throw new Error(`Failed to get account details: ${error.message}`);
    }
  }

  // Check if account exists
  async accountExists(accountId) {
    try {
      const account = await this.near.account(accountId);
      await account.state();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Add access key to account
  async addAccessKey(accountId, publicKey, allowance, contractId) {
    try {
      const account = await this.near.account(accountId);
      await account.addKey(
        publicKey,
        contractId,
        [],
        allowance
      );
    } catch (error) {
      throw new Error(`Failed to add access key: ${error.message}`);
    }
  }

  // Delete access key from account
  async deleteAccessKey(accountId, publicKey) {
    try {
      const account = await this.near.account(accountId);
      await account.deleteKey(publicKey);
    } catch (error) {
      throw new Error(`Failed to delete access key: ${error.message}`);
    }
  }

  // Get account balance
  async getBalance(accountId) {
    try {
      const account = await this.near.account(accountId);
      return await account.getAccountBalance();
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  // Update account status
  async updateAccountStatus(accountId, status) {
    const accountData = this.accounts.get(accountId);
    if (!accountData) {
      throw new Error(`Account ${accountId} not found`);
    }

    this.accounts.set(accountId, {
      ...accountData,
      status,
      updatedAt: Date.now()
    });
  }

  // Generate new key pair
  async generateKeyPair() {
    const keyPair = KeyPair.fromRandom('ed25519');
    return {
      publicKey: keyPair.getPublicKey().toString(),
      privateKey: keyPair.secretKey
    };
  }

  // Store key pair in key store
  async storeKeyPair(accountId, keyPair) {
    await this.keyStore.setKey(this.networkId, accountId, keyPair);
  }
}

module.exports = AccountService;
