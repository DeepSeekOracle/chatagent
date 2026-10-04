#!/usr/bin/env python3
"""Sweep the site chrome: put the Eternal Haven reading room next to the other rooms.

Only the homepage ever linked to /books/, so the site's chrome carried the other
rooms and no way into the shelf. Two chrome surfaces list those rooms and both
are hand-written per page, so both are swept here:

  header   the page's first <nav> (the room row)
  footer   <nav aria-label="Footer"> (the site map in <footer class="site">)

Insertion anchor, first match wins (absolute chatagent.ca URLs count too):
  /signal/ -> insert BEFORE it, so the rows read .. Books, LYGO Signal ..
  /sources/ /lattice/ /games/ /champions.html /app.html /lygoskillhub.html
  /portal/ /lygo-llm-console.html /guides/ -> insert after

A nav holding only site-meta links (home / about / privacy / terms / contact) is
left alone, and so is a page with no nav at all. Every edit is one whole line
matched to the anchor's own indentation and the file's own line ending, and the
tool proves it is additive by counting the line it added.

  python tools/nav-books-sweep.py             # dry run
  python tools/nav-books-sweep.py --apply
"""
from __future__ import annotations

import os
import re
import sys

APPLY = "--apply" in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEW = '<a href="/books/">Books</a>'

AFTER = ["/sources/", "/lattice/", "/games/", "/champions.html", "/app.html",
         "/lygoskillhub.html", "/portal/", "/lygo-llm-console.html", "/guides/"]
BEFORE = ["/signal/"]
META_ONLY = {"/", "/about.html", "/privacy.html", "/terms.html", "/contact.html", "/sitemap.xml"}

changed, skipped, alreadys = [], [], []


def plain(a: str) -> str:
    return a.replace("https://chatagent.ca", "").replace("http://chatagent.ca", "")


def slots(text: str):
    """Every chrome nav this sweep owns, as (surface, start, end, markup)."""
    out = []
    m = re.search(r"<nav[^>]*>[\s\S]*?</nav>", text)
    if m:
        out.append(("header", m.start(), m.end(), m.group(0)))
    m = re.search(r'<nav aria-label="Footer">[\s\S]*?</nav>', text)
    if m:
        out.append(("footer", m.start(), m.end(), m.group(0)))
    return out


def insert_link(nav: str) -> str:
    """Pure insertion of one whole line inside an existing nav."""
    nl = "\r\n" if "\r\n" in nav else "\n"
    for anchor in BEFORE:
        m = re.search(r'[ \t]*<a href="[^"]*' + re.escape(anchor) + r'"[^>]*>[^<]*</a>[ \t]*\r?\n', nav)
        if m:
            indent = re.match(r"[ \t]*", m.group(0)).group(0)
            return nav[:m.start()] + f"{indent}{NEW}{nl}" + nav[m.start():]
    for anchor in AFTER:
        m = re.search(r'[ \t]*<a href="[^"]*' + re.escape(anchor) + r'"[^>]*>[^<]*</a>[ \t]*\r?\n', nav)
        if m:
            indent = re.match(r"[ \t]*", m.group(0)).group(0)
            return nav[:m.end()] + f"{indent}{NEW}{nl}" + nav[m.end():]
    return nav


def process(text: str):
    """Returns (new_text, [(surface, verdict)]) for one page."""
    reasons, out, edits = [], text, 0
    for surface, start, end, nav in slots(text):
        if re.search(r'href="[^"]*/books/"', nav):
            reasons.append((surface, "already links /books/"))
            continue
        hrefs = [plain(h) for h in re.findall(r'href="([^"]+)"', nav)]
        if hrefs and set(hrefs) <= META_ONLY:
            reasons.append((surface, "meta-only nav"))
            continue
        new_nav = insert_link(nav)
        if new_nav == nav:
            reasons.append((surface, "NO ANCHOR MATCHED"))
            continue
        out = out[:start] + new_nav + out[end:]
        reasons.append((surface, "changed"))
        edits += 1
    if edits and out.count(NEW) != text.count(NEW) + edits:
        return text, [("!", "REFUSED: edit was not a pure insertion")]
    return out, reasons


for dp, dn, fn in os.walk(ROOT):
    if ".git" in dp or "node_modules" in dp:
        continue
    for f in sorted(fn):
        if not f.endswith(".html"):
            continue
        p = os.path.join(dp, f)
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        s = open(p, encoding="utf-8", errors="replace", newline="").read()
        out, reasons = process(s)
        for surface, why in reasons:
            label = f"{rel} [{surface}]"
            if why == "changed":
                changed.append(label)
            elif why.startswith("already"):
                alreadys.append(label)
            else:
                skipped.append((label, why))
        if out != s and APPLY:
            open(p, "w", encoding="utf-8", errors="replace", newline="").write(out)

print(f"{'APPLIED' if APPLY else 'DRY RUN'} — inserting \"{NEW}\" into {len(changed)} nav(s)")
print(f"  already linking /books/: {len(alreadys)}")
bad = [s for s in skipped if s[1] == "NO ANCHOR MATCHED"]
print(f"  left alone: {len(skipped)}  (no anchor matched: {len(bad)})")
for label in changed:
    print("   +", label)
for label, why in bad[:12]:
    print("   ?", label, "->", why)
if not APPLY:
    print("\nre-run with --apply to write")
