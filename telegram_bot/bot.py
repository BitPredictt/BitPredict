"""
BitPredict Telegram Bot
AI-powered prediction markets on Bitcoin L1 via OP_NET

Features:
- /start — Welcome message with inline keyboard
- /markets — Browse active prediction markets
- /market <id> — Detailed market info with AMM prices
- /portfolio — View portfolio (wallet required)
- /stats — OP_NET network stats (live block height)
- /about — About BitPredict
- /help — All commands
- Inline keyboards for navigation
- Live OP_NET regtest block height via RPC
"""

import os
import sys
import json
import logging
import asyncio
from datetime import datetime, timezone

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
TELEGRAM_COMMUNITY = "https://t.me/opnetbtc"

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("bitpredict_bot")

# ---------------------------------------------------------------------------
# Market Data (mirrors frontend src/data/markets.ts)
# ---------------------------------------------------------------------------

MARKETS = [
    {
        "id": "btc-100k-2026",
        "question": "Will Bitcoin reach $150,000 by end of 2026?",
        "category": "Crypto",
        "yes": 0.72, "no": 0.28,
        "volume": 245000, "liquidity": 89000,
        "end": "2026-12-31",
        "tags": ["bitcoin", "price", "bullish"],
        "emoji": "\U0001f4c8",
    },
    {
        "id": "eth-etf-spot",
        "question": "Will Ethereum spot ETF surpass $50B AUM in 2026?",
        "category": "Crypto",
        "yes": 0.45, "no": 0.55,
        "volume": 178000, "liquidity": 62000,
        "end": "2026-12-31",
        "tags": ["ethereum", "etf"],
        "emoji": "\U0001f4b0",
    },
    {
        "id": "us-election-2026",
        "question": "Will Republicans win the 2026 US midterm elections?",
        "category": "Politics",
        "yes": 0.58, "no": 0.42,
        "volume": 520000, "liquidity": 145000,
        "end": "2026-11-03",
        "tags": ["election", "usa"],
        "emoji": "\U0001f5f3\ufe0f",
    },
    {
        "id": "opnet-adoption",
        "question": "Will OP_NET process 1M+ transactions by Q4 2026?",
        "category": "Crypto",
        "yes": 0.65, "no": 0.35,
        "volume": 92000, "liquidity": 34000,
        "end": "2026-12-31",
        "tags": ["opnet", "bitcoin"],
        "emoji": "\U0001f680",
    },
    {
        "id": "ai-agi-2027",
        "question": "Will AGI be achieved before 2028?",
        "category": "Tech",
        "yes": 0.18, "no": 0.82,
        "volume": 890000, "liquidity": 210000,
        "end": "2027-12-31",
        "tags": ["ai", "agi"],
        "emoji": "\U0001f916",
    },
    {
        "id": "champions-league",
        "question": "Will Real Madrid win Champions League 2026?",
        "category": "Sports",
        "yes": 0.32, "no": 0.68,
        "volume": 340000, "liquidity": 95000,
        "end": "2026-06-01",
        "tags": ["football", "ucl"],
        "emoji": "\u26bd",
    },
    {
        "id": "btc-dominance",
        "question": "Will BTC dominance exceed 65% in 2026?",
        "category": "Crypto",
        "yes": 0.54, "no": 0.46,
        "volume": 156000, "liquidity": 48000,
        "end": "2026-12-31",
        "tags": ["bitcoin", "dominance"],
        "emoji": "\U0001f451",
    },
    {
        "id": "mars-mission",
        "question": "Will SpaceX launch Starship to Mars orbit by 2027?",
        "category": "Tech",
        "yes": 0.25, "no": 0.75,
        "volume": 430000, "liquidity": 120000,
        "end": "2027-12-31",
        "tags": ["spacex", "mars"],
        "emoji": "\U0001f6f8",
    },
    {
        "id": "nft-comeback",
        "question": "Will NFT market cap exceed $100B in 2026?",
        "category": "Culture",
        "yes": 0.15, "no": 0.85,
        "volume": 67000, "liquidity": 22000,
        "end": "2026-12-31",
        "tags": ["nft", "market"],
        "emoji": "\U0001f3a8",
    },
    {
        "id": "fed-rate-cut",
        "question": "Will the Fed cut rates below 3% by end of 2026?",
        "category": "Politics",
        "yes": 0.41, "no": 0.59,
        "volume": 710000, "liquidity": 195000,
        "end": "2026-12-31",
        "tags": ["fed", "rates"],
        "emoji": "\U0001f3e6",
    },
    {
        "id": "solana-flip-eth",
        "question": "Will Solana flip Ethereum in daily transactions by 2027?",
        "category": "Crypto",
        "yes": 0.38, "no": 0.62,
        "volume": 198000, "liquidity": 56000,
        "end": "2027-06-30",
        "tags": ["solana", "ethereum"],
        "emoji": "\u26a1",
    },
    {
        "id": "world-cup-2026",
        "question": "Will Brazil win the 2026 FIFA World Cup?",
        "category": "Sports",
        "yes": 0.22, "no": 0.78,
        "volume": 1200000, "liquidity": 320000,
        "end": "2026-07-19",
        "tags": ["football", "world-cup"],
        "emoji": "\U0001f3c6",
    },
]

