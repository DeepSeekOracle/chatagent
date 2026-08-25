from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
src = Image.open(ROOT / "assets" / "menu.jpg").convert("RGB")
W, H, BAR = 1200, 630, 118
canvas = Image.new("RGB", (W, H), (8, 7, 6))
scale = max(W / src.width, (H - BAR) / src.height)
nw, nh = int(src.width * scale), int(src.height * scale)
src = src.resize((nw, nh), Image.Resampling.LANCZOS)
left, top = (nw - W) // 2, 0
art = src.crop((left, top, left + W, top + (H - BAR)))
canvas.paste(art, (0, 0))
draw = ImageDraw.Draw(canvas)
draw.rectangle([0, H - BAR, W, H], fill=(8, 7, 6))
draw.line([(0, H - BAR), (W, H - BAR)], fill=(212, 175, 55), width=2)
serif = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", 40)
sans = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 20)
title, sub = "Stock Market Masters", "Buy  ·  Sell  ·  Ride the floor  ·  Cash out"
pad = 56
bt = draw.textbbox((0, 0), title, font=serif)
th = bt[3] - bt[1]
bs = draw.textbbox((0, 0), sub, font=sans)
sh = bs[3] - bs[1]
ty = (H - BAR) + (BAR - (th + 8 + sh)) // 2 - 4
draw.text((pad, ty), title, font=serif, fill=(243, 236, 227))
draw.text((pad, ty + th + 8), sub, font=sans, fill=(212, 175, 55))
out = ROOT / "assets" / "og.jpg"
canvas.save(out, "JPEG", quality=88, optimize=True)
print("wrote", out, out.stat().st_size)
