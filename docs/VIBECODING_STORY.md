# BitPredict — Vibecoding Story

> Twitter/X thread for #opnetvibecode submission + Vibecoding Story award.
> Each tweet is under 280 characters. Copy-paste one by one.

---

## 1/9 — Hook (250 chars)

What if Polymarket existed on Bitcoin?

Not Ethereum. Not an L2. Actual Bitcoin L1.

I built it in 3 weeks with @opnetbtc and Bob AI.

BitPredict — the first prediction market on Bitcoin.

Thread 🧵👇

#opnetvibecode

---

## 2/9 — Problem (268 chars)

$2T in BTC sits idle. Zero DeFi on L1.

Prediction markets do $1B+/month — all on ETH or Solana. Bitcoin holders left out.

OP_NET changes that: smart contracts on Bitcoin. No bridge. No L2 token. Just Bitcoin.

That's where BitPredict comes in.

---

## 3/9 — The Pivot (275 chars)

Week 1: built an AMM (Uniswap-style) for binary bets.

Problem: AMMs need LPs. Zero users = dead.

Week 2: scrapped it. Rebuilt as parimutuel:
• Bets pool together
• Winners split the pot
• No LP needed
• Works with 2 or 2000 users

Way better for Bitcoin L1.

---

## 4/9 — 5 Contracts (271 chars)

5 smart contracts on Bitcoin L1:

1. PredictionMarket — parimutuel engine
2. WBTC — NativeSwap BTC wrapper
3. StakingVault — stake & earn 40% of fees
4. Treasury — protocol revenue
5. PriceOracle — BTC/ETH/SOL feeds

All WASM. All deployed. All verified on testnet.

---

## 5/9 — Security (274 chars)

Bob audited everything. Two full rounds.

Round 1: 3 CRITICAL + 4 HIGH (no refunds, all-losers crash, no timelock). Fixed.

Round 2: cross-market drain, unpinned deps. Fixed.

10 findings → 10 fixes → 0 known vulns.

Most hackathon projects skip audits. We did two.

---

## 6/9 — Vault + AI (270 chars)

StakingVault: stake WBTC, earn 40% of all platform fees. Auto-compound, 7-day vesting, CSV timelocks.

DeFi yield on Bitcoin L1.

AI inside the product: Gemini-powered chat, per-market signals (bullish/bearish), strategy tips.

Bob builds AND powers the UX.

---

## 7/9 — Lessons (277 chars)

Building on Bitcoin L1 is different:

• No floats — u256 or bust
• Two address systems — OPNet Identity vs bech32
• AssemblyScript looks like TS but isn't
• CSV timelocks: elegant, unforgiving
• Bob caught 3 critical bugs I'd have shipped

EVM muscle memory is a liability here.

---

## 8/9 — Live (218 chars)

BitPredict is live on OP_NET testnet:

https://bitpredict.club

Connect wallet → wrap BTC → bet on markets → stake in vault → chat with AI.

5 contracts. Full-stack DeFi. On Bitcoin.

github.com/BitPredictt/BitPredict

---

## 9/9 — Closing (189 chars)

3 weeks. 5 contracts. 2 audits. 1 AI agent.

First prediction market on Bitcoin L1.

Built with Bob. Powered by @opnetbtc. Settled on Bitcoin.

Next stop: mainnet.

#opnetvibecode

---

# Submission Tweet (standalone, 264 chars)

Built the first prediction market on Bitcoin L1 with @opnetbtc

5 contracts. Parimutuel betting. Staking vault. AI signals. 2 security audits.

Live on testnet: https://bitpredict.club

3 weeks of vibecoding with Bob 🧵

#opnetvibecode

---

# Award Positioning Notes

## Best DeFi Build — PRIMARY target
- 5 contracts (most projects have 1-2)
- Parimutuel model (novel on Bitcoin)
- Vault with real fee distribution
- Treasury for protocol revenue
- 2% fee split: vault 40% / protocol 40% / creators 20%
- Security: 2 audit rounds, 10 findings fixed

## Mainnet Ready — SECONDARY target
- Security audit completed (10/10 findings fixed)
- Dependency pinning (btc-runtime 1.10.12)
- Helmet security headers
- JWT auth
- Live on testnet (not localhost)
- Clear mainnet TODOs documented (multisig, Redis, PostgreSQL)

## Best Agent Build — TERTIARY target
- Bob for contract architecture
- Bob for security audit (2 rounds)
- Gemini AI in-app chat (user-facing)
- PriceOracle bot (automated feeds)
- AI used at every layer: build, audit, product

## Demo Video Plan (3 min)
0:00-0:30 — Hook: open bitpredict.club, show live markets
0:30-1:30 — Full flow: connect wallet → wrap BTC → place bet → show TX in explorer
1:30-2:00 — Vault: stake, APY, fee flow visualization
2:00-2:30 — AI: ask Bob a question, show market signals
2:30-3:00 — Close: "First prediction market on Bitcoin L1. 5 contracts. Mainnet ready."
