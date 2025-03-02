const calculateLiquidityScore = (tvl, volume24h) => {
  // Higher TVL and volume indicate better liquidity
  const tvlScore = Math.min(tvl / 1000000, 1); // Normalize to 1M TVL
  const volumeScore = Math.min(volume24h / 100000, 1); // Normalize to 100K volume
  return (tvlScore * 0.6 + volumeScore * 0.4);
};

const calculateVolatilityScore = (priceHistory) => {
  if (!priceHistory || priceHistory.length < 2) return 0;

  // Calculate standard deviation of price changes
  const changes = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const change = (priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1];
    changes.push(change);
  }

  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;
  const stdDev = Math.sqrt(variance);

  // Convert to a score (lower volatility = higher score)
  return Math.max(0, 1 - stdDev * 10);
};

const calculateProtocolScore = (protocol) => {
  const {
    age, // in days
    totalValueLocked,
    uniqueUsers,
    auditCount,
    hackHistory,
    communitySize,
  } = protocol;

  // Age score (older = better, max 2 years)
  const ageScore = Math.min(age / 730, 1);

  // TVL score (higher = better, max 100M)
  const tvlScore = Math.min(totalValueLocked / 100000000, 1);

  // Users score (more = better, max 10k users)
  const usersScore = Math.min(uniqueUsers / 10000, 1);

  // Audit score (more = better, max 5 audits)
  const auditScore = Math.min(auditCount / 5, 1);

  // Hack history penalty (more hacks = worse)
  const hackPenalty = Math.max(0, 1 - hackHistory * 0.2);

  // Community score (larger = better, max 100k members)
  const communityScore = Math.min(communitySize / 100000, 1);

  // Weighted average of all scores
  return (
    ageScore * 0.15 +
    tvlScore * 0.25 +
    usersScore * 0.15 +
    auditScore * 0.2 +
    hackPenalty * 0.15 +
    communityScore * 0.1
  );
};

const calculateAuditScore = (audits) => {
  if (!audits || !audits.length) return 0;

  const scores = audits.map(audit => {
    const {
      auditor,
      severity,
      issuesFixed,
      totalIssues,
      timeElapsed, // in days
    } = audit;

    // Auditor reputation score (0-1)
    const auditorScore = auditor.reputation || 0.5;

    // Issues resolution score
    const resolutionScore = issuesFixed / totalIssues;

    // Severity score (lower severity = higher score)
    const severityScore = 1 - (severity / 10);

    // Time relevance (newer = better, max 1 year)
    const timeScore = Math.max(0, 1 - timeElapsed / 365);

    return (
      auditorScore * 0.3 +
      resolutionScore * 0.3 +
      severityScore * 0.2 +
      timeScore * 0.2
    );
  });

  // Average of all audit scores, weighted by recency
  const totalWeight = scores.reduce((sum, _, i) => sum + (scores.length - i), 0);
  const weightedScore = scores.reduce((sum, score, i) => {
    const weight = (scores.length - i) / totalWeight;
    return sum + score * weight;
  }, 0);

  return weightedScore;
};

const calculateRiskScore = ({
  liquidityScore,
  volatilityScore,
  protocolScore,
  auditsScore,
}) => {
  // Normalize all scores to 0-1 range
  const normalizedLiquidity = Math.max(0, Math.min(1, liquidityScore));
  const normalizedVolatility = Math.max(0, Math.min(1, volatilityScore));
  const normalizedProtocol = Math.max(0, Math.min(1, protocolScore));
  const normalizedAudits = Math.max(0, Math.min(1, auditsScore));

  // Weighted average of all components
  const riskScore = (
    normalizedLiquidity * 0.3 +
    normalizedVolatility * 0.3 +
    normalizedProtocol * 0.2 +
    normalizedAudits * 0.2
  );

  return riskScore;
};

const getRiskLevel = (score) => {
  if (score >= 0.7) return 'low';
  if (score >= 0.4) return 'medium';
  return 'high';
};

const getDetailedRiskAnalysis = (opportunity) => {
  const {
    tvl,
    volume24h,
    priceHistory,
    protocol,
    audits,
  } = opportunity;

  const liquidityScore = calculateLiquidityScore(tvl, volume24h);
  const volatilityScore = calculateVolatilityScore(priceHistory);
  const protocolScore = calculateProtocolScore(protocol);
  const auditsScore = calculateAuditScore(audits);

  const riskScore = calculateRiskScore({
    liquidityScore,
    volatilityScore,
    protocolScore,
    auditsScore,
  });

  return {
    overall: {
      score: riskScore,
      level: getRiskLevel(riskScore),
    },
    components: {
      liquidity: {
        score: liquidityScore,
        details: {
          tvl,
          volume24h,
        },
      },
      volatility: {
        score: volatilityScore,
        details: {
          stdDev: calculateVolatilityScore(priceHistory),
        },
      },
      protocol: {
        score: protocolScore,
        details: {
          age: protocol.age,
          tvl: protocol.totalValueLocked,
          users: protocol.uniqueUsers,
          auditCount: protocol.auditCount,
          hackHistory: protocol.hackHistory,
        },
      },
      audits: {
        score: auditsScore,
        details: audits,
      },
    },
  };
};

module.exports = {
  calculateLiquidityScore,
  calculateVolatilityScore,
  calculateProtocolScore,
  calculateAuditScore,
  calculateRiskScore,
  getRiskLevel,
  getDetailedRiskAnalysis,
};
