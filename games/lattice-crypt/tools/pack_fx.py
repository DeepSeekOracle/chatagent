"""32px projectile + impact atlas. Unique silhouette per arm."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

DEST = Path(r"D:\chatagent\games\lattice-crypt\assets")
CELL = 32
COLS = 8
CLEAR = (0, 0, 0, 0)


def blank():
    return Image.new("RGBA", (CELL, CELL), CLEAR)


def blob(draw, cx, cy, r, c):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)


def shot_shard(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    ox = fr
    blob(d, 16, 16, 8, (251, 191, 36, 70))
    d.polygon([(4 + ox, 16), (16, 6), (28 - ox, 16), (16, 26)], fill=(251, 191, 36, 255))
    d.polygon([(8, 16), (16, 10), (24, 16), (16, 22)], fill=(254, 240, 138, 255))
    d.polygon([(12, 16), (16, 13), (22, 16), (16, 19)], fill=(255, 255, 230, 255))
    return im


def shot_fan(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    blob(d, 16, 16, 9, (251, 146, 60, 50))
    y = 16 + (fr % 2) * 1 - 1
    d.pieslice((2, y - 12, 30, y + 12), 200, 340, fill=(249, 115, 22, 255))
    d.pieslice((6, y - 8, 26, y + 8), 205, 335, fill=(253, 186, 116, 255))
    d.pieslice((10, y - 4, 22, y + 4), 210, 330, fill=(255, 237, 213, 255))
    return im


def shot_needle(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    blob(d, 22, 16, 5, (34, 211, 238, 80))
    d.rectangle((2, 14, 28, 18), fill=(103, 232, 249, 255))
    d.rectangle((4, 15, 26, 17), fill=(224, 247, 255, 255))
    d.polygon([(26, 12), (31, 16), (26, 20)], fill=(255, 255, 255, 255))
    if fr:
        d.rectangle((0, 15, 6, 17), fill=(165, 243, 252, 180))
    return im


def shot_cinder(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    r = 9 + fr
    blob(d, 16, 17, r, (239, 68, 68, 70))
    blob(d, 16, 16, 8, (249, 115, 22, 230))
    blob(d, 16, 15, 5, (251, 191, 36, 255))
    blob(d, 15, 14, 2, (255, 251, 210, 255))
    blob(d, 10 + fr, 22, 3, (220, 80, 20, 200))
    blob(d, 22 - fr, 23, 2, (255, 140, 40, 180))
    return im


def shot_comet(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    blob(d, 18, 15, 9, (96, 165, 250, 70))
    d.polygon([(2, 18 + fr), (14, 14), (14, 20)], fill=(59, 130, 246, 180))
    blob(d, 20, 15, 7, (147, 197, 253, 255))
    blob(d, 21, 14, 4, (219, 234, 254, 255))
    blob(d, 22, 13, 2, (255, 255, 255, 255))
    return im


def shot_halo(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    blob(d, 16, 16, 12, (251, 191, 36, 40))
    d.ellipse((4, 4, 28, 28), outline=(251, 191, 36, 255), width=3)
    d.ellipse((7, 7, 25, 25), outline=(254, 240, 138, 255), width=2)
    blob(d, 16, 16, 3 + (fr & 1), (255, 255, 220, 255))
    return im


def shot_imp(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    blob(d, 16, 16, 8 + fr, (239, 68, 68, 80))
    blob(d, 16, 16, 6, (248, 113, 113, 255))
    blob(d, 15, 14, 3, (254, 202, 202, 255))
    return im


def shot_hurler(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    blob(d, 16, 16, 8, (100, 110, 120, 255))
    blob(d, 14, 14, 4, (160, 168, 176, 255))
    blob(d, 18, 18, 2, (70, 76, 84, 255))
    if fr:
        blob(d, 20, 12, 2, (190, 196, 200, 255))
    return im


def hit_burst(col, fr):
    im = blank()
    d = ImageDraw.Draw(im)
    r = 6 + fr * 4
    blob(d, 16, 16, r, col[:3] + (80,))
    for ang, rad in ((0, 12), (90, 11), (45, 9), (135, 9), (180, 12), (270, 10)):
        import math
        a = math.radians(ang + fr * 12)
        x, y = 16 + math.cos(a) * rad, 16 + math.sin(a) * rad
        blob(d, x, y, 2, col)
    blob(d, 16, 16, 3, (255, 255, 255, 255))
    return im


def muzzle_flash(col, fr):
    im = blank()
    d = ImageDraw.Draw(im)
    blob(d, 16, 16, 8 + fr * 2, col[:3] + (90,))
    blob(d, 16, 16, 4, col)
    blob(d, 16, 16, 2, (255, 255, 255, 255))
    return im


def nova_ring(fr):
    im = blank()
    d = ImageDraw.Draw(im)
    r = 6 + fr * 3
    d.ellipse((16 - r, 16 - r, 16 + r, 16 + r), outline=(94, 234, 212, 220), width=2)
    return im


def main():
    frames = []
    names = {}

    def put(name, im):
        names[name] = len(frames)
        frames.append((name, im))

    for i in range(4):
        put(f"bolt_shard_{i}", shot_shard(i))
        put(f"bolt_fan_{i}", shot_fan(i))
        put(f"bolt_needle_{i}", shot_needle(i))
        put(f"bolt_cinder_{i}", shot_cinder(i))
        put(f"bolt_comet_{i}", shot_comet(i))
        put(f"bolt_halo_{i}", shot_halo(i))
        put(f"bolt_imp_{i}", shot_imp(i))
        put(f"bolt_hurler_{i}", shot_hurler(i))
    gold = (251, 191, 36, 255)
    orange = (249, 115, 22, 255)
    cyan = (34, 211, 238, 255)
    red = (239, 68, 68, 255)
    blue = (96, 165, 250, 255)
    for i in range(2):
        put(f"hit_shard_{i}", hit_burst(gold, i))
        put(f"hit_fan_{i}", hit_burst(orange, i))
        put(f"hit_needle_{i}", hit_burst(cyan, i))
        put(f"hit_cinder_{i}", hit_burst(red, i))
        put(f"hit_comet_{i}", hit_burst(blue, i))
        put(f"hit_halo_{i}", hit_burst(gold, i))
        put(f"mz_shard_{i}", muzzle_flash(gold, i))
        put(f"mz_fan_{i}", muzzle_flash(orange, i))
        put(f"mz_needle_{i}", muzzle_flash(cyan, i))
        put(f"mz_cinder_{i}", muzzle_flash(red, i))
        put(f"mz_comet_{i}", muzzle_flash(blue, i))
        put(f"mz_halo_{i}", muzzle_flash(gold, i))
        put(f"nova_{i}", nova_ring(i))

    rows = (len(frames) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * CELL, rows * CELL), CLEAR)
    for i, (name, im) in enumerate(frames):
        atlas.paste(im, ((i % COLS) * CELL, (i // COLS) * CELL), im)
    DEST.mkdir(parents=True, exist_ok=True)
    atlas.save(DEST / "fx.png")
    (DEST / "fx.json").write_text(
        json.dumps({"cell": CELL, "cols": COLS, "names": names}, indent=2),
        encoding="utf-8",
    )
    print("fx", atlas.size, "frames", len(frames))


if __name__ == "__main__":
    main()
