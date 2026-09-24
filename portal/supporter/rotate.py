#!/usr/bin/env python3
"""Rotate the LYGO portal supporter code, and patch its hash into portal/supporter.js.

Why a hash and not the code: portal/supporter.js ships to the public web, so it can only carry a
SHA-256 of each accepted code. The plaintext code is printed here (for the Patreon post) and written
to a folder OUTSIDE the repo, so it never lands in git.

Normalization is the contract with the browser: uppercase, drop everything that is not A-Z0-9.
"lygo-2609-a7k3-9qzp" and "LYGO 2609 A7K3 9QZP" are the same code, in this tool and in supplier.js.

Common use (run from the repo root, or pass --file):
  python portal/supporter/rotate.py --list
  python portal/supporter/rotate.py --check LYGO-2609-A7K3-9QZP
  python portal/supporter/rotate.py --add --month 2026-10                 # next month's code
  python portal/supporter/rotate.py --add --month 2026-10 --until 2026-11-05
  python portal/supporter/rotate.py --steward                             # a permanent code for the steward
  python portal/supporter/rotate.py --selftest

--until defaults to the 5th of the following month: a grace window, so a supporter who paid in
September is not locked out at midnight on rotation day.
"""
import argparse
import hashlib
import json
import os
import re
import secrets
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FILE = os.path.join(HERE, "..", "supporter.js")
START = "/* @supporter-hashes:start"
END = "/* @supporter-hashes:end */"
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"          # no I, O, 0, 1: codes get read aloud and retyped
CODE_RE = re.compile(r"^LYGO-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$")
STORE_DEFAULT = os.path.join(os.path.expanduser("~"), ".lygo-supporter-codes")


def normalize(code):
    return re.sub(r"[^A-Z0-9]", "", str(code or "").upper())


def hash_code(code):
    return hashlib.sha256(normalize(code).encode("utf-8")).hexdigest()


def gap():
    return "".join(secrets.choice(ALPHABET) for _ in range(4))


def make_code(month):
    """LYGO-YYMM-XXXX-XXXX: the issue month is inside the code, so a supporter can see at a glance
    which month they hold, and support can tell an old code from a current one without a lookup."""
    yymm = month[2:4] + month[5:7]
    return "LYGO-%s-%s-%s" % (yymm, gap(), gap())


def next_month(month):
    y, m = int(month[:4]), int(month[5:7])
    return "%04d-%02d" % ((y + 1, 1) if m == 12 else (y, m + 1))


def default_until(month):
    return next_month(month) + "-05"


def load_block(path):
    """The array literal between the markers: (raw, start_index, end_index_after_bracket, rows)."""
    raw = open(path, "rb").read().decode("utf-8")
    i = raw.index(START)
    j = raw.index(END)
    start = raw.index("[", i)
    end = raw.rindex("]", i, j)
    rows = json.loads(raw[start:end + 1])
    if not isinstance(rows, list):
        raise SystemExit("the hash block is not a JSON array")
    return raw, start, end, rows


def save_block(path, raw, start, end, rows):
    """One writer, one shape: the block is rewritten in full, so the diff shows exactly what changed."""
    if rows:
        body = "[\n" + ",\n".join("    " + json.dumps(r) for r in rows) + "\n  ]"
    else:
        body = "[]"
    out = raw[:start] + body + raw[end + 1:]
    assert out.count(START) == 1 and out.count(END) == 1
    open(path, "wb").write(out.encode("utf-8"))
    return out


def print_rows(rows):
    if not rows:
        print("  (no hashes yet — run --add)")
        return
    for r in rows:
        keep = "permanent" if r.get("permanent") else ("until " + str(r.get("until")))
        print("  %-9s %s  %s  %s" % (r.get("label"), keep, str(r.get("sha256"))[:12] + "…", r.get("note", "")))


