"""Bake original 16×16 arcade-pixel atlas for Lattice Crypt. No third-party art."""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(r"D:\chatagent\games\lattice-crypt\assets")
CELL = 16
COLS = 16
ROWS = 20
CLEAR = (0, 0, 0, 0)

def blank():
    return Image.new("RGBA", (CELL, CELL), CLEAR)

def px(im, x, y, c):
    if 0 <= x < CELL and 0 <= y < CELL:
        im.putpixel((x, y), c)

def rect(im, x, y, w, h, c):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            px(im, xx, yy, c)

def circ(im, cx, cy, r, c):
    for y in range(CELL):
        for x in range(CELL):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                px(im, x, y, c)

def floor_tile(hue):
    im = blank()
    a = hue + (255,)
    b = tuple(max(0, v - 12) for v in hue) + (255,)
    spec = tuple(min(255, v + 22) for v in hue) + (255,)
    for y in range(CELL):
        for x in range(CELL):
            n = (x * 3 + y * 7) % 11
            px(im, x, y, a if n > 2 else b)
    px(im, 3, 5, spec)
    px(im, 11, 10, spec)
    px(im, 7, 2, b)
    return im

def wall_tile(stone=(58, 52, 68), dark=(28, 24, 36), lite=(92, 84, 104)):
    im = blank()
    s, d, l = stone + (255,), dark + (255,), lite + (255,)
    rect(im, 0, 0, 16, 16, s)
    for y in range(0, 16, 4):
        rect(im, 0, y, 16, 1, d)
    rect(im, 0, 0, 16, 2, l)
    rect(im, 3, 5, 4, 3, d)
    rect(im, 10, 9, 4, 3, d)
    return im

def door_tile(open_=False):
    im = blank()
    if open_:
        rect(im, 1, 0, 3, 16, (70, 48, 32, 255))
        rect(im, 12, 0, 3, 16, (70, 48, 32, 255))
        return im
    rect(im, 2, 0, 12, 16, (92, 58, 32, 255))
    rect(im, 3, 1, 10, 14, (120, 74, 40, 255))
    px(im, 11, 8, (220, 180, 60, 255))
    return im

def exit_tile():
    im = blank()
    circ(im, 8, 8, 6, (20, 180, 160, 255))
    circ(im, 8, 8, 3, (200, 255, 220, 255))
    return im

def item(kind):
    im = blank()
    if kind == "food":
        circ(im, 8, 9, 5, (200, 80, 60, 255))
        rect(im, 6, 4, 4, 3, (240, 220, 160, 255))
    elif kind == "flask":
        rect(im, 6, 4, 4, 8, (80, 160, 220, 255))
        rect(im, 7, 2, 2, 3, (200, 220, 240, 255))
    elif kind == "poison":
        # blight — flask silhouette, sick liquid
        rect(im, 6, 4, 4, 8, (70, 170, 50, 255))
        rect(im, 7, 2, 2, 3, (200, 220, 240, 255))
        px(im, 7, 8, (20, 40, 20, 255))
        px(im, 8, 10, (20, 40, 20, 255))
    elif kind == "key":
        rect(im, 8, 3, 3, 9, (240, 200, 50, 255))
        circ(im, 9, 4, 3, (240, 200, 50, 255))
        px(im, 6, 10, (240, 200, 50, 255))
        px(im, 6, 12, (240, 200, 50, 255))
    elif kind == "chest":
        rect(im, 3, 6, 10, 8, (160, 100, 30, 255))
        rect(im, 3, 9, 10, 2, (220, 170, 50, 255))
    elif kind == "vial":
        rect(im, 6, 3, 4, 10, (180, 70, 220, 255))
        rect(im, 7, 1, 2, 3, (240, 200, 255, 255))
    elif kind == "trap":
        rect(im, 2, 2, 12, 12, (40, 20, 20, 255))
        for i in range(3, 13, 3):
            rect(im, i, 4, 1, 8, (180, 40, 40, 255))
    elif kind == "codex":
        rect(im, 4, 3, 8, 11, (40, 50, 90, 255))
        rect(im, 5, 4, 6, 9, (240, 200, 70, 255))
        rect(im, 6, 6, 4, 1, (80, 40, 10, 255))
    elif kind == "swift":
        rect(im, 4, 8, 8, 5, (40, 90, 50, 255))
        rect(im, 6, 5, 4, 4, (80, 180, 90, 255))
        px(im, 12, 7, (200, 255, 120, 255))
    elif kind == "aegis":
        circ(im, 8, 8, 6, (40, 160, 180, 255))
        circ(im, 8, 8, 3, (180, 240, 255, 255))
    elif kind == "veil":
        circ(im, 8, 8, 6, (180, 180, 220, 140))
        circ(im, 8, 7, 3, (240, 240, 255, 200))
    elif kind == "pulse":
        circ(im, 8, 8, 6, (240, 200, 40, 255))
        circ(im, 8, 8, 2, (255, 255, 200, 255))
    elif kind == "warp":
        rect(im, 3, 3, 10, 10, (80, 40, 160, 255))
        circ(im, 8, 8, 3, (220, 160, 255, 255))
    elif kind == "reflect":
        circ(im, 8, 8, 6, (200, 220, 255, 255))
        rect(im, 7, 3, 2, 10, (40, 80, 160, 255))
    elif kind == "pad":
        rect(im, 1, 1, 14, 14, (40, 80, 90, 255))
        circ(im, 8, 8, 4, (80, 220, 200, 255))
        circ(im, 8, 8, 2, (20, 40, 40, 255))
    return im