CATEGORIES = {
    "Crypto": "\U0001f4b0",
    "Politics": "\U0001f5f3\ufe0f",
    "Sports": "\u26bd",
    "Tech": "\U0001f916",
    "Culture": "\U0001f3a8",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pct(v: float) -> str:
    return f"{v * 100:.0f}%"


def sats_fmt(v: int) -> str:
    if v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v / 1_000:.0f}K"
    return str(v)


def price_bar(yes: float) -> str:
    filled = round(yes * 10)
    return "\U0001f7e2" * filled + "\U0001f534" * (10 - filled)


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
        logger.warning("RPC fetch failed: %s", exc)
    return None


def find_market(market_id: str):
    for m in MARKETS:
        if m["id"] == market_id:
            return m
    return None


def market_card(m: dict) -> str:
    return (
        f"{m['emoji']} *{m['question']}*\n"
        f"\n"
        f"{price_bar(m['yes'])}\n"
        f"\U0001f7e2 YES: *{pct(m['yes'])}*  \u2022  \U0001f534 NO: *{pct(m['no'])}*\n"
        f"\U0001f4ca Vol: {sats_fmt(m['volume'])} sats  \u2022  \U0001f4a7 Liq: {sats_fmt(m['liquidity'])} sats\n"
        f"\U0001f4c5 Ends: {m['end']}  \u2022  \U0001f3f7 {m['category']}\n"
    )


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
        "\u2022 \U0001f916 *Bob AI* analysis with confidence scores\n"
        "\u2022 \u26a1 *Constant\\-product AMM* \\(x\u00b7y\\=k\\) pricing\n"
        "\u2022 \U0001f512 *AssemblyScript smart contract* compiled to WASM\n"
        "\u2022 \U0001f3c6 *Leaderboard* \\+ portfolio tracking\n"
        "\n"
        "Use the buttons below or type /help for commands\\."
    )

    await update.message.reply_text(
        text,
        parse_mode=ParseMode.MARKDOWN_V2,
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
        "/stats \u2014 OP\\_NET network stats\n"
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
            f"{m['emoji']} {m['id'][:12]}",
            callback_data=f"market_{m['id']}"
        ))

    keyboard = [buttons[i:i+2] for i in range(0, len(buttons), 2)]
    keyboard.append([
        InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL),
    ])

    # Category filter row
    if category == "All":
        cat_buttons = []
        for cat, em in CATEGORIES.items():
            cat_buttons.append(InlineKeyboardButton(f"{em} {cat}", callback_data=f"markets_{cat}"))
        keyboard.insert(0, cat_buttons[:3])
        keyboard.insert(1, cat_buttons[3:])

    await message.reply_text(
        "\n".join(lines),
        parse_mode=ParseMode.MARKDOWN_V2,
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_market(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Usage: /market <id>\nExample: /market btc\\-100k\\-2026",
            parse_mode=ParseMode.MARKDOWN_V2,
        )
        return
    market_id = context.args[0]
    m = find_market(market_id)
    if not m:
        await update.message.reply_text(f"Market `{_esc(market_id)}` not found\\.", parse_mode=ParseMode.MARKDOWN_V2)
        return
    await send_market_detail(update.message, m)


async def send_market_detail(message, m: dict):
    text = (
        f"{m['emoji']} *{_esc(m['question'])}*\n"
        f"\n"
        f"{price_bar(m['yes'])}\n"
        f"\n"
        f"\U0001f7e2 *YES*: {pct(m['yes'])} probability\n"
        f"\U0001f534 *NO*: {pct(m['no'])} probability\n"
        f"\n"
        f"\U0001f4ca *Volume*: {sats_fmt(m['volume'])} sats\n"
        f"\U0001f4a7 *Liquidity*: {sats_fmt(m['liquidity'])} sats\n"
        f"\U0001f4c5 *Ends*: {_esc(m['end'])}\n"
        f"\U0001f3f7 *Category*: {_esc(m['category'])}\n"
        f"\U0001f3f7 *Tags*: {_esc(', '.join(m['tags']))}\n"
        f"\n"
        f"_AMM: Constant\\-product \\(x\u00b7y\\=k\\) with 2% fee_\n"
        f"_Smart contract on OP\\_NET Bitcoin L1_"
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(f"\U0001f7e2 Trade YES @ {pct(m['yes'])}", url=WEBAPP_URL),
            InlineKeyboardButton(f"\U0001f534 Trade NO @ {pct(m['no'])}", url=WEBAPP_URL),
        ],
        [
            InlineKeyboardButton("\u25c0 All Markets", callback_data="markets_all"),
            InlineKeyboardButton(f"\U0001f916 AI Analysis", callback_data=f"ai_{m['id']}"),
        ],
    ])

    await message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_stats(update.message)


