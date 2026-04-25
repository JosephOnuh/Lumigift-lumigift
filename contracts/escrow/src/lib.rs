//! Lumigift Escrow Contract
//!
//! Locks USDC for a recipient until a predetermined timestamp.
//! Only the designated recipient can claim after the unlock time.
//!
//! # USDC Contract Addresses
//!
//! - **Mainnet:** `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
//!   (Circle USDC on Stellar mainnet)
//! - **Testnet:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
//!   (Circle USDC on Stellar testnet)

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracterror, contracttype, token, Address, Env, Symbol,
};

// ─── Error enum ───────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AlreadyInitialized = 1,
    AlreadyClaimed     = 2,
    StillLocked        = 3,
    NotInitialized     = 4,
    Unauthorized       = 5,
    AlreadyCancelled   = 6,
    InvalidAmount      = 7,
}

/// Minimum escrow amount: 1 USDC expressed in stroops (7 decimal places).
const MIN_AMOUNT: i128 = 10_000_000;

// ─── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Sender,
    Recipient,
    Token,
    Amount,
    UnlockTime,
    Claimed,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initialize the escrow. Called once by the platform after deploying.
    pub fn initialize(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        amount: i128,
        unlock_time: u64,
    ) -> Result<(), EscrowError> {
        if env.storage().instance().has(&DataKey::Sender) {
            return Err(EscrowError::AlreadyInitialized);
        }

        if amount < MIN_AMOUNT {
            return Err(EscrowError::InvalidAmount);
        }

        // Reject any token that is not the expected USDC contract
        if token != expected_usdc {
            panic!("token must be the USDC contract");
        }

        sender.require_auth();

        env.storage().instance().set(&DataKey::Sender, &sender);
        env.storage().instance().set(&DataKey::Recipient, &recipient);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::UnlockTime, &unlock_time);
        env.storage().instance().set(&DataKey::Claimed, &false);

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        env.events().publish(
            (Symbol::new(&env, "initialized"),),
            (sender, recipient, amount, unlock_time),
        );

        Ok(())
    }

    /// Claim the escrowed funds. Only callable by the recipient after unlock_time.
    pub fn claim(env: Env) -> Result<(), EscrowError> {
        let recipient: Address = env
            .storage()
            .instance()
            .get(&DataKey::Recipient)
            .ok_or(EscrowError::NotInitialized)?;

        recipient.require_auth();

        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);

        if claimed {
            return Err(EscrowError::AlreadyClaimed);
        }

        let unlock_time: u64 = env
            .storage()
            .instance()
            .get(&DataKey::UnlockTime)
            .ok_or(EscrowError::NotInitialized)?;

        if env.ledger().timestamp() < unlock_time {
            return Err(EscrowError::StillLocked);
        }

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(EscrowError::NotInitialized)?;

        let amount: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Amount)
            .ok_or(EscrowError::NotInitialized)?;

        env.storage().instance().set(&DataKey::Claimed, &true);

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        env.events().publish(
            (Symbol::new(&env, "claimed"),),
            (recipient, amount),
        );

        Ok(())
    }

    /// Read-only: returns (recipient, amount, unlock_time, claimed).
    pub fn get_state(env: Env) -> Result<(Address, i128, u64, bool), EscrowError> {
        let recipient: Address = env
            .storage()
            .instance()
            .get(&DataKey::Recipient)
            .ok_or(EscrowError::NotInitialized)?;
        let amount: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Amount)
            .ok_or(EscrowError::NotInitialized)?;
        let unlock_time: u64 = env
            .storage()
            .instance()
            .get(&DataKey::UnlockTime)
            .ok_or(EscrowError::NotInitialized)?;
        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);

        Ok((recipient, amount, unlock_time, claimed))
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Env,
    };

    fn create_token(env: &Env, admin: &Address) -> (Address, TokenClient, StellarAssetClient) {
        let token_id = env.register_stellar_asset_contract(admin.clone());
        let token = TokenClient::new(env, &token_id);
        let token_admin = StellarAssetClient::new(env, &token_id);
        (token_id, token, token_admin)
    }

    #[test]
    fn test_initialize_and_claim() {
        let env = Env::default();
        env.mock_all_auths();

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let (token_id, token, token_admin) = create_token(&env, &sender);

        token_admin.mint(&sender, &100_000_000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&sender, &recipient, &token_id, &100_000_000, &1_000);
        env.ledger().with_mut(|l| l.timestamp = 1_001);
        client.claim();

        assert_eq!(token.balance(&recipient), 100_000_000);
    }

    #[test]
    fn test_double_initialize_returns_error() {
        let env = Env::default();
        env.mock_all_auths();

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let (token_id, _, token_admin) = create_token(&env, &sender);
        token_admin.mint(&sender, &200_000_000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&sender, &recipient, &token_id, &100_000_000, &1_000);

        let err = client
            .try_initialize(&sender, &recipient, &token_id, &100_000_000, &1_000)
            .unwrap_err()
            .unwrap();
        assert_eq!(err, EscrowError::AlreadyInitialized);
    }

    #[test]
    fn test_claim_before_unlock_returns_error() {
        let env = Env::default();
        env.mock_all_auths();

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let (token_id, _, token_admin) = create_token(&env, &sender);
        token_admin.mint(&sender, &100_000_000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&sender, &recipient, &token_id, &100_000_000, &9_999_999);

        let err = client.try_claim().unwrap_err().unwrap();
        assert_eq!(err, EscrowError::StillLocked);
    }

    #[test]
    fn test_double_claim_returns_error() {
        let env = Env::default();
        env.mock_all_auths();

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let (token_id, _, token_admin) = create_token(&env, &sender);
        token_admin.mint(&sender, &100_000_000);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        client.initialize(&sender, &recipient, &token_id, &100_000_000, &1_000);
        env.ledger().with_mut(|l| l.timestamp = 1_001);
        client.claim();

        let err = client.try_claim().unwrap_err().unwrap();
        assert_eq!(err, EscrowError::AlreadyClaimed);
    }

    #[test]
    fn test_get_state_not_initialized_returns_error() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        let err = client.try_get_state().unwrap_err().unwrap();
        assert_eq!(err, EscrowError::NotInitialized);
    }

    #[test]
    fn test_initialize_zero_amount_returns_invalid_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let (token_id, _, _) = create_token(&env, &sender);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        let err = client
            .try_initialize(&sender, &recipient, &token_id, &0, &1_000)
            .unwrap_err()
            .unwrap();
        assert_eq!(err, EscrowError::InvalidAmount);
    }

    #[test]
    fn test_initialize_below_minimum_amount_returns_invalid_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let (token_id, _, token_admin) = create_token(&env, &sender);
        token_admin.mint(&sender, &9_999_999);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        // 9_999_999 stroops = just under 1 USDC minimum
        let err = client
            .try_initialize(&sender, &recipient, &token_id, &9_999_999, &1_000)
            .unwrap_err()
            .unwrap();
        assert_eq!(err, EscrowError::InvalidAmount);
    }
}