def generator(kind, lvl):
    im = blank()
    pal = {
        "wraith": (180, 220, 255),
        "brute": (180, 80, 50),
        "imp": (220, 60, 40),
        "hurler": (200, 140, 40),
        "shade": (160, 80, 200),
    }[kind]
    s = 4 + lvl
    circ(im, 8, 9, s, pal + (255,))
    circ(im, 8, 9, max(2, s - 3), (20, 10, 20, 255))
    rect(im, 3, 13, 10, 3, (40, 30, 40, 255))
    return im

def foe(kind, lvl, frame=0):
    im = blank()
    if kind == "wraith":
        c = (200 - lvl * 20, 230, 255, 180 + frame * 20)
        circ(im, 8, 7, 4 + lvl, c)
        px(im, 6, 6, (20, 20, 40, 255)); px(im, 10, 6, (20, 20, 40, 255))
    elif kind == "brute":
        c = (160 + lvl * 20, 70, 40, 255)
        rect(im, 4, 4, 8, 10, c)
        rect(im, 5, 2, 6, 3, (40, 20, 16, 255))
        rect(im, 2, 6, 3, 6, c)
    elif kind == "imp":
        c = (220, 40 + lvl * 20, 30, 255)
        circ(im, 8, 8, 4 + lvl, c)
        px(im, 5, 3, c); px(im, 11, 3, c)
    elif kind == "hurler":
        c = (210, 150, 40, 255)
        rect(im, 5, 5, 6, 8, c)
        circ(im, 8, 4, 3, c)
    elif kind == "shade":
        if frame:
            return im
        c = (140, 60, 200, 220)
        circ(im, 8, 8, 5, c)
    elif kind == "thief":
        c = (40, 140, 70, 255)
        rect(im, 5, 4, 6, 9, c)
        circ(im, 8, 4, 3, (20, 80, 40, 255))
    elif kind == "drain":
        c = (20, 0, 0, 255)
        circ(im, 8, 8, 6, (80, 0, 0, 255))
        circ(im, 8, 8, 3, c)
        px(im, 6, 6, (255, 40, 40, 255)); px(im, 10, 6, (255, 40, 40, 255))
    return im

