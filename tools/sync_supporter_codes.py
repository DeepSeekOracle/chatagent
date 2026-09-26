"""Keep every page's supporter code list identical to the portal's.

The portal's table (`portal/supporter.js`) is the source of truth: it is written by
`portal/supporter/rotate.py`. The games gate and the SkillHub download gate carry the same list,
because one supporter code has to work everywhere, and this tool is what keeps the copies from
drifting apart.

    python tools/sync_supporter_codes.py           # copy the portal table into every target
    python tools/sync_supporter_codes.py --check    # verify only; exit 1 when any target differs

Every file marks its table with the same pair of comments, so the copy is literal. A target with
more than one marker pair is refused rather than guessed at: a stray marker makes the copy
ambiguous, and a naive splice would duplicate the block silently — it still parses, so only the
assertion catches it.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "portal" / "supporter.js"
TARGETS = (
    ROOT / "games" / "lygo-gate.js",              # the eight games' donation gate
    ROOT / "supporter" / "download-gate.js",      # the SkillHub download buttons
)
START = "/* @supporter-hashes:start */"
END = "/* @supporter-hashes:end */"


def block(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    starts, ends = text.count(START), text.count(END)
    if starts != 1 or ends != 1:
        raise SystemExit(
            f"{path}: expected exactly one {START} / {END} pair, found {starts} and {ends}. "
            "Fix the markers by hand before syncing — a stray marker makes the copy ambiguous."
        )
    return text[text.index(START):text.index(END) + len(END)]


def patch(path: Path, new_block: str) -> bool:
    text = path.read_text(encoding="utf-8")
    a = text.index(START)
    b = text.rindex(END) + len(END)
    if text[a:b] == new_block:
        return False
    path.write_text(text[:a] + new_block + text[b:], encoding="utf-8", newline="")
    return True


def count(source: str) -> int:
    return len(re.findall(r'\{"label".*?\}', source))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="do not write; fail when any target differs")
    args = ap.parse_args()

    source_block = block(SOURCE)
    print(f"source {SOURCE.relative_to(ROOT)}: {count(source_block)} codes")
    differing = []
    for target in TARGETS:
        if not target.exists():
            print(f"  MISSING  {target.relative_to(ROOT)}")
            differing.append(target)
            continue
        same = block(target) == source_block
        print(f"  {'in sync ' if same else 'OUT OF SYNC'}  {target.relative_to(ROOT)} ({count(block(target))} codes)")
        if not same:
            differing.append(target)

    if not differing:
        print("all targets carry exactly the portal's table")
        return 0
    if args.check:
        print(f"FAIL: {len(differing)} target(s) differ from the portal table")
        return 1
    for target in differing:
        if target.exists():
            patch(target, source_block)
            print(f"copied the portal table into {target.relative_to(ROOT)} ({count(source_block)} codes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
