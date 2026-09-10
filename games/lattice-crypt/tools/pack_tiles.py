"""Pack Imagine floor/wall stills into a 32px zone tileset. Seamless wrap + autotile faces."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageEnhance

SRC = Path(r"D:\chatagent\games\lattice-crypt\assets\tiles\src")
DEST = Path(r"D:\chatagent\games\lattice-crypt\assets")
CELL = 32
COLS = 16
ZONES = ("stone", "frost", "ember", "root", "tide", "gold", "void", "lattice")


def wrap_crop(im: Image.Image, size: int, ox: int, oy: int) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    canvas = Image.new("RGB", (size, size))
    for y in range(size):
        for x in range(size):
            canvas.putpixel((x, y), im.getpixel(((ox + x) % w, (oy + y) % h)))
    return canvas


def make_seamless(im: Image.Image, blend: int = 48) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    out = im.copy()
    px, src = out.load(), im.load()
    b = min(blend, w // 4, h // 4)
    for x in range(b):
        t = x / b
        for y in range(h):
            a = src[x, y]
            c = src[w - b + x, y]
            px[x, y] = tuple(int(c[i] * (1 - t) + a[i] * t) for i in range(3))
            px[w - b + x, y] = tuple(int(a[i] * (1 - t) + c[i] * t) for i in range(3))
    for y in range(b):
        t = y / b
        for x in range(w):
            a = px[x, y]
            c = px[x, h - b + y]
            px[x, y] = tuple(int(c[i] * (1 - t) + a[i] * t) for i in range(3))
            px[x, h - b + y] = tuple(int(a[i] * (1 - t) + c[i] * t) for i in range(3))
    return out


def down(im: Image.Image) -> Image.Image:
    return im.resize((CELL, CELL), Image.Resampling.BOX).convert("RGBA")


def darken(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Brightness(im).enhance(amt)


def wall_face(top: Image.Image) -> Image.Image:
    im = darken(top, 0.62).convert("RGBA")
    px = im.load()
    lip = int(CELL * 0.38)
    for y in range(CELL - lip, CELL):
        k = (y - (CELL - lip)) / max(1, lip)
        for x in range(CELL):
            r, g, b, a = px[x, y]
            s = 0.45 + 0.2 * k
            px[x, y] = (int(r * s), int(g * s), int(b * s), 255)
    y0 = CELL - lip
    for x in range(CELL):
        r, g, b, a = px[x, y0]
        px[x, y0] = (min(255, r + 28), min(255, g + 24), min(255, b + 18), 255)
    return im


def wall_void() -> Image.Image:
    im = Image.new("RGBA", (CELL, CELL), (8, 9, 14, 255))
    px = im.load()
    for y in range(CELL):
        for x in range(CELL):
            n = (x * 13 + y * 7) % 17
            if n < 2:
                px[x, y] = (12, 13, 20, 255)
    return im


def edge_overlay(kind: str) -> Image.Image:
    im = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    px = im.load()
    col = {
        "n": (255, 255, 255, 36),
        "s": (0, 0, 0, 70),
        "e": (0, 0, 0, 40),
        "w": (255, 255, 255, 22),
    }[kind]
    if kind == "n":
        for x in range(CELL):
            px[x, 0] = col
            if x % 3 == 0:
                px[x, 1] = col
    elif kind == "s":
        for x in range(CELL):
            px[x, CELL - 1] = col
            px[x, CELL - 2] = (0, 0, 0, 40)
    elif kind == "e":
        for y in range(CELL):
            px[CELL - 1, y] = col
    else:
        for y in range(CELL):
            px[0, y] = col
    return im


def deco_from(floor: Image.Image, zone: str) -> Image.Image:
    im = floor.copy()
    px = im.load()
    if zone in ("gold", "stone"):
        for y in range(6, 26):
            for x in range(6, 26):
                if (x - 16) ** 2 + (y - 16) ** 2 < 70:
                    r, g, b, a = px[x, y]
                    px[x, y] = (min(255, r + 18), min(255, g + 12), max(0, b - 6), 255)
    elif zone in ("tide", "frost"):
        for y in range(8, 24):
            for x in range(8, 24):
                if (x + y) % 5 == 0:
                    r, g, b, a = px[x, y]
                    px[x, y] = (min(255, r + 10), min(255, g + 20), min(255, b + 28), 180)
    elif zone == "ember":
        for y in range(10, 22):
            for x in range(10, 22):
                if (x * y) % 11 == 0:
                    px[x, y] = (180, 50, 20, 255)
    elif zone == "root":
        for i in range(8, 24):
            px[i, i] = (40, 70, 30, 255)
            px[i, 32 - i] = (50, 80, 35, 255)
    elif zone == "void":
        for y in range(12, 20):
            for x in range(12, 20):
                if abs(x - 16) + abs(y - 16) == 4:
                    px[x, y] = (90, 50, 140, 255)
    else:
        for y in range(4, 28, 8):
            for x in range(CELL):
                r, g, b, a = px[x, y]
                px[x, y] = (min(255, r + 20), min(255, g + 30), min(255, b + 40), 255)
    return im


def load_src(zone: str, kind: str) -> Image.Image:
    p = SRC / f"{zone}_{kind}.jpg"
    if not p.exists():
        p = SRC / f"{zone}_floor.jpg"
    im = Image.open(p).convert("RGB")
    im = make_seamless(im)
    side = min(im.size)
    im = im.crop((0, 0, side, side)).resize((256, 256), Image.Resampling.BOX)
    return im


def main() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    frames: list[tuple[str, Image.Image]] = []
    names = {}

    def put(name: str, im: Image.Image) -> None:
        names[name] = len(frames)
        frames.append((name, im.convert("RGBA")))

    put("void", wall_void())
    for zone in ZONES:
        floor_src = load_src(zone, "floor")
        try:
            wall_src = load_src(zone, "wall")
        except Exception:
            wall_src = darken(floor_src, 0.55)
        fa = down(wrap_crop(floor_src, 96, 8, 8))
        fb = down(wrap_crop(floor_src, 96, 56, 40))
        top = down(wrap_crop(wall_src, 96, 24, 24))
        top = darken(top, 0.82)
        face = wall_face(top)
        put(f"{zone}_floor0", fa)
        put(f"{zone}_floor1", fb)
        put(f"{zone}_top", top)
        put(f"{zone}_face", face)
        put(f"{zone}_deco", deco_from(fa, zone))
        put(f"{zone}_n", edge_overlay("n"))
        put(f"{zone}_s", edge_overlay("s"))
        put(f"{zone}_e", edge_overlay("e"))
        put(f"{zone}_w", edge_overlay("w"))
        # 2x2 seam check
        chk = Image.new("RGB", (64, 64))
        chk.paste(fa.convert("RGB"), (0, 0))
        chk.paste(fa.convert("RGB"), (32, 0))
        chk.paste(fa.convert("RGB"), (0, 32))
        chk.paste(fa.convert("RGB"), (32, 32))
        (SRC / "_check").mkdir(exist_ok=True)
        chk.save(SRC / "_check" / f"{zone}_2x2.png")

    rows = (len(frames) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    for i, (name, im) in enumerate(frames):
        if im.size != (CELL, CELL):
            im = im.resize((CELL, CELL), Image.Resampling.BOX)
        atlas.paste(im, ((i % COLS) * CELL, (i // COLS) * CELL))
    atlas.save(DEST / "tiles.png")
    (DEST / "tiles.json").write_text(
        json.dumps({"cell": CELL, "cols": COLS, "names": names}, indent=2),
        encoding="utf-8",
    )
    print("tiles", atlas.size, "frames", len(frames))


if __name__ == "__main__":
    main()
