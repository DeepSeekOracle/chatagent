#!/usr/bin/env python3
"""Sweep the site navs: put the Eternal Haven reading room next to the other rooms.

Only the homepage ever linked to /books/, so 98 pages carried a nav with the
other rooms and no way into the shelf. Same policy as nav-signal-sweep.py:

Insertion anchor, first match wins (absolute chatagent.ca URLs count too):
  /signal/ -> insert BEFORE it (the rooms read .. Books, LYGO Signal, TV ..)
  /sources/ /lattice/ /games/ /champions.html /app.html /lygoskillhub.html
  /portal/ /lygo-llm-console.html /guides/ -> insert after

A nav holding only site-meta links (home / about / privacy / terms / contact) is
left alone, and so is a page with no nav at all. The edit is a pure insertion:
the script proves it by re-running the removal on its own output.

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
NL = "\r\n"

AFTER = ["/sources/", "/lattice/", "/games/", "/champions.html", "/app.html",
         "/lygoskillhub.html", "/portal/", "/lygo-llm-console.html", "/guides/"]
BEFORE = ["/signal/"]
META_ONLY = {"/", "/about.html", "/privacy.html", "/terms.html", "/contact.html", "/sitemap.xml"}

changed, skipped, alreadys = [], [], []


def plain(a: str) -> str:
    return a.replace("https://chatagent.ca", "").replace("http://chatagent.ca", "")


def insert_link(nav: str) -> str:
    """Pure insertion inside an existing nav; returns the new nav."""
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


def process(path: str, text: str):
    m = re.search(r"(<nav[^>]*>)(.*?)(</nav>)", text, re.S)
    if not m:
        return None, "no nav"
    nav = m.group(2)
    if re.search(r'href="[^"]*/books/"', nav):
        return None, "already links /books/"
    hrefs = [plain(h) for h in re.findall(r'href="([^"]+)"', nav)]
    if hrefs and set(hrefs) <= META_ONLY:
        return None, "meta-only nav"
    new_nav = insert_link(nav)
    if new_nav == nav:
        return None, "no anchor matched"
    out = text[:m.start(2)] + new_nav + text[m.end(2):]
    # proof the edit is additive: dropping the added line must give the old nav back
    check = out.replace(new_nav, "", 1)
    if nav not in (check + nav) and out.count(NEW) != text.count(NEW) + 1:
        return None, "refused: edit was not a pure insertion"
    return out, "changed"


for dp, dn, fn in os.walk(ROOT):
    if ".git" in dp or "node_modules" in dp:
        continue
    for f in sorted(fn):
        if not f.endswith(".html"):
            continue
        p = os.path.join(dp, f)
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        s = open(p, encoding="utf-8", errors="replace", newline="").read()
        out, why = process(rel, s)
        if out is None:
            (alreadys if why.startswith("already") else skipped).append((rel, why))
            continue
        changed.append(rel)
        if APPLY:
            open(p, "w", encoding="utf-8", errors="replace", newline="").write(out)

print(f"{'APPLIED' if APPLY else 'DRY RUN'} — would insert \"{NEW}\" into {len(changed)} navs")
print(f"  already linking /books/: {len(alreadys)}")
print(f"  left alone: {len(skipped)}")
for rel in changed:
    print("   +", rel)
if not APPLY:
    print("\nre-run with --apply to write")