// ─── Property-based tests ─────────────────────────────────────────────────────
//
// Each proptest! block runs at least 1 000 cases (proptest default).
// The four properties below map directly to the acceptance criteria in issue #109.

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Env,
    };

    // ── helpers ──────────────────────────────────────────────────────────────

    fn setup_initialized_escrow(
        amount: i128,
        unlock_time: u64,
    ) -> (Env, Address, TokenClient, EscrowContractClient) {
        let env = Env::default();
        env.mock_all_auths();

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(sender.clone());
        let token = TokenClient::new(&env, &token_id);
        let token_admin = StellarAssetClient::new(&env, &token_id);
        token_admin.mint(&sender, &amount);

        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);
        client.initialize(&sender, &recipient, &token_id, &amount, &unlock_time);

        (env, recipient, token, client)
    }

    // ── Property 1 ───────────────────────────────────────────────────────────
    // After a successful claim the contract's token balance is always 0.

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(1_000))]
        #[test]
        fn prop_balance_zero_after_claim(
            amount    in MIN_AMOUNT..=1_000_000_000_i128,
            unlock_time in 1u64..=1_000_000u64,
        ) {
            let (env, _recipient, token, client) =
                setup_initialized_escrow(amount, unlock_time);

            // Advance ledger past unlock_time so the claim succeeds
            env.ledger().with_mut(|l| l.timestamp = unlock_time);
            client.claim();

            let contract_balance = token.balance(&client.address);
            prop_assert_eq!(
                contract_balance, 0,
                "contract balance must be 0 after claim, got {contract_balance}"
            );
        }
    }

    // ── Property 2 ───────────────────────────────────────────────────────────
    // The amount received by the recipient always equals the initialized amount.

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(1_000))]
        #[test]
        fn prop_claimed_amount_equals_initialized_amount(
            amount    in MIN_AMOUNT..=1_000_000_000_i128,
            unlock_time in 1u64..=1_000_000u64,
        ) {
            let (env, recipient, token, client) =
                setup_initialized_escrow(amount, unlock_time);

            let balance_before = token.balance(&recipient);

            env.ledger().with_mut(|l| l.timestamp = unlock_time);
            client.claim();

            let received = token.balance(&recipient) - balance_before;
            prop_assert_eq!(
                received, amount,
                "recipient received {received} but expected {amount}"
            );
        }
    }

    // ── Property 3 ───────────────────────────────────────────────────────────
    // Claim always fails with StillLocked when ledger timestamp < unlock_time.

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(1_000))]
        #[test]
        fn prop_claim_fails_before_unlock(
            amount      in MIN_AMOUNT..=1_000_000_000_i128,
            unlock_time in 2u64..=u64::MAX / 2,
            // ledger_ts is strictly less than unlock_time
            ledger_ts   in 0u64..=1u64,
        ) {
            // Map ledger_ts into [0, unlock_time - 1]
            let ledger_ts = ledger_ts % unlock_time; // always < unlock_time

            let (env, _recipient, _token, client) =
                setup_initialized_escrow(amount, unlock_time);

            env.ledger().with_mut(|l| l.timestamp = ledger_ts);

            let err = client.try_claim().unwrap_err().unwrap();
            prop_assert_eq!(
                err,
                EscrowError::StillLocked,
                "expected StillLocked at ts={ledger_ts}, unlock={unlock_time}"
            );
        }
    }

    // ── Property 4 ───────────────────────────────────────────────────────────
    // A second call to initialize always fails with AlreadyInitialized.

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(1_000))]
        #[test]
        fn prop_double_initialize_always_fails(
            amount      in MIN_AMOUNT..=1_000_000_000_i128,
            unlock_time in 0u64..=u64::MAX / 2,
            amount2     in MIN_AMOUNT..=1_000_000_000_i128,
            unlock_time2 in 0u64..=u64::MAX / 2,
        ) {
            let env = Env::default();
            env.mock_all_auths();

            let sender = Address::generate(&env);
            let recipient = Address::generate(&env);
            let token_id = env.register_stellar_asset_contract(sender.clone());
            let token_admin = StellarAssetClient::new(&env, &token_id);
            // Mint enough for both initialize calls
            token_admin.mint(&sender, &(amount + amount2));

            let contract_id = env.register_contract(None, EscrowContract);
            let client = EscrowContractClient::new(&env, &contract_id);

            // First initialize must succeed
            client.initialize(&sender, &recipient, &token_id, &amount, &unlock_time);

            // Second initialize must always fail regardless of arguments
            let err = client
                .try_initialize(&sender, &recipient, &token_id, &amount2, &unlock_time2)
                .unwrap_err()
                .unwrap();

            prop_assert_eq!(
                err,
                EscrowError::AlreadyInitialized,
                "expected AlreadyInitialized on second call"
            );
        }
    }
}
