use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, Promise};
use std::collections::HashMap;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, Default)]
pub struct SafetyProxy {
    owner_id: AccountId,
    sentiment_threshold: u8,
    staking_ratio: u8,
    allowed_pools: Vec<AccountId>,
    current_allocation: HashMap<String, u8>,
}

#[near_bindgen]
impl SafetyProxy {
    #[init]
    pub fn new(
        owner_id: AccountId,
        sentiment_threshold: u8,
        staking_ratio: u8,
        allowed_pools: Vec<AccountId>,
    ) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        assert!(sentiment_threshold <= 100, "Invalid sentiment threshold");
        assert!(staking_ratio <= 100, "Invalid staking ratio");
        
        Self {
            owner_id,
            sentiment_threshold,
            staking_ratio,
            allowed_pools,
            current_allocation: HashMap::new(),
        }
    }

    #[payable]
    pub fn execute_strategy(&mut self, sentiment_score: u8) -> Promise {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can execute strategy"
        );
        assert!(sentiment_score <= 100, "Invalid sentiment score");

        if sentiment_score <= self.sentiment_threshold {
            // Emergency reallocation
            self.reallocate_to_safety()
        } else {
            // Normal operation
            self.execute_normal_strategy(sentiment_score)
        }
    }

    fn reallocate_to_safety(&mut self) -> Promise {
        let staking_amount = env::account_balance() * self.staking_ratio as u128 / 100;
        
        // Update allocation tracking
        self.current_allocation.insert("staking".to_string(), self.staking_ratio);
        self.current_allocation.insert(
            "stable_pools".to_string(),
            100 - self.staking_ratio
        );

        // Execute staking
        Promise::new(env::current_account_id())
            .stake(staking_amount, b"ed25519:4vJ9JU1bJJE96GRzKXTBe6wNymRLhXubNgoKb2TGKSrBPc4Qr8tZxGBvEv6KhuoiEqR9c4FxhJee2xiCYt6ZYe8S".to_vec())
    }

    fn execute_normal_strategy(&mut self, sentiment_score: u8) -> Promise {
        let allocation = if sentiment_score <= 25 {
            // Bearish
            vec![
                ("staking".to_string(), 50),
                ("stable_pools".to_string(), 50),
            ]
        } else if sentiment_score <= 74 {
            // Neutral
            vec![
                ("staking".to_string(), 30),
                ("stable_pools".to_string(), 40),
                ("near_pools".to_string(), 30),
            ]
        } else {
            // Bullish (75-100)
            vec![
                ("staking".to_string(), 20),
                ("near_pools".to_string(), 50),
                ("aurora_pools".to_string(), 30),
            ]
        };

        // Update allocation tracking
        self.current_allocation.clear();
        for (pool, percentage) in allocation {
            self.current_allocation.insert(pool, percentage as u8);
        }

        // Execute allocation
        self.execute_allocation()
    }

    fn execute_allocation(&self) -> Promise {
        let mut promise = Promise::new(env::current_account_id());
        
        for (pool_type, percentage) in self.current_allocation.iter() {
            let amount = env::account_balance() * *percentage as u128 / 100;
            
            match pool_type.as_str() {
                "staking" => {
                    promise = promise.stake(amount, b"ed25519:4vJ9JU1bJJE96GRzKXTBe6wNymRLhXubNgoKb2TGKSrBPc4Qr8tZxGBvEv6KhuoiEqR9c4FxhJee2xiCYt6ZYe8S".to_vec());
                }
                "stable_pools" | "near_pools" | "aurora_pools" => {
                    if let Some(_pool_contract) = self.allowed_pools.first() {
                        promise = promise.function_call(
                            "deposit".to_string().into_bytes(),
                            b"{}".to_vec(),
                            amount,
                            env::prepaid_gas() / 3,
                        );
                    }
                }
                _ => {}
            }
        }

        promise
    }

    // View methods
    pub fn get_current_allocation(&self) -> HashMap<String, u8> {
        self.current_allocation.clone()
    }

    pub fn get_safety_parameters(&self) -> (u8, u8) {
        (self.sentiment_threshold, self.staking_ratio)
    }

    // Owner methods
    #[payable]
    pub fn update_safety_parameters(
        &mut self,
        sentiment_threshold: u8,
        staking_ratio: u8,
    ) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only owner can update parameters"
        );
        assert!(sentiment_threshold <= 100, "Invalid sentiment threshold");
        assert!(staking_ratio <= 100, "Invalid staking ratio");

        self.sentiment_threshold = sentiment_threshold;
        self.staking_ratio = staking_ratio;
    }
}
