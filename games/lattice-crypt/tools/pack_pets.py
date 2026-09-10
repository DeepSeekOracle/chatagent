"""Key mythical pet stills into a 64px atlas. Walk bob + attack still."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("pack_foes", HERE / "pack_foes.py")
pf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pf)

SRC = Path(r"D:\chatagent\games\lattice-crypt\assets\pets\src")
OUT = Path(r"D:\chatagent\games\lattice-crypt\assets\pets")
DEST = Path(r"D:\chatagent\games\lattice-crypt\assets")
SIZE = 64
COLS = 8
KINDS = ("wolf", "lion", "bear", "elephant", "scorpion")
FLOAT = {"scorpion"}


def frames_for(kind: str) -> list[Image.Image]:
    a = pf.fit(Image.open(SRC / f"{kind}.jpg"))
    bp = SRC / f"{kind}_b.jpg"
    b = pf.fit(Image.open(bp)) if bp.exists() else pf.shift(a, 0, -2)
    if kind in FLOAT:
        return [a, pf.shift(a, 0, -3), b, pf.shift(b, 0, -1)]
    return [a, pf.walk_legs(a, 2), b, pf.walk_legs(b, -2)]


def main() -> None:
    frames: list[tuple[str, Image.Image]] = []
    (OUT / "64").mkdir(parents=True, exist_ok=True)
    for kind in KINDS:
        for i, im in enumerate(frames_for(kind)):
            name = f"pet_{kind}_{i}"
            frames.append((name, im))
            im.save(OUT / "64" / f"{name}.png")
    rows = (len(frames) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * SIZE, rows * SIZE), (0, 0, 0, 0))
    names = {}
    for i, (name, im) in enumerate(frames):
        x, y = (i % COLS) * SIZE, (i // COLS) * SIZE
        atlas.paste(im, (x, y), im)
        names[name] = i
    atlas.save(DEST / "pets.png")
    (DEST / "pets.json").write_text(
        json.dumps({"cell": SIZE, "cols": COLS, "names": names}, indent=2),
        encoding="utf-8",
    )
    print("pets", atlas.size, "frames", len(frames))


if __name__ == "__main__":
    main()
