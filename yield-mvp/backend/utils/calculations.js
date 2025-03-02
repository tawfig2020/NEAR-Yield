/**
 * Calculate Annual Percentage Yield (APY)
 * @param {number} rewardRate Daily reward rate
 * @param {number} totalStaked Total amount staked
 * @returns {number} APY as a percentage
 */
function calculateAPY(rewardRate, totalStaked) {
  if (totalStaked <= 0) return 0;
  const dailyReturn = rewardRate / totalStaked;
  return (Math.pow(1 + dailyReturn, 365) - 1) * 100;
}

/**
 * Calculate Return on Investment (ROI)
 * @param {Array} historicalData Array of historical price data
 * @param {string} period Time period ('1d', '7d', '30d')
 * @returns {number} ROI as a percentage
 */
function calculateROI(historicalData, period) {
  if (!historicalData || historicalData.length < 2) return 0;

  let days;
  switch (period) {
    case '1d':
      days = 1;
      break;
    case '7d':
      days = 7;
      break;
    case '30d':
      days = 30;
      break;
    default:
      days = 1;
  }

  const currentValue = historicalData[historicalData.length - 1].value;
  const historicalValue = historicalData[0].value;

  return ((currentValue - historicalValue) / historicalValue) * 100;
}

/**
 * Calculate Impermanent Loss
 * @param {number} priceRatio Current price to initial price ratio
 * @returns {number} Impermanent loss as a percentage
 */
function calculateImpermanentLoss(priceRatio) {
  return (2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100;
}

/**
 * Calculate Risk-Adjusted Return (Sharpe Ratio)
 * @param {number} returns Array of historical returns
 * @param {number} riskFreeRate Risk-free rate (e.g., Treasury yield)
 * @returns {number} Sharpe ratio
 */
function calculateSharpeRatio(returns, riskFreeRate) {
  if (!returns || returns.length === 0) return 0;

  const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((a, b) => a + Math.pow(b - averageReturn, 2), 0) / returns.length
  );

  return stdDev === 0 ? 0 : (averageReturn - riskFreeRate) / stdDev;
}

/**
 * Calculate Maximum Drawdown
 * @param {Array} prices Array of historical prices
 * @returns {number} Maximum drawdown as a percentage
 */
function calculateMaxDrawdown(prices) {
  if (!prices || prices.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }

    const drawdown = (peak - price) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown * 100;
}

/**
 * Calculate Compound Interest
 * @param {number} principal Initial investment
 * @param {number} rate Annual interest rate as decimal
 * @param {number} time Time in years
 * @param {number} frequency Compounding frequency per year
 * @returns {number} Final amount
 */
function calculateCompoundInterest(principal, rate, time, frequency = 365) {
  return principal * Math.pow(1 + rate / frequency, frequency * time);
}

/**
 * Calculate Value at Risk (VaR)
 * @param {Array} returns Array of historical returns
 * @param {number} confidence Confidence level (e.g., 0.95 for 95%)
 * @returns {number} Value at Risk
 */
function calculateVaR(returns, confidence = 0.95) {
  if (!returns || returns.length === 0) return 0;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * returns.length);
  return -sortedReturns[index];
}

module.exports = {
  calculateAPY,
  calculateROI,
  calculateImpermanentLoss,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateCompoundInterest,
  calculateVaR
};
