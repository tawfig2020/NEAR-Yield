use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, Balance, PanicOnDefault, Promise};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct AutoRebalanceAgent {
    owner_id: AccountId,
    sentiment_oracle: AccountId,
    staking_contract: AccountId,
    pools: UnorderedMap<AccountId, Balance>,
    sentiment_threshold: f32,
    rebalance_percentage: f32,
    is_active: bool,
}

#[near_bindgen]
impl AutoRebalanceAgent {
    #[init]
    pub fn new(
        owner_id: AccountId,
        sentiment_oracle: AccountId,
        staking_contract: AccountId,
        sentiment_threshold: f32,
        rebalance_percentage: f32,
    ) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        assert!(
            sentiment_threshold > 0.0 && sentiment_threshold < 100.0,
            "Invalid sentiment threshold"
        );
        assert!(
            rebalance_percentage > 0.0 && rebalance_percentage <= 100.0,
            "Invalid rebalance percentage"
        );

        Self {
            owner_id,
            sentiment_oracle,
            staking_contract,
            pools: UnorderedMap::new(b"p"),
            sentiment_threshold,
            rebalance_percentage: rebalance_percentage / 100.0,
            is_active: true,
        }
    }

    #[payable]
    pub fn execute_strategy(&mut self, sentiment: f32) {
        assert!(env::predecessor_account_id() == self.sentiment_oracle, "Unauthorized");
        assert!(self.is_active, "Strategy is paused");

        if sentiment < self.sentiment_threshold {
            self.rebalance_to_staking();
        }
    }

    fn rebalance_to_staking(&mut self) {
        let mut total_withdrawn: Balance = 0;

        // Withdraw from risky pools
        for (pool_id, balance) in self.pools.iter() {
            let withdraw_amount = Balance::from((balance as f64 * self.rebalance_percentage as f64) as u128);
            if withdraw_amount > 0 {
                // Call pool's withdraw function
                Promise::new(pool_id)
                    .function_call(
                        "withdraw".to_string(),
                        near_sdk::serde_json::to_vec(&U128(withdraw_amount)).unwrap(),
                        1,
                        env::prepaid_gas() / 3,
                    );
                total_withdrawn += withdraw_amount;
            }
        }

        if total_withdrawn > 0 {
            // Stake withdrawn amount
            Promise::new(self.staking_contract)
                .function_call(
                    "stake".to_string(),
                    near_sdk::serde_json::to_vec(&U128(total_withdrawn)).unwrap(),
                    total_withdrawn,
                    env::prepaid_gas() / 3,
                );

            env::log_str(&format!(
                "Rebalanced {} yoctoNEAR to staking due to low sentiment",
                total_withdrawn
            ));
        }
    }

    // Admin functions
    pub fn update_sentiment_threshold(&mut self, threshold: f32) {
        self.assert_owner();
        assert!(
            threshold > 0.0 && threshold < 100.0,
            "Invalid sentiment threshold"
        );
        self.sentiment_threshold = threshold;
    }

    pub fn update_rebalance_percentage(&mut self, percentage: f32) {
        self.assert_owner();
        assert!(
            percentage > 0.0 && percentage <= 100.0,
            "Invalid rebalance percentage"
        );
        self.rebalance_percentage = percentage / 100.0;
    }

    pub fn toggle_strategy(&mut self) {
        self.assert_owner();
        self.is_active = !self.is_active;
    }

    pub fn add_pool(&mut self, pool_id: AccountId) {
        self.assert_owner();
        self.pools.insert(&pool_id, &0);
    }

    pub fn remove_pool(&mut self, pool_id: AccountId) {
        self.assert_owner();
        self.pools.remove(&pool_id);
    }

    // View functions
    pub fn get_pools(&self) -> Vec<(AccountId, U128)> {
        self.pools
            .iter()
            .map(|(k, v)| (k, U128(v)))
            .collect()
    }

    pub fn get_strategy_config(&self) -> StrategyConfig {
        StrategyConfig {
            sentiment_threshold: self.sentiment_threshold,
            rebalance_percentage: self.rebalance_percentage * 100.0,
            is_active: self.is_active,
        }
    }

    // Helper functions
    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can call this method"
        );
    }
}

#[derive(near_sdk::serde::Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct StrategyConfig {
    pub sentiment_threshold: f32,
    pub rebalance_percentage: f32,
    pub is_active: bool,
}