async def send_stats(message):
    height = await fetch_block_height()
    height_str = f"*{height:,}*" if height else "_connecting\\.\\.\\._"
    status = "\U0001f7e2 LIVE" if height else "\U0001f7e1 CONNECTING"

    total_vol = sum(m["volume"] for m in MARKETS)
    total_liq = sum(m["liquidity"] for m in MARKETS)

    text = (
        f"*\U0001f4e1 OP\\_NET Network Stats*\n"
        f"\n"
        f"{status}\n"
        f"\n"
        f"\U0001f4e6 *Block Height*: {height_str}\n"
        f"\U0001f4ca *Active Markets*: *{len(MARKETS)}*\n"
        f"\U0001f4b0 *Total Volume*: {sats_fmt(total_vol)} sats\n"
        f"\U0001f4a7 *Total Liquidity*: {sats_fmt(total_liq)} sats\n"
        f"\U0001f310 *Network*: OP\\_NET Regtest\n"
        f"\u26a1 *Consensus*: PoW \\+ OP\\_NET\n"
        f"\n"
        f"_Data from {_esc(OPNET_RPC)}_"
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\U0001f50d Explorer", url=EXPLORER_URL),
            InlineKeyboardButton("\U0001f4d6 Docs", url=DEV_DOCS_URL),
        ],
        [
            InlineKeyboardButton("\U0001f4a7 Faucet", url=FAUCET_URL),
            InlineKeyboardButton("\U0001f310 Web App", url=WEBAPP_URL),
        ],
    ])

    await message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


