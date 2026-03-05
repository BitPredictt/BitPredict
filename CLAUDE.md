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

## Project State (Mar 5, 2026)
- **Full Bob mainnet audit completed** — 13 critical + 12 high + 10 medium issues fixed
- **Contracts require redeployment** — tx.origin→tx.sender, while→for, approve override, CEI fix, shares guard
- **Server/Frontend now env-driven** — OPNET_NETWORK, addresses, RPC all via env vars
- **Server requires env vars** — JWT_SECRET, OPNET_NETWORK, PRED_TOKEN, PREDICTION_MARKET_ADDRESS, ALLOWED_ORIGIN
- **Frontend requires VITE_* env vars** — VITE_OPNET_NETWORK, VITE_CONTRACT_ADDRESS, etc.
- **Auth hardened** — HMAC challenges, no fallback signature, rate limits on all financial endpoints

## Key Files
- `contracts/PredictionMarket.ts` — основной контракт (buyShares, sellShares, claimPayout, createMarket, resolveMarket)
- `contracts/StakingVault.ts` — стейкинг vault с CSV timelocks
- `contracts/PriceOracle.ts` — multi-sig oracle (3-of-5 median)
- `contracts/PredToken.ts` — BPUSD OP-20 token
- `server/index.js` — Express сервер (~2800 строк)
- `src/lib/api.ts` — фронтенд API клиент с JWT
- `src/lib/opnet.ts` — on-chain взаимодействие
- `src/hooks/useWallet.ts` — wallet hook (@btc-vision/walletconnect)

## Build Commands
- Contracts: `cd contracts && npm run build`
- Frontend: `npx vite build`
- Server: `JWT_SECRET=xxx node server/index.js`
- TypeCheck: `npx tsc --noEmit`
