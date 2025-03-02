use crate::config::{PoolMetrics, PortfolioAllocation, RiskLevel, YieldConfig};
use std::collections::HashMap;
use tokio::sync::broadcast;
use near_sdk::json_types::U128;
use std::error::Error;

pub struct YieldOptimizer {
    config: YieldConfig,
    pool_data: HashMap<String, PoolMetrics>,
    alert_tx: broadcast::Sender<AlertMessage>,
}

#[derive(Clone, Debug)]
pub enum AlertMessage {
    ApyDrop { pool_id: String, old_apy: f64, new_apy: f64 },
    RiskIncrease { pool_id: String, risk_factor: f64 },
    RebalanceNeeded { reason: String },
    ProtocolWarning { protocol: String, message: String },
}

impl YieldOptimizer {
    pub fn new(config: YieldConfig, alert_tx: broadcast::Sender<AlertMessage>) -> Self {
        Self {
            config,
            pool_data: HashMap::new(),
            alert_tx,
        }
    }

    pub async fn update_pool_data(&mut self, pools: Vec<PoolMetrics>) {
        for pool in pools {
            if let Some(old_pool) = self.pool_data.get(&pool.pool_id) {
                // Check for significant APY drops
                if (old_pool.apy - pool.apy) > 2.0 {
                    let _ = self.alert_tx.send(AlertMessage::ApyDrop {
                        pool_id: pool.pool_id.clone(),
                        old_apy: old_pool.apy,
                        new_apy: pool.apy,
                    });
                }

                // Monitor risk changes
                if pool.risk_score < old_pool.risk_score * 0.8 {
                    let _ = self.alert_tx.send(AlertMessage::RiskIncrease {
                        pool_id: pool.pool_id.clone(),
                        risk_factor: pool.risk_score,
                    });
                }
            }

            self.pool_data.insert(pool.pool_id.clone(), pool);
        }
    }

    pub async fn optimize_portfolio(&self) -> Vec<PortfolioAllocation> {
        let mut valid_pools: Vec<&PoolMetrics> = self.pool_data
            .values()
            .filter(|pool| self.config.validate_pool(pool))
            .collect();

        // Sort by risk-adjusted return (APY * risk_score * chain_factor)
        valid_pools.sort_by(|a, b| {
            let a_score = a.apy * a.risk_score * a.chain_factor;
            let b_score = b.apy * b.risk_score * b.chain_factor;
            b_score.partial_cmp(&a_score).unwrap()
        });

        let mut allocations = Vec::new();
        let mut total_allocation = 0.0;

        for pool in valid_pools {
            if total_allocation >= 1.0 {
                break;
            }

            let mut allocation = match self.config.risk_tolerance {
                RiskLevel::Low => 0.2,
                RiskLevel::Moderate => 0.3,
                RiskLevel::High => 0.4,
            };

            // Adjust allocation based on remaining capacity
            allocation = allocation.min(1.0 - total_allocation);
            allocation = allocation.min(self.config.max_allocation_per_pool);

            if allocation > 0.0 {
                allocations.push(PortfolioAllocation {
                    pool_id: pool.pool_id.clone(),
                    protocol: pool.protocol.clone(),
                    allocation_percentage: allocation,
                    expected_apy: pool.apy,
                    risk_score: pool.risk_score,
                });

                total_allocation += allocation;
            }
        }

        // Normalize allocations to ensure they sum to 100%
        if !allocations.is_empty() {
            let sum: f64 = allocations.iter().map(|a| a.allocation_percentage).sum();
            for allocation in &mut allocations {
                allocation.allocation_percentage /= sum;
            }
        }

        allocations
    }

    pub async fn execute_rebalance(
        &self,
        current_allocations: &[PortfolioAllocation],
        target_allocations: &[PortfolioAllocation],
    ) -> Result<(), Box<dyn Error>> {
        // Calculate required trades
        let mut trades = Vec::new();
        for target in target_allocations {
            let current = current_allocations
                .iter()
                .find(|a| a.pool_id == target.pool_id)
                .map(|a| a.allocation_percentage)
                .unwrap_or(0.0);

            let difference = target.allocation_percentage - current;
            if difference.abs() > self.config.rebalance_threshold / 100.0 {
                trades.push((target.pool_id.clone(), difference));
            }
        }

        // If rebalancing is needed, notify
        if !trades.is_empty() {
            let _ = self.alert_tx.send(AlertMessage::RebalanceNeeded {
                reason: format!("Portfolio drift detected: {} trades required", trades.len()),
            });
        }

        Ok(())
    }

    pub fn get_portfolio_stats(&self, allocations: &[PortfolioAllocation]) -> PortfolioStats {
        let total_apy: f64 = allocations
            .iter()
            .map(|a| a.expected_apy * a.allocation_percentage)
            .sum();

        let avg_risk: f64 = allocations
            .iter()
            .map(|a| a.risk_score * a.allocation_percentage)
            .sum();

        PortfolioStats {
            expected_apy: total_apy,
            risk_score: avg_risk,
            num_pools: allocations.len(),
        }
    }
}

#[derive(Debug)]
pub struct PortfolioStats {
    pub expected_apy: f64,
    pub risk_score: f64,
    pub num_pools: usize,
}
