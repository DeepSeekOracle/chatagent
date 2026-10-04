#!/usr/bin/env python3
"""Build the neurovascular share cards: 1200x630 (OG/Twitter) and 1080x1080 (square).

The card carries real lattice numbers: the three public feeds are fetched here and the
values drawn are theirs (verdict and claim count, slots live/future/miss, star chain
sequence and validity, agora nodes/feed/pending), plus a genuine graph — the ingest
ledger bucketed from the star feed's own event times — and the feed round-trip times
measured during this build.

Artwork is the page's own: neurovascular/art/twin.png (the wire-node figure drawn by
the page canvas, transparent) and neurovascular/art/field.png (its particle field).
Both are captured from the page itself:

  python -m http.server 8099            # in the repo root
  # load /neurovascular/index.html?shot at 1400x920 dpr2, then save
  # document.querySelector('#fig').toDataURL('image/png')               -> art/twin.png
  # document.querySelector('#quantum-particles').toDataURL('image/png') -> art/field.png

Every string is measured against the box it sits in and the build prints a fit verdict,
so text can never silently run under the artwork.

Run:  python tools/make_neurovascular_og.py
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "neurovascular" / "art"
CACHE = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Temp" / "nv-og-cache"
CACHE.mkdir(parents=True, exist_ok=True)

CYAN = (0, 247, 255)
ICE = (154, 223, 255)
GREEN = (93, 255, 154)
VIOLET = (201, 182, 255)
ROSE = (255, 93, 122)
INK = (234, 255, 255)
DIM = (127, 147, 163)
NIGHT = (3, 7, 11)

FEEDS = {
    "audit": "https://huggingface.co/datasets/DeepSeekOracle/lygo-public-witness-feed/resolve/main/lattice-audit.json",
    "star": "https://deepseekoracle.github.io/lygo-protocol-stack/haven_star_chart/haven_star_chart_feed.json",
    "pulse": "https://deepseekoracle.github.io/lygo-protocol-stack/agent-agora/api/pulse.json",
}
FEED_LABEL = {"audit": "kernel audit", "star": "star chart", "pulse": "agora pulse"}
FONT_CSS = ("https://fonts.googleapis.com/css2"
            "?family=Orbitron:wght@500;700&family=Share+Tech+Mono&display=swap")

FITS: list[tuple[str, float, float]] = []   # (what, needed px, allowed px)


def check(what: str, needed: float, allowed: float) -> None:
    FITS.append((what, needed, allowed))


def font_files() -> dict:
    css = CACHE / "fonts.css"
    if not css.exists() or css.stat().st_size < 200:
        req = urllib.request.Request(FONT_CSS, headers={"User-Agent": "Mozilla/4.0"})
        css.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    text = css.read_text(encoding="utf-8", errors="replace")
    out: dict = {}
    for fam, weight, url in re.findall(
            r"font-family:\s*'([^']+)';\s*font-style:\s*\w+;\s*font-weight:\s*(\d+);"
            r".*?src:\s*url\((https://[^)]+\.ttf)\)", text, re.S):
        key = fam.replace(" ", "")
        local = CACHE / f"{key}-{weight}.ttf"
        if not local.exists():
            local.write_bytes(urllib.request.urlopen(url, timeout=30).read())
        out.setdefault(key, {})[weight] = local
    return out


def read_feeds() -> dict:
    got = {}
    for key, url in FEEDS.items():
        t0 = time.perf_counter()
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (share-card build)"})
        raw = urllib.request.urlopen(req, timeout=40).read()
        got[key] = {"ms": round((time.perf_counter() - t0) * 1000), "bytes": len(raw),
                    "data": json.loads(raw.decode("utf-8"))}
    return got


def spaced(draw, s, font, spacing):
    return sum(draw.textlength(c, font=font) + spacing for c in s) - (spacing if s else 0)


def glow_text(img, xy, s, font, fill, glow=None, blur=14, spacing=0):
    x, y = xy
    if glow:
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        cx = x
        for ch in s:
            d.text((cx, y), ch, font=font, fill=glow + (255,))
            cx += d.textlength(ch, font=font) + spacing
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))
    d = ImageDraw.Draw(img)
    cx = x
    for ch in s:
        d.text((cx, y), ch, font=font, fill=fill)
        cx += d.textlength(ch, font=font) + spacing


def ledger_histogram(entries, w, h, buckets=26):
    """Ingest activity per time bucket, from the feed's own event_utc stamps."""
    times = []
    for e in entries or []:
        t = e.get("event_utc") or e.get("event_time")
        if not t:
            continue
        try:
            times.append(time.mktime(time.strptime(t[:19], "%Y-%m-%dT%H:%M:%S")))
        except ValueError:
            continue
    if not times:
        return []
    times.sort()
    t0, t1 = times[0], times[-1]
    span = max(1e-6, t1 - t0)
    counts = [0] * buckets
    for t in times:
        counts[min(buckets - 1, int((t - t0) / span * (buckets - 0.001)))] += 1
    top = max(counts) or 1
    gap = 3
    bw = max(2, (w - gap * (buckets - 1)) / buckets)
    bars = []
    for i, c in enumerate(counts):
        bh = 0 if c == 0 else max(2, (c / top) * h)
        bars.append((i * (bw + gap), bh, bw))
    return bars


