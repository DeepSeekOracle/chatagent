"""Key Imagine warden stills into a 64px hero atlas. Same pipeline as pack_foes."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from pack_foes import COLS, SIZE, fit, shift

SRC = Path(r"D:\chatagent\games\lattice-crypt\assets\heroes\src")
DEST = Path(r"D:\chatagent\games\lattice-crypt\assets")
HEROES = (
    "kael", "vale", "orin", "nia", "lightfather", "lyra",
    "arkos", "d9ra", "srath", "kairos", "justicae", "seidon", "sancora",
)


def frames_for(hid: str) -> list:
    a = fit(Image.open(SRC / f"{hid}.jpg"))
    bp = SRC / f"{hid}_b.jpg"
    b = fit(Image.open(bp)) if bp.exists() else shift(a, 0, -2)
    return [a, b]


def main() -> None:
    frames = []
    names = {}
    for hid in HEROES:
        src = SRC / f"{hid}.jpg"
        if not src.exists():
            print("missing", hid)
            continue
        idle, walk = frames_for(hid)
        idle_i = len(frames)
        frames.append((f"hero_{hid}_0_0", idle))
        walk_i = len(frames)
        frames.append((f"hero_{hid}_0_1", walk))
        for face in (0, 2, 3):
            names[f"hero_{hid}_{face}_0"] = idle_i
            names[f"hero_{hid}_{face}_1"] = walk_i
        out64 = DEST / "heroes" / "64"
        out64.mkdir(parents=True, exist_ok=True)
        idle.save(out64 / f"hero_{hid}_0.png")
        walk.save(out64 / f"hero_{hid}_1.png")

    rows = (len(frames) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * SIZE, max(1, rows) * SIZE), (0, 0, 0, 0))
    for i, (name, im) in enumerate(frames):
        atlas.paste(im, ((i % COLS) * SIZE, (i // COLS) * SIZE), im)
    DEST.mkdir(parents=True, exist_ok=True)
    atlas.save(DEST / "heroes.png")
    (DEST / "heroes.json").write_text(
        json.dumps({"cell": SIZE, "cols": COLS, "names": names}, indent=2),
        encoding="utf-8",
    )
    print("heroes", atlas.size, "frames", len(frames))


if __name__ == "__main__":
    from PIL import Image
    main()
