# BitPredict — картинки в проекте и что добавить

## Что уже есть

| Файл | Назначение |
|------|------------|
| `public/favicon.svg` | Иконка вкладки: оранжевый градиент, символ ₿, скруглённый квадрат 64×64 |
| **Вне репо** | `og:image` и `twitter:image` в `index.html` ссылаются на `https://bitpredict.club/screen.png` (1200×630) — файла в репозитории нет |

**Иконки в UI:** везде используются компоненты **Lucide React** (BarChart3, Lock, Trophy, Wallet, Bitcoin, BrainCircuit и т.д.) — отдельные файлы картинок для них не нужны.

---

## Что добавить по проекту

### 1. OG/Twitter превью (обязательно)

**Файл:** `public/screen.png`  
**Размер:** 1200×630 px  
**Где используется:** `index.html` — meta `og:image`, `twitter:image` (сейчас внешняя ссылка bitpredict.club/screen.png).

**Промпт для генерации:**

```
Social share image for a crypto prediction market app "BitPredict". Dark background (#0a0a0f), headline "Predict the Future on Bitcoin L1", subtitle "AI-powered prediction markets · OP_NET". Stylized Bitcoin orange gradient accent, minimal chart/candlestick or prediction UI element, no faces. Modern fintech style, 1200x630, centered composition, sharp and readable text.
```

**Альтернатива (если текст не в картинке):**

```
Website preview card: dark blue-black background, orange and purple soft gradients, abstract Bitcoin/blockchain visualization (subtle nodes or graph), prediction market theme (yes/no odds feel). No text. Professional, 1200x630, suitable for link preview.
```

---

### 2. Логотип приложения (опционально)

**Файлы:** `public/logo.svg` или `public/logo.png` (например 128×128, 256×256)  
**Где использовать:** Header (сейчас градиент + иконка Bitcoin + текст), Footer, будущий PWA.

**Промпт:**

```
App logo for "BitPredict": combination of Bitcoin symbol and prediction/forecast element (e.g. small chart line or upward arrow). Orange (#f7931a) and dark orange gradient, minimal flat design, works on dark background. Square format, no text, recognizable at 32px and 128px.
```

---

### 3. Hero-иллюстрация главной страницы

**Файл:** `public/hero.png` или `public/hero.svg`  
**Где:** над или под блоком "Predict the Future on Bitcoin L1" на вкладке Markets.

**Промпт:**

```
Illustration for crypto prediction market landing: abstract dashboard with candlesticks, YES/NO odds bars, and Bitcoin orange accent. Dark theme, purple and orange gradients, no people. Wide format, modern UI illustration style, fits above or below a headline.
```

---

### 4. Empty states (иллюстрации вместо только иконок)

Сейчас везде только Lucide-иконки. Можно добавить одну универсальную иллюстрацию «пусто» или отдельные под контекст.

#### 4.1 Универсальная «пусто»

**Файл:** `public/empty-state.svg` или `public/empty-state.png`  
**Где:** No markets found, No predictions yet, No predictors yet, Connect wallet (общий вариант).

**Промпт:**

```
Friendly empty state illustration: simple crypto/fintech scene — wallet or chart with a soft "nothing here yet" vibe. Dark background compatible, orange and gray accents, minimal, no text. Works as 200x200 or 300x300 asset for empty lists.
```

#### 4.2 Подключи кошелёк

**Файл:** `public/connect-wallet.png`  
**Где:** Portfolio, VaultDashboard, WalletPanel — экраны "Connect Your Wallet" / "Connect wallet".

**Промпт:**

```
Illustration "connect wallet": stylized wallet or phone with connection dots/rays, Bitcoin orange and blue accent. Dark UI style, encouraging and clear. No text. Square or vertical format, ~300px height.
```

#### 4.3 Нет ставок / нет рынков

**Файл:** `public/no-bets.png`  
**Где:** Portfolio "No predictions yet", Markets "No markets found", Leaderboard "No predictors yet".

**Промпт:**

```
Empty state for prediction app: minimal chart or ticket with a small "zero" or empty state hint. Dark theme, orange accent, friendly and minimal. No text. ~250x250px.
```

---

### 5. How It Works — схема/иллюстрация

**Файл:** `public/how-it-works.png` или `public/how-it-works.svg`  
**Где:** секция HowItWorks (4 шага: Choose market → Buy shares → AI Analysis → Collect payout).

**Промпт:**

```
Single illustration: 4-step flow for prediction market — 1) browse markets, 2) buy YES/NO shares, 3) AI analysis, 4) collect payout. Simple icons or small scenes in one horizontal strip. Dark background, Bitcoin orange and purple, no text. Wide format ~800x200 or 600x250.
```

---

### 6. Аватар Bob AI (опционально)

**Файл:** `public/bob-avatar.png` или `public/bob-avatar.svg`  
**Где:** AIChat — сейчас аватар = градиент + BrainCircuit. Можно заменить на картинку.

**Промпт:**

```
Friendly AI assistant avatar for "Bob": abstract robot or brain-chip character, purple and orange accent, tech style. Square, works at 80x80px. No text. Slightly playful but professional.
```

---

### 7. Страница 404

**Файл:** `public/404.png` или `public/404.svg`  
**Где:** `public/404.html` или роут 404 во фронте.

**Промпт:**

```
404 page illustration: lost Bitcoin coin or broken link symbol in a dark, minimal scene. Orange accent, subtle humor. No text. ~400x300 or 300x300.
```

---

### 8. PWA / App icons (если будет PWA)

**Файлы:** `public/icon-192.png`, `public/icon-512.png`  
**Где:** будущий `manifest.json` для "Add to Home Screen".

**Промпт (тот же, что для логотипа, но в двух размерах):**

```
App icon for BitPredict: Bitcoin symbol merged with prediction/chart element. Orange gradient, flat, no text. Square 512x512, works when scaled down to 192 and 96.
```

---

## Приоритеты

| Приоритет | Что | Зачем |
|-----------|-----|--------|
| **Высокий** | `screen.png` (OG/Twitter) | Превью в соцсетях и мессенджерах; сейчас ссылка на внешний URL |
| **Средний** | Empty states (хотя бы одна общая или connect-wallet) | Более дружелюбный UI при пустых списках и до подключения кошелька |
| **Средний** | Hero-иллюстрация | Усиление главного экрана |
| **Низкий** | Логотип, Bob avatar, How It Works, 404, PWA icons | Полировка и брендинг |

---

## Куда положить файлы

- Все статичные картинки — в **`public/`**.
- Подключение: в HTML — `<img src="/screen.png">`, в React — `<img src="/screen.png" />` или `import url from '/screen.png'` при необходимости.
- После добавления `public/screen.png` можно в `index.html` заменить `https://bitpredict.club/screen.png` на `/screen.png` (или оставить полный URL продакшена, если картинка отдаётся с того же домена).
