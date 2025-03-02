const { BigNumber } = require('bignumber.js');

class FinancialCalculations {
  // Advanced APY calculation considering compounding frequency
  static calculateAPY(rate, compoundingFrequency = 365) {
    const r = new BigNumber(rate).dividedBy(100);
    return new BigNumber(1)
      .plus(r.dividedBy(compoundingFrequency))
      .pow(compoundingFrequency)
      .minus(1)
      .multipliedBy(100)
      .toFixed(2);
  }

  // Calculate impermanent loss
  static calculateImpermanentLoss(priceRatio) {
    const sqrtRatio = Math.sqrt(priceRatio);
    const loss = 2 * sqrtRatio / (1 + priceRatio) - 1;
    return (loss * 100).toFixed(2);
  }

  // Risk scoring algorithm
  static calculateRiskScore(params) {
    const {
      apy,
      tvl,
      volatility,
      auditScore,
      timeInMarket,
      protocolType
    } = params;

    // Weights for different factors
    const weights = {
      apy: 0.2,
      tvl: 0.15,
      volatility: 0.25,
      auditScore: 0.2,
      timeInMarket: 0.1,
      protocolType: 0.1
    };

    // Normalize values between 0 and 1
    const normalizedApy = Math.min(apy / 100, 1);
    const normalizedTvl = Math.min(tvl / 1000000000, 1); // Normalize against $1B TVL
    const normalizedVolatility = 1 - (volatility / 100);
    const normalizedTimeInMarket = Math.min(timeInMarket / 365, 1); // Normalize against 1 year

    // Calculate weighted score
    const riskScore = (
      normalizedApy * weights.apy +
      normalizedTvl * weights.tvl +
      normalizedVolatility * weights.volatility +
      auditScore * weights.auditScore +
      normalizedTimeInMarket * weights.timeInMarket +
      (protocolType === 'stable' ? 1 : 0.7) * weights.protocolType
    );

    // Convert to 0-100 scale
    return (riskScore * 100).toFixed(2);
  }

  // Historical performance analysis
  static analyzeHistoricalPerformance(data) {
    const returns = [];
    const volatility = [];
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let peak = data[0]?.value || 0;

    for (let i = 1; i < data.length; i++) {
      // Calculate daily return
      const dailyReturn = (data[i].value - data[i-1].value) / data[i-1].value;
      returns.push(dailyReturn);

      // Update peak and drawdown
      if (data[i].value > peak) {
        peak = data[i].value;
        currentDrawdown = 0;
      } else {
        currentDrawdown = (peak - data[i].value) / peak;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }

      // Calculate rolling volatility (20-day window)
      if (returns.length >= 20) {
        const window = returns.slice(-20);
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window.length;
        volatility.push(Math.sqrt(variance));
      }
    }

    // Calculate metrics
    const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const averageVolatility = volatility.reduce((a, b) => a + b, 0) / volatility.length;
    const sharpeRatio = (averageReturn * 365) / (averageVolatility * Math.sqrt(365));

    return {
      annualizedReturn: (Math.pow(1 + averageReturn, 365) - 1) * 100,
      annualizedVolatility: averageVolatility * Math.sqrt(365) * 100,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio: sharpeRatio
    };
  }

  // Liquidity pool simulation
  static simulateLP(params) {
    const {
      initialPrice,
      finalPrice,
      token0Amount,
      token1Amount,
      days
    } = params;

    // Calculate holding value
    const initialValue = token0Amount + (token1Amount * initialPrice);
    const finalHoldingValue = token0Amount + (token1Amount * finalPrice);

    // Calculate LP value
    const k = token0Amount * token1Amount;
    const finalToken0 = Math.sqrt(k * finalPrice);
    const finalToken1 = Math.sqrt(k / finalPrice);
    const finalLPValue = finalToken0 + (finalToken1 * finalPrice);

    // Calculate impermanent loss
    const priceRatio = finalPrice / initialPrice;
    const impermanentLoss = this.calculateImpermanentLoss(priceRatio);

    // Calculate fees earned (assuming 0.3% fee per trade and daily volume = 50% of TVL)
    const dailyVolume = initialValue * 0.5;
    const dailyFees = dailyVolume * 0.003;
    const totalFees = dailyFees * days;

    // Final ROI including fees
    const roiWithFees = ((finalLPValue + totalFees - initialValue) / initialValue) * 100;

    return {
      initialValue,
      finalHoldingValue,
      finalLPValue,
      impermanentLoss,
      estimatedFees: totalFees,
      roiWithFees
    };
  }
}

module.exports = FinancialCalculations;
