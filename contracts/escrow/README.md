# Lumigift Escrow Contract

Soroban smart contract that time-locks USDC for a recipient until a predetermined timestamp.

## Error Codes

| Variant | Code | Description |
|---|---|---|
| `AlreadyInitialized` | 1 | `initialize` was called on a contract that is already set up |
| `AlreadyClaimed` | 2 | `claim` was called after the funds were already claimed |
| `StillLocked` | 3 | `claim` was called before `unlock_time` has passed |
| `NotInitialized` | 4 | A function requiring state was called before `initialize` |
| `Unauthorized` | 5 | Reserved for future access-control checks |
| `AlreadyCancelled` | 6 | Reserved for future cancellation logic |

## Functions

### `initialize(sender, recipient, token, amount, unlock_time) → Result<(), EscrowError>`

Deploys escrow state and transfers `amount` of `token` from `sender` into the contract.
Fails with `AlreadyInitialized` if called more than once.

### `claim() → Result<(), EscrowError>`

Transfers the locked funds to `recipient`. Requires:
- Caller is `recipient`
- Current ledger timestamp ≥ `unlock_time`
- Funds have not already been claimed

### `get_state() → Result<(Address, i128, u64, bool), EscrowError>`

Returns `(recipient, amount, unlock_time, claimed)`. Fails with `NotInitialized` if the contract has not been set up.
