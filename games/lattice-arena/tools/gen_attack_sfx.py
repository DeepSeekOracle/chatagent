"""Original attack tones for LYGO Arena. Reads vis/sfx pairs out of attacks.js.
   No samples from anywhere else. Peak sits at 0.62 so the radio can stay on top.
"""
import math
import os
import re
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "attacks.js")
OUT = os.path.join(ROOT, "assets", "sfx")
SR = 22050


def pairs():
    text = open(SRC, encoding="utf-8").read()
    found = re.findall(r'vis:\s*"([a-z]+)",\s*sfx:\s*"([a-z0-9_]+)"', text)
    seen = {}
    for vis, sfx in found:
        seen[sfx] = vis
    return seen


def unit(i, salt):
    x = math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
    return (x - math.floor(x)) * 2 - 1


def env(t, a, d):
    if t < a:
        return t / a
    return math.exp(-(t - a) * d)


def synth(vis, salt):
    pitch = 0.86 + (salt % 37) / 100.0
    dur = {
        "howl": 0.42, "trample": 0.38, "quake": 0.34, "seal": 0.36, "beam": 0.28,
        "charge": 0.26, "tide": 0.32, "heart": 0.34, "summon": 0.4, "rage": 0.36,
    }.get(vis, 0.18)
    n = int(SR * dur)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        ns = unit(i, salt)
        e = env(t, 0.008, 8)
        if vis in ("bite", "lunge", "clamp", "barb"):
            f = 140 * pitch
            s = math.sin(2 * math.pi * f * t) * e + ns * env(t, 0.001, 28) * 0.65
            if vis == "clamp" and t > 0.06:
                s += math.sin(2 * math.pi * f * 1.4 * (t - 0.06)) * env(t - 0.06, 0.002, 20) * 0.5
        elif vis in ("tusk", "stomp", "trample", "quake", "fist"):
            f = (70 if vis in ("trample", "quake", "stomp") else 95) * pitch
            s = math.sin(2 * math.pi * f * t) * env(t, 0.004, 6)
            s += math.sin(2 * math.pi * f * 0.5 * t) * env(t, 0.002, 4) * 0.7
            if vis == "trample" and t > 0.12:
                s += math.sin(2 * math.pi * f * (t - 0.12)) * env(t - 0.12, 0.004, 7)
        elif vis in ("slash", "cleave", "claw"):
            f = (520 if vis == "claw" else 320) * pitch * (1 + t * 3)
            s = ns * env(t, 0.002, 14) * 0.85 + math.sin(2 * math.pi * f * t) * e * 0.25
        elif vis in ("arrow", "needle", "rain", "thrust"):
            f = (880 if vis != "thrust" else 420) * pitch
            s = math.sin(2 * math.pi * f * t) * env(t, 0.001, 22)
            if vis == "rain":
                s += math.sin(2 * math.pi * f * 1.2 * t) * env(max(0, t - 0.04), 0.001, 22) * 0.6
        elif vis in ("note", "heal", "bloom", "heart"):
            f = (523 if vis != "heart" else 196) * pitch
            s = math.sin(2 * math.pi * f * t) * env(t, 0.01, 4)
            s += math.sin(2 * math.pi * f * 1.25 * t) * env(t, 0.02, 3.2) * 0.45
            if vis == "heart" and t > 0.12:
                s += math.sin(2 * math.pi * f * (t - 0.12)) * env(t - 0.12, 0.005, 6) * 0.8
        elif vis in ("howl", "rage"):
            f0, f1 = 180 * pitch, 460 * pitch
            f = f0 + (f1 - f0) * min(1, t / dur)
            s = math.sin(2 * math.pi * f * t) * env(t, 0.03, 2.2)
            s += ns * 0.08 * e
        elif vis in ("ward", "seal", "clock", "hour", "sigil", "lock"):
            f = (640 if vis != "seal" else 392) * pitch
            s = math.sin(2 * math.pi * f * t) * env(t, 0.002, 7)
            s += math.sin(2 * math.pi * f * 1.5 * t) * env(t, 0.004, 6) * 0.4
        elif vis in ("charge", "veil"):
            s = ns * env(t, 0.01, 6) * (0.4 + t * 2)
        elif vis in ("tide", "deep"):
            f = 150 * pitch
            s = math.sin(2 * math.pi * f * t + math.sin(t * 30) ) * env(t, 0.02, 3.5)
        elif vis in ("fire", "forge", "flask", "blast"):
            s = ns * env(t, 0.002, 10) * 0.8 + math.sin(2 * math.pi * 180 * pitch * t) * e * 0.3
        elif vis in ("stone", "crown", "summon"):
            f = 110 * pitch
            s = math.sin(2 * math.pi * f * t) * env(t, 0.003, 5)
            if vis == "crown":
                s += math.sin(2 * math.pi * 660 * pitch * t) * env(max(0, t - 0.05), 0.001, 16) * 0.35
        elif vis in ("beam", "unname"):
            f = 900 * pitch * (1 - t)
            s = math.sin(2 * math.pi * max(80, f) * t) * env(t, 0.001, 9)
        elif vis in ("drain", "wisp"):
            f = 500 * pitch * (1 - t * 1.5)
            s = math.sin(2 * math.pi * max(90, f) * t) * env(t, 0.01, 4)
        elif vis == "shard":
            f = 740 * pitch
            s = math.sin(2 * math.pi * f * t) * env(t, 0.001, 16) + ns * env(t, 0.001, 30) * 0.3
        else:
            s = math.sin(2 * math.pi * 440 * pitch * t) * e
        out[i] = s
    return out


def write_wav(path, samples):
    peak = max(abs(x) for x in samples) or 1
    scale = 0.62 / peak
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", max(-32767, min(32767, int(x * scale * 32767)))) for x in samples)
        w.writeframes(frames)


def main():
    os.makedirs(OUT, exist_ok=True)
    book = pairs()
    for sfx, vis in sorted(book.items()):
        salt = sum(ord(c) for c in sfx)
        write_wav(os.path.join(OUT, sfx + ".wav"), synth(vis, salt))
    print(len(book))


if __name__ == "__main__":
    main()
