"""Key + pixelize Imagine monster stills into 32px walk frames."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(r"D:\chatagent\games\lattice-crypt\assets\foes\src")
OUT = Path(r"D:\chatagent\games\lattice-crypt\assets\foes\32")
SIZE = 32
KINDS = ("wraith", "brute", "imp", "hurler", "shade", "thief", "drain")
BOSSES = ("gate", "smith", "unnamer", "lock", "crown", "heartboss", "levi", "tithe")
FLOAT = {"wraith", "shade", "drain", "unnamer", "lock", "levi", "crown"}


def key_green(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g >= 140 and g >= r + 35 and g >= b + 35:
                px[x, y] = (0, 0, 0, 0)
            elif g >= 110 and r < 90 and b < 90:
                px[x, y] = (0, 0, 0, 0)
    return im


def bbox(im: Image.Image) -> tuple[int, int, int, int]:
    a = im.split()[-1]
    box = a.getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    pad = max(4, im.width // 40)
    x0, y0, x1, y1 = box
    return (
        max(0, x0 - pad),
        max(0, y0 - pad),
        min(im.width, x1 + pad),
        min(im.height, y1 + pad),
    )


def fit32(im: Image.Image) -> Image.Image:
    im = key_green(im)
    x0, y0, x1, y1 = bbox(im)
    crop = im.crop((x0, y0, x1, y1))
    # nearest downscale keeping aspect, sit on the bottom of the cell
    cw, ch = crop.size
    scale = min((SIZE - 2) / cw, (SIZE - 2) / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    small = crop.resize((nw, nh), Image.NEAREST)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(small, ((SIZE - nw) // 2, SIZE - nh - 1), small)
    return canvas


def shift(im: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (dx, dy), im)
    return out


def walk_legs(im: Image.Image, side: int) -> Image.Image:
    """Nudge the lower third left/right for a cheap step."""
    out = im.copy()
    w, h = im.size
    y0 = int(h * 0.62)
    band = out.crop((0, y0, w, h))
    blank = Image.new("RGBA", (w, h - y0), (0, 0, 0, 0))
    out.paste(blank, (0, y0))
    out.paste(band, (side, y0), band)
    return out


def frames_for(kind: str) -> list[Image.Image]:
    a = fit32(Image.open(SRC / f"{kind}.jpg"))
    bp = SRC / f"{kind}_b.jpg"
    b = fit32(Image.open(bp)) if bp.exists() else shift(a, 0, -1)
    if kind in FLOAT:
        return [a, shift(a, 0, -2), b, shift(b, 0, -1)]
    return [a, walk_legs(a, 1), b, walk_legs(b, -1)]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for kind in KINDS:
        fr = frames_for(kind)
        for i, im in enumerate(fr):
            p = OUT / f"foe_{kind}_{i}.png"
            im.save(p)
            n += 1
            print("wrote", p.name)
    for kind in BOSSES:
        fr = frames_for(kind)
        for i, im in enumerate(fr):
            p = OUT / f"foe_{kind}_{i}.png"
            im.save(p)
            n += 1
            print("wrote", p.name)
    print("packed", n, "frames")


if __name__ == "__main__":
    main()
