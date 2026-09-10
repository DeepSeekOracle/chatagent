"""32px 2-frame pickup atlas for Lattice Crypt. Original pixel, no third-party art."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

DEST = Path(r"D:\chatagent\games\lattice-crypt\assets")
CELL = 32
COLS = 8
CLEAR = (0, 0, 0, 0)

KINDS = [
    "food", "flask", "poison", "key", "chest", "vial", "trap", "codex",
    "swift", "aegis", "veil", "pulse", "warp", "reflect",
    "fan", "needle", "cinder", "comet", "halo", "cleave", "orbit", "aura",
    "core", "heart", "iron", "phial",
    "berry", "bread", "feast", "nectar", "elixir", "scrap",
    "coin", "gem", "crystal", "boot", "lens", "quiver", "tome", "ring",
    "thorns", "magnet", "echo", "soul", "crown", "moon", "sun", "storm",
    "bomb", "frostorb", "fury", "moss", "chalice", "scroll",
    "dice", "lantern", "latch", "ward", "seed", "anvil", "hymnstone", "grit",
    "spark", "weave",
]


def blank():
    return Image.new("RGBA", (CELL, CELL), CLEAR)


def blob(d, cx, cy, r, c):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)


def glow(d, cx, cy, r, rgb, a=70):
    blob(d, cx, cy, r, rgb + (a,))


def poly(d, pts, c):
    d.polygon(pts, fill=c)


def rect(d, x, y, w, h, c):
    d.rectangle((x, y, x + w, y + h), fill=c)


def food(fr):
    im = blank(); d = ImageDraw.Draw(im)
    y = 17 + (fr & 1)
    glow(d, 16, y, 11, (200, 80, 60), 50)
    blob(d, 16, y, 8, (196, 70, 50, 255))
    blob(d, 13, y - 2, 4, (230, 120, 80, 255))
    rect(d, 15, y - 11, 3, 5, (70, 140, 50, 255))
    rect(d, 17, y - 10, 4, 2, (90, 180, 70, 255))
    return im


def flask(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (80, 160, 220), 50)
    rect(d, 12, 10, 8, 16, (50, 110, 170, 255))
    rect(d, 13, 12, 6, 12, (90, 190, 240, 255))
    rect(d, 14, 4 + fr, 4, 7, (200, 230, 255, 255))
    rect(d, 13, 8, 6, 2, (240, 250, 255, 255))
    if fr:
        blob(d, 16, 18, 2, (255, 255, 255, 200))
    return im


def poison(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (70, 170, 50), 55)
    rect(d, 12, 10, 8, 16, (30, 80, 30, 255))
    rect(d, 13, 12, 6, 12, (90, 200, 60, 255))
    rect(d, 14, 4, 4, 7, (200, 230, 200, 255))
    blob(d, 14 + fr, 18, 2, (20, 40, 20, 255))
    blob(d, 18 - fr, 21, 1, (20, 40, 20, 255))
    return im


def key(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (240, 200, 50), 45)
    blob(d, 16, 9, 6, (240, 200, 50, 255))
    blob(d, 16, 9, 3, (40, 30, 10, 0))
    d.ellipse((13, 6, 19, 12), fill=(40, 28, 8, 255))
    rect(d, 15, 12, 3, 14, (240, 200, 50, 255))
    rect(d, 10, 20 + fr, 6, 2, (240, 200, 50, 255))
    rect(d, 10, 24, 5, 2, (240, 200, 50, 255))
    blob(d, 17, 8, 1, (255, 240, 160, 255))
    return im


def chest(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 12, (220, 170, 50), 40)
    lid = 8 - fr
    rect(d, 6, 14, 20, 12, (140, 86, 28, 255))
    rect(d, 6, lid, 20, 8, (176, 112, 40, 255))
    rect(d, 6, 14, 20, 3, (220, 170, 50, 255))
    rect(d, 14, 13, 4, 6, (240, 200, 60, 255))
    if fr:
        blob(d, 16, 10, 2, (255, 240, 140, 255))
    return im


def vial(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (180, 70, 220), 55)
    rect(d, 12, 10, 8, 16, (90, 30, 130, 255))
    rect(d, 13, 12, 6, 12, (190, 90, 240, 255))
    rect(d, 14, 3 + fr, 4, 8, (240, 200, 255, 255))
    if fr:
        blob(d, 16, 17, 2, (255, 230, 255, 220))
    return im


def trap(fr):
    im = blank(); d = ImageDraw.Draw(im)
    rect(d, 4, 18, 24, 8, (40, 20, 20, 255))
    h = 10 + fr * 4
    for i in range(5):
        x = 6 + i * 5
        poly(d, [(x, 22), (x + 2, 22 - h), (x + 4, 22)], (180, 40, 40, 255))
    return im


def codex(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (240, 200, 70), 40)
    ox = fr
    rect(d, 8 + ox, 6, 16, 20, (40, 50, 90, 255))
    rect(d, 10 + ox, 8, 12, 16, (240, 200, 70, 255))
    rect(d, 12 + ox, 12, 8, 2, (80, 40, 10, 255))
    rect(d, 12 + ox, 16, 8, 2, (80, 40, 10, 255))
    return im


def swift(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (80, 180, 90), 45)
    poly(d, [(8, 22), (16, 8 - fr), (24, 22), (16, 18)], (40, 90, 50, 255))
    poly(d, [(10, 20), (16, 11), (22, 20)], (80, 180, 90, 255))
    blob(d, 24 + fr, 10, 2, (200, 255, 120, 255))
    return im


def aegis(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 10 + fr
    glow(d, 16, 16, r, (40, 160, 180), 55)
    blob(d, 16, 16, 10, (40, 160, 180, 255))
    blob(d, 16, 16, 6, (180, 240, 255, 255))
    blob(d, 16, 16, 3, (20, 60, 80, 255))
    return im


def veil(fr):
    im = blank(); d = ImageDraw.Draw(im)
    a = 140 + fr * 40
    glow(d, 16, 16, 11, (180, 180, 220), 40)
    blob(d, 16, 16, 10, (180, 180, 220, a))
    blob(d, 16, 12, 5, (240, 240, 255, 200))
    return im


def pulse(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 8 + fr * 3
    glow(d, 16, 16, r + 2, (240, 200, 40), 60)
    blob(d, 16, 16, r, (240, 200, 40, 255))
    blob(d, 16, 16, 3, (255, 255, 200, 255))
    return im


def warp(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (80, 40, 160), 50)
    o = fr * 2
    rect(d, 8, 8, 16, 16, (80, 40, 160, 255))
    blob(d, 16, 16, 5 + o, (220, 160, 255, 255))
    blob(d, 16, 16, 2, (255, 240, 255, 255))
    return im


def reflect(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (200, 220, 255), 50)
    blob(d, 16, 16, 10, (200, 220, 255, 255))
    rect(d, 15, 6, 3, 20, (40, 80, 160, 255))
    if fr:
        blob(d, 20, 10, 2, (255, 255, 255, 255))
    return im


def fan(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (240, 180, 40), 50)
    y = 16 + fr
    d.pieslice((4, y - 12, 28, y + 12), 200, 340, fill=(249, 115, 22, 255))
    d.pieslice((8, y - 8, 24, y + 8), 205, 335, fill=(255, 220, 80, 255))
    return im


def needle(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 18, 16, 8, (34, 211, 238), 50)
    rect(d, 4, 14, 22, 4, (180, 220, 255, 255))
    poly(d, [(24, 12), (31, 16), (24, 20)], (255, 255, 255, 255))
    if fr:
        rect(d, 0, 15, 6, 2, (165, 243, 252, 180))
    return im


def cinder(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 8 + fr * 2
    glow(d, 16, 17, r + 2, (220, 80, 20), 60)
    blob(d, 16, 17, r, (220, 80, 20, 255))
    blob(d, 16, 15, 5, (255, 180, 40, 255))
    blob(d, 15, 13, 2, (255, 255, 160, 255))
    blob(d, 10 + fr * 3, 24, 2, (255, 120, 40, 200))
    return im


def comet(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 18, 14, 10, (160, 200, 255), 50)
    poly(d, [(4, 20 + fr), (14, 14), (14, 20)], (80, 120, 200, 200))
    blob(d, 20, 14, 7, (160, 200, 255, 255))
    blob(d, 21, 13, 3, (255, 255, 255, 255))
    return im


def halo(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 12, (255, 220, 80), 40)
    d.ellipse((5, 5, 27, 27), outline=(255, 220, 80, 255), width=3)
    d.ellipse((8, 8, 24, 24), outline=(255, 255, 200, 255), width=2)
    blob(d, 16, 16, 2 + fr, (255, 255, 230, 255))
    return im


def cleave(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (248, 113, 113), 45)
    poly(d, [(6, 24), (10, 8 - fr), (14, 24)], (200, 50, 50, 255))
    poly(d, [(8, 22), (10, 10), (12, 22)], (240, 180, 180, 255))
    rect(d, 8, 22, 5, 4, (120, 80, 40, 255))
    return im


def orbit(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (226, 232, 240), 40)
    d.ellipse((6, 6, 26, 26), outline=(226, 232, 240, 255), width=2)
    a = fr * math.pi
    for i in range(3):
        ang = a + i * 2.09
        blob(d, 16 + math.cos(ang) * 9, 16 + math.sin(ang) * 9, 3, (248, 113, 113, 255))
    return im


def aura(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 9 + fr * 2
    glow(d, 16, 16, r + 2, (74, 222, 128), 50)
    d.ellipse((16 - r, 16 - r, 16 + r, 16 + r), outline=(74, 222, 128, 255), width=3)
    blob(d, 16, 16, 4, (180, 255, 200, 255))
    return im


def core(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 8 + fr
    glow(d, 16, 16, r + 2, (255, 80, 60), 55)
    blob(d, 16, 16, r, (255, 80, 60, 255))
    blob(d, 16, 16, 3, (255, 240, 180, 255))
    return im


def heart(fr):
    im = blank(); d = ImageDraw.Draw(im)
    y = 15 - fr
    glow(d, 16, y + 2, 11, (200, 40, 60), 50)
    blob(d, 12, y, 6, (200, 40, 60, 255))
    blob(d, 20, y, 6, (200, 40, 60, 255))
    poly(d, [(6, y + 2), (16, y + 14), (26, y + 2)], (200, 40, 60, 255))
    blob(d, 12, y - 1, 2, (255, 160, 170, 255))
    return im


def iron(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (140, 150, 160), 40)
    rect(d, 8, 12, 16, 14, (140, 150, 160, 255))
    rect(d, 10, 6 + fr, 12, 8, (180, 190, 200, 255))
    rect(d, 12, 8, 8, 3, (80, 86, 94, 255))
    return im


def phial(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (80, 220, 160), 50)
    rect(d, 12, 10, 8, 16, (30, 110, 80, 255))
    rect(d, 13, 12, 6, 12, (80, 220, 160, 255))
    rect(d, 14, 3 + fr, 4, 8, (200, 255, 230, 255))
    return im


def berry(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 9, (190, 40, 70), 45)
    blob(d, 12, 18, 5, (190, 40, 70, 255))
    blob(d, 20, 18, 5, (210, 50, 80, 255))
    blob(d, 16, 13 + fr, 5, (170, 30, 60, 255))
    rect(d, 15, 6, 3, 5, (50, 120, 40, 255))
    return im


def bread(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (210, 160, 80), 40)
    d.ellipse((6, 12 + fr, 26, 26 + fr), fill=(180, 120, 50, 255))
    d.ellipse((8, 10 + fr, 24, 22 + fr), fill=(230, 180, 90, 255))
    blob(d, 12, 14 + fr, 1, (160, 100, 40, 255))
    blob(d, 18, 16 + fr, 1, (160, 100, 40, 255))
    return im


def feast(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 12, (240, 180, 60), 45)
    blob(d, 16, 20, 10, (180, 160, 120, 255))
    blob(d, 12, 14, 5, (200, 70, 50, 255))
    blob(d, 20, 15, 4, (80, 160, 70, 255))
    blob(d, 16, 12 - fr, 3, (240, 200, 80, 255))
    return im


def nectar(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (250, 200, 80), 50)
    poly(d, [(10, 10), (22, 10), (20, 24), (12, 24)], (180, 140, 40, 255))
    rect(d, 13, 12, 6, 8, (255, 220, 80, 200 + fr * 40))
    rect(d, 12, 8, 8, 3, (220, 180, 60, 255))
    return im


def elixir(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (80, 255, 180), 55)
    rect(d, 11, 8, 10, 18, (20, 90, 70, 255))
    rect(d, 12, 10, 8, 14, (40, 220, 160, 255))
    rect(d, 13, 2 + fr, 6, 8, (200, 255, 230, 255))
    blob(d, 16, 16, 2 + fr, (255, 255, 220, 255))
    return im


def scrap(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 9, (140, 150, 120), 35)
    rect(d, 8, 12 + fr, 16, 12, (120, 130, 110, 255))
    rect(d, 10, 10 + fr, 12, 4, (90, 100, 80, 255))
    blob(d, 20, 16, 2, (70, 80, 60, 255))
    return im


def coin(fr):
    im = blank(); d = ImageDraw.Draw(im)
    w = 10 if fr else 7
    glow(d, 16, 16, 10, (240, 200, 50), 50)
    d.ellipse((16 - w, 8, 16 + w, 24), fill=(240, 200, 50, 255))
    d.ellipse((16 - w + 2, 10, 16 + w - 2, 22), fill=(180, 140, 20, 255))
    return im


def gem(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (80, 220, 255), 55)
    o = fr
    poly(d, [(16, 4 + o), (26, 14), (16, 28 - o), (6, 14)], (80, 200, 255, 255))
    poly(d, [(16, 8), (22, 14), (16, 22), (10, 14)], (200, 245, 255, 255))
    return im


def crystal(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (34, 211, 238), 50)
    poly(d, [(16, 4), (22 + fr, 16), (16, 28), (10 - fr, 16)], (34, 180, 220, 255))
    poly(d, [(16, 8), (20, 16), (16, 24), (12, 16)], (180, 250, 255, 255))
    return im


def boot(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (80, 180, 90), 40)
    rect(d, 10, 8 + fr, 8, 14, (90, 60, 40, 255))
    rect(d, 10, 18 + fr, 16, 8, (70, 48, 32, 255))
    rect(d, 22, 20 + fr, 4, 6, (200, 255, 120, 255))
    return im


def lens(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 14, 14, 10, (180, 220, 255), 45)
    d.ellipse((5, 5, 23, 23), outline=(200, 220, 240, 255), width=3)
    blob(d, 14, 14, 5, (140, 200, 255, 80 + fr * 40))
    rect(d, 20, 20, 8, 3, (160, 140, 80, 255))
    return im


def quiver(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (180, 120, 50), 40)
    rect(d, 11, 10, 10, 16, (140, 90, 40, 255))
    for i in range(3):
        x = 12 + i * 3
        rect(d, x, 4 + (fr if i == 1 else 0), 2, 12, (200, 220, 255, 255))
        poly(d, [(x, 4), (x + 1, 1), (x + 2, 4)], (240, 80, 60, 255))
    return im


def tome(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (180, 80, 220), 45)
    rect(d, 7, 6, 18, 20, (60, 30, 90, 255))
    rect(d, 9, 8, 14, 16, (200, 160, 255, 255))
    rect(d, 11, 12 + fr, 10, 2, (80, 40, 120, 255))
    rect(d, 11, 16, 10, 2, (80, 40, 120, 255))
    return im


def ring(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (240, 200, 50), 45)
    d.ellipse((8, 8, 24, 24), outline=(240, 200, 50, 255), width=3)
    blob(d, 16, 8 + fr, 3, (80, 200, 255, 255))
    return im


def thorns(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (80, 140, 50), 40)
    for a, r in ((0, 12), (70, 11), (140, 12), (210, 10), (280, 11)):
        ang = math.radians(a + fr * 8)
        x, y = 16 + math.cos(ang) * r, 16 + math.sin(ang) * r
        poly(d, [(16, 16), (x, y), (16 + math.cos(ang + 0.3) * (r - 4), 16 + math.sin(ang + 0.3) * (r - 4))], (80, 140, 50, 255))
    blob(d, 16, 16, 4, (40, 80, 30, 255))
    return im


def magnet(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (220, 60, 60), 45)
    d.arc((6, 6, 26, 26), 200, 340, width=6, fill=(200, 50, 50, 255))
    rect(d, 6, 16, 5, 8 + fr, (200, 50, 50, 255))
    rect(d, 21, 16, 5, 8 + fr, (60, 80, 200, 255))
    return im


def echo(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 6 + fr * 5
    glow(d, 16, 16, r, (147, 197, 253), 50)
    d.ellipse((16 - r, 16 - r, 16 + r, 16 + r), outline=(147, 197, 253, 255), width=2)
    d.ellipse((12, 12, 20, 20), outline=(224, 242, 254, 255), width=2)
    return im


def soul(fr):
    im = blank(); d = ImageDraw.Draw(im)
    y = 16 - fr * 2
    glow(d, 16, y, 11, (200, 220, 255), 50)
    blob(d, 16, y, 8, (180, 210, 255, 200))
    blob(d, 16, y - 4, 4, (255, 255, 255, 220))
    poly(d, [(12, y + 4), (16, y + 12), (20, y + 4)], (180, 210, 255, 200))
    return im


def crown(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (251, 191, 36), 50)
    rect(d, 6, 16, 20, 8, (240, 180, 40, 255))
    for i, h in enumerate((10, 16 + fr * 2, 10, 16 + fr * 2, 10)):
        x = 6 + i * 4
        poly(d, [(x, 16), (x + 2, 16 - h), (x + 4, 16)], (255, 220, 80, 255))
    blob(d, 16, 8 - fr, 2, (80, 220, 255, 255))
    return im


def moon(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (200, 210, 255), 45)
    blob(d, 16, 16, 10, (220, 230, 255, 255))
    blob(d, 20 + fr, 13, 8, (20, 24, 40, 255))
    return im


def sun(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 6 + fr
    glow(d, 16, 16, 12, (255, 180, 40), 55)
    blob(d, 16, 16, r, (255, 200, 40, 255))
    for i in range(8):
        a = math.radians(i * 45 + fr * 12)
        blob(d, 16 + math.cos(a) * 12, 16 + math.sin(a) * 12, 2, (255, 240, 120, 255))
    return im


def storm(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (147, 197, 253), 50)
    blob(d, 16, 10, 8, (120, 140, 180, 255))
    ox = fr * 2
    poly(d, [(18 + ox, 8), (10 + ox, 16), (16 + ox, 16), (12 + ox, 26), (22 + ox, 14), (16 + ox, 14)], (255, 240, 80, 255))
    return im


def bomb(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 11, (239, 68, 68), 45)
    blob(d, 16, 18, 9, (40, 36, 44, 255))
    blob(d, 13, 16, 3, (90, 86, 94, 255))
    rect(d, 15, 8, 3, 5, (160, 120, 60, 255))
    blob(d, 18 + fr, 6, 2, (255, 180, 40, 255))
    return im


def frostorb(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 8 + fr
    glow(d, 16, 16, r + 2, (125, 211, 252), 55)
    blob(d, 16, 16, r, (125, 211, 252, 230))
    blob(d, 14, 14, 3, (255, 255, 255, 255))
    rect(d, 15, 8, 2, 16, (255, 255, 255, 180))
    rect(d, 8, 15, 16, 2, (255, 255, 255, 180))
    return im


def fury(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (239, 68, 68), 55)
    blob(d, 16, 18, 8 + fr, (220, 40, 40, 255))
    blob(d, 16, 12, 6, (255, 120, 40, 255))
    blob(d, 16, 8, 3, (255, 240, 160, 255))
    return im


def moss(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (74, 222, 128), 40)
    blob(d, 16, 20, 8, (50, 120, 50, 255))
    blob(d, 12, 16 + fr, 5, (80, 180, 70, 255))
    blob(d, 20, 16, 5, (70, 160, 60, 255))
    blob(d, 16, 14 - fr, 4, (140, 220, 100, 255))
    return im


def chalice(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 14, 11, (180, 70, 220), 50)
    poly(d, [(8, 8), (24, 8), (20, 16), (12, 16)], (200, 160, 60, 255))
    rect(d, 14, 16, 4, 8, (180, 140, 40, 255))
    rect(d, 10, 24, 12, 3, (180, 140, 40, 255))
    blob(d, 16, 10, 3 + fr, (180, 80, 220, 200))
    return im


def scroll(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (240, 220, 160), 40)
    rect(d, 8, 8 + fr, 16, 16, (240, 220, 160, 255))
    blob(d, 8, 16 + fr, 4, (220, 190, 120, 255))
    blob(d, 24, 16 + fr, 4, (220, 190, 120, 255))
    rect(d, 12, 12 + fr, 8, 1, (80, 50, 20, 255))
    return im


def dice(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (240, 240, 250), 40)
    o = fr
    rect(d, 8 + o, 8, 16, 16, (240, 240, 250, 255))
    blob(d, 12 + o, 12, 2, (30, 30, 40, 255))
    blob(d, 20 + o, 12, 2, (30, 30, 40, 255))
    blob(d, 16 + o, 16, 2, (30, 30, 40, 255))
    blob(d, 12 + o, 20, 2, (30, 30, 40, 255))
    blob(d, 20 + o, 20, 2, (30, 30, 40, 255))
    return im


def lantern(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 11, (255, 200, 80), 55)
    rect(d, 10, 10, 12, 14, (80, 60, 30, 255))
    rect(d, 12, 12, 8, 10, (255, 200, 60, 180 + fr * 50))
    rect(d, 14, 4, 4, 6, (120, 90, 40, 255))
    blob(d, 16, 16, 2 + fr, (255, 255, 200, 255))
    return im


def latch(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (180, 200, 220), 45)
    blob(d, 16, 10, 6, (180, 200, 220, 255))
    d.ellipse((13, 7, 19, 13), fill=(20, 24, 32, 255))
    rect(d, 15, 14, 3, 12, (180, 200, 220, 255))
    rect(d, 10, 20 + fr, 8, 3, (180, 200, 220, 255))
    return im


def ward(fr):
    im = blank(); d = ImageDraw.Draw(im)
    r = 9 + fr
    glow(d, 16, 16, r + 1, (34, 211, 238), 50)
    poly(d, [(16, 4), (26, 12), (22, 26), (10, 26), (6, 12)], (34, 160, 180, 255))
    blob(d, 16, 16, 4, (180, 240, 255, 255))
    return im


def seed(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 9, (80, 180, 70), 40)
    blob(d, 16, 20, 5, (90, 60, 30, 255))
    rect(d, 15, 10 - fr, 3, 10, (50, 140, 50, 255))
    blob(d, 12, 10 - fr, 3, (80, 180, 70, 255))
    blob(d, 20, 11 - fr, 3, (80, 180, 70, 255))
    return im


def anvil(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 10, (148, 163, 184), 40)
    rect(d, 6, 12 + fr, 20, 6, (160, 170, 180, 255))
    rect(d, 12, 16 + fr, 8, 8, (120, 130, 140, 255))
    rect(d, 8, 24 + fr, 16, 3, (90, 96, 104, 255))
    return im


def hymnstone(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (103, 232, 249), 50)
    poly(d, [(16, 4), (24, 16), (16, 28), (8, 16)], (80, 180, 220, 255))
    blob(d, 16, 16, 3 + fr, (255, 255, 255, 255))
    if fr:
        blob(d, 8, 8, 2, (200, 255, 255, 200))
        blob(d, 24, 10, 2, (200, 255, 255, 200))
    return im


def grit(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 18, 9, (148, 163, 184), 35)
    blob(d, 14, 18, 7, (120, 124, 130, 255))
    blob(d, 20, 16 + fr, 5, (150, 154, 160, 255))
    blob(d, 12, 14, 4, (90, 94, 100, 255))
    return im


def spark(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 10, (253, 224, 71), 55)
    s = 10 + fr * 3
    poly(d, [(16, 16 - s), (18, 14), (16 + s, 16), (18, 18), (16, 16 + s), (14, 18), (16 - s, 16), (14, 14)], (255, 240, 120, 255))
    blob(d, 16, 16, 2, (255, 255, 255, 255))
    return im


def weave(fr):
    im = blank(); d = ImageDraw.Draw(im)
    glow(d, 16, 16, 11, (253, 224, 71), 45)
    for i in range(3):
        r = 5 + i * 3 + fr
        d.ellipse((16 - r, 16 - r, 16 + r, 16 + r), outline=(251, 191, 36, 220), width=2)
    blob(d, 16, 16, 2, (255, 255, 220, 255))
    return im


DRAW = {
    "food": food, "flask": flask, "poison": poison, "key": key, "chest": chest,
    "vial": vial, "trap": trap, "codex": codex, "swift": swift, "aegis": aegis,
    "veil": veil, "pulse": pulse, "warp": warp, "reflect": reflect,
    "fan": fan, "needle": needle, "cinder": cinder, "comet": comet, "halo": halo,
    "cleave": cleave, "orbit": orbit, "aura": aura, "core": core, "heart": heart,
    "iron": iron, "phial": phial, "berry": berry, "bread": bread, "feast": feast,
    "nectar": nectar, "elixir": elixir, "scrap": scrap, "coin": coin, "gem": gem,
    "crystal": crystal, "boot": boot, "lens": lens, "quiver": quiver, "tome": tome,
    "ring": ring, "thorns": thorns, "magnet": magnet, "echo": echo, "soul": soul,
    "crown": crown, "moon": moon, "sun": sun, "storm": storm, "bomb": bomb,
    "frostorb": frostorb, "fury": fury, "moss": moss, "chalice": chalice, "scroll": scroll,
    "dice": dice, "lantern": lantern, "latch": latch, "ward": ward, "seed": seed,
    "anvil": anvil, "hymnstone": hymnstone, "grit": grit, "spark": spark, "weave": weave,
}


def main():
    n = len(KINDS) * 2
    rows = math.ceil(n / COLS)
    atlas = Image.new("RGBA", (COLS * CELL, rows * CELL), CLEAR)
    names = {}
    i = 0
    for kind in KINDS:
        fn = DRAW[kind]
        for fr in (0, 1):
            im = fn(fr)
            x, y = (i % COLS) * CELL, (i // COLS) * CELL
            atlas.paste(im, (x, y))
            names[f"{kind}_{fr}"] = i
            i += 1
    atlas.save(DEST / "items.png")
    meta = {"cell": CELL, "cols": COLS, "names": names, "kinds": KINDS}
    (DEST / "items.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("wrote", DEST / "items.png", atlas.size, "cells", i)


if __name__ == "__main__":
    main()
