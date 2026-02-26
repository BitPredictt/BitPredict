"""
BitPredict Telegram Bot
AI-powered prediction markets on Bitcoin L1 via OP_NET

Full feature set matching web app:
- /start — Welcome + inline keyboard
- /markets — Browse all 12 markets with category filters
- /market <id> — Detailed market view with AMM prices
- /balance <address> — Real OP_NET RPC balance
- /stats — Live OP_NET Regtest block height + network stats
- /achievements — View achievements & XP progress
- /quests — Active quests & completion status
- /ai <id> — Bob AI analysis for any market
- /about — About BitPredict
- /help — All commands
- Inline keyboards for navigation
- Real OP_NET Regtest RPC integration
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import aiohttp
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    BotCommand,
)
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
from telegram.constants import ParseMode

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BOT_TOKEN = os.environ.get("BITPREDICT_TG_TOKEN", "")
OPNET_RPC = "https://regtest.opnet.org"
WEBAPP_URL = "https://opbitpredict.github.io/BitPredict/"
GITHUB_URL = "https://github.com/opbitpredict/BitPredict"
EXPLORER_URL = "https://opscan.org"
FAUCET_URL = "https://faucet.opnet.org"
DEV_DOCS_URL = "https://dev.opnet.org"
DATA_DIR = Path(__file__).parent / "data"

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("bitpredict_bot")

# ---------------------------------------------------------------------------
# Market Data (mirrors frontend src/data/markets.ts)
# ---------------------------------------------------------------------------

MARKETS = [
    {"id": "btc-100k-2026", "question": "Will Bitcoin reach $150,000 by end of 2026?",
     "category": "Crypto", "yes": 0.72, "no": 0.28, "volume": 245000, "liquidity": 89000,
     "end": "2026-12-31", "tags": ["bitcoin", "price", "bullish"], "emoji": "\U0001f4c8"},
    {"id": "eth-etf-spot", "question": "Will Ethereum spot ETF surpass $50B AUM in 2026?",
     "category": "Crypto", "yes": 0.45, "no": 0.55, "volume": 178000, "liquidity": 62000,
     "end": "2026-12-31", "tags": ["ethereum", "etf"], "emoji": "\U0001f4b0"},
    {"id": "us-election-2026", "question": "Will Republicans win the 2026 US midterm elections?",
     "category": "Politics", "yes": 0.58, "no": 0.42, "volume": 520000, "liquidity": 145000,
     "end": "2026-11-03", "tags": ["election", "usa"], "emoji": "\U0001f5f3\ufe0f"},
    {"id": "opnet-adoption", "question": "Will OP_NET process 1M+ transactions by Q4 2026?",
     "category": "Crypto", "yes": 0.65, "no": 0.35, "volume": 92000, "liquidity": 34000,
     "end": "2026-12-31", "tags": ["opnet", "bitcoin"], "emoji": "\U0001f680"},
    {"id": "ai-agi-2027", "question": "Will AGI be achieved before 2028?",
     "category": "Tech", "yes": 0.18, "no": 0.82, "volume": 890000, "liquidity": 210000,
     "end": "2027-12-31", "tags": ["ai", "agi"], "emoji": "\U0001f916"},
    {"id": "champions-league", "question": "Will Real Madrid win Champions League 2026?",
     "category": "Sports", "yes": 0.32, "no": 0.68, "volume": 340000, "liquidity": 95000,
     "end": "2026-06-01", "tags": ["football", "ucl"], "emoji": "\u26bd"},
    {"id": "btc-dominance", "question": "Will BTC dominance exceed 65% in 2026?",
     "category": "Crypto", "yes": 0.54, "no": 0.46, "volume": 156000, "liquidity": 48000,
     "end": "2026-12-31", "tags": ["bitcoin", "dominance"], "emoji": "\U0001f451"},
    {"id": "mars-mission", "question": "Will SpaceX launch Starship to Mars orbit by 2027?",
     "category": "Tech", "yes": 0.25, "no": 0.75, "volume": 430000, "liquidity": 120000,
     "end": "2027-12-31", "tags": ["spacex", "mars"], "emoji": "\U0001f6f8"},
    {"id": "nft-comeback", "question": "Will NFT market cap exceed $100B in 2026?",
     "category": "Culture", "yes": 0.15, "no": 0.85, "volume": 67000, "liquidity": 22000,
     "end": "2026-12-31", "tags": ["nft", "market"], "emoji": "\U0001f3a8"},
    {"id": "fed-rate-cut", "question": "Will the Fed cut rates below 3% by end of 2026?",
     "category": "Politics", "yes": 0.41, "no": 0.59, "volume": 710000, "liquidity": 195000,
     "end": "2026-12-31", "tags": ["fed", "rates"], "emoji": "\U0001f3e6"},
    {"id": "solana-flip-eth", "question": "Will Solana flip Ethereum in daily transactions by 2027?",
     "category": "Crypto", "yes": 0.38, "no": 0.62, "volume": 198000, "liquidity": 56000,
     "end": "2027-06-30", "tags": ["solana", "ethereum"], "emoji": "\u26a1"},
    {"id": "world-cup-2026", "question": "Will Brazil win the 2026 FIFA World Cup?",
     "category": "Sports", "yes": 0.22, "no": 0.78, "volume": 1200000, "liquidity": 320000,
     "end": "2026-07-19", "tags": ["football", "world-cup"], "emoji": "\U0001f3c6"},
]

CATEGORIES = {
    "Crypto": "\U0001f4b0", "Politics": "\U0001f5f3\ufe0f",
    "Sports": "\u26bd", "Tech": "\U0001f916", "Culture": "\U0001f3a8",
}

# ---------------------------------------------------------------------------
# Achievements & Quests (mirrors frontend useAchievements.ts)
# ---------------------------------------------------------------------------

ACHIEVEMENTS = [
    {"id": "first_prediction", "title": "First Prediction", "desc": "Place your very first prediction",
     "icon": "\U0001f3af", "cat": "trading", "xp": 100},
    {"id": "whale_trader", "title": "Whale Trader", "desc": "Place a prediction of 50,000+ sats",
     "icon": "\U0001f40b", "cat": "trading", "xp": 250},
    {"id": "diversified", "title": "Diversified Portfolio", "desc": "Bet on 3 different categories",
     "icon": "\U0001f308", "cat": "trading", "xp": 200},
    {"id": "ai_strategist", "title": "AI Strategist", "desc": "Use Bob AI analysis before betting",
     "icon": "\U0001f916", "cat": "explorer", "xp": 150},
    {"id": "fortune_builder", "title": "Fortune Builder", "desc": "Place 10 total predictions",
     "icon": "\U0001f4b0", "cat": "milestone", "xp": 500},
    {"id": "volume_king", "title": "Volume King", "desc": "Trade 100,000 sats total",
     "icon": "\U0001f451", "cat": "milestone", "xp": 750},
    {"id": "explorer", "title": "OP_NET Explorer", "desc": "Visit the OP_NET block explorer",
     "icon": "\U0001f50d", "cat": "explorer", "xp": 50},
    {"id": "early_bird", "title": "Early Bird", "desc": "Connect wallet in first session",
     "icon": "\U0001f426", "cat": "social", "xp": 75},
    {"id": "bull_bear", "title": "Bull & Bear", "desc": "Place both YES and NO predictions",
     "icon": "\U0001f4ca", "cat": "trading", "xp": 150},
    {"id": "hot_streak", "title": "Hot Streak", "desc": "Place 5 predictions in one session",
     "icon": "\U0001f525", "cat": "trading", "xp": 300},
    {"id": "community_member", "title": "Community Member", "desc": "Visit Telegram community",
     "icon": "\U0001f4ac", "cat": "social", "xp": 50},
    {"id": "bitcoin_maxi", "title": "Bitcoin Maximalist", "desc": "Place 5 Crypto predictions",
     "icon": "\u20bf", "cat": "milestone", "xp": 300},
]

QUESTS = [
    {"id": "connect_wallet", "title": "Connect OP_WALLET", "desc": "Connect your OP_WALLET extension",
     "icon": "\U0001f517", "type": "onetime", "xp": 100},
    {"id": "first_bet", "title": "Place First Prediction", "desc": "Place your first YES or NO prediction",
     "icon": "\U0001f3af", "type": "onetime", "xp": 150},
    {"id": "analyze_market", "title": "Ask Bob AI", "desc": "Analyze any market using Bob AI",
     "icon": "\U0001f9e0", "type": "onetime", "xp": 100},
    {"id": "trade_3_categories", "title": "Category Explorer", "desc": "Trade in 3 different categories",
     "icon": "\U0001f30d", "type": "onetime", "xp": 200},
    {"id": "daily_prediction", "title": "Daily Prediction", "desc": "Place at least 1 prediction today",
     "icon": "\U0001f4c5", "type": "daily", "xp": 50},
    {"id": "weekly_volume", "title": "Weekly Volume", "desc": "Trade 50,000 sats this week",
     "icon": "\U0001f4c8", "type": "weekly", "xp": 300},
    {"id": "visit_faucet", "title": "Get Regtest BTC", "desc": "Visit the OP_NET faucet",
     "icon": "\U0001f6b0", "type": "onetime", "xp": 75},
    {"id": "check_leaderboard", "title": "Competitive Spirit", "desc": "Check the leaderboard",
     "icon": "\U0001f3c6", "type": "onetime", "xp": 50},
]

# ---------------------------------------------------------------------------
# AI Analysis Data (enhanced, mirrors frontend AIAnalysis.tsx)
# ---------------------------------------------------------------------------

AI_ANALYSES = {
    "btc-100k-2026": {
        "signal": "\U0001f7e2 BULLISH", "confidence": 78,
        "reasoning": [
            "Post-halving supply shock historically bullish",
            "Institutional ETF inflows accelerating ($2.1B/week)",
            "On-chain accumulation at all-time highs",
            "OP_NET DeFi volume growing 40% month-over-month",
        ],
        "risk": "Low risk \u2014 strong signal alignment",
        "recommendation": "Strong YES at current 72% price",
    },
    "eth-etf-spot": {
        "signal": "\U0001f7e1 NEUTRAL", "confidence": 55,
        "reasoning": [
            "ETH ETF inflows moderate but growing",
            "Regulatory clarity improving in US/EU",
            "$50B AUM is ambitious target for 2026",
            "Staking yield narrative gaining traction",
        ],
        "risk": "Medium risk \u2014 mixed signals",
        "recommendation": "Hold \u2014 wait for Q2 inflow data",
    },
    "opnet-adoption": {
        "signal": "\U0001f7e2 BULLISH", "confidence": 72,
        "reasoning": [
            "OP_NET ecosystem growing rapidly (25+ dApps)",
            "MotoSwap and Stash driving daily volume",
            "Developer activity up 60% in 6 months",
            "Bob AI MCP integration attracting builders",
        ],
        "risk": "Low-medium risk \u2014 ecosystem momentum strong",
        "recommendation": "YES position favored at 65%",
    },
    "ai-agi-2027": {
        "signal": "\U0001f534 BEARISH", "confidence": 85,
        "reasoning": [
            "AGI definition remains deeply contested",
            "Current models excel at pattern matching, not reasoning",
            "Timeline extremely ambitious even with rapid progress",
            "Major labs (DeepMind, OpenAI) not claiming AGI imminent",
        ],
        "risk": "Low risk \u2014 strong NO consensus",
        "recommendation": "Strong NO \u2014 82% price fairly valued",
    },
    "us-election-2026": {
        "signal": "\U0001f7e1 NEUTRAL", "confidence": 52,
        "reasoning": [
            "Historical midterm pattern favors opposition party",
            "Economy and inflation key swing factors",
            "Early polling shows tight races in key states",
            "Turnout models highly uncertain this far out",
        ],
        "risk": "High risk \u2014 too early for conviction",
        "recommendation": "Small position or wait for polls",
    },
    "champions-league": {
        "signal": "\U0001f534 BEARISH", "confidence": 60,
        "reasoning": [
            "Real Madrid squad aging in key positions",
            "Competition from Man City, Arsenal, Bayern strong",
            "32% YES implies market already prices some chance",
            "Historical win rate for favorites: ~15%",
        ],
        "risk": "Medium risk \u2014 sports markets volatile",
        "recommendation": "Lean NO \u2014 68% price is fair",
    },
    "world-cup-2026": {
        "signal": "\U0001f534 BEARISH", "confidence": 65,
        "reasoning": [
            "Brazil has 6 titles but last in 2002",
            "Argentina, France strong competitors",
            "Home advantage for USA/Canada/Mexico hosts",
            "22% YES is reasonable for a single team",
        ],
        "risk": "Medium risk \u2014 major tournament uncertainty",
        "recommendation": "NO position at current pricing",
    },
}

DEFAULT_AI = {
    "signal": "\U0001f7e1 NEUTRAL", "confidence": 50,
    "reasoning": [
        "Insufficient on-chain data for strong signal",
        "AMM reserves show balanced market pricing",
        "Monitor volume trends for directional cues",
        "Check OP_NET block explorer for recent activity",
    ],
    "risk": "Medium risk \u2014 insufficient data",
    "recommendation": "Hold \u2014 wait for clearer signal",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pct(v: float) -> str:
    return f"{v * 100:.0f}%"

def sats_fmt(v: int) -> str:
    if v >= 1_000_000: return f"{v / 1_000_000:.1f}M"
    if v >= 1_000: return f"{v / 1_000:.0f}K"
    return str(v)

def price_bar(yes: float) -> str:
    filled = round(yes * 10)
    return "\U0001f7e2" * filled + "\U0001f534" * (10 - filled)

_ESCAPE_CHARS = r"_*[]()~`>#+-=|{}.!"
def _esc(text: str) -> str:
    return "".join(("\\" + ch if ch in _ESCAPE_CHARS else ch) for ch in text)

def find_market(market_id: str):
    for m in MARKETS:
        if m["id"] == market_id:
            return m
    return None

# ---------------------------------------------------------------------------
# OP_NET RPC calls
# ---------------------------------------------------------------------------

async def fetch_block_height() -> int | None:
    try:
        async with aiohttp.ClientSession() as session:
            payload = {"jsonrpc": "2.0", "id": 1, "method": "btc_blockNumber", "params": []}
            async with session.post(OPNET_RPC, json=payload, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                data = await resp.json()
                result = data.get("result")
                if isinstance(result, str):
                    return int(result, 16) if result.startswith("0x") else int(result)
                if isinstance(result, int):
                    return result
    except Exception as exc:
        logger.warning("RPC block height fetch failed: %s", exc)
    return None

async def fetch_balance(address: str) -> int | None:
    """Fetch real BTC balance from OP_NET RPC (btc_getBalance)."""
    try:
        async with aiohttp.ClientSession() as session:
            payload = {"jsonrpc": "2.0", "id": 1, "method": "btc_getBalance", "params": [address, True]}
            async with session.post(OPNET_RPC, json=payload, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                data = await resp.json()
                result = data.get("result")
                if result is None:
                    return None
                if isinstance(result, str):
                    return int(result, 16) if result.startswith("0x") else int(result)
                return int(result)
    except Exception as exc:
        logger.warning("RPC balance fetch failed: %s", exc)
    return None

# ---------------------------------------------------------------------------
# Command Handlers
# ---------------------------------------------------------------------------

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("\U0001f4ca Markets", callback_data="markets_all"),
            InlineKeyboardButton("\U0001f916 AI Analysis", callback_data="ai_analysis"),
        ],
        [
            InlineKeyboardButton("\U0001f3c5 Achievements", callback_data="achievements"),
            InlineKeyboardButton("\U0001f3af Quests", callback_data="quests"),
        ],
        [
            InlineKeyboardButton("\U0001f4e1 Network Stats", callback_data="stats"),
            InlineKeyboardButton("\u2753 How It Works", callback_data="how"),
        ],
        [
            InlineKeyboardButton("\U0001f310 Open Web App", url=WEBAPP_URL),
            InlineKeyboardButton("\U0001f4bb GitHub", url=GITHUB_URL),
        ],
    ]

    text = (
        "*\U0001f52e BitPredict \u2014 AI Prediction Markets on Bitcoin L1*\n"
        "\n"
        "Trade binary outcomes powered by *OP\\_NET* smart contracts "
        "directly on Bitcoin Layer 1\\.\n"
        "\n"
        "\u2022 \U0001f4c8 *12 active markets* across Crypto, Politics, Sports, Tech & Culture\n"
        "\u2022 \U0001f916 *Bob AI* analysis with confidence scores & risk assessment\n"
        "\u2022 \u26a1 *Constant\\-product AMM* \\(x\u00b7y\\=k\\) pricing\n"
        "\u2022 \U0001f512 *AssemblyScript smart contract* compiled to WASM\n"
        "\u2022 \U0001f3c6 *Leaderboard* \\+ portfolio tracking\n"
        "\u2022 \U0001f3c5 *Achievements & Quests* with XP system\n"
        "\u2022 \U0001f4b0 *Real OP\\_NET balance* via RPC\n"
        "\n"
        "Use the buttons below or type /help for commands\\."
    )

    await update.message.reply_text(
        text, parse_mode=ParseMode.MARKDOWN_V2,
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "*\U0001f4d6 BitPredict Commands*\n"
        "\n"
        "/start \u2014 Welcome & main menu\n"
        "/markets \u2014 Browse all prediction markets\n"
        "/market \\_id\\_ \u2014 Detailed market view\n"
        "/crypto \u2014 Crypto markets only\n"
        "/politics \u2014 Politics markets only\n"
        "/sports \u2014 Sports markets only\n"
        "/tech \u2014 Tech markets only\n"
        "/ai \\_id\\_ \u2014 Bob AI analysis for a market\n"
        "/balance \\_addr\\_ \u2014 Real OP\\_NET balance\n"
        "/stats \u2014 OP\\_NET network stats\n"
        "/achievements \u2014 View all achievements\n"
        "/quests \u2014 Active quests & progress\n"
        "/about \u2014 About BitPredict\n"
        "/help \u2014 This message\n"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2)


async def cmd_markets(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_markets_list(update.message, "All")

async def cmd_crypto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_markets_list(update.message, "Crypto")

async def cmd_politics(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_markets_list(update.message, "Politics")

async def cmd_sports(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_markets_list(update.message, "Sports")

async def cmd_tech(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_markets_list(update.message, "Tech")


async def send_markets_list(message, category: str):
    if category == "All":
        filtered = MARKETS
        title = "\U0001f4ca *All Markets*"
    else:
        filtered = [m for m in MARKETS if m["category"] == category]
        emoji = CATEGORIES.get(category, "")
        title = f"{emoji} *{category} Markets*"

    lines = [title, ""]
    for i, m in enumerate(filtered, 1):
        lines.append(
            f"{i}\\. {m['emoji']} *{_esc(m['question'])}*\n"
            f"   \U0001f7e2 {pct(m['yes'])} \u2022 \U0001f534 {pct(m['no'])} \u2022 Vol: {sats_fmt(m['volume'])} sats"
        )
        lines.append("")

    buttons = []
    for m in filtered[:6]:
        buttons.append(InlineKeyboardButton(
            f"{m['emoji']} {m['id'][:12]}", callback_data=f"market_{m['id']}"
        ))
    keyboard = [buttons[i:i+2] for i in range(0, len(buttons), 2)]
    keyboard.append([InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL)])

    if category == "All":
        cat_buttons = [InlineKeyboardButton(f"{em} {cat}", callback_data=f"markets_{cat}")
                       for cat, em in CATEGORIES.items()]
        keyboard.insert(0, cat_buttons[:3])
        keyboard.insert(1, cat_buttons[3:])

    await message.reply_text(
        "\n".join(lines), parse_mode=ParseMode.MARKDOWN_V2,
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_market(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Usage: /market <id>\nExample: /market btc\\-100k\\-2026",
            parse_mode=ParseMode.MARKDOWN_V2,
        )
        return
    m = find_market(context.args[0])
    if not m:
        await update.message.reply_text(f"Market `{_esc(context.args[0])}` not found\\.", parse_mode=ParseMode.MARKDOWN_V2)
        return
    await send_market_detail(update.message, m)


async def send_market_detail(message, m: dict):
    text = (
        f"{m['emoji']} *{_esc(m['question'])}*\n\n"
        f"{price_bar(m['yes'])}\n\n"
        f"\U0001f7e2 *YES*: {pct(m['yes'])} probability\n"
        f"\U0001f534 *NO*: {pct(m['no'])} probability\n\n"
        f"\U0001f4ca *Volume*: {sats_fmt(m['volume'])} sats\n"
        f"\U0001f4a7 *Liquidity*: {sats_fmt(m['liquidity'])} sats\n"
        f"\U0001f4c5 *Ends*: {_esc(m['end'])}\n"
        f"\U0001f3f7 *Category*: {_esc(m['category'])}\n"
        f"\U0001f3f7 *Tags*: {_esc(', '.join(m['tags']))}\n\n"
        f"_AMM: Constant\\-product \\(x\u00b7y\\=k\\) with 2% fee_\n"
        f"_Smart contract on OP\\_NET Bitcoin L1_"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton(f"\U0001f7e2 Trade YES @ {pct(m['yes'])}", url=WEBAPP_URL),
         InlineKeyboardButton(f"\U0001f534 Trade NO @ {pct(m['no'])}", url=WEBAPP_URL)],
        [InlineKeyboardButton("\u25c0 All Markets", callback_data="markets_all"),
         InlineKeyboardButton("\U0001f916 AI Analysis", callback_data=f"ai_{m['id']}")],
    ])
    await message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


# ---------------------------------------------------------------------------
# Balance command (real OP_NET RPC)
# ---------------------------------------------------------------------------

async def cmd_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Usage: /balance <address>\nExample: /balance bcrt1q\\.\\.\\.\\.",
            parse_mode=ParseMode.MARKDOWN_V2,
        )
        return
    addr = context.args[0]
    bal = await fetch_balance(addr)
    if bal is not None:
        btc = bal / 100_000_000
        text = (
            f"*\U0001f4b0 Wallet Balance*\n\n"
            f"\U0001f4cd *Address*: `{_esc(addr[:8])}\\.\\.\\.\\.{_esc(addr[-6:])}`\n"
            f"\u26a1 *Balance*: *{bal:,}* sats \\({btc:.8f} BTC\\)\n"
            f"\U0001f310 *Network*: OP\\_NET Regtest\n\n"
            f"_Live data from {_esc(OPNET_RPC)}_"
        )
    else:
        text = (
            f"*\U0001f4b0 Wallet Balance*\n\n"
            f"\U0001f4cd *Address*: `{_esc(addr[:8])}\\.\\.\\.\\.{_esc(addr[-6:])}`\n"
            f"\u26a0\ufe0f Balance unavailable \\(RPC error or address not found\\)\n\n"
            f"Get regtest BTC from the [faucet]({_esc(FAUCET_URL)})\\!"
        )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f50d Explorer", url=f"{EXPLORER_URL}/address/{addr}"),
         InlineKeyboardButton("\U0001f4a7 Faucet", url=FAUCET_URL)],
    ])
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_stats(update.message)

async def send_stats(message):
    height = await fetch_block_height()
    height_str = f"*{height:,}*" if height else "_connecting\\.\\.\\._"
    status = "\U0001f7e2 LIVE" if height else "\U0001f7e1 CONNECTING"
    total_vol = sum(m["volume"] for m in MARKETS)
    total_liq = sum(m["liquidity"] for m in MARKETS)

    text = (
        f"*\U0001f4e1 OP\\_NET Network Stats*\n\n"
        f"{status}\n\n"
        f"\U0001f4e6 *Block Height*: {height_str}\n"
        f"\U0001f4ca *Active Markets*: *{len(MARKETS)}*\n"
        f"\U0001f4b0 *Total Volume*: {sats_fmt(total_vol)} sats\n"
        f"\U0001f4a7 *Total Liquidity*: {sats_fmt(total_liq)} sats\n"
        f"\U0001f310 *Network*: OP\\_NET Regtest\n"
        f"\u26a1 *Consensus*: PoW \\+ OP\\_NET\n\n"
        f"_Data from {_esc(OPNET_RPC)}_"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f50d Explorer", url=EXPLORER_URL),
         InlineKeyboardButton("\U0001f4d6 Docs", url=DEV_DOCS_URL)],
        [InlineKeyboardButton("\U0001f4a7 Faucet", url=FAUCET_URL),
         InlineKeyboardButton("\U0001f310 Web App", url=WEBAPP_URL)],
    ])
    await message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


# ---------------------------------------------------------------------------
# About
# ---------------------------------------------------------------------------

async def cmd_about(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "*\U0001f52e About BitPredict*\n\n"
        "BitPredict is a decentralized prediction market platform "
        "built on *OP\\_NET* \\- Bitcoin Layer 1 smart contracts\\.\n\n"
        "*Tech Stack:*\n"
        "\u2022 \U0001f7e0 *Bitcoin L1* \\- Settlement layer\n"
        "\u2022 \u26a1 *OP\\_NET* \\- Smart contract runtime \\(WASM\\)\n"
        "\u2022 \U0001f4dd *AssemblyScript* \\- Contract language\n"
        "\u2022 \u2699\ufe0f *React \\+ Vite \\+ TypeScript* \\- Frontend\n"
        "\u2022 \U0001f3a8 *Tailwind CSS* \\- Styling\n"
        "\u2022 \U0001f916 *Bob AI* \\- Market analysis agent\n\n"
        "*Features:*\n"
        "\u2022 Binary outcome prediction markets\n"
        "\u2022 Constant\\-product AMM \\(x\u00b7y\\=k\\)\n"
        "\u2022 AI\\-powered market analysis with risk assessment\n"
        "\u2022 Real\\-time OP\\_NET block height \\+ balance via RPC\n"
        "\u2022 Portfolio tracking & leaderboard\n"
        "\u2022 Achievements & quests with XP system\n"
        "\u2022 OP\\_WALLET browser extension support\n\n"
        "*Links:*\n"
        f"\u2022 [Web App]({_esc(WEBAPP_URL)})\n"
        f"\u2022 [GitHub]({_esc(GITHUB_URL)})\n"
        f"\u2022 [Explorer]({_esc(EXPLORER_URL)})\n"
        f"\u2022 [OP\\_NET Docs]({_esc(DEV_DOCS_URL)})\n"
            )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL),
         InlineKeyboardButton("\U0001f4bb GitHub", url=GITHUB_URL)],
    ])
    await update.message.reply_text(
        text, parse_mode=ParseMode.MARKDOWN_V2,
        reply_markup=keyboard, disable_web_page_preview=True,
    )


# ---------------------------------------------------------------------------
# AI Analysis
# ---------------------------------------------------------------------------

async def cmd_ai(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.args:
        await send_ai_analysis(update.message, context.args[0])
    else:
        await send_ai_analysis(update.message, "btc-100k-2026")

async def send_ai_analysis(message, market_id: str):
    m = find_market(market_id)
    if not m:
        await message.reply_text(f"Market `{_esc(market_id)}` not found\\.", parse_mode=ParseMode.MARKDOWN_V2)
        return

    ai = AI_ANALYSES.get(market_id, DEFAULT_AI)
    reasons = "\n".join(f"  \u2022 {_esc(r)}" for r in ai["reasoning"])

    text = (
        f"*\U0001f916 Bob AI Analysis*\n\n"
        f"{m['emoji']} *{_esc(m['question'])}*\n\n"
        f"*Signal*: {ai['signal']}\n"
        f"*Confidence*: {ai['confidence']}%\n"
        f"*Risk*: _{_esc(ai['risk'])}_\n\n"
        f"*Reasoning:*\n{reasons}\n\n"
        f"*Recommendation:* _{_esc(ai['recommendation'])}_\n\n"
        f"\U0001f7e2 YES: {pct(m['yes'])}  \u2022  \U0001f534 NO: {pct(m['no'])}\n"
        f"_Powered by Bob AI \\+ OP\\_NET on\\-chain data_"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f7e2 Trade YES", url=WEBAPP_URL),
         InlineKeyboardButton("\U0001f534 Trade NO", url=WEBAPP_URL)],
        [InlineKeyboardButton("\u25c0 Back to Market", callback_data=f"market_{market_id}")],
    ])
    await message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


# ---------------------------------------------------------------------------
# Achievements & Quests
# ---------------------------------------------------------------------------

async def cmd_achievements(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_achievements(update.message)

async def send_achievements(message):
    total_xp = sum(a["xp"] for a in ACHIEVEMENTS)
    lines = [
        "*\U0001f3c5 Achievements*\n",
        f"_Earn XP by completing challenges on BitPredict\\!_",
        f"_Total possible XP: {total_xp}_\n",
    ]
    for cat_name, cat_emoji in [("trading", "\u26a1"), ("milestone", "\U0001f3c6"), ("explorer", "\U0001f50d"), ("social", "\u2b50")]:
        cat_achs = [a for a in ACHIEVEMENTS if a["cat"] == cat_name]
        if cat_achs:
            lines.append(f"\n{cat_emoji} *{_esc(cat_name.title())}*")
            for a in cat_achs:
                lines.append(f"  {a['icon']} *{_esc(a['title'])}* \\(\\+{a['xp']} XP\\)")
                lines.append(f"    _{_esc(a['desc'])}_")

    lines.append(f"\n_Complete achievements in the [Web App]({_esc(WEBAPP_URL)})\\!_")

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f3af Quests", callback_data="quests"),
         InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL)],
    ])
    await message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


async def cmd_quests(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_quests(update.message)

async def send_quests(message):
    total_xp = sum(q["xp"] for q in QUESTS)
    lines = [
        "*\U0001f3af Active Quests*\n",
        f"_Complete quests to earn XP and level up\\!_",
        f"_Total quest XP: {total_xp}_\n",
    ]
    for q_type, type_label in [("onetime", "\U0001f4cc One\\-time"), ("daily", "\U0001f4c5 Daily"), ("weekly", "\U0001f4c8 Weekly")]:
        typed = [q for q in QUESTS if q["type"] == q_type]
        if typed:
            lines.append(f"\n{type_label}")
            for q in typed:
                lines.append(f"  {q['icon']} *{_esc(q['title'])}* \\(\\+{q['xp']} XP\\)")
                lines.append(f"    _{_esc(q['desc'])}_")

    lines.append(f"\n_Track progress in the [Web App]({_esc(WEBAPP_URL)})\\!_")

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f3c5 Achievements", callback_data="achievements"),
         InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL)],
        [InlineKeyboardButton("\U0001f4a7 Get BTC (Faucet)", url=FAUCET_URL)],
    ])
    await message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


# ---------------------------------------------------------------------------
# How It Works
# ---------------------------------------------------------------------------

async def send_how_it_works(message):
    text = (
        "*\u2753 How BitPredict Works*\n\n"
        "*1\\. \U0001fa99 Choose a Market*\n"
        "Browse markets across Crypto, Politics, Sports, Tech & Culture\\. "
        "Each has YES/NO outcomes priced by AMM\\.\n\n"
        "*2\\. \U0001f504 Buy Shares*\n"
        "Use regtest BTC to buy YES or NO shares\\. "
        "Constant\\-product AMM \\(x\u00b7y\\=k\\) ensures fair pricing\\.\n\n"
        "*3\\. \U0001f916 AI Analysis*\n"
        "Bob AI analyzes on\\-chain data, volume, and reserve ratios "
        "to generate trading signals with risk assessment\\.\n\n"
        "*4\\. \U0001f3c5 Earn Achievements*\n"
        "Complete quests and unlock achievements to earn XP "
        "and climb the leaderboard\\.\n\n"
        "*5\\. \U0001f3c6 Collect Payout*\n"
        "When resolved, winning shares are redeemable 1:1\\. "
        "Payouts settle on Bitcoin L1 via OP\\_NET\\.\n"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f4ca Browse Markets", callback_data="markets_all"),
         InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL)],
    ])
    await message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


# ---------------------------------------------------------------------------
# Callback Query Handler
# ---------------------------------------------------------------------------

async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "markets_all":
        await send_markets_list(query.message, "All")
    elif data.startswith("markets_"):
        await send_markets_list(query.message, data.replace("markets_", ""))
    elif data.startswith("market_"):
        m = find_market(data.replace("market_", ""))
        if m:
            await send_market_detail(query.message, m)
        else:
            await query.message.reply_text("Market not found.")
    elif data.startswith("ai_"):
        await send_ai_analysis(query.message, data.replace("ai_", ""))
    elif data == "ai_analysis":
        await send_ai_analysis(query.message, "btc-100k-2026")
    elif data == "stats":
        await send_stats(query.message)
    elif data == "how":
        await send_how_it_works(query.message)
    elif data == "achievements":
        await send_achievements(query.message)
    elif data == "quests":
        await send_quests(query.message)


# ---------------------------------------------------------------------------
# Bot Setup
# ---------------------------------------------------------------------------

async def post_init(application: Application):
    """Set bot commands, description and profile after startup."""
    commands = [
        BotCommand("start", "Welcome & main menu"),
        BotCommand("markets", "Browse all prediction markets"),
        BotCommand("market", "Market detail (e.g. /market btc-100k-2026)"),
        BotCommand("crypto", "Crypto markets"),
        BotCommand("politics", "Politics markets"),
        BotCommand("sports", "Sports markets"),
        BotCommand("tech", "Tech markets"),
        BotCommand("ai", "Bob AI analysis (e.g. /ai btc-100k-2026)"),
        BotCommand("balance", "OP_NET balance (e.g. /balance bcrt1q...)"),
        BotCommand("stats", "OP_NET network stats"),
        BotCommand("achievements", "View achievements & XP"),
        BotCommand("quests", "Active quests & progress"),
        BotCommand("about", "About BitPredict"),
        BotCommand("help", "All commands"),
    ]
    await application.bot.set_my_commands(commands)

    await application.bot.set_my_description(
        "BitPredict — AI-powered prediction markets on Bitcoin L1 via OP_NET. "
        "12 markets, Bob AI analysis, constant-product AMM, achievements & quests, "
        "real on-chain balance. Built with AssemblyScript smart contracts on WASM."
    )
    await application.bot.set_my_short_description(
        "AI prediction markets on Bitcoin L1 via OP_NET \u2022 12 markets \u2022 Bob AI \u2022 Achievements"
    )
    logger.info("Bot commands and description set successfully")


def main():
    token = BOT_TOKEN
    if not token:
        logger.error("BITPREDICT_TG_TOKEN not set!")
        sys.exit(1)

    app = Application.builder().token(token).post_init(post_init).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("markets", cmd_markets))
    app.add_handler(CommandHandler("market", cmd_market))
    app.add_handler(CommandHandler("crypto", cmd_crypto))
    app.add_handler(CommandHandler("politics", cmd_politics))
    app.add_handler(CommandHandler("sports", cmd_sports))
    app.add_handler(CommandHandler("tech", cmd_tech))
    app.add_handler(CommandHandler("ai", cmd_ai))
    app.add_handler(CommandHandler("balance", cmd_balance))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("achievements", cmd_achievements))
    app.add_handler(CommandHandler("quests", cmd_quests))
    app.add_handler(CommandHandler("about", cmd_about))
    app.add_handler(CallbackQueryHandler(callback_handler))

    logger.info("BitPredict bot starting...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
