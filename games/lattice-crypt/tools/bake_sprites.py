"""Bake original 16×16 arcade-pixel atlas for Lattice Crypt. No third-party art."""
from __future__ import annotations
import json
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(r"D:\chatagent\games\lattice-crypt\assets")
FOE32 = OUT / "foes" / "32"
CELL = 16
COLS = 16
ROWS = 32
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
    elif kind == "fan":
        circ(im, 8, 8, 5, (240, 180, 40, 255))
        px(im, 3, 8, (255, 220, 80, 255)); px(im, 13, 8, (255, 220, 80, 255)); px(im, 8, 3, (255, 220, 80, 255))
    elif kind == "needle":
        rect(im, 3, 7, 10, 2, (180, 220, 255, 255))
        px(im, 13, 7, (255, 255, 255, 255)); px(im, 13, 8, (255, 255, 255, 255))
    elif kind == "cinder":
        circ(im, 8, 9, 5, (220, 80, 20, 255))
        circ(im, 8, 7, 3, (255, 180, 40, 255))
        px(im, 8, 3, (255, 255, 160, 255))
    elif kind == "comet":
        circ(im, 10, 6, 4, (160, 200, 255, 255))
        rect(im, 3, 8, 6, 3, (80, 120, 200, 180))
    elif kind == "halo":
        circ(im, 8, 8, 6, (255, 220, 80, 255))
        circ(im, 8, 8, 3, (20, 20, 20, 0))
        px(im, 8, 2, (255, 255, 200, 255))
    elif kind == "core":
        circ(im, 8, 8, 5, (255, 80, 60, 255))
        circ(im, 8, 8, 2, (255, 240, 180, 255))
    elif kind == "heart":
        circ(im, 6, 7, 3, (200, 40, 60, 255))
        circ(im, 10, 7, 3, (200, 40, 60, 255))
        rect(im, 5, 8, 6, 5, (200, 40, 60, 255))
    elif kind == "iron":
        rect(im, 4, 4, 8, 9, (140, 150, 160, 255))
        rect(im, 6, 2, 4, 3, (180, 190, 200, 255))
    elif kind == "phial":
        rect(im, 6, 3, 4, 10, (80, 220, 160, 255))
        rect(im, 7, 1, 2, 3, (200, 255, 230, 255))
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
    px(im, 8, 8, pal + (255,))
    if lvl >= 2:
        px(im, 4, 6, pal + (255,))
        px(im, 12, 6, pal + (255,))
    if lvl >= 3:
        rect(im, 7, 2, 2, 2, pal + (255,))
    return im


def puff(frame):
    im = blank()
    c = (255, 220, 120, 255)
    r = 2 + frame
    circ(im, 8, 8, r, c)
    if frame:
        circ(im, 8, 8, max(1, r - 2), (255, 80, 40, 200))
    if frame >= 2:
        px(im, 3, 4, c)
        px(im, 13, 5, c)
        px(im, 5, 13, c)
        px(im, 12, 12, c)
    if frame >= 3:
        circ(im, 8, 8, 1, (255, 255, 220, 255))
    return im