def hero(hid, dx, frame):
    im = blank()
    pal = {
        "kael": ((196, 36, 36), (240, 196, 64)),
        "vale": ((32, 168, 196), (230, 240, 245)),
        "orin": ((212, 168, 36), (140, 80, 210)),
        "nia": ((36, 148, 64), (160, 230, 90)),
    }[hid]
    body, accent = pal[0] + (255,), pal[1] + (255,)
    skin = (240, 208, 176, 255)
    ink = (20, 16, 24, 255)
    bob = frame
    # shadow
    rect(im, 4, 14, 8, 2, (0, 0, 0, 90))
    # legs
    lx = 5 if frame == 0 else 6
    rx = 9 if frame == 0 else 8
    rect(im, lx, 12 + bob, 2, 3, body)
    rect(im, rx, 12 + bob, 2, 3, body)
    # torso
    rect(im, 5, 7 + bob, 6, 6, body)
    # head
    circ(im, 8, 5 + bob, 3, skin)
    if hid == "kael":
        rect(im, 4, 3 + bob, 8, 2, (40, 20, 16, 255))
        rect(im, 11, 8 + bob, 4, 2, accent)
        rect(im, 13, 6 + bob, 2, 6, accent)
    elif hid == "vale":
        rect(im, 4, 2 + bob, 8, 2, accent)
        px(im, 4, 2 + bob, accent); px(im, 11, 2 + bob, accent)
        rect(im, 3, 7 + bob, 3, 7, accent)
    elif hid == "orin":
        rect(im, 4, 1 + bob, 8, 4, (48, 24, 72, 255))
        rect(im, 11, 6 + bob, 2, 8, accent)
        px(im, 12, 5 + bob, (180, 255, 255, 255))
    else:
        rect(im, 4, 3 + bob, 8, 2, (20, 70, 30, 255))
        rect(im, 11, 7 + bob, 4, 1, accent)
        px(im, 14, 7 + bob, (255, 255, 160, 255))
    if dx == 0:
        px(im, 7, 5 + bob, ink); px(im, 9, 5 + bob, ink)
    elif dx == 1:
        px(im, 6, 5 + bob, ink)
    elif dx == 2:
        px(im, 10, 5 + bob, ink)
    else:
        rect(im, 5, 3 + bob, 6, 3, body)
    return im

def shot(color):
    im = blank()
    circ(im, 8, 8, 2, color)
    return im

def main():
    atlas = Image.new("RGBA", (COLS * CELL, ROWS * CELL), CLEAR)
    names = {}
    i = 0

    def put(name, im):
        nonlocal i
        x, y = (i % COLS) * CELL, (i // COLS) * CELL
        atlas.paste(im, (x, y))
        names[name] = i
        i += 1

    put("floor", floor_tile((48, 52, 44)))
    put("floor2", floor_tile((40, 44, 56)))
    put("floor3", floor_tile((56, 40, 36)))
    put("wall", wall_tile())
    put("wall2", wall_tile((36, 52, 72), (16, 24, 40), (90, 140, 180)))
    put("wall3", wall_tile((72, 36, 28), (36, 16, 12), (140, 80, 50)))
    put("wall4", wall_tile((28, 22, 40), (10, 8, 16), (70, 40, 90)))
    put("door", door_tile(False))
    put("door_open", door_tile(True))
    put("exit", exit_tile())
    put("food", item("food"))
    put("flask", item("flask"))
    put("poison", item("poison"))
    put("key", item("key"))
    put("chest", item("chest"))
    put("vial", item("vial"))
    put("trap", item("trap"))
    put("codex", item("codex"))
    put("swift", item("swift"))
    put("aegis", item("aegis"))
    put("veil", item("veil"))
    put("pulse", item("pulse"))
    put("warp", item("warp"))
    put("reflect", item("reflect"))
    put("pad", item("pad"))
    put("shot_kael", shot((255, 80, 60, 255)))
    put("shot_vale", shot((80, 220, 240, 255)))
    put("shot_orin", shot((255, 220, 80, 255)))
    put("shot_nia", shot((120, 255, 90, 255)))
    for k in ("wraith", "brute", "imp", "hurler", "shade"):
        for lv in (1, 2, 3):
            put(f"gen_{k}_{lv}", generator(k, lv))
    for k in ("wraith", "brute", "imp", "hurler", "shade", "thief", "drain"):
        put(f"foe_{k}_0", foe(k, 1, 0))
        put(f"foe_{k}_1", foe(k, 1, 1))
    for hid in ("kael", "vale", "orin", "nia"):
        for d in range(4):
            for f in range(2):
                put(f"hero_{hid}_{d}_{f}", hero(hid, d, f))

    atlas = atlas.resize((atlas.width * 2, atlas.height * 2), Image.NEAREST)
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / "sprites.png")
    (OUT / "sprites.json").write_text(
        __import__("json").dumps({"cell": 32, "cols": COLS, "names": names}, indent=2),
        encoding="utf-8",
    )
    print("baked", i, "cells", atlas.size)

if __name__ == "__main__":
    main()