def main():
    ap = argparse.ArgumentParser(description="Rotate the LYGO portal supporter code.")
    ap.add_argument("--file", default=DEFAULT_FILE, help="the file whose hash block is patched")
    ap.add_argument("--add", action="store_true", help="generate a code for --month and add its hash")
    ap.add_argument("--steward", action="store_true", help="add a permanent code (no expiry)")
    ap.add_argument("--month", default=None, help="YYYY-MM the code is issued for")
    ap.add_argument("--until", default=None, help="inclusive end date YYYY-MM-DD (default: 5th of next month)")
    ap.add_argument("--label", default=None, help="label stored with the hash")
    ap.add_argument("--note", default="", help="a short note stored with the hash")
    ap.add_argument("--check", default=None, help="check a code against the file and exit 0/1")
    ap.add_argument("--list", action="store_true", help="show the entries (labels, expiry, hash prefix)")
    ap.add_argument("--selftest", action="store_true", help="prove normalize/hash/expiry logic")
    ap.add_argument("--outdir", default=STORE_DEFAULT, help="where the plaintext code is written (outside the repo)")
    args = ap.parse_args()

    path = os.path.abspath(args.file)
    raw, start, end, rows = load_block(path)

    if args.selftest:
        a = hash_code("lygo-2609-a7k3-9qzp")
        b = hash_code("LYGO 2609 A7K3 9QZP")
        c = hash_code("LYGO-2609-A7K3-9QZQ")
        assert a == b, "normalization differs between spellings of the same code"
        assert a != c, "two different codes hashed the same"
        assert normalize(" lygo—2609—a7k3—9qzp ") == "LYGO2609A7K39QZP", normalize(" lygo—2609—a7k3—9qzp ")
        assert default_until("2026-09") == "2026-10-05"
        assert next_month("2026-12") == "2027-01"
        assert CODE_RE.match(make_code("2026-09")), make_code("2026-09")
        print("selftest ok — same code in any spelling hashes the same; different codes do not.")
        print("example code shape:", make_code("2026-09"))
        return 0

    if args.list:
        print("%s — %d entries" % (path, len(rows)))
        print_rows(rows)
        return 0

    if args.check:
        h = hash_code(args.check)
        today = date.today().isoformat()
        hit = [r for r in rows if r.get("sha256") == h]
        if not hit:
            print("no match: %s is not in %s" % (normalize(args.check), os.path.basename(path)))
            return 1
        r = hit[0]
        expired = bool(r.get("until")) and not r.get("permanent") and r["until"] < today
        print("match: label=%s until=%s%s" % (r.get("label"), r.get("until", "permanent"),
                                              "  (EXPIRED — the browser will refuse this code today)" if expired else ""))
        return 1 if expired else 0

    if args.steward or args.add:
        if args.steward:
            code = "LYGO-STEW-" + gap() + "-" + gap()
            label = args.label or "steward"
            entry = {"label": label, "sha256": hash_code(code), "until": None, "permanent": True,
                     "note": args.note or "steward: never expires — keep the plaintext private"}
        else:
            today_month = date.today().isoformat()[:7]
            month = args.month or today_month
            if not re.match(r"^\d{4}-\d{2}$", month):
                print("--month must look like 2026-10", file=sys.stderr)
                return 2
            code = make_code(month)
            entry = {"label": args.label or month, "sha256": hash_code(code),
                     "until": args.until or default_until(month),
                     "note": args.note or ("this month's code" if month >= today_month else "rotated out")}
        rows = [r for r in rows if r.get("label") != entry["label"]] + [entry]
        save_block(path, raw, start, end, rows)
        os.makedirs(args.outdir, exist_ok=True)
        keep = os.path.join(args.outdir, "supporter-code-%s.txt" % entry["label"])
        with open(keep, "w", encoding="utf-8") as f:
            f.write("LYGO portal supporter code\nlabel:  %s\nuntil:  %s\ncode:   %s\n\n"
                    "Paste the code into the Patreon post for %s. The plaintext is written here, never\n"
                    "into the repo: only its SHA-256 is in portal/supporter.js.\n"
                    % (entry["label"], entry.get("until") or "permanent", code, entry["label"]))
        print("added  %s  until %s" % (entry["label"], entry.get("until") or "permanent"))
        print("code:  %s" % code)
        print("kept:  %s" % keep)
        print("                                              ^ paste this on Patreon, not in the repo")
        print()
        print_rows(rows)
        return 0

    print_rows(rows)
    print("\nnothing to do: pass --add, --steward, --check, --list or --selftest")
    return 0


if __name__ == "__main__":
    sys.exit(main())
