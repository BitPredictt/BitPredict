"""Generate a simple BitPredict bot avatar using Pillow."""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 512
OUT = os.path.join(os.path.dirname(__file__), "avatar.png")


def generate():
    img = Image.new("RGB", (SIZE, SIZE), "#0a0a0a")
    draw = ImageDraw.Draw(img)

    # Background gradient circle
    for r in range(SIZE // 2, 0, -1):
        ratio = r / (SIZE // 2)
        g = int(30 + 180 * (1 - ratio))
        color = (int(g * 0.9), int(g * 0.6), 0)  # orange/bitcoin color
        draw.ellipse(
            [SIZE // 2 - r, SIZE // 2 - r, SIZE // 2 + r, SIZE // 2 + r],
            fill=color,
        )

    # Inner dark circle
    inner_r = SIZE // 3
    draw.ellipse(
        [
            SIZE // 2 - inner_r,
            SIZE // 2 - inner_r,
            SIZE // 2 + inner_r,
            SIZE // 2 + inner_r,
        ],
        fill="#1a1a2e",
    )

    # Bitcoin symbol text
    try:
        font_big = ImageFont.truetype("arial.ttf", 180)
        font_small = ImageFont.truetype("arial.ttf", 48)
    except OSError:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # BTC symbol
    draw.text(
        (SIZE // 2, SIZE // 2 - 20),
        "\u20bf",
        fill="#f7931a",
        font=font_big,
        anchor="mm",
    )

    # "PREDICT" text below
    draw.text(
        (SIZE // 2, SIZE // 2 + 120),
        "PREDICT",
        fill="#ffffff",
        font=font_small,
        anchor="mm",
    )

    img.save(OUT)
    print(f"Avatar saved to {OUT}")


if __name__ == "__main__":
    generate()
