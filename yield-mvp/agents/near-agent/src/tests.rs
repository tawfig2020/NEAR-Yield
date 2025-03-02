use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::{testing_env, AccountId, Balance, Gas, Promise};
use near_sdk::json_types::U128;
use near_sdk::env;

use crate::*;

const NEAR: Balance = 1_000_000_000_000_000_000_000_000; // 1 NEAR in yoctoNEAR

pub fn setup_contract() -> (AutoRebalanceAgent, AccountId) {
    let owner = accounts(0);
    let contract = AutoRebalanceAgent::new(InitArgs {
        owner_id: owner.clone(),
        min_apy: 500, // 5% APY
    });
    (contract, owner)
}

fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(accounts(0))
        .signer_account_id(predecessor_account_id.clone())
        .predecessor_account_id(predecessor_account_id)
        .attached_deposit(0)
        .prepaid_gas(Gas(10u64.pow(18)));
    builder
}

#[test]
fn test_new_contract() {
    let owner = accounts(0);
    let contract = AutoRebalanceAgent::new(InitArgs {
        owner_id: owner.clone(),
        min_apy: 500,
    });
    assert_eq!(contract.owner_id, owner);
    assert_eq!(contract.min_apy, 500);
}

#[test]
fn test_set_min_apy_zero() {
    let (mut contract, owner) = setup_contract();
    let mut context = get_context(owner);
    testing_env!(context.build());
    
    contract.set_min_apy(0);
    assert_eq!(contract.min_apy, 0);
}

