use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, Balance, PanicOnDefault};

#[derive(BorshDeserialize, BorshSerialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct PoolInfo {
    pub apy: u64,
    pub tvl: U128,
    pub risk_level: RiskLevel,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct InitArgs {
    pub owner_id: AccountId,
    pub min_apy: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct AutoRebalanceAgent {
    pub owner_id: AccountId,
    pub min_apy: u64,
    pub pools: UnorderedMap<String, PoolInfo>,
    pub current_pool: String,
    pub total_balance: Balance,
    pub balances: UnorderedMap<AccountId, Balance>,
}

#[near_bindgen]
impl AutoRebalanceAgent {
    #[init]
    pub fn new(args: InitArgs) -> Self {
        assert!(!env::state_exists(), "Contract already initialized");
        
        Self {
            owner_id: args.owner_id,
            min_apy: args.min_apy,
            pools: UnorderedMap::new(b"p"),
            current_pool: "default_pool".to_string(),
            total_balance: 0,
            balances: UnorderedMap::new(b"b"),
        }
    }

    pub fn set_min_apy(&mut self, min_apy: u64) {
        self.assert_owner();
        assert!(min_apy <= 10000, "APY cannot exceed maximum value"); // Max 100%
        self.min_apy = min_apy;
        env::log(format!("min_apy_updated: {}", min_apy).as_bytes());
    }

    pub fn get_min_apy(&self) -> u64 {
        self.min_apy
    }

    pub fn add_pool(&mut self, pool_id: String, info: PoolInfo) {
        self.assert_owner();
        assert!(!self.pools.get(&pool_id).is_some(), "Pool already exists");
        self.pools.insert(&pool_id, &info);
        env::log(format!("pool_added: {}", pool_id).as_bytes());
    }

    pub fn get_pool(&self, pool_id: &String) -> Option<PoolInfo> {
        self.pools.get(pool_id)
    }

    pub fn update_pool(&mut self, pool_id: String, info: PoolInfo) {
        self.assert_owner();
        assert!(self.pools.get(&pool_id).is_some(), "Pool not found");
        self.pools.insert(&pool_id, &info);
        env::log(format!("pool_updated: {}", pool_id).as_bytes());
    }

    pub fn get_current_pool(&self) -> String {
        self.current_pool.clone()
    }

    pub fn check_and_rebalance(&mut self) {
        let mut highest_apy = self.min_apy;
        let mut best_pool = self.current_pool.clone();

        for (pool_id, info) in self.pools.iter() {
            if info.apy > highest_apy {
                highest_apy = info.apy;
                best_pool = pool_id;
            }
        }

        if best_pool != self.current_pool {
            self.rebalance_to_pool(&best_pool);
        } else {
            env::log(b"no_rebalance_needed");
        }
    }

    pub fn rebalance_to_pool(&mut self, pool_id: &String) {
        assert!(self.pools.get(pool_id).is_some(), "Pool not found");
        self.current_pool = pool_id.clone();
        env::log(format!("rebalanced_to_pool: {}", pool_id).as_bytes());
    }

    #[payable]
    pub fn deposit(&mut self) {
        let account_id = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        
        let balance = self.balances.get(&account_id).unwrap_or(0);
        self.balances.insert(&account_id, &(balance + deposit));
        self.total_balance += deposit;
    }

    pub fn withdraw(&mut self, amount: U128) {
        let account_id = env::predecessor_account_id();
        let amount: u128 = amount.into();
        let balance = self.balances.get(&account_id).expect("No balance found");
        assert!(balance >= amount, "Insufficient balance");
        
        self.balances.insert(&account_id, &(balance - amount));
        self.total_balance -= amount;
        
        Promise::new(account_id).transfer(amount);
    }

    pub fn get_balance(&self, account_id: AccountId) -> U128 {
        U128(self.balances.get(&account_id).unwrap_or(0))
    }

    pub fn get_total_balance(&self) -> U128 {
        U128(self.total_balance)
    }

    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only contract owner can call this method"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;
    use std::convert::TryFrom;
}