async def cmd_about(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "*\U0001f52e About BitPredict*\n"
        "\n"
        "BitPredict is a decentralized prediction market platform "
        "built on *OP\\_NET* \\- Bitcoin Layer 1 smart contracts\\.\n"
        "\n"
        "*Tech Stack:*\n"
        "\u2022 \U0001f7e0 *Bitcoin L1* \\- Settlement layer\n"
        "\u2022 \u26a1 *OP\\_NET* \\- Smart contract runtime \\(WASM\\)\n"
        "\u2022 \U0001f4dd *AssemblyScript* \\- Contract language\n"
        "\u2022 \u2699\ufe0f *React \\+ Vite \\+ TypeScript* \\- Frontend\n"
        "\u2022 \U0001f3a8 *Tailwind CSS* \\- Styling\n"
        "\u2022 \U0001f916 *Bob AI* \\- Market analysis agent\n"
        "\n"
        "*Features:*\n"
        "\u2022 Binary outcome prediction markets\n"
        "\u2022 Constant\\-product AMM \\(x\u00b7y\\=k\\)\n"
        "\u2022 AI\\-powered market analysis\n"
        "\u2022 Real\\-time OP\\_NET block height\n"
        "\u2022 Portfolio tracking & leaderboard\n"
        "\u2022 OP\\_WALLET browser extension support\n"
        "\n"
        "*Links:*\n"
        f"\u2022 [Web App]({_esc(WEBAPP_URL)})\n"
        f"\u2022 [GitHub]({_esc(GITHUB_URL)})\n"
        f"\u2022 [Explorer]({_esc(EXPLORER_URL)})\n"
        f"\u2022 [OP\\_NET Docs]({_esc(DEV_DOCS_URL)})\n"
        f"\u2022 [Community]({_esc(TELEGRAM_COMMUNITY)})\n"
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL),
            InlineKeyboardButton("\U0001f4bb GitHub", url=GITHUB_URL),
        ],
    ])

    await message.reply_text(
        text,
        parse_mode=ParseMode.MARKDOWN_V2,
        reply_markup=keyboard,
        disable_web_page_preview=True,
    )


# ---------------------------------------------------------------------------
# AI Analysis
# ---------------------------------------------------------------------------

AI_ANALYSES = {
    "btc-100k-2026": {
        "signal": "\U0001f7e2 BULLISH",
        "confidence": 78,
        "reasoning": [
            "Post-halving supply shock historically bullish",
            "Institutional ETF inflows accelerating",
            "On-chain accumulation at all-time highs",
        ],
        "recommendation": "Strong YES at current 72% price",
    },
    "opnet-adoption": {
        "signal": "\U0001f7e2 BULLISH",
        "confidence": 72,
        "reasoning": [
            "OP_NET ecosystem growing rapidly",
            "MotoSwap and DeFi apps driving volume",
            "Developer activity increasing steadily",
        ],
        "recommendation": "YES position favored at 65%",
    },
    "ai-agi-2027": {
        "signal": "\U0001f534 BEARISH",
        "confidence": 85,
        "reasoning": [
            "AGI definition remains contested",
            "Current models lack true reasoning",
            "Timeline extremely ambitious for 2028",
        ],
        "recommendation": "Strong NO — 82% price fairly valued",
    },
}

DEFAULT_AI = {
    "signal": "\U0001f7e1 NEUTRAL",
    "confidence": 50,
    "reasoning": [
        "Insufficient data for strong signal",
        "Market is fairly priced by AMM",
        "Monitor volume trends for direction",
    ],
    "recommendation": "Hold — wait for clearer signal",
}


