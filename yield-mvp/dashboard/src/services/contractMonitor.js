import { connect, keyStores, utils } from 'near-api-js';
import { formatNearAmount } from 'near-api-js/lib/utils/format';

export class ContractMonitor {
  constructor(contractId, nodeUrl) {
    this.contractId = contractId;
    this.nodeUrl = nodeUrl;
    this.lastChecked = null;
    this.transactionHistory = [];
  }

  async initialize() {
    const keyStore = new keyStores.BrowserLocalStorageKeyStore();
    const config = {
      networkId: 'mainnet',
      keyStore,
      nodeUrl: this.nodeUrl,
    };
    
    this.near = await connect(config);
    this.account = await this.near.account(this.contractId);
    this.startMonitoring();
  }

  async getContractState() {
    try {
      const state = await this.account.viewState('');
      return {
        timestamp: new Date(),
        state: state.map(({ key, value }) => ({
          key: Buffer.from(key).toString('utf8'),
          value: Buffer.from(value).toString('utf8'),
        })),
      };
    } catch (error) {
      console.error('Error fetching contract state:', error);
      throw error;
    }
  }

  async trackTransactionVolume(startTime, endTime) {
    try {
      const txs = await this.account.getTransactions(startTime, endTime);
      const volume = txs.reduce((acc, tx) => {
        if (tx.actions.some(a => a.type === 'Transfer')) {
          return acc + parseFloat(formatNearAmount(tx.amount));
        }
        return acc;
      }, 0);

      return {
        count: txs.length,
        volume,
        timeRange: { startTime, endTime },
      };
    } catch (error) {
      console.error('Error tracking transaction volume:', error);
      throw error;
    }
  }

  async runSecurityChecks() {
    const checks = [];
    try {
      // Check contract code hash
      const codeHash = await this.account.getCodeHash();
      checks.push({
        name: 'code_hash',
        status: 'passed',
        value: codeHash,
      });

      // Check access keys
      const accessKeys = await this.account.getAccessKeys();
      const hasFullAccess = accessKeys.some(key => key.permission === 'FullAccess');
      checks.push({
        name: 'access_keys',
        status: hasFullAccess ? 'warning' : 'passed',
        value: accessKeys.length,
        details: hasFullAccess ? 'Full access key detected' : 'Function call keys only',
      });

      // Check account balance
      const balance = await this.account.getAccountBalance();
      const minBalance = utils.format.parseNearAmount('10'); // 10 NEAR minimum
      checks.push({
        name: 'balance',
        status: balance.available > minBalance ? 'passed' : 'warning',
        value: utils.format.formatNearAmount(balance.available),
      });

      // Check recent transactions
      const now = new Date();
      const hourAgo = new Date(now - 3600000);
      const recentTxs = await this.trackTransactionVolume(hourAgo, now);
      checks.push({
        name: 'transaction_volume',
        status: recentTxs.count > 1000 ? 'warning' : 'passed',
        value: recentTxs.count,
        details: `Volume: ${recentTxs.volume} NEAR`,
      });

      return {
        timestamp: new Date(),
        checks,
        overall: checks.every(c => c.status === 'passed') ? 'passed' : 'warning',
      };
    } catch (error) {
      console.error('Error running security checks:', error);
      throw error;
    }
  }

  startMonitoring() {
    // Monitor contract state every 5 minutes
    this.stateInterval = setInterval(async () => {
      try {
        const state = await this.getContractState();
        this.emit('stateUpdate', state);
      } catch (error) {
        this.emit('error', error);
      }
    }, 300000);

    // Run security checks every hour
    this.securityInterval = setInterval(async () => {
      try {
        const checks = await this.runSecurityChecks();
        this.emit('securityUpdate', checks);
      } catch (error) {
        this.emit('error', error);
      }
    }, 3600000);
  }

  stopMonitoring() {
    clearInterval(this.stateInterval);
    clearInterval(this.securityInterval);
  }

  emit(event, data) {
    // Implement your event emission logic here
    // Could use EventEmitter, WebSocket, or custom event system
    if (this.onEvent) {
      this.onEvent(event, data);
    }
  }
}
