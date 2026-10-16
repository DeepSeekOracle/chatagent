"""Compose the LYGO Arena floor mats from CC0 Poly Haven textures.

    python tools/gen_arena_mats.py --fetch     # cache the source textures (needs the network)
    python tools/gen_arena_mats.py             # write assets/floors/<name>.jpg for every mat
    python tools/gen_arena_mats.py --only=basalt,glacier

House style, read off the original seventeen mats: a photographic ground, duotoned into the ring's
palette, vignetted at the edges and lifted in the middle; a thin accent ring (an inscribed octagon
with an inner circle, or two concentric circles) drawn with a dark under-stroke and a soft glow;
and a black centre medallion carrying the wordmark in the accent colour.

Every mat is composed at exactly the arena's own pixel size (MAP_W * TILE x MAP_H * TILE = 2176 x
1408), because paintFloor() stretches the photo mat across the whole floor canvas and returns early
- the mat IS the arena, so anything not drawn here is not drawn.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------- geometry ---
W, H = 2176, 1408                      # == arena.js MAP_W * TILE x MAP_H * TILE
CX, CY = W / 2, H / 2
SS = 2                                 # supersample for the ring/medallion pass

# ---------------------------------------------------------------- the mats ---
# name: palette / ring style / how many times the texture repeats across the mat
MATS = {
    # dark grounds
    "basalt":    dict(style="octagon", tiles=1, shadow="#0a0c10", light="#4a3128", accent="#ff7a2f", gamma=1.05, lift=0.20, dark=0.50, mix=0.18),
    "nightrun":  dict(style="ring",    tiles=2, shadow="#07080c", light="#3a3f4a", accent="#c084fc", gamma=1.10, lift=0.18, dark=0.52, mix=0.16),
    "glacier":   dict(style="octagon", tiles=1, shadow="#0e1a24", light="#e6f1f8", accent="#7fd8ff", gamma=1.06, lift=0.14, dark=0.42, mix=0.22),
    # mid grounds
    "gantry":    dict(style="ring",    tiles=3, shadow="#10151b", light="#6d7580", accent="#5eead4", gamma=0.98, lift=0.14, dark=0.46, mix=0.20),
    "granite":   dict(style="octagon", tiles=3, shadow="#14171c", light="#cdd3db", accent="#93c5fd", gamma=0.94, lift=0.15, dark=0.38, mix=0.24),
    "rustbelt":  dict(style="octagon", tiles=2, shadow="#1a0f0a", light="#b4552a", accent="#f0a054", gamma=1.02, lift=0.15, dark=0.44, mix=0.22),
    "highland":  dict(style="ring",    tiles=1, shadow="#0d1608", light="#7d9a4a", accent="#a3e635", gamma=1.00, lift=0.16, dark=0.42, mix=0.24),
    # light grounds
    "marble":    dict(style="ring",    tiles=2, shadow="#6b5f4a", light="#f6f1e4", accent="#c8a044", gamma=0.94, lift=0.12, dark=0.30, mix=0.20),
    "flagstone": dict(style="octagon", tiles=2, shadow="#2a2b28", light="#d8d2c2", accent="#fbbf24", gamma=0.95, lift=0.12, dark=0.34, mix=0.20),
    "tideline":  dict(style="ring",    tiles=1, shadow="#1b2a2e", light="#e6d5a8", accent="#2dd4bf", gamma=1.02, lift=0.14, dark=0.34, mix=0.30),
}

# ring radii in mat pixels, measured off the original set (a photo mat is drawn 1:1)
R_OCT, R_IN, R_DISC = 578, 348, 202
RING_OUT, RING_IN, RING_DISC = 580, 300, 220

# ---------------------------------------------------------------- sources ---
# name -> (Poly Haven asset, resolution). CC0; see assets/floors/SOURCES.md.
SOURCES = {
    "basalt":    ("aerial_rocks_02", "2k"),
    "glacier":   ("snow_02", "2k"),
    "marble":    ("marble_01", "2k"),
    "gantry":    ("metal_plate", "2k"),
    "tideline":  ("aerial_beach_01", "2k"),
    "rustbelt":  ("rust_coarse_01", "2k"),
    "nightrun":  ("asphalt_02", "2k"),
    "granite":   ("granite_tile", "2k"),
    "highland":  ("aerial_grass_rock", "2k"),
    "flagstone": ("stone_tiles_02", "2k"),
}

CACHE = os.environ.get("LYGO_ARENA_MAT_CACHE") or os.path.join(
    os.environ.get("TEMP") or "/tmp", "lygo_arena_mats")


def _get(url, timeout=180):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def diffuse_url(asset, res):
    d = json.loads(_get(f"https://api.polyhaven.com/files/{asset}").decode("utf-8"))
    entry = d["Diffuse"][res]["jpg"]
    return entry["url"], entry.get("size", 0)


def fetch(force=False, cache=None):
    """Download the source textures into the (repo-external) cache."""
    cache = cache or CACHE
    os.makedirs(cache, exist_ok=True)
    for name, (asset, res) in SOURCES.items():
        dst = os.path.join(cache, f"{name}.jpg")
        if os.path.exists(dst) and not force:
            print(f"  cached  {name:10s} {os.path.getsize(dst)/1048576:6.2f} MB  <- {asset}")
            continue
        url, _ = diffuse_url(asset, res)
        blob = _get(url)
        with open(dst, "wb") as f:
            f.write(blob)
        print(f"  pulled  {name:10s} {len(blob)/1048576:6.2f} MB  <- {asset} ({res} diffuse)")
    print(f"\n{len(SOURCES)} sources ready in {cache}")
    return len(SOURCES)


FONT = r"C:\Windows\Fonts\ariblk.ttf"
WORDMARK = "LYGO"


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def ground(src, spec):
    """Photographic ground, duotoned into the mat's palette, vignetted and centre-lit."""
    img = Image.open(src).convert("RGB")
    tile = max(256, int(round(W / spec["tiles"])))
    img = img.resize((tile, tile), Image.LANCZOS)
    arr = np.asarray(img, dtype=np.float32)
    reps_x = int(np.ceil(W / tile))
    reps_y = int(np.ceil(H / tile))
    big = np.tile(arr, (reps_y, reps_x, 1))[:H, :W]
    lum = big @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    lo, hi = np.percentile(lum, 2), np.percentile(lum, 98)
    l = np.clip((lum - lo) / max(1.0, hi - lo), 0, 1) ** spec["gamma"]
    sh, li = hex_rgb(spec["shadow"]), hex_rgb(spec["light"])
    duo = sh[None, None, :] + (li - sh)[None, None, :] * l[:, :, None]
    out = duo * (1 - spec["mix"]) + big * spec["mix"]
    # elliptical radius, 0 at the middle and 1 in the corners
    yy = (np.arange(H, dtype=np.float32) - CY) / CY
    xx = (np.arange(W, dtype=np.float32) - CX) / CX
    r = np.sqrt((yy[:, None] ** 2 + xx[None, :] ** 2) / 2.0)
    gain = 1 + spec["lift"] * (1 - r) ** 1.5 - spec["dark"] * r ** 2.0
    out *= gain[:, :, None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


def _octagon(cx, cy, rx, ry):
    pts = []
    for k in range(8):
        a = np.pi / 8 + k * np.pi / 4
        pts.append((cx + rx * np.cos(a) * 1.0824, cy + ry * np.sin(a) * 1.0824))
    return pts


def _wordmark(dr, cx, cy, text, accent, size):
    font = ImageFont.truetype(FONT, size)
    track = size * 0.10
    widths = [dr.textlength(ch, font=font) for ch in text]
    total = sum(widths) + track * (len(text) - 1)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        dr.text((x, cy), ch, font=font, fill=accent, anchor="lm")
        x += w + track


def dressing(spec):
    """The ring + centre medallion, drawn at SS x and downsampled for clean edges."""
    lay = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    dr = ImageDraw.Draw(lay)
    accent = spec["accent"]
    cx, cy = CX * SS, CY * SS
    lw = 3 * SS

    def stroke(fn, colour, width):
        fn(colour, width)

    def octagon(colour, width):
        dr.line(_octagon(cx, cy, R_OCT * SS, R_OCT * 1.02 * SS) + [_octagon(cx, cy, R_OCT * SS, R_OCT * 1.02 * SS)[0]],
                fill=colour, width=width, joint="curve")

    def inner_circle(colour, width):
        dr.ellipse([cx - R_IN * SS, cy - R_IN * SS, cx + R_IN * SS, cy + R_IN * SS], outline=colour, width=width)

    def outer_circle(colour, width):
        dr.ellipse([cx - RING_OUT * SS, cy - RING_OUT * SS, cx + RING_OUT * SS, cy + RING_OUT * SS], outline=colour, width=width)

    def inner_ring(colour, width):
        dr.ellipse([cx - RING_IN * SS, cy - RING_IN * SS, cx + RING_IN * SS, cy + RING_IN * SS], outline=colour, width=width)

    # dark under-stroke first, then the accent line, so the ring reads on sand and on rock
    if spec["style"] == "octagon":
        stroke(octagon, (8, 10, 16, 150), lw + 3 * SS)
        stroke(inner_circle, (8, 10, 16, 130), lw + 2 * SS)
    else:
        stroke(outer_circle, (8, 10, 16, 150), lw + 3 * SS)
        stroke(inner_ring, (8, 10, 16, 130), lw + 2 * SS)

    glow = lay.filter(ImageFilter.GaussianBlur(6 * SS))
    if spec["style"] == "octagon":
        stroke(octagon, accent, lw)
        stroke(inner_circle, accent, lw - SS)
    else:
        stroke(outer_circle, accent, lw)
        stroke(inner_ring, (210, 214, 222, 210), lw - SS)

    # centre medallion: a black disc, an accent rim, faint ticks, the wordmark
    disc = R_DISC if spec["style"] == "octagon" else RING_DISC
    dr.ellipse([cx - (disc + 6) * SS, cy - (disc + 6) * SS, cx + (disc + 6) * SS, cy + (disc + 6) * SS],
               fill=(11, 13, 18, 232))
    dr.ellipse([cx - disc * SS, cy - disc * SS, cx + disc * SS, cy + disc * SS],
               outline=accent, width=3 * SS)
    dr.ellipse([cx - (disc - 7) * SS, cy - (disc - 7) * SS, cx + (disc - 7) * SS, cy + (disc - 7) * SS],
               outline=(148, 163, 184, 90), width=1 * SS)
    for k in range(8):
        a = k * np.pi / 4
        x0, y0 = cx + np.cos(a) * (disc - 14) * SS, cy + np.sin(a) * (disc - 14) * SS
        x1, y1 = cx + np.cos(a) * (disc - 4) * SS, cy + np.sin(a) * (disc - 4) * SS
        dr.line([x0, y0, x1, y1], fill=(203, 213, 225, 130), width=1 * SS)
    _wordmark(dr, cx, cy, WORDMARK, accent, int(disc * 0.62 * SS))

    lay = lay.resize((W, H), Image.LANCZOS)
    return lay, glow.resize((W, H), Image.LANCZOS)


def compose(name, spec, src, outdir):
    base = ground(src, spec)
    over, glow = dressing(spec)
    base = Image.alpha_composite(base.convert("RGBA"), glow)
    out = Image.alpha_composite(base, over).convert("RGB")
    dst = os.path.join(outdir, name + ".jpg")
    out.save(dst, "JPEG", quality=90, subsampling=0, optimize=True, progressive=True)
    return dst


def sources_md():
    """The licence record the sourcing brief asks for: which source each mat came from."""
    out = ["# New arena floor mats — sources and licence", "",
           "The ten mats added in the 2026-10 mat pass are composed from **Poly Haven** textures.",
           "Poly Haven releases every asset (HDRIs, textures, models) as **CC0 / public domain** —",
           "no attribution required, commercial use allowed (<https://polyhaven.com/license>).",
           "Credit is given here anyway.", "",
           "The composed mats are the only files that ship; the source textures are cached outside the",
           "repo (`tools/gen_arena_mats.py --fetch` restores them).", "",
           "| mat | ground source (Poly Haven) | licence | diff map |", "| --- | --- | --- | --- |"]
    for name in MATS:
        asset, res = SOURCES[name]
        out.append(f"| `{name}.jpg` | [`{asset}`](https://polyhaven.com/a/{asset}) | CC0 | {res} Diffuse |")
    out += ["", "Ring, medallion and wordmark are drawn by `tools/gen_arena_mats.py` "
            "(Arial Black wordmark, the house octagon/ring geometry measured off the original set).", ""]
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--cache", default=os.environ.get("LYGO_ARENA_MAT_CACHE") or
                    os.path.join(os.environ.get("TEMP") or "/tmp", "lygo_arena_mats"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "floors"))
    a = ap.parse_args()
    if a.fetch:
        import gen_arena_mats as g
        return 0 if g.fetch(a.force) == len(g.SOURCES) else 1

    want = [s for s in a.only.split(",") if s] or list(MATS)
    outdir = os.path.abspath(a.out)
    os.makedirs(outdir, exist_ok=True)
    written = []
    for name in want:
        src = os.path.join(a.cache, name + ".jpg")
        if not os.path.exists(src):
            print(f"  !! missing source {src} — run --fetch first")
            return 1
        dst = compose(name, MATS[name], src, outdir)
        written.append((name, MATS[name], dst))
        print(f"  {name:10s} {MATS[name]['style']:8s} tiles={MATS[name]['tiles']}  "
              f"{os.path.getsize(dst)/1048576:5.2f} MB  {os.path.basename(dst)}")
    with open(os.path.join(outdir, "SOURCES.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write(sources_md())
    print(f"\n{len(written)} mats written to {outdir}\nlicence record: {os.path.join(outdir, 'SOURCES.md')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
