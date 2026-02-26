"""Set bot profile photo via Telegram API."""
import os
import sys
import asyncio
from telegram import Bot

BOT_TOKEN = os.environ.get("BITPREDICT_TG_TOKEN", "")
AVATAR_PATH = os.path.join(os.path.dirname(__file__), "avatar.png")


async def main():
    token = BOT_TOKEN
    if not token:
        print("BITPREDICT_TG_TOKEN not set!")
        sys.exit(1)

    if not os.path.exists(AVATAR_PATH):
        print(f"Avatar not found at {AVATAR_PATH}, generating...")
        from gen_avatar import generate
        generate()

    bot = Bot(token=token)
    me = await bot.get_me()
    print(f"Bot: @{me.username} ({me.first_name})")

    with open(AVATAR_PATH, "rb") as f:
        # Delete old photos first
        try:
            photos = await bot.get_user_profile_photos(me.id)
            # Can't delete bot photos via API, just set new one
        except Exception:
            pass

        # Set new photo - not available in Bot API directly for bots
        # We'll use setChat photo on bot's own chat - not supported
        # Profile photo must be set via @BotFather
        print("NOTE: Bot profile photo must be set via @BotFather")
        print(f"Avatar generated at: {AVATAR_PATH}")
        print("Send this image to @BotFather -> /setuserpic -> select your bot")

    await bot.close()


if __name__ == "__main__":
    asyncio.run(main())
