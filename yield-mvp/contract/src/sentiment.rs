use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, Balance, Promise};
use near_sdk::json_types::U128;
use std::collections::HashMap;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct SentimentConfig {
    pub bearish_threshold: f64,
    pub bullish_threshold: f64,
    pub defensive_allocation: f64,
    pub aggressive_allocation: f64,
    pub min_rebalance_interval: u64,
    pub last_rebalance: u64,
}

impl Default for SentimentConfig {
    fn default() -> Self {
        Self {
            bearish_threshold: 0.25,
            bullish_threshold: 0.75,
            defensive_allocation: 0.7,  // 70% move to stablecoin
            aggressive_allocation: 0.8,  // 80% exposure to NEAR
            min_rebalance_interval: 3600, // 1 hour
            last_rebalance: 0,
        }
    }
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct CompositeData {
    pub composite_score: f64,
    pub confidence: f64,
    pub market_signals: MarketSignals,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct MarketSignals {
    pub trend: String,
    pub strength: String,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub enum Strategy {
    Defensive,
    Conservative,
    Aggressive,
    Moderate,
    Balanced,
}

#[near_bindgen]
impl Contract {
    pub fn handle_twitter_sentiment(&mut self, sentiment: f64) -> Promise {
        // Verify caller is authorized
        self.assert_authorized_caller();
        
        // Get current timestamp
        let current_time = env::block_timestamp();
        
        // Check if enough time has passed since last rebalance
        if current_time - self.sentiment_config.last_rebalance < self.sentiment_config.min_rebalance_interval {
            env::log_str("Rebalance interval not met");
            return Promise::new(env::current_account_id());
        }

        // Handle different sentiment scenarios
        if sentiment <= self.sentiment_config.bearish_threshold {
            self.handle_bearish_scenario()
        } else if sentiment >= self.sentiment_config.bullish_threshold {
            self.handle_bullish_scenario()
        } else {
            self.handle_neutral_scenario()
        }
    }

    pub fn handle_composite_sentiment(&mut self, data: CompositeData) {
        // Verify caller
        self.assert_authorized_caller();
        
        // Get current timestamp
        let current_time = env::block_timestamp();
        
        // Check if enough time has passed since last rebalance
        if current_time - self.sentiment_config.last_rebalance < self.sentiment_config.min_rebalance_interval {
            env::log_str("Rebalance interval not met");
            return;
        }

        // Validate confidence level
        if data.confidence < 0.6 {  // Require at least 60% confidence
            env::log_str("Insufficient confidence in sentiment data");
            return;
        }

        // Handle market signals
        match data.market_signals.trend.as_str() {
            "bearish" => {
                if data.market_signals.strength == "strong" {
                    self.handle_strong_bearish(&data)
                } else {
                    self.handle_weak_bearish(&data)
                }
            },
            "bullish" => {
                if data.market_signals.strength == "strong" {
                    self.handle_strong_bullish(&data)
                } else {
                    self.handle_weak_bullish(&data)
                }
            },
            _ => self.handle_neutral(&data)
        }

        // Update last rebalance time
        self.sentiment_config.last_rebalance = current_time;
        
        // Log the action
        env::log_str(
            &format!(
                "Processed composite sentiment: score={}, confidence={}, trend={}, strength={}",
                data.composite_score,
                data.confidence,
                data.market_signals.trend,
                data.market_signals.strength
            )
        );
    }

    fn handle_bearish_scenario(&mut self) -> Promise {
        let stablecoin_allocation = self.total_balance() as f64 * self.sentiment_config.defensive_allocation;
        
        // Move funds to stablecoin pools
        self.rebalance_to_stablecoin(stablecoin_allocation as u128)
    }

    fn handle_bullish_scenario(&mut self) -> Promise {
        let near_allocation = self.total_balance() as f64 * self.sentiment_config.aggressive_allocation;
        
        // Increase NEAR exposure
        self.rebalance_to_near(near_allocation as u128)
    }

    fn handle_neutral_scenario(&mut self) -> Promise {
        // Maintain balanced portfolio
        self.rebalance_to_neutral()
    }

    fn handle_strong_bearish(&mut self, data: &CompositeData) {
        // Move significant portion to stablecoin pools
        let stablecoin_allocation = self.total_balance() as f64 * 0.7;  // 70% to stablecoins
        self.rebalance_to_stablecoin(stablecoin_allocation as u128);
        
        // Set defensive strategy
        self.set_strategy(Strategy::Defensive);
    }

    fn handle_weak_bearish(&mut self, data: &CompositeData) {
        // Move moderate portion to stablecoin pools
        let stablecoin_allocation = self.total_balance() as f64 * 0.5;  // 50% to stablecoins
        self.rebalance_to_stablecoin(stablecoin_allocation as u128);
        
        // Set conservative strategy
        self.set_strategy(Strategy::Conservative);
    }

    fn handle_strong_bullish(&mut self, data: &CompositeData) {
        // Increase yield farming exposure
        let yield_allocation = self.total_balance() as f64 * 0.8;  // 80% to yield farming
        self.rebalance_to_yield_farming(yield_allocation as u128);
        
        // Set aggressive strategy
        self.set_strategy(Strategy::Aggressive);
    }

    fn handle_weak_bullish(&mut self, data: &CompositeData) {
        // Moderate yield farming exposure
        let yield_allocation = self.total_balance() as f64 * 0.6;  // 60% to yield farming
        self.rebalance_to_yield_farming(yield_allocation as u128);
        
        // Set moderate strategy
        self.set_strategy(Strategy::Moderate);
    }

    fn handle_neutral(&mut self, data: &CompositeData) {
        // Balanced allocation
        let yield_allocation = self.total_balance() as f64 * 0.5;  // 50-50 split
        self.rebalance_to_balanced(yield_allocation as u128);
        
        // Set balanced strategy
        self.set_strategy(Strategy::Balanced);
    }

    fn rebalance_to_stablecoin(&mut self, amount: Balance) -> Promise {
        // Implementation of stablecoin rebalancing
        self.sentiment_config.last_rebalance = env::block_timestamp();
        
        // Call external DeFi protocols
        // This is a placeholder - actual implementation would interact with specific protocols
        Promise::new(env::current_account_id())
    }

    fn rebalance_to_near(&mut self, amount: Balance) -> Promise {
        // Implementation of NEAR rebalancing
        self.sentiment_config.last_rebalance = env::block_timestamp();
        
        // Call external DeFi protocols
        // This is a placeholder - actual implementation would interact with specific protocols
        Promise::new(env::current_account_id())
    }

    fn rebalance_to_neutral(&mut self) -> Promise {
        // Implementation of neutral rebalancing
        self.sentiment_config.last_rebalance = env::block_timestamp();
        
        // Call external DeFi protocols
        // This is a placeholder - actual implementation would interact with specific protocols
        Promise::new(env::current_account_id())
    }

    fn rebalance_to_yield_farming(&mut self, amount: Balance) -> Promise {
        // Implementation of yield farming rebalancing
        self.sentiment_config.last_rebalance = env::block_timestamp();
        
        // Call external DeFi protocols
        // This is a placeholder - actual implementation would interact with specific protocols
        Promise::new(env::current_account_id())
    }

    fn rebalance_to_balanced(&mut self, amount: Balance) -> Promise {
        // Implementation of balanced rebalancing
        self.sentiment_config.last_rebalance = env::block_timestamp();
        
        // Call external DeFi protocols
        // This is a placeholder - actual implementation would interact with specific protocols
        Promise::new(env::current_account_id())
    }

    // Helper functions
    fn assert_authorized_caller(&self) {
        assert!(
            self.is_authorized_caller(env::predecessor_account_id()),
            "Unauthorized caller"
        );
    }

    fn is_authorized_caller(&self, account_id: AccountId) -> bool {
        // Implementation of authorization check
        self.authorized_callers.contains(&account_id)
    }

    pub fn update_sentiment_config(
        &mut self,
        bearish_threshold: Option<f64>,
        bullish_threshold: Option<f64>,
        defensive_allocation: Option<f64>,
        aggressive_allocation: Option<f64>,
        min_rebalance_interval: Option<u64>,
    ) {
        // Only owner can update config
        self.assert_owner();
        
        if let Some(threshold) = bearish_threshold {
            self.sentiment_config.bearish_threshold = threshold;
        }
        if let Some(threshold) = bullish_threshold {
            self.sentiment_config.bullish_threshold = threshold;
        }
        if let Some(allocation) = defensive_allocation {
            self.sentiment_config.defensive_allocation = allocation;
        }
        if let Some(allocation) = aggressive_allocation {
            self.sentiment_config.aggressive_allocation = allocation;
        }
        if let Some(interval) = min_rebalance_interval {
            self.sentiment_config.min_rebalance_interval = interval;
        }
    }

    fn set_strategy(&mut self, strategy: Strategy) {
        // Implementation of strategy setting
    }

    fn assert_owner(&self) {
        assert!(
            self.is_owner(env::predecessor_account_id()),
            "Only owner can update config"
        );
    }

    fn is_owner(&self, account_id: AccountId) -> bool {
        // Implementation of owner check
        self.owner == account_id
    }
}
