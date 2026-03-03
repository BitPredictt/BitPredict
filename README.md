# BitPredict — AI-Powered Prediction Markets on Bitcoin L1

> **Built for OP_NET Vibecoding Week 2: "The DeFi Signal"** | `#opnetvibecode` | [@opnetbtc](https://x.com/opnetbtc)

![Bitcoin](https://img.shields.io/badge/Bitcoin-L1-orange?style=for-the-badge&logo=bitcoin)
![OP_NET](https://img.shields.io/badge/OP__NET-Powered-blue?style=for-the-badge)
![Bob AI](https://img.shields.io/badge/Bob_AI-Agent-purple?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## What is BitPredict?

BitPredict is a **full-stack DeFi prediction market** built natively on **Bitcoin Layer 1** using **OP_NET smart contracts**. Users trade binary outcomes (YES/NO) and multi-outcome markets on real-world events — crypto prices, politics, sports, tech — using **BPUSD** (virtual stablecoin on OP_NET testnet).

Unlike prediction markets on Ethereum or L2 rollups, BitPredict operates directly on Bitcoin's base layer, inheriting its security while adding programmable market logic through OP_NET's Tapscript-encoded smart contracts.

### Key Highlights

- **Bitcoin-native DeFi** — prediction markets directly on the most secure blockchain
- **Constant-product AMM** — real x*y=k pricing for binary outcomes (same math as Uniswap)
- **StakingVault** — stake BPUSD, earn 50% of protocol fees, auto-compound rewards
- **Bob AI Agent** — built-in market analyst powered by Gemini LLM + OP_NET expertise
- **On-chain settlement** — every bet signed via OP_WALLET, recorded on Bitcoin L1
- **5-minute fast markets** — rapid-fire BTC price predictions with live countdowns
- **Achievements & quests** — gamified XP system with on-chain reward claims
- **Social trading** — follow top predictors, P&L charts, leaderboard

---

## Live Demo

| | URL |
|---|---|
| **Frontend** | [bitpredictt.github.io/BitPredict](https://bitpredictt.github.io/BitPredict/) |
| **Backend API** | [polyfantasy.xyz/bpapi](https://polyfantasy.xyz/bpapi/) |
| **GitHub** | [github.com/BitPredictt/BitPredict](https://github.com/BitPredictt/BitPredict) |

### Deployed Contracts (OP_NET Testnet)

| Contract | Address |
|---|---|
| **PredictionMarket** | `opt1sqr00sl3vc4h955dpwdr2j35mqmflrnav8qskrepj` |
| **BPUSD Token (OP-20)** | `opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d` |
| **StakingVault** | `opt1sqzvj9vwjg6llrarqzx7xsw3mtt2gh7er5gz55srt` |

Explorer: [opscan.org](https://opscan.org)

---

## Features

### Prediction Markets

| Feature | Description |
|---|---|
| **Constant-Product AMM** | x*y=k pricing for binary outcomes — same math as Uniswap |
| **Binary Markets** | YES/NO outcomes on crypto, politics, sports, tech, culture |
| **Multi-Outcome Markets** | Multiple outcomes per market (e.g., election candidates) |
| **5-Min Fast Bets** | Rapid BTC price predictions with live countdown timers |
| **On-Chain Bets** | Each bet signed via OP_WALLET (increaseAllowance proof) |
| **2% Trading Fee** | Protocol fee distributed to vault stakers |
| **Price Impact Display** | AMM slippage shown before trade confirmation |
| **AI Market Signals** | Bob AI generates bullish/bearish/neutral signals per market |

### StakingVault (Predict & Earn)

| Feature | Description |
|---|---|
| **Stake BPUSD** | Deposit into the vault to earn protocol revenue |
| **50% Fee Distribution** | Half of all trading fees flow to vault stakers |
| **Auto-Compound** | Toggle automatic reinvestment of rewards |
| **Vesting Schedule** | Reward vesting with progress tracking |
| **TVL & APY Charts** | Real-time vault analytics with Recharts |
| **On-Chain Proofs** | Stake/unstake/claim all require OP_WALLET signatures |

### Bob AI Agent

| Feature | Description |
|---|---|
| **Market Analysis** | AI-powered market signals (buy YES/NO, confidence levels) |
| **Chat Interface** | Full conversational AI with Gemini LLM backend |
| **OP_NET Expertise** | Protocol knowledge, contract mechanics, trading strategies |
| **Quick Prompts** | One-click analysis shortcuts (EV calc, BTC analysis, strategy) |
| **Per-Market Signals** | Each market card shows Bob's bullish/bearish signal |

### Social & Gamification

| Feature | Description |
|---|---|
| **Leaderboard** | Top predictors ranked by volume and win rate |
| **Follow Traders** | Follow/unfollow top performers |
| **P&L Charts** | Portfolio performance with area charts |
| **Achievements** | 8+ achievements with XP rewards |
| **Quests** | Daily/weekly quests for extra BPUSD |
| **On-Chain Rewards** | Claim quest rewards via OP_WALLET signature |

### Frontend

| Feature | Description |
|---|---|
| **Market Browser** | Search, filter, sort by volume/liquidity/ending soon |
| **Category Filtering** | Crypto, Politics, Sports, Tech, Culture, Fast Bets |
| **Real-time Updates** | Markets refresh every 10s, bets every 15s |
| **Portfolio Tracking** | Active bets, wins, losses, ROI, win streaks |
| **Responsive Design** | Desktop nav + mobile bottom tab bar |
| **Dark Theme** | Bitcoin-inspired dark UI with gradient accents |

---

## Architecture

```
BitPredict
├── contracts/                    # OP_NET Smart Contracts (AssemblyScript)
│   ├── PredictionMarket.ts       # AMM prediction market contract
│   ├── BPUSDToken.ts             # BPUSD MintableToken (OP-20)
│   ├── StakingVault.ts           # MasterChef-style staking vault
│   └── src/                      # Entry points + ABI definitions
│
├── server/                       # Express Backend
│   └── index.js                  # API + SQLite DB + AI signal + vault logic
│                                 #   - Market CRUD, AMM calculation
│                                 #   - On-chain bet verification
│                                 #   - Fee distribution to vault
│                                 #   - Leaderboard, social, portfolio P&L
│                                 #   - Bob AI chat (Gemini LLM)
│
├── src/                          # React Frontend
│   ├── App.tsx                   # Main app with tab navigation
│   ├── components/
│   │   ├── Header.tsx            # Logo, wallet, nav tabs (lucide icons)
│   │   ├── MarketCard.tsx        # Market card with AMM prices + countdown
│   │   ├── BetModal.tsx          # Trade modal with AMM details + AI signal
│   │   ├── Portfolio.tsx         # User bets, P&L chart, win streaks
│   │   ├── VaultDashboard.tsx    # Stake/unstake, TVL chart, APY, rewards
│   │   ├── Leaderboard.tsx       # Top predictors ranking
│   │   ├── AIChat.tsx            # Bob AI conversational interface
│   │   ├── Achievements.tsx      # XP, quests, reward claims
│   │   ├── TopPredictors.tsx     # Follow/unfollow top traders
│   │   ├── NetworkStats.tsx      # Block height, gas, market count
│   │   ├── HowItWorks.tsx        # Onboarding steps
│   │   ├── Toast.tsx             # Notification system
│   │   └── Footer.tsx            # Links and credits
│   ├── hooks/
│   │   ├── useWallet.ts          # OP_WALLET connection + balance
│   │   └── useAchievements.ts    # Achievement tracking + XP
│   ├── lib/
│   │   ├── opnet.ts              # OP_NET integration (signing, AMM calc)
│   │   └── api.ts                # Server API client (all endpoints)
│   └── data/
│       └── markets.ts            # Category definitions
│
├── deploy/                       # Deployment scripts
├── index.html                    # Entry point
├── vite.config.ts                # Vite + TailwindCSS v4
└── package.json                  # Dependencies
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Blockchain** | Bitcoin L1 via OP_NET (Tapscript-encoded calldata) |
| **Smart Contracts** | AssemblyScript (btc-runtime) compiled to WASM |
| **Frontend** | React 19 + TypeScript 5.9 + Vite 7 |
| **Styling** | TailwindCSS v4 |
| **Charts** | Recharts (TVL, APY, P&L area/bar charts) |
| **Icons** | Lucide React |
| **Wallet** | OP_WALLET browser extension (@btc-vision/walletconnect) |
| **Backend** | Express.js + better-sqlite3 |
| **AI** | Gemini LLM (gemini-2.5-flash) |
| **OP_NET SDK** | `opnet`, `@btc-vision/bitcoin`, `@btc-vision/transaction` |
| **Deployment** | GitHub Pages (frontend) + VPS (backend) |

---

## Smart Contract Design

### Constant-Product AMM

BitPredict uses the same AMM model as Uniswap, adapted for binary outcomes:

```
k = yesReserve * noReserve  (constant)

Buying YES shares:
  newNoReserve  = noReserve + netAmount
  newYesReserve = k / newNoReserve
  shares        = yesReserve - newYesReserve

YES price = noReserve / (yesReserve + noReserve)
```

This provides:
- **Continuous liquidity** — always a price available
- **Natural price discovery** — prices move with demand
- **Slippage protection** — large trades move price more
- **No order book needed** — fully automated

### Security Measures

- **No floating-point arithmetic** — all calculations use u256 integer math
- **SafeMath operations** — overflow/underflow protection
- **Reentrancy protection** — state updates before external effects
- **Market validation** — end time must be future, amounts above 100 minimum
- **Double-claim prevention** — claimed flag per user per market
- **Fee enforcement** — 2% (200 bps) on every trade
- **On-chain bet proofs** — each bet requires signed OP_WALLET transaction

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- [OP_WALLET](https://opnet.org) browser extension
- Testnet BTC from [faucet.opnet.org](https://faucet.opnet.org)

### Installation

```bash
git clone https://github.com/BitPredictt/BitPredict.git
cd BitPredict
npm install
```

### Development

```bash
# Frontend (Vite dev server)
npm run dev

# Backend (Express server, port 3456)
node server/index.js
```

### Build for Production

```bash
npm run build
```

---

## How to Use

1. Install [OP_WALLET](https://opnet.org) Chrome extension
2. Switch to **OP_NET Testnet** in OP_WALLET settings
3. Get free testnet BTC from [faucet.opnet.org](https://faucet.opnet.org)
4. Open BitPredict and click **Connect**
5. Get free BPUSD from the **Vault** tab (faucet)
6. Browse markets, select one, choose YES or NO
7. Sign the transaction in OP_WALLET (on-chain proof)
8. Track your bets in the **Portfolio** tab
9. Stake BPUSD in the **Vault** to earn trading fees
10. Chat with **Bob AI** for market analysis and signals

---

## On-Chain Bet Flow

```
1. User selects market + side (YES/NO) + amount
2. Frontend calls increaseAllowance on BPUSD contract (via OP_WALLET)
3. User signs TX in OP_WALLET → txHash returned
4. Frontend sends txHash to server
5. Server verifies TX, records bet, calculates AMM price impact
6. 2% fee collected: 50% to vault stakers, 50% to protocol
7. New YES/NO prices broadcast to all clients
```

---

## AI Agent (Bob)

This project was built with extensive use of **Bob**, the OP_NET AI MCP agent:

- **Smart contract patterns** — AssemblyScript contract templates and btc-runtime API
- **AMM mathematics** — Constant-product formula validated against NativeSwap
- **Security guidance** — Floating-point risks, reentrancy, overflow concerns
- **OP_NET integration** — Provider setup, transaction building, deployment flow
- **Frontend architecture** — React component patterns for DeFi apps

Bob also powers the in-app AI chat, providing real-time market analysis and trading signals.

---

## Links

| Resource | URL |
|---|---|
| **OP_NET** | [opnet.org](https://opnet.org) |
| **Bob AI Agent** | [ai.opnet.org](https://ai.opnet.org) |
| **Developer Docs** | [dev.opnet.org](https://dev.opnet.org) |
| **Block Explorer** | [opscan.org](https://opscan.org) |
| **OP_WALLET** | [opnet.org](https://opnet.org) |
| **Testnet Faucet** | [faucet.opnet.org](https://faucet.opnet.org) |

---

## License

MIT License — see [LICENSE](LICENSE)

---

*Built with AI. Powered by Bitcoin. Settled on OP_NET. #opnetvibecode*
