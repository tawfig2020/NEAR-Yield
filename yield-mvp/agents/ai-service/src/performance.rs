use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyPerformance {
    pub strategy_id: String,
    pub initial_value: f64,
    pub current_value: f64,
    pub apy: f64,
    pub gas_saved: f64,
    pub rebalance_count: u32,
    pub last_update: DateTime<Utc>,
    pub historical_values: Vec<TimeSeriesData>,
    pub comparison: ComparisonMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeriesData {
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub sentiment_score: f32,
    pub action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonMetrics {
    pub manual_strategy_apy: f64,
    pub market_average_apy: f64,
    pub alpha: f64, // Excess returns compared to market
    pub sharpe_ratio: f64,
}

pub struct PerformanceTracker {
    strategies: HashMap<String, StrategyPerformance>,
}

impl PerformanceTracker {
    pub fn new() -> Self {
        Self {
            strategies: HashMap::new(),
        }
    }

    pub fn calculate_apy(&self, strategy: &StrategyPerformance) -> f64 {
        let days_elapsed = (Utc::now() - strategy.historical_values[0].timestamp).num_days() as f64;
        if days_elapsed == 0.0 {
            return 0.0;
        }

        let return_rate = (strategy.current_value - strategy.initial_value) / strategy.initial_value;
        let annualized = (1.0 + return_rate).powf(365.0 / days_elapsed) - 1.0;
        annualized * 100.0
    }

    pub fn update_strategy(&mut self, 
        strategy_id: &str, 
        current_value: f64,
        sentiment_score: f32,
        action: Option<String>
    ) {
        if let Some(strategy) = self.strategies.get_mut(strategy_id) {
            strategy.current_value = current_value;
            strategy.apy = self.calculate_apy(strategy);
            strategy.last_update = Utc::now();

            strategy.historical_values.push(TimeSeriesData {
                timestamp: Utc::now(),
                value: current_value,
                sentiment_score,
                action,
            });

            // Update comparison metrics
            self.update_comparison_metrics(strategy);
        }
    }

    fn update_comparison_metrics(&self, strategy: &mut StrategyPerformance) {
        // Calculate market average APY (simplified example)
        let market_apy = 5.0; // This would come from external data

        // Calculate Sharpe ratio
        let returns: Vec<f64> = strategy.historical_values.windows(2)
            .map(|w| (w[1].value - w[0].value) / w[0].value)
            .collect();

        let avg_return = returns.iter().sum::<f64>() / returns.len() as f64;
        let std_dev = (returns.iter()
            .map(|r| (r - avg_return).powi(2))
            .sum::<f64>() / returns.len() as f64)
            .sqrt();

        let risk_free_rate = 0.02; // 2% annual
        let sharpe = if std_dev > 0.0 {
            (avg_return - risk_free_rate) / std_dev
        } else {
            0.0
        };

        strategy.comparison = ComparisonMetrics {
            manual_strategy_apy: market_apy,
            market_average_apy: market_apy,
            alpha: strategy.apy - market_apy,
            sharpe_ratio: sharpe,
        };
    }

    pub fn get_gas_savings(&self, strategy_id: &str) -> f64 {
        if let Some(strategy) = self.strategies.get(strategy_id) {
            // Estimate gas savings based on number of automated rebalances
            let avg_gas_per_tx = 0.001; // NEAR tokens
            strategy.rebalance_count as f64 * avg_gas_per_tx
        } else {
            0.0
        }
    }

    pub fn get_strategy_stats(&self, strategy_id: &str) -> Option<StrategyStats> {
        self.strategies.get(strategy_id).map(|strategy| {
            let win_rate = self.calculate_win_rate(strategy);
            let avg_rebalance_gain = self.calculate_avg_rebalance_gain(strategy);

            StrategyStats {
                apy: strategy.apy,
                win_rate,
                avg_rebalance_gain,
                gas_saved: self.get_gas_savings(strategy_id),
                alpha: strategy.comparison.alpha,
                sharpe_ratio: strategy.comparison.sharpe_ratio,
            }
        })
    }

    fn calculate_win_rate(&self, strategy: &StrategyPerformance) -> f64 {
        let mut winning_trades = 0;
        let mut total_trades = 0;

        for window in strategy.historical_values.windows(2) {
            if let Some(action) = &window[1].action {
                total_trades += 1;
                if window[1].value > window[0].value {
                    winning_trades += 1;
                }
            }
        }

        if total_trades > 0 {
            (winning_trades as f64 / total_trades as f64) * 100.0
        } else {
            0.0
        }
    }

    fn calculate_avg_rebalance_gain(&self, strategy: &StrategyPerformance) -> f64 {
        let mut total_gain = 0.0;
        let mut total_rebalances = 0;

        for window in strategy.historical_values.windows(2) {
            if window[1].action.is_some() {
                total_rebalances += 1;
                total_gain += (window[1].value - window[0].value) / window[0].value;
            }
        }

        if total_rebalances > 0 {
            (total_gain / total_rebalances as f64) * 100.0
        } else {
            0.0
        }
    }
}

#[derive(Debug, Serialize)]
pub struct StrategyStats {
    pub apy: f64,
    pub win_rate: f64,
    pub avg_rebalance_gain: f64,
    pub gas_saved: f64,
    pub alpha: f64,
    pub sharpe_ratio: f64,
}
