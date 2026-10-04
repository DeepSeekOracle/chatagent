#!/usr/bin/env python3
"""Generate the Eternal Haven share cards (1200x630) for the /books/ section.

Cards are drawn from the section's own art so the palette, the night field and
the gold accent match the pages. Fonts come from Google Fonts (Cormorant Garamond
for the title, Syne for the kicker) and are cached in the build cache.

  python tools/make_books_og.py            # write books/art/og-*.jpg
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "books" / "art"
CACHE = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Temp" / "books-og-cache"
CACHE.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
NIGHT = (7, 11, 20)
GOLD = (224, 179, 106)
INK = (244, 239, 230)
MUTED = (203, 191, 170)

FONT_CSS = ("https://fonts.googleapis.com/css2"
            "?family=Cormorant+Garamond:wght@500;600&family=Syne:wght@700;800&display=swap")


def font_files() -> dict:
    """Fetch (once) the woff2-free TTF builds Google serves to old browsers."""
    got = {}
    for name in ("CormorantGaramond", "Syne"):
        for weight in ("500", "600", "700", "800"):
            got.setdefault(name, {})
    css = CACHE / "fonts.css"
    if not css.exists() or css.stat().st_size < 200:
        req = urllib.request.Request(FONT_CSS, headers={"User-Agent": "Mozilla/4.0"})
        css.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    text = css.read_text(encoding="utf-8", errors="replace")
    blocks = re.findall(r"font-family:\s*'([^']+)';\s*font-style:\s*\w+;\s*font-weight:\s*(\d+);"
                        r".*?src:\s*url\((https://[^)]+\.ttf)\)", text, re.S)
    for fam, weight, url in blocks:
        fam_key = fam.replace(" ", "")
        local = CACHE / f"{fam_key}-{weight}.ttf"
        if not local.exists():
            local.write_bytes(urllib.request.urlopen(url, timeout=30).read())
        got.setdefault(fam_key, {})[weight] = local
    return got


def draw_card(out_name: str, art: str, kicker: str, title: str, sub: str, foot: str) -> None:
    fonts = FONTS
    serif_big = ImageFont.truetype(str(fonts["CormorantGaramond"]["600"]), 96)
    serif_mid = ImageFont.truetype(str(fonts["CormorantGaramond"]["500"]), 44)
    sans = ImageFont.truetype(str(fonts["Syne"]["700"]), 24)
    sans_small = ImageFont.truetype(str(fonts["Syne"]["700"]), 22)

    base = Image.new("RGB", (W, H), NIGHT)
    art_path = ART / art
    try:
        src = Image.open(art_path).convert("RGB")
        # right-hand panel: cover art scaled to the full height, subject centred
        target_w = int(src.width * (H / src.height))
        panel = src.resize((target_w, H), Image.LANCZOS) if target_w >= 470 else src.resize((470, int(src.height * 470 / src.width)), Image.LANCZOS)
        if panel.height < H:
            panel = panel.resize((int(panel.width * H / panel.height), H), Image.LANCZOS)
        base.paste(panel.crop((max(0, (panel.width - 470) // 2), 0,
                               max(0, (panel.width - 470) // 2) + 470, H)), (W - 470, 0))
    except Exception as exc:  # art missing -> plain field, still a valid card
        print("  ! art", art, exc)

    # scrims: darken the left column for text, feather the art's left edge
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    for x in range(0, 760):
        a = int(232 - (x / 760) * 200)
        sd.line([(x, 0), (x, H)], fill=NIGHT + (max(0, a),))
    for x in range(700, W):
        a = int(60 * (x - 700) / (W - 700))
        sd.line([(x, 0), (x, H)], fill=NIGHT + (a,))
    base = Image.alpha_composite(base.convert("RGBA"), scrim).convert("RGB")

    d = ImageDraw.Draw(base)
    d.rectangle([0, 0, W, 7], fill=GOLD)

    x0 = 72
    col = 628  # text column width (the art panel starts at x=730)
    y = 118

    def wrap(text: str, font, maxw: int) -> list:
        words, lines, cur = text.split(), [], ""
        for w in words:
            trial = (cur + " " + w).strip()
            if d.textlength(trial, font=font) <= maxw or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    d.text((x0, y), kicker.upper(), font=sans, fill=GOLD)
    y += 52

    lines = wrap(title, serif_big, col)
    if len(lines) > 3:
        serif_big = ImageFont.truetype(str(FONTS["CormorantGaramond"]["600"]), 76)
        lines = wrap(title, serif_big, col)
    for ln in lines:
        d.text((x0, y), ln, font=serif_big, fill=INK)
        y += int(serif_big.size * 1.02)

    y += 18
    # the sub block gets whatever room is left above the footer; shrink rather
    # than spill (a longer subtitle must not run into the footer line)
    room = (H - 108) - y
    for size in (44, 40, 36, 33):
        sub_font = ImageFont.truetype(str(FONTS["CormorantGaramond"]["500"]), size)
        sub_lines = wrap(sub, sub_font, col)
        if len(sub_lines) * int(size * 1.24) <= room:
            break
    for ln in sub_lines:
        d.text((x0, y), ln, font=sub_font, fill=MUTED)
        y += int(sub_font.size * 1.24)

    d.text((x0, H - 74), foot, font=sans_small, fill=GOLD)
    d.text((x0, H - 44), "chatagent.ca/books/", font=sans_small, fill=MUTED)

    # the text column must stay clear of the art panel
    over = [ln for ln in wrap(title, serif_big, col) if d.textlength(ln, font=serif_big) > col]
    assert not over, f"title overflows its column: {over}"
    assert y < H - 90, f"text block runs into the footer (y={y})"
    dst = ART / out_name
    base.save(dst, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"  wrote {dst.relative_to(ROOT)}  {base.size[0]}x{base.size[1]}  {dst.stat().st_size // 1024}KB")


CARDS = [
    ("og-books.jpg", "hero.jpg", "Justin Helmer · The Eternal Haven",
     "Start at moonlight",
     "Five walking novels, free to read, with the published editions in print and ebook.", ""),
    ("og-book-1.jpg", "book-1.jpg", "The Eternal Haven Chronicles · Book I",
     "The Moonlit Slumber",
     "Serenya, the bronze Emberion, and the lullaby that keeps the Vale awake.", "Read free on chatagent.ca"),
    ("og-book-2.jpg", "book-2.jpg", "The Eternal Haven Chronicles · Book II",
     "The Shattered Accord",
     "From the fracture in Haven, through the eclipse, to a new accord.", "Read free on chatagent.ca"),
    ("og-book-3.jpg", "book-3.jpg", "The Eternal Haven Chronicles · Book III",
     "The Ascension War",
     "After Haven's retreat, the war becomes a question of who may speak truth into being.",
     "Read free on chatagent.ca"),
    ("og-book-4.jpg", "book-4.jpg", "The Eternal Haven Chronicles · Book IV",
     "Eternal Dawns",
     "Morning that does not erase the night. The manuscript opens with the Twelve at Dawn.",
     "Read free on chatagent.ca"),
    ("og-book-5.jpg", "book-5.jpg", "The Eternal Haven Chronicles · Book V",
     "The Unwritten Seal",
     "A stranger carries a Seal the Codex does not hold, and Haven must decide whether it can grow "
     "without becoming a throne again.",
     "Read free on chatagent.ca"),
]

if __name__ == "__main__":
    FONTS = font_files()
    for args in CARDS:
        draw_card(*args)
    print("checked", len(CARDS), "cards")
