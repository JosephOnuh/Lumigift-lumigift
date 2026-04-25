# Local Development Setup Guide

This guide walks you through setting up Lumigift on your local machine from scratch.

---

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Node.js | 20 | [nodejs.org](https://nodejs.org) |
| npm | 10 | bundled with Node.js |
| Git | any | [git-scm.com](https://git-scm.com) |
| Docker & Docker Compose | any | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Rust + Cargo | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` |
| Stellar CLI | latest | see [Stellar CLI docs](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) |

> **Windows users:** all commands below assume **WSL 2** (Ubuntu 22.04 recommended).  
> Install WSL: `wsl --install` in an elevated PowerShell, then reopen a WSL terminal.

---

## 1. Clone and install dependencies

```bash
git clone https://github.com/JosephOnuh/Lumigift-lumigift.git
cd Lumigift-lumigift
npm install
```

---

## 2. Start backing services (Redis + PostgreSQL)

The project ships a `docker-compose.yml` for Redis. Add PostgreSQL alongside it:

```bash
# Start Redis (already in docker-compose.yml)
docker compose up -d

# Start PostgreSQL separately (or add it to docker-compose.yml)
docker run -d \
  --name lumigift-postgres \
  -e POSTGRES_USER=lumigift \
  -e POSTGRES_PASSWORD=lumigift \
  -e POSTGRES_DB=lumigift \
  -p 5432:5432 \
  postgres:16-alpine
```

Verify both are running:

```bash
docker ps          # should show redis and postgres containers
redis-cli ping     # → PONG
psql postgresql://lumigift:lumigift@localhost:5432/lumigift -c '\l'
```

---

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values described in the sections below.

### 3a. Core app

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
```

### 3b. Database

```env
DATABASE_URL=postgresql://lumigift:lumigift@localhost:5432/lumigift
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=10000
DB_CONNECTION_TIMEOUT_MS=5000
```

### 3c. Redis

```env
REDIS_URL=redis://localhost:6379
```

### 3d. Stellar testnet account

See [Section 4](#4-create-a-stellar-testnet-account) for how to obtain these values.

```env
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SERVER_SECRET_KEY=<your testnet secret key>
STELLAR_ESCROW_CONTRACT_ID=<deployed contract id — see Section 6>
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
USDC_ASSET_CODE=USDC
```

### 3e. Paystack sandbox

See [Section 5](#5-set-up-paystack-sandbox) for how to obtain these values.

```env
PAYSTACK_SECRET_KEY=sk_test_<your_key>
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_<your_key>
```

### 3f. SMS (Termii)

Sign up at [termii.com](https://termii.com) and grab a free trial API key.

```env
TERMII_API_KEY=<your_termii_api_key>
TERMII_SENDER_ID=Lumigift
```

### 3g. Cron secret

```env
CRON_SECRET=<run: openssl rand -base64 32>
```

### 3h. Cloudinary (optional — only needed for gift media uploads)

```env
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

---

## 4. Create a Stellar testnet account

### macOS / Linux / WSL

```bash
# Install Stellar CLI if you haven't already
cargo install --locked stellar-cli --features opt

# Generate a new keypair
stellar keys generate --global lumigift-dev --network testnet

# Print the public key
stellar keys address lumigift-dev

# Fund it from the testnet friendbot (free XLM)
stellar keys fund lumigift-dev --network testnet
```

Alternatively, use the web friendbot:

```
https://friendbot.stellar.org/?addr=<YOUR_PUBLIC_KEY>
```

Copy the **secret key** into `STELLAR_SERVER_SECRET_KEY`:

```bash
stellar keys show lumigift-dev   # prints the secret key — keep it safe
```

### Establish a USDC trustline

The server account must trust the testnet USDC asset before it can hold or send USDC:

```bash
stellar tx new change-trust \
  --source-account lumigift-dev \
  --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 \
  --network testnet \
  --sign \
  --submit
```

### Fund with testnet USDC

Use the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test) or the testnet USDC faucet to send USDC to your account.

---

## 5. Set up Paystack sandbox

1. Sign up at [paystack.com](https://paystack.com) (free).
2. In the dashboard, switch to **Test mode** (toggle in the top-right).
3. Go to **Settings → API Keys & Webhooks**.
4. Copy the **Test Secret Key** (`sk_test_…`) → `PAYSTACK_SECRET_KEY`.
5. Copy the **Test Public Key** (`pk_test_…`) → `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.

**Test card numbers** (use these in the checkout flow):

| Card number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4084 0840 8408 4081 | 408 | 01/99 | Success |
| 4084 0840 8408 4081 | 408 | 01/99 | Declined (use wrong CVV) |

---

## 6. Run database migrations

```bash
# Apply all migrations in order
for f in migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

---

## 7. Build and deploy the escrow contract (optional for frontend work)

```bash
# Add the wasm32 target if you haven't already
rustup target add wasm32-unknown-unknown

# Build the contract WASM
npm run contract:build

# Run Rust unit tests
npm run contract:test

# Deploy to testnet and copy the printed contract ID into STELLAR_ESCROW_CONTRACT_ID
STELLAR_NETWORK=testnet npm run contract:deploy
```

---

## 8. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 9. Run the test suite

```bash
npm test                  # unit tests (Jest)
npm run test:coverage     # with coverage report
npm run contract:test     # Rust / Soroban tests
```

---

## Troubleshooting

### `ECONNREFUSED` connecting to Redis

Redis is not running. Start it:

```bash
docker compose up -d
```

### `ECONNREFUSED` connecting to PostgreSQL

The Postgres container is not running:

```bash
docker start lumigift-postgres
# or re-run the docker run command from Section 2
```

### `Error: connect ECONNREFUSED 127.0.0.1:5432` in tests

Tests that hit the DB need a running Postgres. Alternatively, mock `@/lib/db` in your test file:

```ts
jest.mock("@/lib/db", () => ({ query: jest.fn() }));
```

### Stellar `op_no_trust` error

Your server account does not have a USDC trustline. Re-run the `change-trust` command in [Section 4](#4-create-a-stellar-testnet-account).

### Stellar `tx_insufficient_balance`

Your testnet account is out of XLM. Re-fund it:

```bash
stellar keys fund lumigift-dev --network testnet
```

### `Invalid OTP` in local testing

OTPs are sent via Termii SMS. In local dev you can read the OTP directly from Redis:

```bash
redis-cli get "otp:+2348012345678"
```

### `next: command not found` after `npm install`

Run `npm install` again, or use `npx next dev` instead of `npm run dev`.

### Port 3000 already in use

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

### WSL-specific: Docker Desktop not running

Make sure Docker Desktop is running on Windows and WSL integration is enabled:  
**Docker Desktop → Settings → Resources → WSL Integration → enable your distro**.

---

## Useful commands reference

```bash
npm run dev              # start Next.js dev server
npm run build            # production build
npm run lint             # ESLint
npm run type-check       # TypeScript type check
npm run format           # Prettier
npm test                 # Jest unit tests
npm run contract:build   # build Soroban WASM
npm run contract:test    # Rust tests
npm run contract:deploy  # deploy to testnet
docker compose up -d     # start Redis
docker compose down      # stop Redis
```
