#!/usr/bin/env ts-node
/**
 * Deploy the Lumigift escrow contract to Stellar Testnet or Mainnet.
 *
 * Usage:
 *   STELLAR_NETWORK=testnet ts-node scripts/deploy-contract.ts
 */

import { execSync } from "child_process";
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

console.log(`Deploying to ${network}…`);

const result = execSync(
  `stellar contract deploy \
    --wasm ${wasmPath} \
    --source ${process.env.STELLAR_SERVER_SECRET_KEY} \
    --rpc-url ${rpcUrl} \
    --network-passphrase "${networkPassphrase}"`,
  { encoding: "utf-8" }
);

const contractId = result.trim();
console.log(`✅ Contract deployed: ${contractId}`);
console.log(`Add to .env: STELLAR_ESCROW_CONTRACT_ID=${contractId}`);
