const { connect, keyStores, utils } = require('near-api-js');
const NodeCache = require('node-cache');
const axios = require('axios');
const { Decimal } = require('decimal.js');
const nearConfig = require('../config/near.config');
const logger = require('../utils/logger');

class NearService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: nearConfig.cache.ttl,
      checkperiod: nearConfig.cache.checkperiod
    });
    this.initialize();
  }

  async initialize() {
    try {
      const keyStore = new keyStores.InMemoryKeyStore();
      const near = await connect({
        networkId: nearConfig.networkId,
        nodeUrl: nearConfig.nodeUrl,
        walletUrl: nearConfig.walletUrl,
        helperUrl: nearConfig.helperUrl,
        keyStore,
      });
      this.near = near;
      logger.info('NEAR connection initialized');
    } catch (error) {
      logger.error('Failed to initialize NEAR connection:', error);
      throw error;
    }
  }

  async getProtocolData() {
    try {
      const cachedData = this.cache.get('protocolData');
      if (cachedData) return cachedData;

      const data = await Promise.all([
        this.getRefFinanceData(),
        this.getJumboData(),
        this.getPembrockData(),
        this.getBurrowData(),
        this.getLinearData()
      ]);

      const protocolData = data.flat().filter(Boolean);
      this.cache.set('protocolData', protocolData);
      return protocolData;
    } catch (error) {
      logger.error('Error fetching protocol data:', error);
      throw error;
    }
  }

  async getRefFinanceData() {
    try {
      const contract = await this.near.loadContract(nearConfig.protocols.ref_finance.contract, {
        viewMethods: ['get_pools', 'get_pool', 'get_return', 'get_number_of_pools']
      });

      const farmContract = await this.near.loadContract(nearConfig.protocols.ref_finance.farm, {
        viewMethods: ['get_farm', 'get_farms', 'get_farm_list', 'get_seed_info']
      });

      // Get pools and farms data
      const [pools, farms] = await Promise.all([
        contract.get_pools(),
        farmContract.get_farm_list()
      ]);

      return this.processRefFinanceData(pools, farms);
    } catch (error) {
      logger.error('Error fetching Ref Finance data:', error);
      return [];
    }
  }

  async getJumboData() {
    try {
      const contract = await this.near.loadContract(nearConfig.protocols.jumbo.contract, {
        viewMethods: ['get_pools', 'get_pool']
      });

      const farmContract = await this.near.loadContract(nearConfig.protocols.jumbo.farm, {
        viewMethods: ['get_farms', 'get_farm']
      });

      // Get pools and farms data
      const [pools, farms] = await Promise.all([
        contract.get_pools(),
        farmContract.get_farms()
      ]);

      return this.processJumboData(pools, farms);
    } catch (error) {
      logger.error('Error fetching Jumbo data:', error);
      return [];
    }
  }

  async getPembrockData() {
    try {
      const contract = await this.near.loadContract(nearConfig.protocols.pembrock.contract, {
        viewMethods: ['get_markets', 'get_market']
      });

      const markets = await contract.get_markets();
      return this.processPembrockData(markets);
    } catch (error) {
      logger.error('Error fetching Pembrock data:', error);
      return [];
    }
  }

  async getBurrowData() {
    try {
      const contract = await this.near.loadContract(nearConfig.protocols.burrow.contract, {
        viewMethods: ['get_assets', 'get_asset']
      });

      const assets = await contract.get_assets();
      return this.processBurrowData(assets);
    } catch (error) {
      logger.error('Error fetching Burrow data:', error);
      return [];
    }
  }

  async getLinearData() {
    try {
      const contract = await this.near.loadContract(nearConfig.protocols.linear.contract, {
        viewMethods: ['get_pools', 'get_pool_info']
      });

      const pools = await contract.get_pools();
      return this.processLinearData(pools);
    } catch (error) {
      logger.error('Error fetching Linear data:', error);
      return [];
    }
  }

  processRefFinanceData(pools, farms) {
    return pools.map(pool => {
      const farm = farms.find(f => f.pool_id === pool.id);
      const apy = this.calculateRefFinanceAPY(pool, farm);
      const tvl = this.calculatePoolTVL(pool);

      return {
        protocol: 'Ref Finance',
        type: 'AMM/Farm',
        apy,
        tvl,
        tokenPair: `${pool.token_symbols[0]}/${pool.token_symbols[1]}`,
        riskLevel: this.calculateRiskLevel(apy, tvl, 'ref_finance'),
        farmRewards: farm ? farm.rewards_per_day : 0,
        volume24h: pool.volume_24h || 0,
        fee: pool.total_fee
      };
    });
  }

  processJumboData(pools, farms) {
    return pools.map(pool => {
      const farm = farms.find(f => f.pool_id === pool.id);
      const apy = this.calculateJumboAPY(pool, farm);
      const tvl = this.calculatePoolTVL(pool);

      return {
        protocol: 'Jumbo',
        type: 'AMM/Farm',
        apy,
        tvl,
        tokenPair: `${pool.token_symbols[0]}/${pool.token_symbols[1]}`,
        riskLevel: this.calculateRiskLevel(apy, tvl, 'jumbo'),
        farmRewards: farm ? farm.rewards_per_day : 0,
        volume24h: pool.volume_24h || 0,
        fee: pool.total_fee
      };
    });
  }

  processPembrockData(markets) {
    return markets.map(market => {
      const apy = this.calculateLendingAPY(market);
      const tvl = this.calculateMarketTVL(market);

      return {
        protocol: 'Pembrock',
        type: 'Lending',
        apy,
        tvl,
        tokenPair: market.token_symbol,
        riskLevel: this.calculateRiskLevel(apy, tvl, 'pembrock'),
        utilizationRate: market.utilization_rate,
        totalBorrowed: market.total_borrowed
      };
    });
  }

  processBurrowData(assets) {
    return assets.map(asset => {
      const apy = this.calculateBurrowAPY(asset);
      const tvl = this.calculateAssetTVL(asset);

      return {
        protocol: 'Burrow',
        type: 'Lending',
        apy,
        tvl,
        tokenPair: asset.token_symbol,
        riskLevel: this.calculateRiskLevel(apy, tvl, 'burrow'),
        utilizationRate: asset.utilization_rate,
        collateralFactor: asset.collateral_factor
      };
    });
  }

  processLinearData(pools) {
    return pools.map(pool => {
      const apy = this.calculateLinearAPY(pool);
      const tvl = this.calculatePoolTVL(pool);

      return {
        protocol: 'Linear',
        type: 'Staking',
        apy,
        tvl,
        tokenPair: pool.token_symbol,
        riskLevel: this.calculateRiskLevel(apy, tvl, 'linear'),
        stakingPeriod: pool.staking_period,
        totalStaked: pool.total_staked
      };
    });
  }

  calculateRefFinanceAPY(pool, farm) {
    try {
      const tradingFeeAPY = new Decimal(pool.volume_24h)
        .mul(pool.total_fee)
        .mul(365)
        .div(pool.tvl)
        .mul(100);

      const farmingAPY = farm 
        ? new Decimal(farm.rewards_per_day)
          .mul(farm.reward_token_price)
          .mul(365)
          .div(pool.tvl)
          .mul(100)
        : new Decimal(0);

      return tradingFeeAPY.plus(farmingAPY).toNumber();
    } catch (error) {
      logger.error('Error calculating Ref Finance APY:', error);
      return 0;
    }
  }

  calculateJumboAPY(pool, farm) {
    // Similar to Ref Finance calculation
    return this.calculateRefFinanceAPY(pool, farm);
  }

  calculateLendingAPY(market) {
    try {
      return new Decimal(market.supply_rate)
        .mul(365)
        .mul(100)
        .toNumber();
    } catch (error) {
      logger.error('Error calculating Lending APY:', error);
      return 0;
    }
  }

  calculateBurrowAPY(asset) {
    try {
      const supplyAPY = new Decimal(asset.supply_rate)
        .mul(365)
        .mul(100);

      const rewardAPY = new Decimal(asset.reward_multiplier)
        .mul(asset.reward_token_price)
        .mul(365)
        .mul(100);

      return supplyAPY.plus(rewardAPY).toNumber();
    } catch (error) {
      logger.error('Error calculating Burrow APY:', error);
      return 0;
    }
  }

  calculateLinearAPY(pool) {
    try {
      return new Decimal(pool.apr)
        .mul(100)
        .toNumber();
    } catch (error) {
      logger.error('Error calculating Linear APY:', error);
      return 0;
    }
  }

  calculatePoolTVL(pool) {
    try {
      return new Decimal(pool.tvl)
        .toNumber();
    } catch (error) {
      logger.error('Error calculating Pool TVL:', error);
      return 0;
    }
  }

  calculateMarketTVL(market) {
    try {
      return new Decimal(market.total_supplied)
        .mul(market.token_price)
        .toNumber();
    } catch (error) {
      logger.error('Error calculating Market TVL:', error);
      return 0;
    }
  }

  calculateAssetTVL(asset) {
    try {
      return new Decimal(asset.total_supplied)
        .mul(asset.token_price)
        .toNumber();
    } catch (error) {
      logger.error('Error calculating Asset TVL:', error);
      return 0;
    }
  }

  calculateRiskLevel(apy, tvl, protocol) {
    // Basic risk calculation based on APY and TVL
    // Higher APY and lower TVL indicates higher risk
    try {
      const apyScore = Math.min(apy / 100, 1); // Normalize APY to 0-1
      const tvlScore = Math.min(Math.log10(tvl) / 8, 1); // Normalize TVL to 0-1 using log scale
      
      // Protocol-specific risk factors
      const protocolRiskFactors = {
        ref_finance: 0.8,
        jumbo: 0.7,
        pembrock: 0.6,
        burrow: 0.75,
        linear: 0.85
      };

      const riskScore = (apyScore * 0.4 + (1 - tvlScore) * 0.4 + (1 - protocolRiskFactors[protocol]) * 0.2);

      if (riskScore < 0.3) return 'Low';
      if (riskScore < 0.6) return 'Medium';
      return 'High';
    } catch (error) {
      logger.error('Error calculating risk level:', error);
      return 'Unknown';
    }
  }
}

module.exports = new NearService();
