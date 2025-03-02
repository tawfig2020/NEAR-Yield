use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YieldConfig {
    pub risk_tolerance: RiskLevel,
    pub min_apy: f64,
    pub min_tvl: u64,
    pub preferred_assets: Vec<String>,
    pub rebalance_threshold: f64,
    pub max_allocation_per_pool: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum RiskLevel {
    Low,
    Moderate,
    High,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PoolMetrics {
    pub protocol: String,
    pub pool_id: String,
    pub apy: f64,
    pub tvl: u64,
    pub risk_score: f64,
    pub audit_status: bool,
    pub token_pair: (String, String),
    pub chain_factor: f64,
}

impl YieldConfig {
    pub fn new(risk_level: RiskLevel) -> Self {
        let (min_apy, min_tvl, max_allocation) = match risk_level {
            RiskLevel::Low => (5.0, 1_000_000, 0.3),
            RiskLevel::Moderate => (8.0, 500_000, 0.4),
            RiskLevel::High => (12.0, 250_000, 0.5),
        };

        YieldConfig {
            risk_tolerance: risk_level,
            min_apy,
            min_tvl,
            preferred_assets: vec!["NEAR".to_string(), "ETH".to_string(), "USDC".to_string()],
            rebalance_threshold: 2.0, // 2% difference triggers rebalance
            max_allocation_per_pool: max_allocation,
        }
    }

    pub fn validate_pool(&self, pool: &PoolMetrics) -> bool {
        if pool.tvl < self.min_tvl {
            return false;
        }

        if pool.apy < self.min_apy {
            return false;
        }

        // Risk scoring based on configuration
        let risk_threshold = match self.risk_tolerance {
            RiskLevel::Low => 0.8,
            RiskLevel::Moderate => 0.6,
            RiskLevel::High => 0.4,
        };

        pool.risk_score >= risk_threshold && pool.chain_factor >= 0.9 && pool.audit_status
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortfolioAllocation {
    pub pool_id: String,
    pub protocol: String,
    pub allocation_percentage: f64,
    pub expected_apy: f64,
    pub risk_score: f64,
}
