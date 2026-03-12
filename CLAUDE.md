# BitPredict — CLAUDE.md

## Model Optimization
При использовании Agent tool автоматически выбирай модель:
- **Haiku** (`model: "haiku"`) — простые поиски, grep, glob, быстрые вопросы
- **Sonnet** (`model: "sonnet"`) — анализ кода, средние задачи, рефакторинг, код-ревью
- **Opus** (default, не указывать model) — сложная архитектура, аудиты безопасности, масштабные изменения

## Language
- Отвечать на русском языке

## Token Economy Rules
- Не читай файлы целиком если нужны только несколько строк — используй offset/limit
- server/index.js = 2800+ строк — ВСЕГДА читай кусками (offset+limit), НЕ целиком
- Группируй независимые tool calls параллельно (один message, несколько calls)
- Используй Grep/Glob вместо Agent для простых поисков
- Предупреждай пользователя когда контекст раздувается и стоит начать новый чат
- Перед чтением большой документации Bob — сначала opnet_knowledge_search, потом section=

## Context Management
- Если чат длиннее ~20 сообщений — предупреди: "Контекст большой, рекомендую `/compact` или новый чат"
- Все важные решения и текущее состояние проекта — в memory/bitpredict.md
- При завершении крупной задачи — обновляй bitpredict.md

## Project State (Mar 11, 2026)
- **On-chain parimutuel implemented** — contract handles bets/claims, server = oracle/indexer
- **AMM removed** — no reserves, no sellShares, no virtual liquidity
- **Fee synced at 2%** — contract 200 BPS, server FEE_PCT=0.02, frontend BET_FEE_PCT=0.02
- **3-step bet flow** — approve → placeBet on-chain → reportBetTx to server
- **Contracts need rebuild + redeploy** — PredictionMarket.ts refactored
- **Server requires env vars** — JWT_SECRET, OPNET_NETWORK, PREDICTION_MARKET_ADDRESS, ALLOWED_ORIGIN
- **Frontend requires VITE_* env vars** — VITE_OPNET_NETWORK, VITE_CONTRACT_ADDRESS, VITE_CONTRACT_PUBKEY, etc.

## Key Files
- `contracts/PredictionMarket.ts` — on-chain parimutuel (placeBet, claimPayout, createMarket, resolveMarket, withdrawFees)
- `contracts/abis/PredictionMarket.abi.ts` — ABI (placeBet, getUserBets, getMarketInfo, getPrice)
- `contracts/StakingVault.ts` — стейкинг vault с CSV timelocks
- `contracts/Treasury.ts` — Treasury (deposit/withdraw, ML-DSA auth)
- `contracts/WBTC.ts` — NativeSwap WBTC token (wrap/unwrap BTC↔WBTC)
- `server/index.js` — Express сервер (~3800 строк, oracle + indexer)
- `src/lib/api.ts` — фронтенд API клиент с JWT + reportBetTx/reportClaimTx
- `src/lib/opnet.ts` — on-chain: approveForMarket, placeBetOnChain, claimPayoutOnChain
- `src/App.tsx` — 3-step handlePlaceBet, handleClaim
- `src/components/BetModal.tsx` — on-chain balance, 2% fee, display-only check
- `src/components/Portfolio.tsx` — on-chain claimPayout
- `src/hooks/useWallet.ts` — wallet hook (@btc-vision/walletconnect)

## Build Commands
- Contracts: `cd contracts && npm run build`
- WBTC only: `cd contracts && npm run build:wbtc`
- Treasury only: `cd contracts && npm run build:treasury`
- Frontend: `npx vite build`
- Server: `JWT_SECRET=xxx node server/index.js`
- TypeCheck: `npx tsc --noEmit`

## Server Env Vars (new for Treasury)
- `PROTOCOL_TREASURY_ADDRESS` — куда слать protocol revenue
- `WITHDRAWAL_FEE_PCT` — комиссия за вывод (default: 0.005 = 0.5%)
- `PROTOCOL_FLUSH_THRESHOLD` — порог для flush (default: 10000 sats)

## Security Notes
- **HIGH-2 WARNING**: `DEPLOYER_SEED` in `.env` — seed phrase for deployer wallet. NEVER commit to git. Rotate periodically. Consider hardware wallet or HSM for production.
- **HIGH-4 Design Decision**: `resolveMarket()` intentionally does NOT use `whenNotPaused()`. Admin must resolve markets during emergencies to prevent funds being locked. Claims are still paused (claimPayout has whenNotPaused).

## Audit Fixes (Mar 12, 2026)
- **CRITICAL-1**: cancelMarket + emergencyWithdraw — admin can cancel, users self-refund
- **CRITICAL-2**: claimPayout handles all-losers scenario (NoWinnerRefund)
- **CRITICAL-3**: verifyTxExists — no more "trust" fallback, retry 3x with 2s delay
- **HIGH-1**: Timelock (6 blocks) on claimPayout after resolution
- **HIGH-3**: sweepDust — admin sweeps remaining dust from resolved/cancelled markets
- **MEDIUM-2**: getTokenAllowance returns raw sats (no /1e8 division)
- **MEDIUM-3**: MAX_SATS configurable via VITE_MAX_SATS env var (default 500000)
- Contract needs rebuild + redeploy after these changes
