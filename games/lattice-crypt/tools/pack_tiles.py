"""Pack zone floors as a continuous 128px wrap so map tiles share edges (no grid)."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageEnhance

SRC = Path(r"D:\chatagent\games\lattice-crypt\assets\tiles\src")
DEST = Path(r"D:\chatagent\games\lattice-crypt\assets")
CELL = 32
SHEET = 128
COLS = 16
ZONES = ("stone", "frost", "ember", "root", "tide", "gold", "void", "lattice")


def make_seamless(im: Image.Image, blend: int = 40) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    out = im.copy()
    px, src = out.load(), im.load()
    b = min(blend, w // 5, h // 5)
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
    # force opposite edges equal so 32px slices join
    for y in range(h):
        px[0, y] = px[w - 1, y]
    for x in range(w):
        px[x, 0] = px[x, h - 1]
    return out


def load_src(zone: str, kind: str) -> Image.Image:
    p = SRC / f"{zone}_{kind}.jpg"
    if not p.exists():
        p = SRC / f"{zone}_floor.jpg"
    im = Image.open(p).convert("RGB")
    side = min(im.size)
    im = im.crop((0, 0, side, side)).resize((SHEET, SHEET), Image.Resampling.BOX)
    return make_seamless(im)


def darken(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Brightness(im).enhance(amt)


def wall_face(top: Image.Image) -> Image.Image:
    im = darken(top, 0.62).convert("RGBA")
    px = im.load()
    lip = 12
    for y in range(CELL - lip, CELL):
        k = (y - (CELL - lip)) / lip
        for x in range(CELL):
            r, g, b, a = px[x, y]
            s = 0.48 + 0.22 * k
            px[x, y] = (int(r * s), int(g * s), int(b * s), 255)
    y0 = CELL - lip
    for x in range(CELL):
        r, g, b, a = px[x, y0]
        px[x, y0] = (min(255, r + 22), min(255, g + 18), min(255, b + 14), 255)
    return im


def wall_void() -> Image.Image:
    return Image.new("RGBA", (CELL, CELL), (8, 9, 14, 255))


def main() -> None:
    frames: list[tuple[str, Image.Image]] = []
    names = {}

    def put(name: str, im: Image.Image) -> None:
        names[name] = len(frames)
        frames.append((name, im.convert("RGBA")))

    put("void", wall_void())
    for zone in ZONES:
        floor = load_src(zone, "floor")
        try:
            wall = load_src(zone, "wall")
        except Exception:
            wall = darken(floor, 0.55)
        for iy in range(4):
            for ix in range(4):
                cell = floor.crop((ix * CELL, iy * CELL, ix * CELL + CELL, iy * CELL + CELL))
                put(f"{zone}_f{ix + iy * 4}", cell)
        top = wall.crop((48, 48, 80, 80))
        top = darken(top, 0.84)
        put(f"{zone}_top", top)
        put(f"{zone}_face", wall_face(top))
        chk = Image.new("RGB", (64, 64))
        a = floor.crop((0, 0, 32, 32))
        chk.paste(a, (0, 0))
        chk.paste(floor.crop((32, 0, 64, 32)), (32, 0))
        chk.paste(floor.crop((0, 32, 32, 64)), (0, 32))
        chk.paste(floor.crop((32, 32, 64, 64)), (32, 32))
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
