"""Sweep the site navs: put LYGO Signal next to the other rooms.

Insertion anchor, first match wins (absolute chatagent.ca URLs count too):
  /sources/  -> insert BEFORE it (TV sits with the rooms in that nav style)
  /lattice/ /games/ /champions.html /app.html /lygoskillhub.html /portal/ /guides/ -> insert after
A nav holding only site-meta links (home / about / privacy / terms / contact) is left alone,
and so is a page with no nav at all (standalone game pages).
"""
import os
import re
import sys

APPLY = "--apply" in sys.argv
SHOW_DIFF = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else None
ROOT = "."
NEW = '<a href="/signal/">LYGO Signal</a>'

ANCHORS = ["/sources/", "/lattice/", "/games/", "/champions.html", "/app.html",
           "/lygoskillhub.html", "/portal/", "/lygo-llm-console.html", "/guides/"]
META_ONLY = {"/", "/about.html", "/privacy.html", "/terms.html", "/contact.html", "/sitemap.xml"}

changed, skipped, alreadys = [], [], []


def absolute(a):
    return a if a.startswith("http") else "https://chatagent.ca" + a


for dp, dn, fn in os.walk(ROOT):
    if ".git" in dp:
        continue
    for f in sorted(fn):
        if not f.endswith(".html"):
            continue
        p = os.path.join(dp, f)
        s = open(p, encoding="utf-8", errors="replace", newline="").read()
        m = re.search(r"<nav[^>]*>(.*?)</nav>", s, re.S)
        if not m:
            skipped.append((p, "no nav"))
            continue
        nav = m.group(1)
        if re.search(r'href="[^"]*/signal/"', nav):
            alreadys.append(p)
            continue
        hrefs = re.findall(r'href="([^"]+)"', nav)
        plain = [h.replace("https://chatagent.ca", "") for h in hrefs]
        if plain and set(plain) <= META_ONLY:
            skipped.append((p, "meta-only nav"))
            continue
        crlf = "\r\n" in s
        nl = "\r\n" if crlf else "\n"
        target = None
        for a in ANCHORS:
            hit = None
            for cand in {a, absolute(a)}:
                hit = re.search(r'<a[^>]*href="' + re.escape(cand) + r'"[^>]*>[^<]*</a>', nav)
                if hit:
                    break
            if hit:
                target = (a, hit)
                break
        if not target:
            skipped.append((p, "no room anchor: " + " ".join(plain[:6])))
            continue
        anchor_name, hit = target
        start, end = m.start(1) + hit.start(), m.start(1) + hit.end()
        line_start = s.rfind("\n", 0, start) + 1
        indent = re.match(r"[ \t]*", s[line_start:start]).group(0)
        if anchor_name == "/sources/":
            s2 = s[:line_start] + indent + NEW + nl + s[line_start:]
        else:
            line_end = s.find("\n", end)
            after = len(s) if line_end == -1 else line_end + 1
            s2 = s[:after] + indent + NEW + nl + s[after:]
        if APPLY:
            open(p, "w", encoding="utf-8", newline="").write(s2)
        changed.append((p, anchor_name))
        if SHOW_DIFF and p.replace("\\", "/").endswith(SHOW_DIFF):
            old = s.split(nl)
            new = s2.split(nl)
            for i, line in enumerate(new):
                if "LYGO Signal" in line:
                    print(f"\n--- preview {p} (line {i + 1}) ---")
                    for j in range(max(0, i - 2), min(len(new), i + 3)):
                        print(("    " if j != i else "  > ") + new[j][:110])
                    break

print(f"pages to change: {len(changed)}   already branded: {len(alreadys)}   left alone: {len(skipped)}")
for p, a in changed:
    print(f"  + {p:52s} (anchor {a})")
print("\nleft alone:")
for p, why in skipped:
    print(f"  - {p:52s} {why}")
if not APPLY:
    print("\nDRY RUN — re-run with --apply")
