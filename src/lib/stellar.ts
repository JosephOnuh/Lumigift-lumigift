import {
  Horizon,
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";
import { serverConfig } from "@/server/config";
import type { StellarAccount, StellarBalance } from "@/types";

const server = new Horizon.Server(serverConfig.stellar.horizonUrl);

const USDC = new Asset(serverConfig.usdc.assetCode, serverConfig.usdc.issuer);

const networkPassphrase =
  serverConfig.stellar.network === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

/** Load a Stellar account. */
export async function loadAccount(publicKey: string): Promise<StellarAccount> {
  const account = await server.loadAccount(publicKey);
  const balances: StellarBalance[] = account.balances.map((b) => ({
    assetCode: b.asset_type === "native" ? "XLM" : (b as { asset_code: string }).asset_code,
    assetIssuer:
      b.asset_type !== "native" ? (b as { asset_issuer: string }).asset_issuer : undefined,
    balance: b.balance,
  }));
  return { publicKey, sequence: account.sequence, balances };
}

/** Get USDC balance for an account. Returns "0" if no trustline. */
export async function getUsdcBalance(publicKey: string): Promise<string> {
  try {
    const account = await loadAccount(publicKey);
    const usdcBalance = account.balances.find(
      (b) => b.assetCode === serverConfig.usdc.assetCode
    );
    return usdcBalance?.balance ?? "0";
  } catch {
    return "0";
  }
}

/** Build and submit a USDC payment from the server escrow account. */
export async function sendUsdcPayment(
  destinationPublicKey: string,
  amount: string
): Promise<string> {
  const serverKeypair = Keypair.fromSecret(serverConfig.stellar.serverSecretKey);
  const sourceAccount = await server.loadAccount(serverKeypair.publicKey());

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset: USDC,
        amount,
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(serverKeypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

/** Establish a USDC trustline for a new account keypair. */
export async function establishUsdcTrustline(secretKey: string): Promise<string> {
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

export { server as horizonServer, USDC, networkPassphrase };
