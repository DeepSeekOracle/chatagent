"""Build exact 2:1 isometric diamond ground tiles. No magenta, no square photos."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(r"D:\chatagent\games\lattice-marines\assets")
W, H = 256, 128  # 2:1 iso diamond


def hash2(x: int, y: int, s: int) -> float:
    n = (x * 374761393 + y * 668265263 + s * 1274126177) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return (n & 0xFFFFFF) / 16777215.0


def noise(x: float, y: float, seed: int) -> float:
    x0, y0 = math.floor(x), math.floor(y)
    fx, fy = x - x0, y - y0
    u = fx * fx * (3 - 2 * fx)
    v = fy * fy * (3 - 2 * fy)
    a = hash2(x0, y0, seed)
    b = hash2(x0 + 1, y0, seed)
    c = hash2(x0, y0 + 1, seed)
    d = hash2(x0 + 1, y0 + 1, seed)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def fbm(x: float, y: float, seed: int, octaves: int = 5) -> float:
    a, s, t = 0.0, 1.0, 0.0
    for i in range(octaves):
        a += noise(x * s, y * s, seed + i * 19) / s
        t += 1.0 / s
        s *= 2.05
    return a / t


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * max(0.0, min(1.0, t)))


def mix(c0, c1, t):
    t = max(0.0, min(1.0, t))
    return tuple(lerp(c0[i], c1[i], t) for i in range(3))


def in_diamond(x: int, y: int) -> bool:
    nx = (x + 0.5) / W * 2 - 1
    ny = (y + 0.5) / H * 2 - 1
    return abs(nx) + abs(ny) <= 1.02


def diamond_uv(x: int, y: int):
    nx = (x + 0.5) / W * 2 - 1
    ny = (y + 0.5) / H * 2 - 1
    u = (nx + ny + 1) * 0.5
    v = (ny - nx + 1) * 0.5
    return u, v


def shade_iso(col, x, y):
    nx = (x + 0.5) / W * 2 - 1
    ny = (y + 0.5) / H * 2 - 1
    # left-dark, right-light, south a bit darker
    light = 0.88 + 0.18 * nx - 0.10 * ny
    return tuple(max(0, min(255, int(c * light))) for c in col)


def build(kind: str, seed: int) -> Image.Image:
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()
    pal = {
        "plains": ((62, 92, 38), (92, 122, 48), (48, 72, 30), (120, 110, 62)),
        "hills": ((90, 92, 88), (130, 128, 118), (70, 74, 70), (58, 62, 58)),
        "forest": ((22, 48, 24), (34, 72, 32), (16, 36, 18), (48, 78, 36)),
        "water": ((10, 42, 62), (18, 78, 96), (8, 28, 48), (40, 140, 150)),
        "ruins": ((78, 72, 64), (110, 104, 92), (52, 48, 44), (140, 122, 88)),
        "fog": ((6, 10, 18), (10, 18, 28), (4, 8, 14), (14, 28, 40)),
    }[kind]
    base, hi, lo, acc = pal
    rng = random.Random(seed)
    for y in range(H):
        for x in range(W):
            if not in_diamond(x, y):
                continue
            u, v = diamond_uv(x, y)
            n = fbm(u * 10, v * 10, seed)
            n2 = fbm(u * 22 + 3, v * 22, seed + 7)
            n3 = fbm(u * 40, v * 40, seed + 13)
            if kind == "water":
                wave = 0.5 + 0.5 * math.sin((u * 22 + v * 7) * math.pi)
                col = mix(lo, hi, n * 0.4 + wave * 0.6)
                if n2 > 0.74:
                    col = mix(col, acc, 0.4)
                if n3 > 0.82:
                    col = mix(col, (180, 230, 235), 0.22)
            elif kind == "forest":
                col = mix(lo, hi, n)
                if n2 > 0.5:
                    col = mix(col, acc, 0.55)
                if ((int(u * 14) ^ int(v * 14) ^ seed) & 3) == 0:
                    col = mix(col, lo, 0.45)
                if n3 > 0.7:
                    col = mix(col, (20, 60, 22), 0.3)
            elif kind == "hills":
                ridge = abs(n - 0.48) * 2
                col = mix(base, hi, ridge)
                if n2 < 0.32:
                    col = mix(col, lo, 0.5)
                if n3 > 0.8:
                    col = mix(col, (160, 158, 148), 0.35)
            elif kind == "ruins":
                col = mix(base, hi, n)
                grid = (int(u * 12) + int(v * 12)) % 2
                if grid:
                    col = mix(col, acc, 0.18)
                if n2 > 0.62:
                    col = mix(col, lo, 0.35)
            elif kind == "fog":
                col = mix(lo, hi, n * 0.35)
                if (int(u * 18) + int(v * 18)) % 7 == 0:
                    col = mix(col, acc, 0.28)
            else:
                col = mix(base, hi, n * 0.75 + n3 * 0.25)
                if n2 > 0.76:
                    col = mix(col, acc, 0.4)
                if n2 < 0.2:
                    col = mix(col, lo, 0.4)
                if n3 > 0.85:
                    col = mix(col, (70, 110, 40), 0.25)
            col = shade_iso(col, x, y)
            px[x, y] = (*col, 255)
    # crisp diamond edge
    edge = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(edge)
    d.polygon([(W // 2, 1), (W - 2, H // 2), (W // 2, H - 2), (1, H // 2)], fill=255)
    im.putalpha(edge)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    specs = [
        ("plains", 11),
        ("hills", 23),
        ("forest", 37),
        ("water", 41),
        ("ruins", 53),
        ("fog", 61),
    ]
    for kind, seed in specs:
        im = build(kind, seed)
        path = OUT / f"tile-{kind}.png"
        im.save(path, optimize=True)
        print("wrote", path, im.size)


if __name__ == "__main__":
    main()