#[test]
#[should_panic(expected = "APY cannot exceed maximum value")]
fn test_set_min_apy_overflow() {
    let (mut contract, owner) = setup_contract();
    let mut context = get_context(owner);
    testing_env!(context.build());
    
    contract.set_min_apy(10001); // Over 100% APY
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_reinitialization_attack() {
    let (contract, _) = setup_contract();
    let attacker = accounts(1);
    let context = get_context(attacker);
    testing_env!(context.build());
    
    // Attempt to reinitialize
    contract.new(InitArgs {
        owner_id: attacker,
        min_apy: 1000,
    });
}

#[test]
fn test_min_apy_update_emits_event() {
    let (mut contract, owner) = setup_contract();
    let context = get_context(owner);
    testing_env!(context.build());
    
    contract.set_min_apy(700);
    let logs = env::logs();
    assert!(logs.iter().any(|log| log.contains("min_apy_updated")));
}

#[test]
fn test_auto_compound_gas_usage() {
    let (mut contract, owner) = setup_contract();
    let context = get_context(owner);
    testing_env!(context.build());
    
    let initial_gas = env::used_gas();
    contract.check_and_rebalance();
    let gas_used = env::used_gas() - initial_gas;
    
    // Ensure gas usage is within reasonable limits (100T gas)
    assert!(gas_used < Gas(100_000_000_000_000));
}

#[test]
fn test_implicit_account_initialization() {
    let implicit_account: AccountId = "98773ab12dc3b2367b678f98726d89e87319872ab673.near".parse().unwrap();
    let contract = AutoRebalanceAgent::new(InitArgs {
        owner_id: implicit_account.clone(),
        min_apy: 500,
    });
    assert_eq!(contract.owner_id, implicit_account);
}

#[test]
fn test_owner_only_functions() {
    let (mut contract, _) = setup_contract();
    
    // Test with non-owner
    let non_owner = accounts(1);
    let context = get_context(non_owner);
    testing_env!(context.build());
    
    let result = std::panic::catch_unwind(|| {
        contract.set_min_apy(1000);
    });
    assert!(result.is_err());
}

#[test]
fn test_add_pool() {
    let (mut contract, owner) = setup_contract();
    let context = get_context(owner);
    testing_env!(context.build());

    let pool_id = "test.near".to_string();
    contract.add_pool(pool_id.clone(), PoolInfo {
        apy: 1000,
        tvl: U128(1_000_000),
        risk_level: RiskLevel::Medium,
    });

    let pool = contract.get_pool(&pool_id);
    assert!(pool.is_some());
    let pool_info = pool.unwrap();
    assert_eq!(pool_info.apy, 1000);
}

#[test]
fn test_check_and_rebalance() {
    let (mut contract, owner) = setup_contract();
    let context = get_context(owner);
    testing_env!(context.build());

    // Add test pools
    contract.add_pool("safe_pool.near".to_string(), PoolInfo {
        apy: 500,
        tvl: U128(1_000_000),
        risk_level: RiskLevel::Low,
    });

    contract.add_pool("risky_pool.near".to_string(), PoolInfo {
        apy: 2000,
        tvl: U128(1_000_000),
        risk_level: RiskLevel::High,
    });

    // Test rebalancing logic
    contract.check_and_rebalance();
    
    // Should move to the higher APY pool
    assert_eq!(contract.get_current_pool(), "risky_pool.near");
}

#[test]
fn test_deposit_and_withdrawal() {
    let (mut contract, owner) = setup_contract();
    let mut context = get_context(owner.clone());
    context.attached_deposit(NEAR);
    testing_env!(context.build());

    // Test deposit
    contract.deposit();
    assert_eq!(contract.get_balance(owner.clone()), U128(NEAR));
    assert_eq!(contract.get_total_balance(), U128(NEAR));

    // Test withdrawal
    contract.withdraw(U128(NEAR));
    assert_eq!(contract.get_balance(owner.clone()), U128(0));
    assert_eq!(contract.get_total_balance(), U128(0));
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_withdrawal_insufficient_balance() {
    let (mut contract, owner) = setup_contract();
    let context = get_context(owner);
    testing_env!(context.build());

    contract.withdraw(U128(NEAR)); // Try to withdraw without depositing
}

#[test]
fn test_multiple_users() {
    let (mut contract, _) = setup_contract();
    let user1 = accounts(1);
    let user2 = accounts(2);

    // User 1 deposit
    let mut context = get_context(user1.clone());
    context.attached_deposit(NEAR);
    testing_env!(context.build());
    contract.deposit();

    // User 2 deposit
    let mut context = get_context(user2.clone());
    context.attached_deposit(NEAR * 2);
    testing_env!(context.build());
    contract.deposit();

    // Check balances
    assert_eq!(contract.get_balance(user1), U128(NEAR));
    assert_eq!(contract.get_balance(user2), U128(NEAR * 2));
    assert_eq!(contract.get_total_balance(), U128(NEAR * 3));
}

#[test]
fn test_update_pool() {
    let (mut contract, owner) = setup_contract();
    let context = get_context(owner);
    testing_env!(context.build());

    // Add initial pool
    let pool_id = "test.near".to_string();
    contract.add_pool(pool_id.clone(), PoolInfo {
        apy: 1000,
        tvl: U128(1_000_000),
        risk_level: RiskLevel::Medium,
    });

    // Update pool
    contract.update_pool(pool_id.clone(), PoolInfo {
        apy: 1500,
        tvl: U128(2_000_000),
        risk_level: RiskLevel::High,
    });

    // Verify update
    let pool = contract.get_pool(&pool_id).unwrap();
    assert_eq!(pool.apy, 1500);
    assert_eq!(pool.tvl, U128(2_000_000));
    match pool.risk_level {
        RiskLevel::High => (),
        _ => panic!("Risk level should be High"),
    }
}

#[test]
#[should_panic(expected = "Pool not found")]
fn test_update_nonexistent_pool() {
    let (mut contract, owner) = setup_contract();
    let context = get_context(owner);
    testing_env!(context.build());

    contract.update_pool("nonexistent.near".to_string(), PoolInfo {
        apy: 1000,
        tvl: U128(1_000_000),
        risk_level: RiskLevel::Medium,
    });
}
