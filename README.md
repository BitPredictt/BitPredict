# BitPredict — AI-Powered Prediction Markets on Bitcoin L1

> **Built for the OP_NET Vibecoding Challenge** | `#opnetvibecode` | [@opnetbtc](https://x.com/opnetbtc)

![Bitcoin](https://img.shields.io/badge/Bitcoin-L1-orange?style=for-the-badge&logo=bitcoin)
![OP_NET](https://img.shields.io/badge/OP__NET-Powered-blue?style=for-the-badge)
![Bob AI](https://img.shields.io/badge/Bob_AI-Agent-purple?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## What is BitPredict?

BitPredict is a **fully functional prediction market platform** built natively on **Bitcoin Layer 1** using **OP_NET's smart contract infrastructure**. Users can trade binary outcomes (YES/NO) on real-world events — crypto prices, politics, sports, tech — using regtest Bitcoin.

Unlike traditional prediction markets that rely on Ethereum or L2 rollups, BitPredict operates directly on Bitcoin's base layer, inheriting its unmatched security and decentralization while adding programmable market logic through OP_NET.

### Why This Matters

- **Bitcoin-native DeFi**: Prediction markets directly on the most secure blockchain
- **No bridges, no wrapping**: Pure Bitcoin L1 transactions via OP_NET
- **Constant-product AMM**: Real financial logic for price discovery (not simulated)
- **AI-powered analysis**: Built-in market intelligence for better predictions
- **Telegram Mini App**: Accessible to 900M+ Telegram users
- **Mainnet-ready architecture**: Production code quality with security considerations

---

## The Vibecoding Story

### How This Was Built

This entire project was vibecoded — every line of code was generated through AI collaboration:

1. **Bob (OP_NET MCP Agent)** provided deep knowledge of OP_NET's smart contract runtime, AssemblyScript patterns, and Bitcoin L1 architecture
2. **AI pair programming** handled all React/TypeScript frontend code, smart contract logic, and deployment configuration
3. **Zero manual coding** — the builder described features and constraints, AI wrote the implementation

### The Build Process

**Day 1 — Research & Architecture**
- Studied OP_NET's btc-runtime, NativeSwap contract patterns, and the constant-product AMM model
- Designed the PredictionMarket smart contract with security-first approach
- Chose React + Vite + TypeScript + TailwindCSS for the frontend stack

**Day 2 — Smart Contract Development**
- Built the AssemblyScript prediction market contract following OP_NET patterns
- Implemented constant-product AMM pricing (x * y = k) for YES/NO shares
- Added fee collection, market resolution, and payout distribution
- Included security: no floating-point math, overflow protection, reentrancy guards, admin key rotation

**Day 3 — Frontend & Integration**
- Built a production-quality React app with dark Bitcoin-themed UI
- Integrated OP_WALLET connection and OP_NET regtest provider
- Added AI market analysis, leaderboard, portfolio tracking
- Telegram Mini App support for mobile-first experience
- Deployed and tested end-to-end

---

## Features

### DeFi Engine (Smart Contract)

| Feature | Description |
|---|---|
| **Constant-Product AMM** | x * y = k pricing for binary outcomes — same math as Uniswap |
| **Market Creation** | Anyone can create markets with configurable resolution times |
| **Share Trading** | Buy YES/NO shares; price moves based on demand |
| **Automated Resolution** | Admin/oracle resolves markets after end block |
| **Proportional Payouts** | Winners receive (userShares / totalWinning) * totalPool |
| **2% Trading Fee** | Fee on each trade for protocol sustainability |
| **Minimum Trade: 100 sats** | Prevents dust attacks |
| **Resolution Grace Period** | 144 blocks (~1 day) buffer for fair resolution |

### Frontend

| Feature | Description |
|---|---|
| **Market Browser** | Search, filter, sort by volume/liquidity/ending |
| **Category Filtering** | Crypto, Politics, Sports, Tech, Culture |
| **Real-time Pricing** | AMM-derived YES/NO prices with visual bars |
| **Bet Placement** | Full modal with amount presets, payout calculation |
| **Portfolio Tracking** | View active bets, wins, losses, total wagered |
| **AI Analysis** | AI-powered market analysis with confidence scores |
| **Leaderboard** | Top predictors ranked by volume and wins |
| **OP_WALLET Connect** | Browser extension wallet integration |
| **Telegram Mini App** | Works inside Telegram via WebApp SDK |
| **Mobile Bottom Nav** | Responsive design with mobile-first navigation |

---

## Architecture

```
BitPredict
├── contracts/                    # OP_NET Smart Contracts
│   └── PredictionMarket.ts       # AssemblyScript contract (btc-runtime)
│       ├── createMarket()        # Create binary outcome market
│       ├── buyShares()           # Purchase YES/NO shares via AMM
│       ├── resolveMarket()       # Admin resolves with outcome
│       ├── claimPayout()         # Winners claim proportional payout
│       ├── getMarketInfo()       # Read market state
│       ├── getPrice()            # Get current YES/NO prices
│       └── getUserShares()       # Read user positions
│
├── src/                          # React Frontend
│   ├── App.tsx                   # Main app with tab navigation
│   ├── components/
│   │   ├── Header.tsx            # Logo, wallet, nav tabs
│   │   ├── MarketCard.tsx        # Market card with AMM prices
│   │   ├── BetModal.tsx          # Trade modal with payout calc
│   │   ├── Portfolio.tsx         # User's bet history
│   │   ├── Leaderboard.tsx       # Top predictors ranking
│   │   ├── AIAnalysis.tsx        # AI market analysis
│   │   └── Toast.tsx             # Notification system
│   ├── hooks/
│   │   └── useWallet.ts          # OP_WALLET + demo wallet logic
│   ├── lib/
│   │   └── opnet.ts              # OP_NET integration layer
│   │       ├── calculatePrice()  # AMM price calculation
│   │       ├── calculateShares() # Share output for given amount
│   │       ├── calculatePayout() # Winner payout calculation
│   │       ├── encodeCalldata()  # Contract call encoding
│   │       └── connectOPWallet() # Wallet extension bridge
│   └── data/
│       └── markets.ts            # Market definitions
│
├── index.html                    # Entry with Telegram WebApp SDK
├── vite.config.ts                # Vite + TailwindCSS + polyfills
└── package.json                  # Dependencies incl. OP_NET libs
```

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
- **SafeMath operations** — overflow/underflow protection on every operation
- **Reentrancy protection** — state updates before external effects
- **Admin key rotation** — `setAdmin()` for operational security
- **Market validation** — end block must be future, amounts above minimum
- **Double-claim prevention** — claimed flag per user per market
- **Fee enforcement** — 2% (200 bps) on every trade, calculated before share distribution

### Mainnet Deployment Path

1. **Compile contract** → `npm run build` (AssemblyScript → WASM)
2. **Deploy to regtest** → Use OP_WALLET extension to upload .wasm and broadcast deployment tx
3. **Test thoroughly** → Unit tests + integration tests on regtest
4. **Audit** → Smart contract security review
5. **Deploy to mainnet** → Same process, mainnet OP_NET RPC
6. **Add oracle integration** → Decentralized resolution via Chainlink/custom oracle
7. **Add LP incentives** → Fee sharing for liquidity providers

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Blockchain** | Bitcoin L1 via OP_NET |
| **Smart Contract** | AssemblyScript (btc-runtime) → WebAssembly |
| **Frontend** | React 19 + TypeScript + Vite 7 |
| **Styling** | TailwindCSS v4 |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **Wallet** | OP_WALLET browser extension |
| **Telegram** | Telegram WebApp SDK |
| **AI Agent** | Bob (OP_NET MCP Server) |
| **OP_NET Libs** | `opnet`, `@btc-vision/bitcoin`, `@btc-vision/transaction` |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- [OP_WALLET](https://opnet.org) browser extension
- Regtest BTC from [faucet.opnet.org](https://faucet.opnet.org)

### Installation

```bash
git clone https://github.com/opbitpredict/BitPredict.git
cd bitpredict
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

### Environment Variables

```bash
cp .env.example .env
# Edit .env with your regtest private key (WIF format)
```

---

## Testing with Regtest BTC

1. Install [OP_WALLET](https://opnet.org) Chrome extension
2. Switch to **Regtest** in OP_WALLET settings
3. Get free regtest BTC from [faucet.opnet.org](https://faucet.opnet.org)
4. Open BitPredict and click **Connect**
5. Browse markets, select one, place a YES or NO prediction
6. Check your portfolio in the **My Bets** tab

---

## Live Demo

**Frontend**: [http://188.137.250.160](http://188.137.250.160) | [GitHub Pages](https://opbitpredict.github.io/BitPredict/)

**GitHub**: [github.com/opbitpredict/BitPredict](https://github.com/opbitpredict/BitPredict)

**Contract**: OP_NET Regtest — deploy via OP_WALLET after compiling to WASM

---

## AI Agent Usage (Bob)

This project was built with extensive use of **Bob**, the OP_NET AI MCP server:

- **Smart contract patterns** — Bob provided AssemblyScript contract templates and btc-runtime API knowledge
- **AMM mathematics** — Constant-product formula implementation validated against NativeSwap
- **Security audit guidance** — Bob flagged floating-point usage, reentrancy risks, and overflow concerns
- **OP_NET integration** — Provider setup, transaction building, contract deployment flow
- **Frontend architecture** — React component structure for DeFi apps

Bob's MCP endpoint: `https://ai.opnet.org/mcp`

---

## Future Roadmap

- [ ] Oracle-based market resolution (decentralized)
- [ ] Liquidity provider rewards (fee sharing)
- [ ] Market creation UI (anyone can create)
- [ ] Position selling (secondary market for shares)
- [ ] Cross-market portfolio analytics
- [ ] Telegram bot for market alerts
- [ ] Mobile app (React Native)
- [ ] Mainnet launch with real BTC

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Links

- **OP_NET**: [opnet.org](https://opnet.org)
- **Bob AI Agent**: [ai.opnet.org](https://ai.opnet.org)
- **Developer Docs**: [dev.opnet.org](https://dev.opnet.org)
- **Block Explorer**: [opscan.org](https://opscan.org)
- **MotoSwap DEX**: [motoswap.org](https://motoswap.org)
- **OP_WALLET**: [opnet.org](https://opnet.org)
- **Testnet Faucet**: [faucet.opnet.org](https://faucet.opnet.org)
- **Challenge**: [vibecode.finance/challenge](https://vibecode.finance/challenge)

---

*Built with AI. Powered by Bitcoin. #opnetvibecode*