async def send_ai_analysis(message, market_id: str):
    m = find_market(market_id)
    if not m:
        await message.reply_text("Market not found\\.", parse_mode=ParseMode.MARKDOWN_V2)
        return

    ai = AI_ANALYSES.get(market_id, DEFAULT_AI)

    reasons = "\n".join(f"  \u2022 {_esc(r)}" for r in ai["reasoning"])

    text = (
        f"*\U0001f916 Bob AI Analysis*\n"
        f"\n"
        f"{m['emoji']} *{_esc(m['question'])}*\n"
        f"\n"
        f"*Signal*: {ai['signal']}\n"
        f"*Confidence*: {ai['confidence']}%\n"
        f"\n"
        f"*Reasoning:*\n"
        f"{reasons}\n"
        f"\n"
        f"*Recommendation:* _{_esc(ai['recommendation'])}_\n"
        f"\n"
        f"\U0001f7e2 YES: {pct(m['yes'])}  \u2022  \U0001f534 NO: {pct(m['no'])}\n"
        f"_Powered by Bob AI \\+ OP\\_NET on\\-chain data_"
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(f"\U0001f7e2 Trade YES", url=WEBAPP_URL),
            InlineKeyboardButton(f"\U0001f534 Trade NO", url=WEBAPP_URL),
        ],
        [
            InlineKeyboardButton("\u25c0 Back to Market", callback_data=f"market_{market_id}"),
        ],
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
        category = data.replace("markets_", "")
        await send_markets_list(query.message, category)
    elif data.startswith("market_"):
        market_id = data.replace("market_", "")
        m = find_market(market_id)
        if m:
            await send_market_detail(query.message, m)
        else:
            await query.message.reply_text("Market not found.")
    elif data.startswith("ai_"):
        market_id = data.replace("ai_", "")
        await send_ai_analysis(query.message, market_id)
    elif data == "ai_analysis":
        # Show AI analysis for top market
        await send_ai_analysis(query.message, "btc-100k-2026")
    elif data == "stats":
        await send_stats(query.message)
    elif data == "how":
        await send_how_it_works(query.message)


async def send_how_it_works(message):
    text = (
        "*\u2753 How BitPredict Works*\n"
        "\n"
        "*1\\. \U0001fa99 Choose a Market*\n"
        "Browse prediction markets across Crypto, Politics, "
        "Sports, Tech & Culture\\. Each market has YES/NO outcomes "
        "priced by our AMM\\.\n"
        "\n"
        "*2\\. \U0001f504 Buy Shares*\n"
        "Use regtest BTC to buy YES or NO shares\\. "
        "Constant\\-product AMM \\(x\u00b7y\\=k\\) ensures fair pricing "
        "with slippage protection\\.\n"
        "\n"
        "*3\\. \U0001f916 AI Analysis*\n"
        "Bob AI agent analyzes on\\-chain data, volume patterns, "
        "and reserve ratios to generate trading signals\\.\n"
        "\n"
        "*4\\. \U0001f3c6 Collect Payout*\n"
        "When the market resolves, winning shares are redeemable 1:1\\. "
        "Payouts settle directly on Bitcoin L1 via OP\\_NET\\.\n"
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\U0001f4ca Browse Markets", callback_data="markets_all"),
            InlineKeyboardButton("\U0001f310 Open App", url=WEBAPP_URL),
        ],
    ])

    await message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=keyboard)


# ---------------------------------------------------------------------------
# Markdown V2 escaping
# ---------------------------------------------------------------------------

_ESCAPE_CHARS = r"_*[]()~`>#+-=|{}.!"

def _esc(text: str) -> str:
    result = []
    for ch in text:
        if ch in _ESCAPE_CHARS:
            result.append("\\")
        result.append(ch)
    return "".join(result)


# ---------------------------------------------------------------------------
# Bot Setup
# ---------------------------------------------------------------------------

async def post_init(application: Application):
    """Set bot commands and description after startup."""
    commands = [
        BotCommand("start", "Welcome & main menu"),
        BotCommand("markets", "Browse all prediction markets"),
        BotCommand("market", "Detailed market view (e.g. /market btc-100k-2026)"),
        BotCommand("crypto", "Crypto markets"),
        BotCommand("politics", "Politics markets"),
        BotCommand("sports", "Sports markets"),
        BotCommand("tech", "Tech markets"),
        BotCommand("stats", "OP_NET network stats"),
        BotCommand("about", "About BitPredict"),
        BotCommand("help", "All commands"),
    ]
    await application.bot.set_my_commands(commands)

    await application.bot.set_my_description(
        "BitPredict — AI-powered prediction markets on Bitcoin L1. "
        "Trade binary outcomes using OP_NET smart contracts. "
        "Constant-product AMM pricing, Bob AI analysis, portfolio tracking."
    )

    await application.bot.set_my_short_description(
        "AI prediction markets on Bitcoin L1 via OP_NET"
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
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("about", cmd_about))
    app.add_handler(CallbackQueryHandler(callback_handler))

    logger.info("BitPredict bot starting...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
