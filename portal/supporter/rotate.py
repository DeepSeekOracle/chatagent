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


def month_iter(start, count):
    """`count` consecutive months, starting at `start` (YYYY-MM)."""
    y, m = int(start[:4]), int(start[5:7])
    out = []
    for _ in range(count):
        out.append("%04d-%02d" % (y, m))
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def series_doc(pairs, today):
    """The document that goes to the vault: codes in the order they go up on Patreon.

    Every code works the moment it is in this file (the browser only refuses an entry whose `until`
    has passed), so the steward pastes one a month and never needs a code change to keep supporters
    served. Rotating early for a leak is still one command: --add --month <that month> --until <today>.
    """
    lines = []
    lines.append("LYGO PORTAL SUPPORTER CODES — ROTATION SHELF")
    lines.append("=" * 72)
    lines.append("")
    lines.append("Generated:      %s" % today)
    lines.append("Codes:          %d" % len(pairs))
    lines.append("First:          %s  (%s)" % (pairs[0][0], pairs[0][2]) if pairs else "")
    lines.append("Last:           %s  (%s)" % (pairs[-1][0], pairs[-1][2]) if pairs else "")
    lines.append("")
    lines.append("WHAT THESE ARE")
    lines.append("  The supporter code for the LYGO API Portal at https://chatagent.ca/portal/.")
    lines.append("  A visitor presses \"Supporter\" in the top nav, pastes the code, and the donation")
    lines.append("  reminder stops in that browser. Nothing else on the portal is locked, with or without")
    lines.append("  a code. The code stays valid through the date beside it (the 5th of the next month).")
    lines.append("")
    lines.append("WHAT TO DO WITH THEM")
    lines.append("  1. Paste THIS MONTH's code into the Patreon post that explains the code:")
    lines.append("     https://www.patreon.com/Excavationpro/posts/chatagent-ca-api-170485961")
    lines.append("     Do not post more than the current month.")
    lines.append("  2. On the 1st of the next month, replace it with that month's code. That is the only")
    lines.append("     monthly step. No code change, no push, no rebuild: every code below is already")
    lines.append("     accepted by the live portal.")
    lines.append("  3. If a code leaks (posted outside Patreon, or shared too far), regenerate that month")
    lines.append("     and put the new one up:  python portal/supporter/rotate.py --add --month YYYY-MM")
    lines.append("     then push portal/supporter.js. Codes past their date are refused automatically.")
    lines.append("")
    lines.append("HONEST LIMITS")
    lines.append("  The code is checked inside the visitor's browser against a SHA-256, so it proves")
    lines.append("  \"this browser was given this month's code\" and nothing more. It is a thank-you gate,")
    lines.append("  not a licence, not DRM, and not a security boundary. Whoever holds a future month's")
    lines.append("  code can use it early and stays unlocked through that month's date, so treat this")
    lines.append("  file as a shelf for yourself: publish one month at a time.")
    lines.append("")
    lines.append("  Only the SHA-256 of each code ships to the web (portal/supporter.js). This plaintext")
    lines.append("  list is the only copy of the codes; if it is lost, regenerate the months you still")
    lines.append("  need rather than guessing.")
    lines.append("")
    lines.append("THE CODES")
    lines.append("-" * 72)
    lines.append("%-10s  %-24s  %s" % ("MONTH", "CODE", "VALID THROUGH"))
    lines.append("-" * 72)
    for month, code, until in pairs:
        lines.append("%-10s  %-24s  %s" % (month, code, until))
    lines.append("-" * 72)
    lines.append("")
    lines.append("Steward's permanent code (never expires, keep it off Patreon) is in")
    lines.append("supporter-code-steward.txt in the same home folder as the other generated codes.")
    lines.append("")
    lines.append("Δ9Φ963 · keep the lattice lit.")
    lines.append("")
    return "\n".join(lines)


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