def foe(kind, lvl, frame=0):
    im = blank()
    bob = (0, -1, 0, 1)[frame % 4]
    step = (0, 1, 0, -1)[frame % 4]
    if kind == "wraith":
        c = (200, 230, 255, 200)
        circ(im, 8, 6 + bob, 4, c)
        rect(im, 5, 8 + bob, 6, 5, c)
        px(im, 6, 5 + bob, (20, 20, 40, 255))
        px(im, 10, 5 + bob, (20, 20, 40, 255))
        rect(im, 11 + step, 10 + bob, 4, 3, (160, 180, 220, 180))
    elif kind == "brute":
        c = (180, 70, 40, 255)
        rect(im, 4, 4 + bob, 8, 8, c)
        rect(im, 5, 2 + bob, 6, 3, (40, 20, 16, 255))
        rect(im, 3 + step, 12 + bob, 3, 3, c)
        rect(im, 9 - step, 12 + bob, 3, 3, c)
        rect(im, 12, 6 + bob, 3, 6, (140, 90, 40, 255))
        px(im, 6, 5 + bob, (20, 10, 10, 255))
        px(im, 9, 5 + bob, (20, 10, 10, 255))
    elif kind == "imp":
        c = (220, 50, 30, 255)
        circ(im, 8, 8 + bob, 4, c)
        px(im, 5, 3 + bob, (80, 20, 80, 255))
        px(im, 11, 3 + bob, (80, 20, 80, 255))
        px(im, 6, 7 + bob, (255, 220, 40, 255))
        px(im, 10, 7 + bob, (255, 220, 40, 255))
        circ(im, 3, 6 + bob, 1 + (frame % 2), (255, 160, 40, 255))
        rect(im, 12, 9 + bob, 3, 2, c)
    elif kind == "hurler":
        c = (210, 150, 40, 255)
        rect(im, 5, 5 + bob, 6, 7, c)
        circ(im, 8, 4 + bob, 3, c)
        circ(im, 12, 3 + bob - (frame % 2), 2, (160, 160, 170, 255))
        rect(im, 4 + step, 12, 3, 3, (80, 50, 20, 255))
        rect(im, 9 - step, 12, 3, 3, (80, 50, 20, 255))
    elif kind == "shade":
        c = (140, 60, 200, 200 if frame % 2 == 0 else 120)
        circ(im, 8, 7 + bob, 4, c)
        rect(im, 5, 9 + bob, 6, 5, c)
        px(im, 6, 6 + bob, (255, 120, 255, 255))
        px(im, 10, 6 + bob, (255, 120, 255, 255))
    elif kind == "thief":
        c = (40, 140, 70, 255)
        rect(im, 5, 5 + bob, 6, 7, c)
        circ(im, 8, 4 + bob, 3, (20, 80, 40, 255))
        px(im, 7, 4 + bob, (255, 220, 40, 255))
        px(im, 9, 4 + bob, (255, 220, 40, 255))
        rect(im, 2, 8 + bob, 3, 2, (200, 200, 210, 255))
        rect(im, 4 + step, 12, 3, 3, (80, 50, 20, 255))
        rect(im, 9 - step, 12, 3, 3, (80, 50, 20, 255))
    elif kind == "drain":
        c = (80, 0, 0, 255)
        circ(im, 8, 7 + bob, 5, c)
        circ(im, 8, 7 + bob, 3, (10, 0, 0, 255))
        px(im, 6, 6 + bob, (255, 40, 40, 255))
        px(im, 10, 6 + bob, (255, 40, 40, 255))
        rect(im, 4, 10 + bob, 8, 5, (40, 0, 0, 255))
    return im

