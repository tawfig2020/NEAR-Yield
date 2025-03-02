const { connect, KeyPair, keyStores, utils } = require('near-api-js');
const { parseNearAmount } = require('near-api-js/lib/utils/format');
const { SecureKeyRotation } = require('../../dashboard/src/services/securityService');

describe('NEAR Contract Integration Tests', () => {
  let near;
  let account;
  let contract;
  const contractName = process.env.CONTRACT_NAME || 'test-contract.testnet';

  beforeAll(async () => {
    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromRandom('ed25519');
    await keyStore.setKey('testnet', contractName, keyPair);

    const config = {
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://wallet.testnet.near.org',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://explorer.testnet.near.org',
    };

    near = await connect(config);
    account = await near.account(contractName);
    contract = new Contract(account, contractName, {
      viewMethods: ['getYieldStats', 'getSecurityMetrics'],
      changeMethods: ['deposit', 'withdraw', 'updateStrategy'],
    });
  });

  describe('Contract State Monitoring', () => {
    it('should fetch and verify contract state', async () => {
      const state = await contract.getYieldStats();
      expect(state).toBeDefined();
      expect(state.totalDeposits).toBeDefined();
      expect(state.currentYield).toBeDefined();
    });

    it('should monitor state changes after deposit', async () => {
      const initialState = await contract.getYieldStats();
      const depositAmount = parseNearAmount('1');
      
      await contract.deposit({
        amount: depositAmount
      });

      const newState = await contract.getYieldStats();
      expect(parseFloat(newState.totalDeposits))
        .toBeGreaterThan(parseFloat(initialState.totalDeposits));
    });
  });

  describe('Transaction Monitoring', () => {
    it('should track and verify transactions', async () => {
      const amount = parseNearAmount('0.1');
      const txResult = await contract.deposit({
        amount
      });

      expect(txResult.transaction).toBeDefined();
      expect(txResult.transaction_outcome).toBeDefined();

      // Verify transaction was recorded in monitoring
      const securityMetrics = await contract.getSecurityMetrics();
      expect(securityMetrics.recentTransactions)
        .toContain(txResult.transaction.hash);
    });

    it('should detect and log suspicious transactions', async () => {
      const largeAmount = parseNearAmount('1000'); // Unusually large amount
      
      try {
        await contract.deposit({
          amount: largeAmount
        });
      } catch (error) {
        // Should trigger security alert
        const securityMetrics = await contract.getSecurityMetrics();
        expect(securityMetrics.alerts)
          .toContainEqual(expect.objectContaining({
            type: 'SUSPICIOUS_TRANSACTION',
            amount: largeAmount
          }));
      }
    });
  });

  describe('Key Rotation', () => {
    let keyRotation;

    beforeEach(() => {
      keyRotation = new SecureKeyRotation(account);
    });

    it('should successfully rotate access keys', async () => {
      const initialKeys = await account.getAccessKeys();
      
      await keyRotation.rotateKeys();
      
      const newKeys = await account.getAccessKeys();
      expect(newKeys).not.toEqual(initialKeys);
      expect(newKeys.length).toBe(initialKeys.length);
    });

    it('should maintain contract access during rotation', async () => {
      // Start key rotation
      const rotationPromise = keyRotation.rotateKeys();
      
      // Attempt transaction during rotation
      const txResult = await contract.deposit({
        amount: parseNearAmount('0.1')
      });
      
      await rotationPromise;
      
      expect(txResult.status).toBe('SUCCESS');
    });

    it('should handle failed rotation gracefully', async () => {
      // Simulate network failure
      jest.spyOn(account, 'addKey').mockRejectedValue(new Error('Network error'));
      
      try {
        await keyRotation.rotateKeys();
      } catch (error) {
        const keys = await account.getAccessKeys();
        // Should still have valid keys
        expect(keys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Recovery Procedures', () => {
    it('should recover from invalid state', async () => {
      // Simulate corrupt state
      await contract.updateStrategy({
        invalidParam: 'corrupt'
      }).catch(() => {});

      const recovery = await contract.recoverState();
      expect(recovery.status).toBe('SUCCESS');
      
      // Verify state is valid
      const state = await contract.getYieldStats();
      expect(state.isValid).toBe(true);
    });

    it('should handle multiple recovery attempts', async () => {
      const attempts = 3;
      let successfulRecoveries = 0;

      for (let i = 0; i < attempts; i++) {
        try {
          await contract.recoverState();
          successfulRecoveries++;
        } catch (error) {
          console.error(`Recovery attempt ${i + 1} failed:`, error);
        }
      }

      expect(successfulRecoveries).toBeGreaterThan(0);
    });
  });
});
