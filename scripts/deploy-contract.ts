#!/usr/bin/env ts-node
/**
 * Deploy the Lumigift escrow contract to Stellar Testnet or Mainnet.
 *
 * Usage:
 *   STELLAR_NETWORK=testnet ts-node scripts/deploy-contract.ts
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const network = process.env.STELLAR_NETWORK ?? "testnet";
const rpcUrl =
  network === "mainnet"
    ? "https://soroban-rpc.stellar.org"
    : "https://soroban-testnet.stellar.org";

const networkPassphrase =
  network === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015";

const wasmPath = path.resolve(
  __dirname,
  "../contracts/target/wasm32-unknown-unknown/release/lumigift_escrow.wasm"
);

if (!fs.existsSync(wasmPath)) {
  console.error("WASM not found. Run `npm run contract:build` first.");
  process.exit(1);
}

const secretKey = process.env.STELLAR_SERVER_SECRET_KEY;
if (!secretKey) {
  console.error("Missing required environment variable: STELLAR_SERVER_SECRET_KEY");
  process.exit(1);
}

// Stellar secret keys are 56-character base32 strings starting with 'S'
if (!/^S[A-Z2-7]{55}$/.test(secretKey)) {
  console.error("STELLAR_SERVER_SECRET_KEY does not match expected Stellar secret key format.");
  process.exit(1);
}

console.log(`Deploying to ${network}…`);

// Use spawnSync with an args array — the secret key is passed as a discrete
// argument and never interpolated into a shell string, preventing injection.
const result = spawnSync(
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

if (result.error || result.status !== 0) {
  console.error("Deployment failed:", result.stderr || result.error?.message);
  process.exit(1);
}

const contractId = result.stdout.trim();
console.log(`✅ Contract deployed: ${contractId}`);
console.log(`Add to .env: STELLAR_ESCROW_CONTRACT_ID=${contractId}`);
