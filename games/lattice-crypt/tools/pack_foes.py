"""Key Imagine stills into a 64px creature atlas. Despill + outline + BOX downscale."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

SRC = Path(r"D:\chatagent\games\lattice-crypt\assets\foes\src")
OUT = Path(r"D:\chatagent\games\lattice-crypt\assets\foes")
SIZE = 64
COLS = 8
KINDS = ("wraith", "brute", "imp", "hurler", "shade", "thief", "drain")
BOSSES = ("gate", "smith", "unnamer", "lock", "crown", "heartboss", "levi", "tithe")
FLOAT = {"wraith", "shade", "drain", "unnamer", "lock", "levi", "crown"}
INK = (18, 12, 20, 255)


def is_screen(r: int, g: int, b: int) -> bool:
    if g < 88:
        return False
    if g >= r + 28 and g >= b + 28:
        return True
    if g > 150 and r < 110 and b < 110:
        return True
    # neon jpeg fringe
    if g > 130 and r < 160 and b < 140 and g > r and g > b and (2 * g - r - b) > 70:
        return True
    return False


def is_card(r: int, g: int, b: int, a: int) -> bool:
    if a < 24:
        return True
    # Cyan/mint plates (Gate). Do not treat white ghosts as a card.
    if g > 185 and b > 175 and r > 130 and (g - r) > 18 and (b - r) > 12:
        return True
    return False


def plate_rgb(im: Image.Image) -> tuple[int, int, int]:
    rgb = im.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    pts = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3), (w // 2, 2), (2, h // 2)]
    rs = gs = bs = 0
    for x, y in pts:
        r, g, b = px[x, y]
        rs += r; gs += g; bs += b
    n = len(pts)
    return rs // n, gs // n, bs // n


def flood_card(im: Image.Image, plate: tuple[int, int, int] | None = None) -> Image.Image:
    """Drop leftover plates (chroma green, cyan cards) from the edges inward."""
    from collections import deque
    im = im.copy()
    px = im.load()
    w, h = im.size
    pr = pg = pb = 0
    if plate:
        pr, pg, pb = plate
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    seen = set()

    def match(r: int, g: int, b: int, a: int) -> bool:
        if a < 24:
            return True
        if is_screen(r, g, b) or is_card(r, g, b, a):
            return True
        if plate:
            dr, dg, db = r - pr, g - pg, b - pb
            if dr * dr + dg * dg + db * db < 52 * 52:
                return True
        return False

    while q:
        x, y = q.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        if not match(r, g, b, a):
            continue
        if a >= 8:
            px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                q.append((nx, ny))
    return im


def key_green(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_screen(r, g, b):
                px[x, y] = (0, 0, 0, 0)
            elif g > r + 12 and g > b + 12 and a > 0:
                ng = min(g, max(r, b) + 10)
                px[x, y] = (r, ng, b, a)
    return im


def bbox(im: Image.Image) -> tuple[int, int, int, int]:
    a = im.split()[-1]
    box = a.getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    pad = max(6, im.width // 50)
    x0, y0, x1, y1 = box
    return (
        max(0, x0 - pad),
        max(0, y0 - pad),
        min(im.width, x1 + pad),
        min(im.height, y1 + pad),
    )


def outline(im: Image.Image) -> Image.Image:
    w, h = im.size
    src = im.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] < 80:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h or src[nx, ny][3] < 80:
                    dst[max(0, min(w - 1, nx)), max(0, min(h - 1, ny))] = INK
    out.paste(im, (0, 0), im)
    return out


def fit(im: Image.Image, size: int = SIZE) -> Image.Image:
    plate = plate_rgb(im)
    im = key_green(im)
    im = flood_card(im, plate)
    x0, y0, x1, y1 = bbox(im)
    crop = im.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    margin = 6
    scale = min((size - margin) / cw, (size - margin) / ch)
    nw, nh = max(8, int(cw * scale)), max(8, int(ch * scale))
    small = crop.resize((nw, nh), Image.Resampling.BOX)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(small, ((size - nw) // 2, size - nh - 1), small)
    canvas = flood_card(canvas, plate)
    return outline(canvas)


def shift(im: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (dx, dy), im)
    return out


def walk_legs(im: Image.Image, side: int) -> Image.Image:
    out = im.copy()
    w, h = im.size
    y0 = int(h * 0.58)
    band = out.crop((0, y0, w, h))
    blank = Image.new("RGBA", (w, h - y0), (0, 0, 0, 0))
    out.paste(blank, (0, y0))
    out.paste(band, (side, y0), band)
    return out


def frames_for(kind: str) -> list[Image.Image]:
    a = fit(Image.open(SRC / f"{kind}.jpg"))
    bp = SRC / f"{kind}_b.jpg"
    b = fit(Image.open(bp)) if bp.exists() else shift(a, 0, -2)
    if kind in FLOAT:
        return [a, shift(a, 0, -3), b, shift(b, 0, -1)]
    return [a, walk_legs(a, 2), b, walk_legs(b, -2)]


def main() -> None:
    frames: list[tuple[str, Image.Image]] = []
    for kind in list(KINDS) + list(BOSSES):
        for i, im in enumerate(frames_for(kind)):
            frames.append((f"foe_{kind}_{i}", im))
            (OUT / "64").mkdir(parents=True, exist_ok=True)
            im.save(OUT / "64" / f"foe_{kind}_{i}.png")

    rows = (len(frames) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * SIZE, rows * SIZE), (0, 0, 0, 0))
    names = {}
    for i, (name, im) in enumerate(frames):
        x, y = (i % COLS) * SIZE, (i // COLS) * SIZE
        atlas.paste(im, (x, y), im)
        names[name] = i
    dest = Path(r"D:\chatagent\games\lattice-crypt\assets")
    atlas.save(dest / "creatures.png")
    (dest / "creatures.json").write_text(
        json.dumps({"cell": SIZE, "cols": COLS, "names": names}, indent=2),
        encoding="utf-8",
    )
    print("creatures", atlas.size, "frames", len(frames))


if __name__ == "__main__":
    main()
