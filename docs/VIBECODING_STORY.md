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

---

# Image Prompts (Midjourney / DALL-E / Grok)

> Generate one image per prompt. Attach to the corresponding tweet.
> Style: dark background (#0a0a0f), orange (#f7931a) + purple (#9333ea) accents, futuristic fintech, no text on images.

## IMG 1 — for Tweet 1/9 (Hook)

```
A glowing Bitcoin coin floating above a futuristic prediction market dashboard interface, dark background, orange and purple neon accents, holographic YES/NO voting bars, cinematic lighting, 16:9 aspect ratio, no text
```

## IMG 2 — for Tweet 3/9 (The Pivot)

```
Split image: left side shows a broken Uniswap-style AMM liquidity pool draining empty, right side shows a vibrant parimutuel betting pool filling up with golden coins, dark background, orange vs purple contrast, dramatic transition effect, 16:9, no text
```

## IMG 3 — for Tweet 4/9 (5 Contracts)

```
Five glowing smart contract cubes arranged in a pentagon formation on a Bitcoin blockchain, each cube has a different icon (market chart, wrapped coin, vault lock, treasury chest, oracle eye), dark space background, orange and purple holographic glow, connected by energy lines, 16:9, no text
```

## IMG 4 — for Tweet 5/9 (Security Audit)

```
A futuristic security shield with a checkmark, surrounded by floating code fragments and bug icons being eliminated by laser beams, dark background, green and orange accents, "protection" feel, cybersecurity aesthetic, 16:9, no text
```

## IMG 5 — for Tweet 6/9 (Vault + AI)

```
A Bitcoin vault door opening with golden light pouring out, combined with an AI brain hologram analyzing market charts, dark background, orange gold from vault and purple glow from AI, split composition, 16:9, no text
```

## IMG 6 — for Tweet 8/9 (Live) — USE REAL SCREENSHOT

```
Take a real screenshot of https://bitpredict.club with markets visible, wallet connected, and vault tab showing APY. This is the most important image — shows the real working product.
```

## IMG 7 — for Tweet 9/9 (Closing)

```
A Bitcoin rocket launching from a laptop screen showing a prediction market interface, trail of orange and purple light, dark space background, stars, "to the moon" energy but professional, 16:9, no text
```

### Which tweets get images:

| Tweet | Image | Why |
|-------|-------|-----|
| 1/9 Hook | IMG 1 (generated) | Eye-catching opener |
| 2/9 Problem | no image | Text is enough |
| 3/9 Pivot | IMG 2 (generated) | Visual before/after |
| 4/9 Contracts | IMG 3 (generated) | Architecture visual |
| 5/9 Security | IMG 4 (generated) | Trust signal |
| 6/9 Vault+AI | IMG 5 (generated) | Features visual |
| 7/9 Lessons | no image | Personal reflection |
| 8/9 Live | IMG 6 (SCREENSHOT!) | Proof it works |
| 9/9 Closing | IMG 7 (generated) | Strong finish |

**7 out of 9 tweets have images. Tweet 2 and 7 are text-only — intentionally, for rhythm.**

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
