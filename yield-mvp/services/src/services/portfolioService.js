const { getRedisClient } = require('../utils/redis');
const { getNearConnection } = require('../utils/near');
const { calculateRiskScore } = require('../utils/risk');
const { Contract } = require('near-api-js');

class PortfolioService {
  constructor() {
    this.redisClient = getRedisClient();
    this.nearConnection = getNearConnection();
    this.contracts = new Map();
  }

  async initializeContract(protocol) {
    if (!this.contracts.has(protocol)) {
      const contractAddress = process.env[`${protocol.toUpperCase()}_CONTRACT_ADDRESS`];
      const contract = new Contract(
        await this.nearConnection.account(),
        contractAddress,
        {
          viewMethods: ['get_pool_info', 'get_user_deposits'],
          changeMethods: ['deposit', 'withdraw']
        }
      );
      this.contracts.set(protocol, contract);
    }
    return this.contracts.get(protocol);
  }

  async getPortfolio(userId) {
    try {
      // Get user's portfolio data
      const portfolio = await this.redisClient.get(`portfolio:${userId}`);
      const positions = portfolio ? JSON.parse(portfolio) : [];

      // Get current protocol data for each position
      const enrichedPositions = await Promise.all(
        positions.map(async (position) => {
          const protocolData = JSON.parse(
            await this.redisClient.get(`protocol:${position.protocol}`)
          );

          const contract = await this.initializeContract(position.protocol);
          const onChainData = await contract.get_user_deposits({
            account_id: userId
          });

          return {
            ...position,
            currentValue: this.calculatePositionValue(position, protocolData),
            onChainBalance: onChainData.balance
          };
        })
      );

      // Calculate portfolio allocation
      const totalValue = enrichedPositions.reduce(
        (sum, pos) => sum + pos.currentValue,
        0
      );

      const allocation = enrichedPositions.reduce((acc, pos) => {
        const protocol = acc.find(p => p.protocol === pos.protocol);
        if (protocol) {
          protocol.value += pos.currentValue;
        } else {
          acc.push({
            protocol: pos.protocol,
            value: pos.currentValue
          });
        }
        return acc;
      }, []);

      // Calculate total yield
      const totalYield = enrichedPositions.reduce(
        (sum, pos) => sum + (pos.currentValue - pos.initialValue),
        0
      );

      return {
        positions: enrichedPositions,
        allocation,
        totalValue,
        totalYield
      };
    } catch (error) {
      console.error('Error getting portfolio:', error);
      throw error;
    }
  }

  async withdraw(userId, positionId) {
    try {
      const portfolio = await this.redisClient.get(`portfolio:${userId}`);
      if (!portfolio) throw new Error('Portfolio not found');

      const positions = JSON.parse(portfolio);
      const position = positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');

      // Initialize contract
      const contract = await this.initializeContract(position.protocol);

      // Execute withdrawal on the smart contract
      const result = await contract.withdraw({
        args: {
          amount: position.amount,
          pool_id: position.poolId
        },
        gas: '300000000000000'
      });

      if (result.success) {
        // Update portfolio in Redis
        const updatedPositions = positions.filter(p => p.id !== positionId);
        await this.redisClient.set(
          `portfolio:${userId}`,
          JSON.stringify(updatedPositions)
        );

        // Record transaction
        await this.recordTransaction(userId, {
          type: 'withdrawal',
          positionId,
          amount: position.amount,
          protocol: position.protocol,
          timestamp: new Date().toISOString()
        });

        return { success: true, transactionHash: result.transaction.hash };
      } else {
        throw new Error('Withdrawal failed on smart contract');
      }
    } catch (error) {
      console.error('Error withdrawing position:', error);
      throw error;
    }
  }

  async invest(userId, investmentData) {
    try {
      const { protocol, amount, poolId } = investmentData;

      // Initialize contract
      const contract = await this.initializeContract(protocol);

      // Execute deposit on the smart contract
      const result = await contract.deposit({
        args: {
          amount,
          pool_id: poolId
        },
        gas: '300000000000000'
      });

      if (result.success) {
        // Update portfolio in Redis
        const portfolio = await this.redisClient.get(`portfolio:${userId}`);
        const positions = portfolio ? JSON.parse(portfolio) : [];

        const newPosition = {
          id: `${protocol}-${poolId}-${Date.now()}`,
          protocol,
          poolId,
          amount,
          initialValue: amount,
          startDate: new Date().toISOString()
        };

        positions.push(newPosition);
        await this.redisClient.set(
          `portfolio:${userId}`,
          JSON.stringify(positions)
        );

        // Record transaction
        await this.recordTransaction(userId, {
          type: 'investment',
          positionId: newPosition.id,
          amount,
          protocol,
          timestamp: new Date().toISOString()
        });

        return { success: true, transactionHash: result.transaction.hash };
      } else {
        throw new Error('Investment failed on smart contract');
      }
    } catch (error) {
      console.error('Error making investment:', error);
      throw error;
    }
  }

  calculatePositionValue(position, protocolData) {
    const { amount, startDate } = position;
    const { apy } = protocolData;

    const daysInvested = Math.floor(
      (new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const dailyRate = (apy / 100) / 365;
    return amount * Math.pow(1 + dailyRate, daysInvested);
  }

  async recordTransaction(userId, transaction) {
    try {
      const transactionsKey = `transactions:${userId}`;
      const transactions = JSON.parse(
        await this.redisClient.get(transactionsKey) || '[]'
      );
      
      transactions.push(transaction);
      await this.redisClient.set(
        transactionsKey,
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  }
}

module.exports = new PortfolioService();