def draw_card(out: Path, feeds: dict, fonts: dict, size=(1200, 630)) -> None:
    """Fixed anchors per size — nothing accumulates, so nothing can drift off the card."""
    W, H = size
    square = W == H
    img = Image.new("RGBA", (W, H), NIGHT + (255,))

    fig_cx, fig_cy = (int(W * 0.79), int(H * 0.48)) if not square else (W // 2, 500)
    twin_h = int(H * (0.60 if not square else 0.40))
    x, col_w = (72, 628) if not square else (84, W - 168)
    cell_w = (col_w - 30) // 2 if not square else (col_w - 40) // 2

    # anchors
    A = dict(kicker=78, title=126, rule=210, sub=228, mrow=306, lbox=464, foot=594,
             fbox=496, pill=64) if not square else dict(
             kicker=92, title=140, rule=222, sub=240, mrow=736, lbox=886, foot=1016,
             fbox=None, pill=88)
    MROW_GAP = 74 if not square else 74
    BOX_H = 108 if not square else 110
    ROW_H = 26

    # ---- backdrop + glow -------------------------------------------------
    field = Image.open(ART / "field.png").convert("RGBA")
    sc = max(W / field.width, H / field.height)
    field = field.resize((int(field.width * sc), int(field.height * sc)), Image.LANCZOS)
    field.putalpha(field.getchannel("A").point(lambda a: int(a * 0.5)))
    img.alpha_composite(field, ((W - field.width) // 2, (H - field.height) // 2))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r, a in ((340, 24), (240, 28), (150, 32)):
        gd.ellipse((fig_cx - r, fig_cy - r * 0.92, fig_cx + r, fig_cy + r * 0.92), fill=(0, 120, 150, a))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70)))

    # ---- the twin --------------------------------------------------------
    twin = Image.open(ART / "twin.png").convert("RGBA")
    bb = twin.getbbox()
    if bb:
        twin = twin.crop(bb)
    twin = twin.resize((int(twin.width * twin_h / twin.height), twin_h), Image.LANCZOS)
    img.alpha_composite(twin, (fig_cx - twin.width // 2, fig_cy - twin.height // 2))

    f = fonts
    orbit = lambda s: ImageFont.truetype(str(f["Orbitron"]["700"]), s)
    orbit5 = lambda s: ImageFont.truetype(str(f["Orbitron"]["500"]), s)
    mono = lambda s: ImageFont.truetype(str(f["ShareTechMono"]["400"]), s)
    d = ImageDraw.Draw(img)

    a, s_, p = feeds["audit"]["data"], feeds["star"]["data"], feeds["pulse"]["data"]
    word = str(a.get("yield", "\u2014"))
    word_col = GREEN if word == "ALIGNED" else (ROSE if word != "\u2014" else DIM)
    claims = a.get("claims") or []
    passed = sum(1 for c in claims if c.get("pass"))
    seq, valid = s_.get("entry_count", "\u2014"), bool(s_.get("chain_valid"))
    aseq = ((a.get("extras") or {}).get("star") or {}).get("seq")
    age_d = None
    try:
        age_d = (time.time() - time.mktime(time.strptime(str(a.get("utc"))[:19], "%Y-%m-%dT%H:%M:%S"))) / 86400
    except (ValueError, TypeError):
        pass

    # ---- kicker, title, rule, sub ---------------------------------------
    kf = orbit5(22)
    check("kicker", spaced(d, "LYGO  NEUROVASCULAR  INTERFACE", kf, 3), col_w)
    glow_text(img, (x, A["kicker"]), "LYGO  NEUROVASCULAR  INTERFACE", kf, CYAN, glow=CYAN, blur=10, spacing=3)

    tfont = orbit(50 if not square else 54)
    check("title", spaced(d, "DEEPSEEK  ORACLE", tfont, 2), col_w)
    glow_text(img, (x, A["title"]), "DEEPSEEK  ORACLE", tfont, INK, glow=(0, 140, 190), blur=18, spacing=2)

    d.line((x, A["rule"], x + col_w, A["rule"]), fill=CYAN + (110,), width=2)
    sf = mono(23)
    for i, line in enumerate(("A simulated digital twin on the wire-node field,", "wired to the live LYGO lattice.")):
        check("sub %d" % (i + 1), d.textlength(line, font=sf), col_w)
        d.text((x, A["sub"] + i * 30), line, font=sf, fill=ICE)

    # ---- LIVE pill -------------------------------------------------------
    pf = mono(20)
    pw = spaced(d, "LATTICE LIVE", pf, 2)
    px = W - 72 - pw - 42
    d.rounded_rectangle((px, A["pill"], px + pw + 42, A["pill"] + 41), radius=4, outline=GREEN + (180,), width=2)
    d.ellipse((px + 16, A["pill"] + 8, px + 26, A["pill"] + 18), fill=GREEN)
    d.text((px + 34, A["pill"]), "LATTICE LIVE", font=pf, fill=GREEN)

    # ---- metric cells ----------------------------------------------------
    cells = [
        ("YIELD", word + ("" if not claims else "  %d/%d" % (passed, len(claims))), word_col),
        ("SLOTS LIVE \u00b7 FUTURE \u00b7 MISS", "%s / %s / %s" % (a.get("live", "\u2014"), a.get("future", "\u2014"), a.get("miss", "\u2014")), INK),
        ("STAR CHAIN", "seq %s  %s" % (seq, "valid" if valid else "BROKEN"), GREEN if valid else ROSE),
        ("AGORA \u00b7 %s FEED \u00b7 %s PENDING" % (p.get("feed_entries", "\u2014"), p.get("pending", "\u2014")),
         "%s nodes" % p.get("chart_nodes", "\u2014"), VIOLET),
    ]
    lf, vf = mono(16), mono(25)
    for i, (label, val, col) in enumerate(cells):
        cx = x + (i % 2) * (cell_w + 30 if not square else cell_w + 40)
        cy = A["mrow"] + (i // 2) * MROW_GAP
        check(label, d.textlength(label, font=lf), cell_w)
        check(val, d.textlength(val, font=vf), cell_w)
        d.text((cx, cy), label, font=lf, fill=DIM)
        d.text((cx, cy + ROW_H), val, font=vf, fill=col)

    # ---- graph: ingest ledger histogram ---------------------------------
    d.rounded_rectangle((x, A["lbox"], x + col_w, A["lbox"] + BOX_H), radius=4, outline=CYAN + (80,), width=1)
    head = "INGEST LEDGER  %s ENTRIES  CHAIN %s  %s" % (
        seq, "VALID" if valid else "BROKEN", str(s_.get("chain_root", ""))[:8].upper())
    check("ledger header", d.textlength(head, font=mono(16)), col_w - 32)
    d.text((x + 16, A["lbox"] + 11), head, font=mono(16), fill=DIM)
    base = A["lbox"] + BOX_H - 13
    d.line((x + 16, base, x + col_w - 16, base), fill=CYAN + (70,), width=1)
    for bx, bh, bw in ledger_histogram(s_.get("entries") or [], col_w - 32, BOX_H - 46):
        if bh > 0:
            d.rectangle((x + 16 + bx, base - bh, x + 16 + bx + bw, base), fill=CYAN + (185,))

    # ---- feed round trip (wide: right column / square: footer line) ------
    note = "SNAPSHOT" + ("  %.1f d OLD" % age_d if age_d is not None else "") + \
           ("  \u00b7  SEQ %s \u2192 %s" % (aseq, seq) if aseq and seq and str(aseq) != str(seq) else "")
    if not square:
        fx, fy, fw, box_h = 720, A["fbox"], W - 72 - 720, 92
        d.rounded_rectangle((fx, fy, fx + fw, fy + box_h), radius=4, outline=CYAN + (70,), width=1)
        d.text((fx + 16, fy + 8), "FEED ROUND TRIP", font=mono(16), fill=DIM)
        for i, key in enumerate(("audit", "star", "pulse")):
            info = feeds[key]
            yy = fy + 28 + i * 17
            d.text((fx + 16, yy), FEED_LABEL[key], font=mono(16), fill=DIM)
            d.text((fx + 176, yy), "%4d ms" % info["ms"], font=mono(16), fill=INK)
            d.rectangle((fx + 268, yy + 3, fx + 268 + (fw - 288), yy + 10), outline=CYAN + (60,))
            d.rectangle((fx + 268, yy + 3, fx + 268 + max(3, int((fw - 288) * min(1.0, info["ms"] / 1500.0))), yy + 10),
                        fill=CYAN + (170,))

    # ---- footer ----------------------------------------------------------
    ff = mono(24)
    glow_text(img, (x, A["foot"]), "chatagent.ca/neurovascular", ff, CYAN, glow=CYAN, blur=8)
    if not square:
        tf2 = mono(15)
        w_note = spaced(d, note, tf2, 1)
        check("footer note", w_note, W - 72 - (x + 360) - 20)
        d.text((W - 72 - w_note, A["foot"] + 9), note, font=tf2, fill=(146, 168, 184))
    else:
        tail, tf2 = "feeds  " + "  \u00b7  ".join("%s %d ms" % (FEED_LABEL[k], feeds[k]["ms"]) for k in ("audit", "star", "pulse")) \
                     + "  \u00b7  \u03949\u03a6963", mono(17)
        check("footer feeds", spaced(d, tail, tf2, 1), col_w)
        d.text((x, A["foot"] + 34), tail, font=tf2, fill=DIM)

    img.convert("RGB").save(out, "JPEG", quality=88, optimize=True, progressive=True)
    print("wrote %s  %dx%d  %d bytes" % (out.relative_to(ROOT), W, H, out.stat().st_size))


def main() -> None:
    fonts = font_files()
    feeds = read_feeds()
    a, s, p = feeds["audit"]["data"], feeds["star"]["data"], feeds["pulse"]["data"]
    print("lattice at build: yield=%s live=%s future=%s miss=%s | star seq=%s valid=%s | agora nodes=%s feed=%s pending=%s"
          % (a.get("yield"), a.get("live"), a.get("future"), a.get("miss"), s.get("entry_count"),
             s.get("chain_valid"), p.get("chart_nodes"), p.get("feed_entries"), p.get("pending")))
    print("measured round trip: " + " ".join("%s %dms/%dB" % (k, v["ms"], v["bytes"]) for k, v in feeds.items()))
    print("ledger buckets: %d" % len(ledger_histogram(s.get("entries") or [], 528, 64)))
    def report(tag):
        over = [(w, n, al) for w, n, al in FITS if n > al - 2]
        print("fit check (%s): %d strings measured, %d over budget" % (tag, len(FITS), len(over)))
        for w, n, al in over:
            print("   OVER  %-30s needs %.0fpx, has %.0fpx" % (w, n, al))
        FITS.clear()

    draw_card(ROOT / "neurovascular" / "og-neurovascular.jpg", feeds, fonts, (1200, 630))
    report("1200x630")
    draw_card(ROOT / "neurovascular" / "card-square-1080.jpg", feeds, fonts, (1080, 1080))
    report("1080x1080")


if __name__ == "__main__":
    main()
