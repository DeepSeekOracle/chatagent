"""Original crowd bed for LYGO Arena. No outside samples.
   A low murmur with a few soft cheers, loopable, peak 0.32.
"""
import math
import os
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sfx", "cheer.wav")
SR = 22050
DUR = 8.0


def unit(i, salt):
    x = math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
    return (x - math.floor(x)) * 2 - 1


def main():
    n = int(SR * DUR)
    samples = [0.0] * n
    # a dull room tone, band-limited by a one-pole, kept quiet
    tone = 0.0
    for i in range(n):
        white = unit(i, 3)
        tone = tone * 0.92 + white * 0.08
        samples[i] += tone * 0.055
    # a handful of voiced "ooh" swells, spread through the loop
    cheers = [
        (0.6, 1.3, 196, 0.09),
        (2.1, 0.9, 220, 0.07),
        (3.4, 1.6, 174, 0.11),
        (5.2, 1.1, 246, 0.08),
        (6.6, 1.2, 188, 0.09),
    ]
    for start, dur, f0, amp in cheers:
        a0 = int(start * SR)
        a1 = min(n, int((start + dur) * SR))
        for i in range(a0, a1):
            t = (i - a0) / SR
            env = math.sin(math.pi * min(1, t / dur)) ** 1.4
            wob = 1 + 0.015 * math.sin(2 * math.pi * 4.5 * t)
            sig = 0
            for k, g in ((1, 0.55), (2, 0.28), (3, 0.12)):
                sig += math.sin(2 * math.pi * f0 * k * wob * t) * g
            samples[i] += sig * amp * env
    # short edge fade so the loop does not click
    fade = int(0.08 * SR)
    for i in range(fade):
        k = i / fade
        samples[i] *= k
        samples[n - 1 - i] *= k
    peak = max(abs(s) for s in samples) or 1
    scale = 0.32 / peak
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with wave.open(OUT, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", max(-32767, min(32767, int(s * scale * 32767)))) for s in samples))
    print("wrote", OUT, "peak", round(peak * scale, 3), "sec", DUR)


if __name__ == "__main__":
    main()