def apply_mirror(path, rows, labels):
    """Write the same hashes into a second file that keeps its own copy of the table.

    The games carry their own table in games/lygo-gate.js (no fetch, so a game works offline), and
    that table ages independently: rotate only the portal and every game keeps accepting the code
    you just retired. This copies the touched labels across verbatim, in the mirror's own order,
    and leaves its other entries (the steward, older rotated-out months) exactly where they are.
    """
    labels = set(labels)
    m_raw, m_start, m_end, m_rows = load_block(path)
    fresh = dict((r.get("label"), r) for r in rows if r.get("label") in labels)
    seen, out = set(), []
    for r in m_rows:
        lab = r.get("label")
        if lab in fresh:
            out.append(fresh[lab])
            seen.add(lab)
        else:
            out.append(r)
    for lab in sorted(set(fresh) - seen):
        out.append(fresh[lab])
    save_block(path, m_raw, m_start, m_end, out)
    return len(fresh)


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
    ap.add_argument("--series", type=int, default=0, metavar="N",
                    help="generate N consecutive monthly codes (all accepted at once) and add their hashes")
    ap.add_argument("--from-month", dest="from_month", default=None,
                    help="with --series: the first month (default: next month)")
    ap.add_argument("--vault-dir", dest="vault_dir", default=None,
                    help="with --series: also write the rotation shelf document (and a JSON copy) here")
    ap.add_argument("--steward", action="store_true", help="add a permanent code (no expiry)")
    ap.add_argument("--month", default=None, help="YYYY-MM the code is issued for")
    ap.add_argument("--until", default=None, help="inclusive end date YYYY-MM-DD (default: 5th of next month)")
    ap.add_argument("--label", default=None, help="label stored with the hash")
    ap.add_argument("--note", default="", help="a short note stored with the hash")
    ap.add_argument("--check", default=None, help="check a code against the file and exit 0/1")
    ap.add_argument("--list", action="store_true", help="show the entries (labels, expiry, hash prefix)")
    ap.add_argument("--selftest", action="store_true", help="prove normalize/hash/expiry logic")
    ap.add_argument("--outdir", default=STORE_DEFAULT, help="where the plaintext code is written (outside the repo)")
    ap.add_argument("--mirror", action="append", default=[], metavar="PATH",
                    help="also write the same hashes into this file (the games keep their own table "
                         "in games/lygo-gate.js) \u2014 repeatable")
    args = ap.parse_args()

    path = os.path.abspath(args.file)
    raw, blk_start, blk_end, rows = load_block(path)

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

    if args.series:
        first_month = args.from_month or next_month(date.today().isoformat()[:7])
        if not re.match(r"^\d{4}-\d{2}$", first_month):
            print("--from-month must look like 2026-10", file=sys.stderr)
            return 2
        months = month_iter(first_month, args.series)
        pairs, codes = [], []
        for mo in months:
            code = make_code(mo)
            until = default_until(mo)
            entry = {"label": mo, "sha256": hash_code(code), "until": until, "note": "monthly rotation"}
            rows = [r for r in rows if r.get("label") != mo] + [entry]
            pairs.append((mo, code, until))
            codes.append({"month": mo, "code": code, "until": until, "sha256": entry["sha256"]})
        save_block(path, raw, blk_start, blk_end, rows)
        for mirror in args.mirror:
            print("mirror: %s (%d hashes)" % (mirror, apply_mirror(mirror, rows, [mo for mo, _, _ in pairs])))
        today = date.today().isoformat()
        os.makedirs(args.outdir, exist_ok=True)
        shelf = os.path.join(args.outdir, "supporter-code-series-%s_%s.txt" % (pairs[0][0], pairs[-1][0]))
        with open(shelf, "w", encoding="utf-8") as f:
            f.write("\n".join("%s\t%s\t%s" % p for p in pairs) + "\n")
        print("series: %d codes, %s .. %s" % (len(pairs), pairs[0][0], pairs[-1][0]))
        print("shelf:  %s" % shelf)
        if args.vault_dir:
            os.makedirs(args.vault_dir, exist_ok=True)
            doc = os.path.join(args.vault_dir, "LYGO_PORTAL_SUPPORTER_CODES.txt")
            with open(doc, "w", encoding="utf-8") as f:
                f.write(series_doc(pairs, today))
            js = os.path.join(args.vault_dir, "lygo-portal-supporter-codes.json")
            with open(js, "w", encoding="utf-8") as f:
                json.dump({"generated": today, "first": pairs[0][0], "last": pairs[-1][0], "codes": codes}, f, indent=2)
            print("vault:  %s" % doc)
            print("vault:  %s" % js)
        print()
        print_rows(rows)
        return 0

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
        save_block(path, raw, blk_start, blk_end, rows)
        for mirror in args.mirror:
            print("mirror: %s (%d hashes)" % (mirror, apply_mirror(mirror, rows, [entry["label"]])))
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
