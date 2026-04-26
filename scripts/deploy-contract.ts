#!/usr/bin/env ts-node
/**
 * Deploy the Lumigift escrow contract to Stellar Testnet or Mainnet.
 *
 * Steps:
 *   1. Deploy WASM via `stellar contract deploy`
 *   2. Verify the deployment by calling `stellar contract invoke -- get_state`
 *      (expects EscrowError::NotInitialized = 4, which proves the contract
 *       is live and responding — it just hasn't been initialized yet)
 *   3. Write the contract ID to .contract-ids.json for environment tracking
 *   4. Log the Stellar Explorer URL for the deployed contract
 *
 * Usage:
 *   STELLAR_NETWORK=testnet ts-node scripts/deploy-contract.ts
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ─── Config ───────────────────────────────────────────────────────────────────

const network = process.env.STELLAR_NETWORK ?? "testnet";

const rpcUrl =
  network === "mainnet"
    ? "https://soroban-rpc.stellar.org"
    : "https://soroban-testnet.stellar.org";

const networkPassphrase =
  network === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015";

const explorerBase =
  network === "mainnet"
    ? "https://stellar.expert/explorer/public/contract"
    : "https://stellar.expert/explorer/testnet/contract";

const ROOT = path.resolve(__dirname, "..");

const wasmPath = path.resolve(
  ROOT,
  "contracts/target/wasm32-unknown-unknown/release/lumigift_escrow.wasm"
);

const contractIdsPath = path.resolve(ROOT, ".contract-ids.json");

// ─── Preflight checks ─────────────────────────────────────────────────────────

if (!fs.existsSync(wasmPath)) {
  console.error("❌ WASM not found. Run `npm run contract:build` first.");
  process.exit(1);
}

const secretKey = process.env.STELLAR_SERVER_SECRET_KEY;
if (!secretKey) {
  console.error("❌ Missing required environment variable: STELLAR_SERVER_SECRET_KEY");
  process.exit(1);
}

// Stellar secret keys are 56-character base32 strings starting with 'S'
if (!/^S[A-Z2-7]{55}$/.test(secretKey)) {
  console.error("❌ STELLAR_SERVER_SECRET_KEY does not match expected Stellar secret key format.");
  process.exit(1);
}

// ─── Step 1: Deploy ───────────────────────────────────────────────────────────

console.log(`\n🚀 Deploying escrow contract to ${network}…`);

const deployResult = spawnSync(
  "stellar",
  [
    "contract", "deploy",
    "--wasm", wasmPath,
    "--source", secretKey,
    "--rpc-url", rpcUrl,
    "--network-passphrase", networkPassphrase,
  ],
  { encoding: "utf-8", shell: false }
);

if (deployResult.error || deployResult.status !== 0) {
  console.error("❌ Deployment failed:", deployResult.stderr || deployResult.error?.message);
  process.exit(1);
}

const contractId = deployResult.stdout.trim();
if (!contractId) {
  console.error("❌ Deployment succeeded but no contract ID was returned.");
  process.exit(1);
}

console.log(`✅ Contract deployed: ${contractId}`);

// ─── Step 2: Verify ───────────────────────────────────────────────────────────
//
// Call `get_state` on the freshly deployed contract. Since it hasn't been
// initialized yet, the contract will return EscrowError::NotInitialized (code 4).
// Any response — including that error — proves the contract is live on-chain
// and the contract ID is correct. A hard CLI failure (non-zero exit with no
// contract-level error) means the contract is unreachable.

console.log("\n🔍 Verifying deployment via get_state…");

const verifyResult = spawnSync(
  "stellar",
  [
    "contract", "invoke",
    "--id", contractId,
    "--source", secretKey,
    "--rpc-url", rpcUrl,
    "--network-passphrase", networkPassphrase,
    "--",
    "get_state",
  ],
  { encoding: "utf-8", shell: false }
);

// A contract-level error (EscrowError::NotInitialized) is returned on stdout
// as a JSON error object and the CLI exits with a non-zero status.
// We accept that as a successful verification — it means the contract exists
// and is executing. We only fail if the CLI itself errors (network issue,
// bad contract ID, etc.) without producing any contract output.
const hasContractOutput =
  verifyResult.stdout.trim().length > 0 || verifyResult.stderr.includes("HostError");

if (verifyResult.error) {
  // CLI couldn't even run — treat as hard failure
  console.error("❌ Verification failed (CLI error):", verifyResult.error.message);
  process.exit(1);
}

if (!hasContractOutput) {
  console.error(
    "❌ Verification failed — no response from contract.",
    "\n   stdout:", verifyResult.stdout,
    "\n   stderr:", verifyResult.stderr
  );
  process.exit(1);
}

console.log("✅ Contract is live and responding on-chain.");

// ─── Step 3: Write .contract-ids.json ────────────────────────────────────────

const deployedAt = new Date().toISOString();

// Merge with any existing entries so we don't overwrite other networks
let existing: Record<string, unknown> = {};
if (fs.existsSync(contractIdsPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(contractIdsPath, "utf-8"));
  } catch {
    console.warn("⚠️  Could not parse existing .contract-ids.json — overwriting.");
  }
}

const updated = {
  ...existing,
  [network]: {
    escrow: contractId,
    deployedAt,
  },
};

fs.writeFileSync(contractIdsPath, JSON.stringify(updated, null, 2) + "\n", "utf-8");
console.log(`\n📄 Contract ID written to .contract-ids.json`);

// ─── Step 4: Explorer URL ─────────────────────────────────────────────────────

const explorerUrl = `${explorerBase}/${contractId}`;
console.log(`\n🔗 Stellar Explorer: ${explorerUrl}`);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`
─────────────────────────────────────────────────
  Network:     ${network}
  Contract ID: ${contractId}
  Deployed at: ${deployedAt}
  Explorer:    ${explorerUrl}
─────────────────────────────────────────────────

Add to .env:
  STELLAR_ESCROW_CONTRACT_ID=${contractId}
`);
