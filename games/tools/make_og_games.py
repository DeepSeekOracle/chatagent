import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
HOST = sys.argv[1] if len(sys.argv) > 1 else "chatagent.ca"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "og.jpg"
W, H = 1200, 630
BAR = 118
ART_H = H - BAR
covers = [
    Image.open(ROOT / "lattice-marines" / "assets" / "og.jpg").convert("RGB"),
    Image.open(ROOT / "lattice-swarm" / "og.jpg").convert("RGB"),
    Image.open(ROOT / "eternal-lattice" / "og.jpg").convert("RGB"),
]


def cover_crop(im, tw, th, ax=0.5, ay=0.5, zoom=1.0):
    scale = max(tw / im.width, th / im.height) * zoom
    nw, nh = int(im.width * scale + 0.5), int(im.height * scale + 0.5)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = int((nw - tw) * ax)
    top = int((nh - th) * ay)
    left = max(0, min(left, nw - tw))
    top = max(0, min(top, nh - th))
    return im.crop((left, top, left + tw, top + th))


canvas = Image.new("RGB", (W, H), (10, 8, 6))
pw = W // 3
# Zoom Marines/Eternal so wordmarks can be cropped out of the X card.
anchors = ((0.62, 0.78, 1.35), (0.5, 0.5, 1.0), (0.5, 0.0, 2.15))
for i, im in enumerate(covers):
    ax, ay, zoom = anchors[i]
    canvas.paste(cover_crop(im, pw, ART_H, ax, ay, zoom), (i * pw, 0))

draw = ImageDraw.Draw(canvas)
for x in (pw, pw * 2):
    draw.line([(x, 0), (x, ART_H)], fill=(224, 179, 106), width=2)

draw.rectangle([0, ART_H, W, H], fill=(8, 7, 6))
draw.line([(0, ART_H), (W, ART_H)], fill=(224, 179, 106), width=2)

serif = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", 44)
sans = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 22)
title = HOST
sub = "Games  ·  Lattice Marines  ·  Lattice Swarm  ·  Eternal Lattice"
pad_x = 56
bbox_t = draw.textbbox((0, 0), title, font=serif)
th = bbox_t[3] - bbox_t[1]
bbox_s = draw.textbbox((0, 0), sub, font=sans)
sh = bbox_s[3] - bbox_s[1]
gap = 8
ty = ART_H + (BAR - (th + gap + sh)) // 2 - 4
draw.text((pad_x, ty), title, font=serif, fill=(243, 236, 227))
draw.text((pad_x, ty + th + gap), sub, font=sans, fill=(224, 179, 106))

canvas.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
print("wrote", OUT, OUT.stat().st_size, canvas.size)