def hero(hid, dx, frame):
    im = blank()
    pal = {
        "kael": ((196, 36, 36), (240, 196, 64)),
        "vale": ((32, 168, 196), (230, 240, 245)),
        "orin": ((212, 168, 36), (140, 80, 210)),
        "nia": ((36, 148, 64), (160, 230, 90)),
        "lyra": ((80, 180, 200), (240, 200, 80)),
        "sancora": ((240, 230, 210), (180, 160, 80)),
        "arkos": ((32, 120, 140), (196, 140, 48)),
        "d9ra": ((120, 80, 80), (200, 60, 50)),
        "srath": ((30, 70, 50), (200, 220, 80)),
        "kairos": ((90, 50, 140), (220, 180, 255)),
        "justicae": ((200, 210, 230), (240, 200, 80)),
        "seidon": ((30, 120, 140), (80, 220, 180)),
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

def shot_wep(kind, frame=0):
    im = blank()
    if kind == "shard":
        circ(im, 8, 8, 2 + frame, (255, 220, 90, 255))
        px(im, 8, 8, (255, 255, 220, 255))
    elif kind == "fan":
        circ(im, 8, 8, 2, (255, 160, 40, 255))
        px(im, 5, 8, (255, 200, 80, 255)); px(im, 11, 8, (255, 200, 80, 255))
    elif kind == "needle":
        rect(im, 2 + frame, 7, 12, 2, (180, 230, 255, 255))
        px(im, 14, 7, (255, 255, 255, 255))
    elif kind == "cinder":
        circ(im, 8, 8, 3 + frame, (255, 100, 20, 230))
        circ(im, 8, 8, 1, (255, 240, 120, 255))
    elif kind == "comet":
        circ(im, 9, 7, 3, (160, 210, 255, 255))
        rect(im, 3, 8, 5, 2, (100, 140, 220, 180))
        if frame:
            px(im, 2, 9, (200, 230, 255, 255))
    elif kind == "halo":
        circ(im, 8, 8, 4 + frame, (255, 220, 80, 200))
        circ(im, 8, 8, 2, (255, 255, 180, 255))
    return im

def spark(frame):
    im = blank()
    c = (255, 230, 120, 255)
    px(im, 8, 8, c)
    if frame:
        px(im, 6, 7, c); px(im, 10, 9, c); px(im, 8, 5, c); px(im, 8, 11, c)
    else:
        px(im, 7, 8, c); px(im, 9, 8, c)
    return im

def muzzle():
    im = blank()
    circ(im, 8, 8, 3, (255, 240, 160, 220))
    circ(im, 8, 8, 1, (255, 255, 255, 255))
    return im

def flame_patch(frame):
    im = blank()
    circ(im, 8, 10, 4 + frame, (220, 70, 20, 180))
    circ(im, 8, 8, 2, (255, 180, 40, 220))
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
    for k in ("fan", "needle", "cinder", "comet", "halo", "core", "heart", "iron", "phial"):
        put(k, item(k))
    put("shot_kael", shot((255, 80, 60, 255)))
    put("shot_vale", shot((80, 220, 240, 255)))
    put("shot_orin", shot((255, 220, 80, 255)))
    put("shot_nia", shot((120, 255, 90, 255)))
    put("shot_imp", shot((255, 140, 40, 255)))
    put("shot_hurler", shot((180, 180, 190, 255)))
    for k in ("shard", "fan", "needle", "cinder", "comet", "halo"):
        put(f"shot_{k}_0", shot_wep(k, 0))
        put(f"shot_{k}_1", shot_wep(k, 1))
    put("spark_0", spark(0))
    put("spark_1", spark(1))
    put("muzzle", muzzle())
    put("flame_0", flame_patch(0))
    put("flame_1", flame_patch(1))
    for n in range(4):
        put(f"puff_{n}", puff(n))
    for k in ("wraith", "brute", "imp", "hurler", "shade"):
        for lv in (1, 2, 3):
            put(f"gen_{k}_{lv}", generator(k, lv))
    for k in ("wraith", "brute", "imp", "hurler", "shade", "thief", "drain"):
        for f in range(4):
            put(f"foe_{k}_{f}", foe(k, 1, f))
    for k in ("gate", "smith", "unnamer", "lock", "crown", "heartboss", "levi", "tithe"):
        for f in range(4):
            put(f"foe_{k}_{f}", foe("drain" if k == "unnamer" else "brute", 1, f))
    for hid in ("kael", "vale", "orin", "nia", "lyra", "sancora", "arkos", "d9ra", "srath", "kairos", "justicae", "seidon"):
        for d in range(4):
            for f in range(2):
                put(f"hero_{hid}_{d}_{f}", hero(hid, d, f))

    atlas = atlas.resize((atlas.width * 2, atlas.height * 2), Image.NEAREST)
    stamped = 0
    if FOE32.exists():
        for name, idx in names.items():
            p = FOE32 / f"{name}.png"
            if not p.exists():
                continue
            im = Image.open(p).convert("RGBA")
            if im.size != (32, 32):
                im = im.resize((32, 32), Image.NEAREST)
            x, y = (idx % COLS) * 32, (idx // COLS) * 32
            atlas.paste(im, (x, y), im)
            stamped += 1
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / "sprites.png")
    (OUT / "sprites.json").write_text(
        json.dumps({"cell": 32, "cols": COLS, "names": names}, indent=2),
        encoding="utf-8",
    )
    print("baked", i, "cells", atlas.size, "stamped", stamped)

if __name__ == "__main__":
    main()
