const { transactions, utils } = require('near-api-js');
const BN = require('bn.js');

class TransactionService {
  constructor(near, accountId) {
    this.near = near;
    this.accountId = accountId;
    this.txQueue = new Map();
    this.processingQueue = false;
  }

  // Add transaction to queue
  async queueTransaction(transaction) {
    const txHash = utils.serialize.base_encode(transaction.hash);
    this.txQueue.set(txHash, {
      transaction,
      status: 'pending',
      timestamp: Date.now()
    });

    if (!this.processingQueue) {
      await this.processQueue();
    }

    return txHash;
  }

  // Process transaction queue
  async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    try {
      for (const [txHash, txData] of this.txQueue.entries()) {
        if (txData.status === 'pending') {
          await this.processTransaction(txHash, txData.transaction);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  // Process individual transaction
  async processTransaction(txHash, transaction) {
    try {
      // Create transaction action
      const actions = this.createActions(transaction);
      
      // Sign and send transaction
      const result = await this.signAndSendTransaction(actions);
      
      // Update transaction status
      this.updateTransactionStatus(txHash, 'completed', result);
      
      return result;
    } catch (error) {
      this.updateTransactionStatus(txHash, 'failed', null, error);
      throw error;
    }
  }

  // Create transaction actions
  createActions(transaction) {
    const actions = [];

    if (transaction.type === 'transfer') {
      actions.push(transactions.transfer(new BN(transaction.amount)));
    } else if (transaction.type === 'functionCall') {
      actions.push(
        transactions.functionCall(
          transaction.methodName,
          transaction.args,
          new BN(transaction.gas || '30000000000000'),
          new BN(transaction.deposit || '0')
        )
      );
    }

    return actions;
  }

  // Sign and send transaction
  async signAndSendTransaction(actions) {
    const account = await this.near.account(this.accountId);
    return await account.signAndSendTransaction({
      receiverId: this.accountId,
      actions
    });
  }

  // Update transaction status
  updateTransactionStatus(txHash, status, result = null, error = null) {
    const txData = this.txQueue.get(txHash);
    if (txData) {
      txData.status = status;
      txData.result = result;
      txData.error = error;
      txData.completedAt = Date.now();
      this.txQueue.set(txHash, txData);
    }
  }

  // Get transaction status
  getTransactionStatus(txHash) {
    return this.txQueue.get(txHash);
  }

  // Clean up old transactions
  cleanupOldTransactions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now();
    for (const [txHash, txData] of this.txQueue.entries()) {
      if (now - txData.timestamp > maxAge) {
        this.txQueue.delete(txHash);
      }
    }
  }
}

module.exports = TransactionService;
