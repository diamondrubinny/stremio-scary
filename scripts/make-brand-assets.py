#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
"""Builds SCARY Web's icons, logo and splash screens from brand/ into web/assets/.

The output files keep the names Stremio Web already uses, so no source file has to change to show them.
Run from anywhere: python3 scripts/make-brand-assets.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "brand"
IMAGES = ROOT / "web" / "assets" / "images"
FAVICONS = ROOT / "web" / "assets" / "favicons"
VOID = (10, 11, 11)
BONE = (233, 225, 207)
BLOOD = (142, 27, 27)


def launcher(size: int) -> Image.Image:
    """The adaptive launcher icon, full bleed: safe for maskable use."""
    background = Image.open(BRAND / "ic_launcher_background.png").convert("RGBA")
    foreground = Image.open(BRAND / "ic_launcher_foreground.png").convert("RGBA")
    return Image.alpha_composite(background, foreground).resize((size, size), Image.LANCZOS)


def rounded(image: Image.Image, radius_ratio: float = 0.22) -> Image.Image:
    scale = 4
    size = image.size[0]
    mask = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * scale, size * scale), radius=int(size * scale * radius_ratio), fill=255)
    out = image.copy()
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


def any_icon(size: int) -> Image.Image:
    """The icon outside a mask: the launcher artwork cropped to its safe zone, with rounded corners."""
    full = launcher(1024)
    inset = int(1024 * 0.14)
    return rounded(full.crop((inset, inset, 1024 - inset, 1024 - inset)).resize((size, size), Image.LANCZOS))


def wordmark(width: int, height: int, background=None) -> Image.Image:
    """SCARY in Rubik Wet Paint, bone on a blood shadow, centred."""
    image = Image.new("RGBA", (width, height), background + (255,) if background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font_size = 10
    font_path = str(BRAND / "fonts" / "RubikWetPaint-Regular.ttf")
    while True:
        font = ImageFont.truetype(font_path, font_size + 4)
        box = draw.textbbox((0, 0), "SCARY", font=font)
        if box[2] - box[0] > width * 0.9 or box[3] - box[1] > height * 0.82:
            break
        font_size += 4
    font = ImageFont.truetype(font_path, font_size)
    box = draw.textbbox((0, 0), "SCARY", font=font)
    x = (width - (box[2] - box[0])) / 2 - box[0]
    y = (height - (box[3] - box[1])) / 2 - box[1]
    offset = max(2, font_size // 22)
    draw.text((x + offset, y + offset), "SCARY", font=font, fill=BLOOD)
    draw.text((x, y), "SCARY", font=font, fill=BONE)
    return image


def main() -> None:
    any_icon(512).save(IMAGES / "icon.png")
    any_icon(512).save(IMAGES / "icon_512x512.png")
    any_icon(196).save(IMAGES / "icon_196x196.png")
    any_icon(256).save(IMAGES / "stremio_symbol.png")
    launcher(512).save(IMAGES / "maskable_icon.png")
    launcher(512).save(IMAGES / "maskable_icon_512x512.png")
    launcher(196).save(IMAGES / "maskable_icon_196x196.png")
    Image.open(BRAND / "ic_launcher_monochrome.png").convert("RGBA").resize((512, 512), Image.LANCZOS).save(IMAGES / "monochrome_icon_512x512.png")
    wordmark(670, 195).save(IMAGES / "logo.png")
    any_icon(256).save(FAVICONS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    count = 0
    for splash in sorted((IMAGES / "splash").glob("*.jpg")):
        width, height = Image.open(splash).size
        canvas = Image.new("RGB", (width, height), VOID)
        mark_width = int(min(width, height) * 0.62)
        mark = wordmark(mark_width, int(mark_width * 0.3))
        canvas.paste(mark, ((width - mark.size[0]) // 2, (height - mark.size[1]) // 2), mark)
        canvas.save(splash, quality=82, optimize=True)
        count += 1
    print(f"icons, logo and {count} splash screens written to {IMAGES.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
