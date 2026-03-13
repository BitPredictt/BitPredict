# BitPredict — Vibecoding Story

> Twitter thread for #opnetvibecode submission + Vibecoding Story award
> Copy each section as a separate tweet in the thread.

---

## Tweet 1 — Hook

What if Polymarket existed on Bitcoin?

Not on Ethereum. Not on an L2. On actual Bitcoin L1.

That's what I built in 3 weeks with @opnetbtc and Bob AI.

Here's the story of BitPredict — the first prediction market on Bitcoin.

🧵👇

#opnetvibecode

---

## Tweet 2 — The Problem

$2T+ in BTC sits idle. Zero DeFi on Layer 1.

Meanwhile prediction markets are exploding — Polymarket does $1B+/month.

But every prediction market runs on Ethereum or Solana. Bitcoin holders? Left out.

OP_NET changes that. Smart contracts on Bitcoin. No bridge. No wrapped tokens on other chains.

---

## Tweet 3 — Day 1: The First Contract

Started with Bob and a question: "Can I build a prediction market on Bitcoin L1?"

Bob's answer: yes, and here's how.

First challenge: AssemblyScript, not Solidity. SHA256 selectors, not keccak256. u256 math, no floats. Everything is different from EVM.

First contract compiled. First market created on-chain. Real Bitcoin transaction.

---

## Tweet 4 — The Pivot: AMM to Parimutuel

Week 1: built a constant-product AMM (Uniswap-style) for binary outcomes.

Problem: AMMs need liquidity providers. On a new platform with zero users? Dead on arrival.

Week 2: ripped it all out. Rebuilt as parimutuel (like Polymarket):
- All bets pool together
- Winners split the pot
- No LP needed
- Works with 2 users or 2000

The contract went from ~400 lines to ~600. Every line matters when you're on Bitcoin L1.

---

## Tweet 5 — 5 Smart Contracts

Ended up with 5 contracts, all on Bitcoin L1:

1. PredictionMarket — parimutuel engine (placeBet, claimPayout, resolveMarket)
2. WBTC — NativeSwap BTC wrapper (wrap real BTC, bet with WBTC)
3. StakingVault — stake WBTC, earn 40% of platform fees
4. Treasury — protocol revenue collection
5. PriceOracle — BTC/ETH/SOL feeds for fast bets

All compiled to WASM. All deployed on OP_NET testnet. All verified.

---

## Tweet 6 — The Security Audit

Asked Bob to audit everything. Two full rounds.

Round 1 found:
- 3 CRITICAL: no cancel/refund, all-losers crash, TX trust fallback
- 4 HIGH: no timelock on claims, no emergency withdraw

Fixed all of them.

Round 2 (mainnet audit) found:
- Cross-market drain via sweepDust
- Unpinned dependencies

Fixed those too.

10 findings. 10 fixes. Zero known vulnerabilities.

Most hackathon projects never get audited. We did it twice.

---

## Tweet 7 — The Vault: Passive Income on Bitcoin

StakingVault uses Bitcoin-native CSV timelocks (not just timestamps).

Stake WBTC → earn 40% of every bet fee on the platform.

Auto-compound toggle. 7-day vesting. Projected APY from real fee data.

Fee flow: Volume → 2% fee → 40% vault → your share.

DeFi yield. On Bitcoin. For real.

---

## Tweet 8 — AI Inside

Bob isn't just a build tool — he's IN the product.

In-app AI chat powered by Gemini:
- "Which market has the best value?"
- "What's the EV on BTC hitting $120k?"
- "How do I place my first bet?"

Per-market signals: bullish/bearish/neutral with confidence levels.

AI-assisted security audit + AI-powered user experience.

---

## Tweet 9 — What I Learned

Building on Bitcoin L1 is hard. Here's what surprised me:

1. No floating point. Ever. u256 or bust.
2. Two address systems (OPNet Identity vs Bitcoin bech32) — broke my brain
3. CSV timelocks are elegant but unforgiving
4. AssemblyScript ≠ TypeScript (looks the same, behaves differently)
5. Bob saved me from at least 3 critical bugs I would've shipped

The EVM muscle memory is a liability here. Bitcoin is a different beast.

---

## Tweet 10 — Live Demo

BitPredict is live on OP_NET testnet right now:

https://bitpredict.club

- Connect OP_WALLET
- Wrap BTC → WBTC
- Browse markets, place bets
- Stake in the vault
- Chat with AI

5 contracts. Full-stack DeFi. On Bitcoin.

GitHub: github.com/BitPredictt/BitPredict

---

## Tweet 11 — Closing

3 weeks. 5 contracts. 2 security audits. 1 AI agent.

The first prediction market on Bitcoin L1.

Built with Bob. Powered by OP_NET. Settled on Bitcoin.

What comes next? Mainnet.

@opnetbtc #opnetvibecode

---

# Short Version (single tweet for submission)

Built the first prediction market on Bitcoin L1 with @opnetbtc 🔥

5 smart contracts. Parimutuel betting. Staking vault with real yield. AI market signals. 2 security audits.

Live on testnet → https://bitpredict.club

3 weeks of vibecoding with Bob. Here's the thread 🧵

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
