# BitPredict — Prediction Markets on Bitcoin L1

> **OP_NET Vibecoding Challenge — Week 3: "The Breakthrough"** | `#opnetvibecode` | [@opnetbtc](https://x.com/opnetbtc)

![Bitcoin](https://img.shields.io/badge/Bitcoin-L1-orange?style=for-the-badge&logo=bitcoin)
![OP_NET](https://img.shields.io/badge/OP__NET-Powered-blue?style=for-the-badge)
![Live](https://img.shields.io/badge/Status-Live_on_Testnet-green?style=for-the-badge)
![Contracts](https://img.shields.io/badge/Contracts-5_Deployed-purple?style=for-the-badge)

---

## What is BitPredict?

BitPredict is a **fully on-chain prediction market** running natively on **Bitcoin Layer 1** through OP_NET. Users bet on real-world outcomes — crypto prices, politics, sports, tech — using **WBTC** (wrapped BTC). Every bet, stake, and claim is a real Bitcoin transaction.

**This is the first prediction market ever built on Bitcoin L1.** No Ethereum. No L2. Just Bitcoin.

### Why Bitcoin Needs This

- **$2T+ in BTC** sits idle with zero DeFi options on L1
- Prediction markets (Polymarket, Kalshi) are booming — **$1B+ monthly volume** — but none on Bitcoin
- OP_NET unlocks smart contracts on Bitcoin without sacrificing security
- BitPredict brings this $1B market to the most trusted blockchain

---

## Live Demo

| | Link |
|---|---|
| **App** | [bitpredict.club](https://bitpredict.club) |
| **GitHub** | [github.com/BitPredictt/BitPredict](https://github.com/BitPredictt/BitPredict) |

### Deployed Contracts (OP_NET Testnet)

| Contract | Address | Purpose |
|---|---|---|
| **PredictionMarket** | `opt1sqzpqfn6cr5fjzp2crfemjyqg4p9w0fve5vp99r5r` | Parimutuel betting engine |
| **WBTC** | `opt1sqzymwwcv446449k8ntgzw3mw5qvv3e77mskm2ry2` | NativeSwap BTC wrapper |
| **StakingVault** | `opt1sqqxqss2hqn7hn5xhkv7fzupvn6u3yq7puuypj3uv` | Stake WBTC, earn fees |
| **Treasury** | `opt1sqr2tt0qyz2p2azjhvtp5kusl08j60mz4ss5rkudm` | Protocol fee collection |
| **PriceOracle** | `opt1sqq6cuxydx96fy3eerrxm6q6een27737ahu0n0jn2` | BTC/ETH/SOL price feeds |

---

## How It Works

```
User places bet → WBTC approved → placeBet() on-chain → funds locked in contract
                                                          ↓
Market resolves → Oracle sets outcome → Winners call claimPayout() → WBTC returned
                                                          ↓
                                        2% fee split: 40% vault stakers
                                                      40% protocol
                                                      20% market creator
```

### Parimutuel Model

Unlike AMM-based prediction markets, BitPredict uses a **parimutuel** system (same as horse racing, Polymarket):

- All bets pool together per side (YES/NO)
- Odds determined by total money on each side
- Winners split the entire pool proportionally
- No counterparty risk — the contract holds all funds
- No liquidity providers needed

### On-Chain Bet Flow (3 Steps)

1. **Approve** — User approves WBTC spending via OP_WALLET
2. **Place Bet** — `placeBet()` locks WBTC in the PredictionMarket contract
3. **Report** — Frontend reports txHash to server for indexing

Every step is a signed Bitcoin L1 transaction. Server only indexes — never touches funds.

---

## Features

### Core Platform
- **Binary markets** — YES/NO on crypto, politics, sports, tech, culture
- **Multi-outcome markets** — multiple options per event
- **Real-time prices** — BTC/ETH/SOL via PriceOracle contract
- **AI market signals** — Bob AI (Gemini LLM) provides per-market analysis
- **Market creation** — anyone can create markets (creator earns 20% of fees)

### Predict & Earn Vault
- **Stake WBTC** → earn 40% of all platform fees
- **Auto-compound** toggle — reinvest rewards automatically
- **Projected APY** — annualized from real fee data
- **Fee Flow visualization** — Volume → 2% fee → 40% vault → your share
- **Earnings calculator** — estimated weekly/monthly returns
- **7-day vesting** — linear unlock on staked positions

### Portfolio & Social
- **P&L tracking** — cumulative profit/loss with charts
- **Leaderboard** — top predictors by volume, wins, PnL
- **Follow traders** — track top performers' activity
- **Win streaks** — gamified streak tracking

### Security (4 Audit Rounds — 96/100)
- **4 rounds of security audit** with progressive hardening (78 → 85 → 92 → 96)
- All math in **u256** with **SafeMath** (no floating-point, no raw operators)
- **ReentrancyGuard** (STANDARD) + **Checks-Effects-Interactions** pattern on every write method
- **cancelMarket + emergencyWithdraw** — admin safety net, users self-refund
- **NoWinnerRefund** — if all bets on losing side, everyone gets refunded
- **Timelock** — 6-block delay on claims after resolution
- **sweepDust** with 144-block delay — admin recovers dust only after users had time to claim
- **MAX_ACTIVE_MARKETS** (100) — caps concurrent markets to prevent storage bloat
- **Zero address checks** on admin transfer and fee recipient
- **totalPools accounting** — decremented on every claim/withdraw, prevents cross-market drain
- **On-chain TX verification** — server validates every txHash before recording
- **13 on-chain events** — full event coverage for off-chain indexing

---

## Smart Contracts (5 Deployed)

| Contract | Lines | Key Functions |
|---|---|---|
| **PredictionMarket** | 1000+ | `placeBet`, `claimPayout`, `createMarket`, `resolveMarket`, `cancelMarket`, `emergencyWithdraw`, `sweepDust`, `getContractInfo` |
| **WBTC** | 200+ | `wrap` (BTC→WBTC), `unwrap` (WBTC→BTC), NativeSwap OP-20 |
| **StakingVault** | 300+ | `stake`, `unstake`, `claim`, CSV timelock vesting |
| **Treasury** | 250+ | `deposit`, `adminWithdraw`, emergency withdrawal with timelock |
| **PriceOracle** | 150+ | `updatePrice`, `getPrice`, multi-asset support |

All contracts use:
- `btc-runtime` for OP_NET compatibility
- `u256` integer math (no floating-point)
- SafeMath overflow/underflow protection
- Event emission for indexing (`MarketCreated`, `SharesPurchased`, `Staked`, etc.)
- Proper OP_NET storage patterns (`Blockchain.getStorageAt`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Blockchain** | Bitcoin L1 via OP_NET (Tapscript-encoded calldata) |
| **Smart Contracts** | AssemblyScript + btc-runtime → WASM |
| **Frontend** | React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 |
| **Charts** | Recharts (TVL, P&L, rewards) |
| **Wallet** | OP_WALLET (@btc-vision/walletconnect) |
| **Backend** | Express.js + better-sqlite3 (oracle + indexer) |
| **AI** | Gemini 2.5 Flash (market signals + chat) |
| **Hosting** | VPS (API) + Cloudflare (CDN) |

---

## Architecture

```
BitPredict
├── contracts/                    # 5 OP_NET Smart Contracts
│   ├── PredictionMarket.ts       # Parimutuel betting engine
│   ├── WBTC.ts                   # NativeSwap BTC↔WBTC wrapper
│   ├── StakingVault.ts           # MasterChef-style staking + CSV timelocks
│   ├── Treasury.ts               # Protocol fee collection + admin withdraw
│   ├── PriceOracle.ts            # Multi-asset price feeds
│   ├── abis/                     # Contract ABIs (auto-generated)
│   └── build/                    # Compiled WASM bytecode
│
├── server/
│   └── index.js                  # Express backend (oracle + indexer)
│                                 #   - Market management + resolution
│                                 #   - On-chain TX verification (3x retry)
│                                 #   - Fee distribution to vault
│                                 #   - AI chat (Gemini LLM)
│                                 #   - Leaderboard, social, P&L
│
├── src/                          # React Frontend
│   ├── App.tsx                   # 3-step on-chain bet flow
│   ├── components/
│   │   ├── VaultDashboard.tsx    # Stake/unstake + fee flow + APY
│   │   ├── BetModal.tsx          # On-chain betting interface
│   │   ├── Portfolio.tsx         # P&L charts + claim payouts
│   │   ├── AIChat.tsx            # Bob AI conversational interface
│   │   └── ...                   # 15+ components
│   ├── lib/
│   │   ├── opnet.ts              # OP_NET SDK integration
│   │   └── api.ts                # Server API client
│   └── hooks/
│       └── useWallet.ts          # OP_WALLET connection
│
└── deploy/                       # Contract deployment scripts
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- [OP_WALLET](https://opnet.org) browser extension
- Testnet BTC from [faucet.opnet.org](https://faucet.opnet.org)

### Quick Start

```bash
git clone https://github.com/BitPredictt/BitPredict.git
cd BitPredict
npm install
cp .env.example .env        # Fill in contract addresses
npm run dev                  # Frontend on localhost:5173
cd server && npm install && node index.js  # Backend on :3456
```

### Build & Deploy Contracts

```bash
cd contracts && npm run build    # Compile all contracts to WASM
cd deploy && node deploy-market.mjs  # Deploy PredictionMarket
```

---

## Mainnet Viability

BitPredict is designed for mainnet deployment:

- **Sustainable fee model** — 2% on every bet, split between vault stakers (40%), protocol (40%), and creators (20%)
- **No dependencies on external liquidity** — parimutuel model works with any number of bettors
- **Security audited** — 4 rounds of audit (96/100 score), all CRITICAL and HIGH findings fixed
- **Treasury contract** — protocol revenue collection with admin controls
- **WBTC wrapping** — real BTC ↔ WBTC via NativeSwap (no synthetic tokens)
- **Oracle infrastructure** — PriceOracle contract for fast-bet price feeds

### Post-Launch Roadmap
- Multisig admin (replace single-key)
- Redis rate limiter (replace in-memory)
- PostgreSQL (replace SQLite for scale)
- Professional security audit
- Mobile app

---

## Built With Bob

This entire project was built using **Bob**, the OP_NET AI development agent:

- Smart contract architecture and security patterns
- AssemblyScript + btc-runtime API guidance
- OP_NET storage, events, and deployment flows
- Frontend OP_NET SDK integration
- Security audit and vulnerability fixes

Bob also powers the **in-app AI chat**, providing real-time market analysis and trading signals to users.

---

## Links

| Resource | URL |
|---|---|
| **BitPredict App** | [bitpredict.club](https://bitpredict.club) |
| **OP_NET** | [opnet.org](https://opnet.org) |
| **Bob AI** | [ai.opnet.org](https://ai.opnet.org) |
| **OP_NET Docs** | [dev.opnet.org](https://dev.opnet.org) |
| **Block Explorer** | [opscan.org](https://opscan.org) |

---

## License

MIT — see [LICENSE](LICENSE)

---

*The first prediction market on Bitcoin L1. Built with Bob. Powered by OP_NET.* `#opnetvibecode`
