"""Key magenta sheets into one PNG per life stage. Same scale across a fish's life."""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_src")
OUT = os.path.join(ROOT, "assets", "fish")
STAGES = ["baby", "infant", "child", "teen", "adult", "elder"]
SHEETS = {
    "1": "dart",
    "2": "ruby",
    "3": "lantern",
    "4": "veil",
    "5": "glimmer",
    "6": "puff",
    "7": "azure",
    "8": "moss",
    "11": "sunscale",
    "12": "pearl",
}

def dist(c, k):
    return abs(c[0] - k[0]) + abs(c[1] - k[1]) + abs(c[2] - k[2])

def split(path, name):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    key = px[2, 2]
    step = 2
    mw, mh = w // step, h // step
    cols = [0] * mw
    for y in range(mh):
        yy = min(h - 1, y * step)
        for x in range(mw):
            if dist(px[min(w - 1, x * step), yy], key) > 90:
                cols[x] += 1
    runs = []
    start = None
    for x, v in enumerate(cols + [0]):
        if v > 3 and start is None:
            start = x
        elif v <= 3 and start is not None:
            if x - start > 3:
                runs.append([start, x - 1])
            start = None
    merged = []
    for run in runs:
        if merged and run[0] - merged[-1][1] < 5:
            merged[-1][1] = run[1]
        else:
            merged.append(run)
    while len(merged) > 6:
        gaps = [(merged[i + 1][0] - merged[i][1], i) for i in range(len(merged) - 1)]
        gaps.sort()
        i = gaps[0][1]
        merged[i][1] = merged[i + 1][1]
        del merged[i + 1]
    while len(merged) < 6 and merged:
        widest = max(range(len(merged)), key=lambda i: merged[i][1] - merged[i][0])
        a, b = merged[widest]
        mid = (a + b) // 2
        best, best_v = mid, 10 ** 9
        for x in range(a + 8, b - 8):
            if cols[x] < best_v:
                best, best_v = x, cols[x]
        if best_v > 8:
            break
        merged[widest:widest + 1] = [[a, best - 1], [best + 1, b]]
    print(name, "runs", len(merged))
    crops = []
    for a, b in merged:
        x0, x1 = a * step, min(w, (b + 1) * step)
        y0, y1 = h, 0
        for y in range(h):
            row = False
            for x in range(x0, x1, 2):
                if dist(px[x, y], key) > 90:
                    row = True
                    break
            if row:
                if y < y0:
                    y0 = y
                y1 = y
        if y1 <= y0:
            continue
        pad = 8
        box = (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad + 1))
        crops.append(im.crop(box))
    if len(crops) < 6:
        raise SystemExit(name + " only " + str(len(crops)))
    crops = crops[:6]
    max_w = max(c.size[0] for c in crops)
    max_h = max(c.size[1] for c in crops)
    scale = min(520 / max_w, 360 / max_h)
    os.makedirs(OUT, exist_ok=True)
    for i, crop in enumerate(crops):
        rgba = crop.convert("RGBA")
        pix = rgba.load()
        cw, ch = rgba.size
        for y in range(ch):
            for x in range(cw):
                r, g, b, a = pix[x, y]
                d = dist((r, g, b), key)
                if d < 78:
                    pix[x, y] = (r, g, b, 0)
                elif d < 120:
                    pix[x, y] = (r, g, b, int(255 * (d - 78) / 42))
        nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
        rgba = rgba.resize((nw, nh), Image.Resampling.LANCZOS)
        rgba.save(os.path.join(OUT, name + "_" + STAGES[i] + ".png"))
    print("  wrote", name, "scale", round(scale, 3))

if __name__ == "__main__":
    for num, name in SHEETS.items():
        split(os.path.join(SRC, num + ".jpg"), name)
    os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
    for src, dest in (("9.jpg", "tank-day.jpg"), ("10.jpg", "tank-night.jpg")):
        im = Image.open(os.path.join(SRC, src)).convert("RGB")
        im = im.resize((1280, 720), Image.Resampling.LANCZOS)
        im.save(os.path.join(ROOT, "assets", dest), quality=86)
        og = im.resize((1200, 630), Image.Resampling.LANCZOS)
        if dest.startswith("tank-day"):
            og.save(os.path.join(ROOT, "assets", "og.jpg"), quality=86)
    print("tanks ok")
