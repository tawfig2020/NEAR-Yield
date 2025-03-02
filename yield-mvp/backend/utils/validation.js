/**
 * Validate NEAR account ID
 * @param {string} accountId NEAR account ID to validate
 * @throws {Error} If account ID is invalid
 */
function validateAccountId(accountId) {
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  if (typeof accountId !== 'string') {
    throw new Error('Account ID must be a string');
  }

  if (accountId.length < 2 || accountId.length > 64) {
    throw new Error('Account ID must be between 2 and 64 characters long');
  }

  const validAccountIdRegex = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
  if (!validAccountIdRegex.test(accountId)) {
    throw new Error('Invalid account ID format');
  }
}

/**
 * Validate transaction amount
 * @param {string|number} amount Amount to validate
 * @param {string|number} minAmount Minimum allowed amount
 * @param {string|number} maxAmount Maximum allowed amount
 * @throws {Error} If amount is invalid
 */
function validateAmount(amount, minAmount, maxAmount) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numMinAmount = typeof minAmount === 'string' ? parseFloat(minAmount) : minAmount;
  const numMaxAmount = typeof maxAmount === 'string' ? parseFloat(maxAmount) : maxAmount;

  if (isNaN(numAmount)) {
    throw new Error('Invalid amount');
  }

  if (numAmount < numMinAmount) {
    throw new Error(`Amount must be at least ${minAmount}`);
  }

  if (numAmount > numMaxAmount) {
    throw new Error(`Amount must not exceed ${maxAmount}`);
  }
}

/**
 * Validate public key
 * @param {string} publicKey Public key to validate
 * @throws {Error} If public key is invalid
 */
function validatePublicKey(publicKey) {
  if (!publicKey) {
    throw new Error('Public key is required');
  }

  if (typeof publicKey !== 'string') {
    throw new Error('Public key must be a string');
  }

  const validPublicKeyRegex = /^ed25519:[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{43,44}$/;
  if (!validPublicKeyRegex.test(publicKey)) {
    throw new Error('Invalid public key format');
  }
}

/**
 * Validate contract method name
 * @param {string} methodName Method name to validate
 * @throws {Error} If method name is invalid
 */
function validateMethodName(methodName) {
  if (!methodName) {
    throw new Error('Method name is required');
  }

  if (typeof methodName !== 'string') {
    throw new Error('Method name must be a string');
  }

  const validMethodNameRegex = /^[a-z][a-z0-9_]*$/;
  if (!validMethodNameRegex.test(methodName)) {
    throw new Error('Invalid method name format');
  }
}

/**
 * Validate gas amount
 * @param {string|number} gas Gas amount to validate
 * @throws {Error} If gas amount is invalid
 */
function validateGas(gas) {
  const numGas = typeof gas === 'string' ? parseFloat(gas) : gas;

  if (isNaN(numGas)) {
    throw new Error('Invalid gas amount');
  }

  const MIN_GAS = 100000;
  const MAX_GAS = 300000000000000;

  if (numGas < MIN_GAS || numGas > MAX_GAS) {
    throw new Error(`Gas must be between ${MIN_GAS} and ${MAX_GAS}`);
  }
}

/**
 * Validate strategy parameters
 * @param {Object} params Strategy parameters to validate
 * @throws {Error} If parameters are invalid
 */
function validateStrategyParams(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid strategy parameters');
  }

  if ('minStake' in params) {
    validateAmount(params.minStake, 0, params.maxStake || Infinity);
  }

  if ('maxStake' in params) {
    validateAmount(params.maxStake, params.minStake || 0, Infinity);
  }

  if ('rewardRate' in params) {
    const rewardRate = parseFloat(params.rewardRate);
    if (isNaN(rewardRate) || rewardRate < 0 || rewardRate > 1) {
      throw new Error('Invalid reward rate (must be between 0 and 1)');
    }
  }
}

module.exports = {
  validateAccountId,
  validateAmount,
  validatePublicKey,
  validateMethodName,
  validateGas,
  validateStrategyParams
};
