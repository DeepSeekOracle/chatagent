"""Keep the games' supporter code list identical to the portal's.

The portal's table (`portal/supporter.js`) is the source of truth: it is written by
`portal/supporter/rotate.py`. The eight games carry the same list so one supporter code works
everywhere, and this tool is what keeps the two from drifting apart.

    python tools/sync_supporter_codes.py           # copy the portal table into the games gate
    python tools/sync_supporter_codes.py --check    # verify only; exit 1 when they differ

Both files mark their table with the same pair of comments, so the copy is literal.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / "portal" / "supporter.js"
GATE = ROOT / "games" / "lygo-gate.js"
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
    ap.add_argument("--check", action="store_true", help="do not write; fail when the two differ")
    args = ap.parse_args()

    portal_doc = PORTAL.read_text(encoding="utf-8")
    gate_source = block(GATE)
    portal_source = block(PORTAL)
    same = portal_source == gate_source
    print(f"portal codes: {count(portal_doc)}   games codes: {count(gate_source)}")
    if same:
        print("in sync: the games gate carries exactly the portal's table")
        return 0
    print("OUT OF SYNC: the games gate does not match the portal's table")
    if args.check:
        return 1
    patch(GATE, portal_source)
    print(f"copied the portal table into {GATE.relative_to(ROOT)} ({count(portal_source)} codes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
