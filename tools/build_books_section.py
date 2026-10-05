#!/usr/bin/env python3
"""Own the machinery around the /books/ reading room.

The five pages of the section (hub + four walking novels) were hand-written with
the body copy the author wants. This script owns everything around that copy so
it cannot drift, and is safe to re-run:

  - <head>…</head> is generated whole per page (no patching between markers), so
    a page can never ship two og:image tags;
  - the section nav (<header class="top">) is generated from one link list;
  - the share row is written into marker-delimited slots (a button row on the
    hub, a compact anchor line inside the reader pages' lore nav);
  - the visually-hidden <h1> the reader pages were missing is written in;
  - every served asset carries one version string (ASSET_V).

  python tools/build_books_section.py           # write the pages
  python tools/build_books_section.py --check   # verify, exit 1 on drift
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "books"

ASSET_V = "20261008"
SITE = "https://chatagent.ca"
X_HANDLE = "@Excavationpro"
PERSON_ID = SITE + "/about.html#person"
ORG_ID = SITE + "/#organization"
SERIES_ID = SITE + "/books/#series"
TWITTER_CARD = "summary_large_image"

NAV = [
    ("/", "Home"),
    ("/books/", "Books"),
    ("/books/book-1/", "Book I"),
    ("/books/book-2/", "Book II"),
    ("/books/book-3/", "Book III"),
    ("/books/book-4/", "Book IV"),
    ("/books/book-5/", "Book V"),
    ("/books/book-6/", "Book VI"),
    ("/signal/", "LYGO Signal"),
    ("/talk-radio/", "Talk Radio"),
    ("/about.html", "About"),
]

VOLUMES = [
    dict(key="book-1", n=1, name="The Moonlit Slumber", isbn="978-1-0698232-0-5",
         art="book-1.jpg", og="og-book-1.jpg",
         part="Serenya, the bronze Emberion, and the lullaby that keeps the Vale awake."),
    dict(key="book-2", n=2, name="The Shattered Accord", isbn="978-1-0698232-2-9",
         art="book-2.jpg", og="og-book-2.jpg",
         part="From the fracture in Haven, through the eclipse, to a new accord."),
    dict(key="book-3", n=3, name="The Ascension War", isbn="978-1-0698232-1-2",
         art="book-3.jpg", og="og-book-3.jpg",
         part="After Haven's retreat, the war becomes a question of who may speak truth into being."),
    dict(key="book-4", n=4, name="Eternal Haven Dawns", isbn="978-1-0698232-3-6",
         art="book-4.jpg", og="og-book-4.jpg",
         part="Morning that does not erase the night. The manuscript opens with the Twelve at Dawn.",
         alt_name="Eternal Dawns"),
    dict(key="book-5", n=5, name="The Unwritten Seal", isbn="978-1-0698232-9-8",
         art="book-5.jpg", og="og-book-5.jpg",
         part="A stranger carries a Seal the Codex does not hold, and Haven must decide whether it "
              "can grow without becoming a throne again.",
         book_format="https://schema.org/EBook",
         also_at="https://www.lulu.com/shop/justin-helmer/the-unwritten-seal/ebook/product-65kg2mr.html"),
    # Book VI is readable here in full; it has no published edition yet, so no isbn,
    # no sameAs and no og:book:isbn meta (the builder guards all three on isbn).
    dict(key="book-6", n=6, name="The Uncounted",
         art="book-6.jpg", og="og-book-6.jpg",
         part="A company of eight and a goat walk out of the counties carrying a page no clerk "
              "will ever file — and the counties come to the room to count what they cannot enter."),
]

# Book V is the series' ebook-first volume; its published edition is the same ISBN.
ROMAN = ["", "I", "II", "III", "IV", "V", "VI"]

PAGES = [
    dict(
        path="books/index.html",
        url=SITE + "/books/",
        title="Start at moonlight — The Eternal Haven by Justin Helmer",
        desc=("The Eternal Haven Chronicles by Justin Helmer, free to read chapter by chapter: Books I to VI "
              "here, and the published editions on Amazon and Lulu."),
        keywords=("Eternal Haven, Eternal Haven Chronicles, Justin Helmer, Excavationpro, The Moonlit Slumber, "
                  "The Shattered Accord, The Ascension War, Eternal Haven Dawns, The Unwritten Seal, "
                  "The Uncounted, "
                  "free fantasy novel online, "
                  "read a novel chapter by chapter, walking novel, audiobook, AI fantasy"),
        og_title="Start at moonlight — The Eternal Haven",
        og_desc=("Dawn is not a reset. Six Eternal Haven novels by Justin Helmer, free to read here or to "
                 "take home in print and ebook."),
        og_type="website",
        og_image="og-books.jpg",
        og_alt=("The Eternal Haven Chronicles — the moonlit city of Haven over still water, free to read at "
                "chatagent.ca/books/"),
        share_title="Start at moonlight — The Eternal Haven by Justin Helmer",
        share_text="The Eternal Haven Chronicles by Justin Helmer: six walking novels, free to read chapter by chapter.",
        hashtags="EternalHaven,JustinHelmer,FantasyBooks",
        crumbs=[("Home", SITE + "/"), ("Books", SITE + "/books/")],
        book=None,
    ),
]

for _v in VOLUMES:
    PAGES.append(dict(
        path=f"books/{_v['key']}/index.html",
        url=f"{SITE}/books/{_v['key']}/",
        title=f"Book {ROMAN[_v['n']]} — {_v['name']} · The Eternal Haven",
        desc=(f"Read {_v['name']} by Justin Helmer, book {_v['n']} of The Eternal Haven Chronicles — free to "
              f"read, chapter by chapter."),
        keywords=(f"{_v['name']}, Eternal Haven, Eternal Haven Chronicles, Book "
                  f"{ROMAN[_v['n']]}, Justin Helmer, Excavationpro, free fantasy novel online, "
                  f"read chapter by chapter, walking novel, audiobook"),
        og_title=f"{_v['name']} — Book {ROMAN[_v['n']]}",
        og_desc=f"{_v['part']} Free to read as a walking novel.",
        og_type="book",
        og_image=_v["og"],
        og_alt=f"The cover art of {_v['name']}, Book {ROMAN[_v['n']]} of The Eternal Haven Chronicles",
        share_title=f"{_v['name']} — Book {ROMAN[_v['n']]} of The Eternal Haven",
        share_text=f"{_v['name']} by Justin Helmer — read it free as a walking novel at chatagent.ca.",
        hashtags="EternalHaven,JustinHelmer,FantasyBooks",
        crumbs=[("Home", SITE + "/"), ("Books", SITE + "/books/"),
                (f"Book {ROMAN[_v['n']]}", f"{SITE}/books/{_v['key']}/")],
        book=_v,
    ))

# The volume titles and part labels the section's own reference material states.
# story.json is generated data, so these live here instead of in hand edits.
STORY_TITLE = {"book-4": "Eternal Haven Dawns", "book-5": "The Unwritten Seal",
               "book-6": "The Uncounted"}
STORY_PARTS = {
    "book-2": {"c1": "Part I \u2014 Embers of Division", "c2": "Part I \u2014 Embers of Division",
               "c3": "Part I \u2014 Embers of Division", "c4": "Part II \u2014 The Seal Forges",
               "c5": "Part II \u2014 The Seal Forges", "c6": "Part II \u2014 The Seal Forges"},
    # Book V is built in five acts with an interlude after each; the reader prints
    # these as the part line over every unit.
    "book-5": dict(
        **{"pro": "", "epi": ""},
        **{f"c{n}": f"Act {act} \u2014 {name}" for act, name, lo, hi in [
            ("I", "The Seal That Should Not Be", 1, 8), ("II", "Indexes and Embers", 9, 16),
            ("III", "The Road of Living Scars", 17, 26), ("IV", "The Closing of Names", 27, 34),
            ("V", "The Lattice Beyond", 35, 40)] for n in range(lo, hi + 1)},
        ia="Interlude A \u2014 Codex", ib="Interlude B \u2014 Emberion",
        ic="Interlude C \u2014 Serenya", id="Interlude D \u2014 The Hollow Index",
    ),
    # Book VI is built in five acts with six interludes threaded through them; the reader
    # prints these as the part line over every unit.
    "book-6": dict(
        **{"pro": "", "epi": ""},
        **{f"c{n}": f"Act {act} \u2014 {name}" for act, name, lo, hi in [
            ("I", "The Road Out", 1, 9), ("II", "The Inside", 10, 16),
            ("III", "The Ascent", 17, 22), ("IV", "The Preparation", 23, 34),
            ("V", "The Return and the Counting", 35, 38)] for n in range(lo, hi + 1)},
        ia="Interlude A \u2014 The Deletion Log",
        ib="Interlude B \u2014 The Arithmetic of Forgetting",
        ic="Interlude C \u2014 The Clerk",
        id="Interlude D \u2014 The Counting House",
        ie="Interlude E \u2014 The Long Column",
        **{"if": "Interlude F \u2014 The Third Column"},
    ),
}


def normalize_story(check: bool) -> list:
    """Enforce the volume title and part labels in the section's story files."""
    findings = []
    for v in VOLUMES:
        p = BOOKS / v["key"] / "story.json"
        src = p.read_text(encoding="utf-8")
        data = json.loads(src)
        changed = []
        want_title = STORY_TITLE.get(v["key"])
        if want_title and data.get("title") != want_title:
            changed.append(f"title {data.get('title')!r} -> {want_title!r}")
            data["title"] = want_title
        for ch in data["chapters"]:
            want = STORY_PARTS.get(v["key"], {}).get(ch["id"])
            if want and ch.get("part") != want:
                changed.append(f"{ch['id']} part -> {want!r}")
                ch["part"] = want
        if changed:
            findings.append(f"books/{v['key']}/story.json: {'would set ' if check else 'set '}"
                            + "; ".join(changed))
            if not check:
                tail = "\r\n" if src.endswith("\n") else ""
                body = json.dumps(data, ensure_ascii=False, indent=2).replace("\n", "\r\n")
                p.write_text(body + tail, encoding="utf-8", newline="")
    return findings


# The date the section's own copy/markup last changed, stamped into the sitemap.
CONTENT_DATE = "2026-10-06"  # Book VI added 2026-10-05


def stamp_sitemap(check: bool) -> list:
    """The five shelf URLs must be in the sitemap and carry a lastmod."""
    p = ROOT / "sitemap.xml"
    if not p.exists():
        return []
    src = p.read_text(encoding="utf-8")
    out, changed = src, []
    for page in PAGES:
        loc = f"<loc>{page['url']}</loc>"
        if loc not in out:
            changed.append(f"{page['url']}: missing from the sitemap")
            continue
        i = out.index(loc) + len(loc)
        if out[i:i + 8] == "<lastmod":
            end = out.index("</lastmod>", i) + len("</lastmod>")
            if out[i:end] != f"<lastmod>{CONTENT_DATE}</lastmod>":
                out = out[:i] + f"<lastmod>{CONTENT_DATE}</lastmod>" + out[end:]
                changed.append(f"{page['url']}: lastmod refreshed")
        else:
            out = out[:i] + f"<lastmod>{CONTENT_DATE}</lastmod>" + out[i:]
            changed.append(f"{page['url']}: lastmod added")
    if changed:
        if not check:
            p.write_text(out, encoding="utf-8", newline="")
        return ["sitemap.xml: " + "; ".join(changed)]
    return []


HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="Justin Helmer / Excavationpro">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="keywords" content="{keywords}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/favicon.svg">
<meta name="theme-color" content="#070b14">
<meta name="google-adsense-account" content="ca-pub-0646320966060599">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="chatagent.ca">
<meta property="og:locale" content="en_CA">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{og_desc}">
{og_book}<meta property="og:image" content="{og_image_url}">
<meta property="og:image:secure_url" content="{og_image_url}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{og_alt}">
<meta name="twitter:card" content="{twitter_card}">
<meta name="twitter:site" content="{x}">
<meta name="twitter:creator" content="{x}">
<meta name="twitter:title" content="{og_title}">
<meta name="twitter:description" content="{og_desc}">
<meta name="twitter:image" content="{og_image_url}">
<meta name="twitter:image:alt" content="{og_alt}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Syne:wght@500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/books/haven.css?v={v}">
<script type="application/ld+json">
{jsonld}
</script>
</head>"""


def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace('"', "&quot;")
             .replace("<", "&lt;").replace(">", "&gt;"))


def graph(page: dict) -> dict:
    person = {"@type": "Person", "@id": PERSON_ID, "name": "Justin Helmer",
              "alternateName": "Excavationpro", "url": SITE + "/about.html"}
    org = {"@type": "Organization", "@id": ORG_ID, "name": "chatagent.ca", "url": SITE + "/"}
    series = {"@type": "BookSeries", "@id": SERIES_ID, "name": "The Eternal Haven Chronicles",
              "alternateName": "The Eternal Haven", "url": SITE + "/books/",
              "author": {"@id": PERSON_ID}, "publisher": {"@id": ORG_ID},
              "hasPart": [{"@id": f"{SITE}/books/{v['key']}/#book"} for v in VOLUMES]}
    hub_books = []
    for v in VOLUMES:
        node = {"@type": "Book", "@id": f"{SITE}/books/{v['key']}/#book", "name": v["name"],
                **({"isbn": v["isbn"]} if v.get("isbn") else {}),
                "position": v["n"], "url": f"{SITE}/books/{v['key']}/",
                "author": {"@id": PERSON_ID}, "inLanguage": "en", "publisher": {"@id": ORG_ID},
                "isPartOf": {"@id": SERIES_ID},
                "image": f"{SITE}/books/art/{v['og']}",
                **({"bookFormat": v.get("book_format") or "https://schema.org/Paperback"}
                   if (v.get("isbn") or v.get("book_format")) else {})}
        if v.get("alt_name"):
            node["alternateName"] = v["alt_name"]
        if v.get("also_at"):
            node["sameAs"] = v["also_at"]
        hub_books.append(node)
    website = {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "chatagent.ca",
               "inLanguage": "en", "publisher": {"@id": ORG_ID}}
    crumbs = {"@type": "BreadcrumbList", "@id": page["url"] + "#breadcrumb",
              "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": name, "item": url}
                                  for i, (name, url) in enumerate(page["crumbs"])]}
    if page["book"] is None:
        nodes = [website, org, person, series] + hub_books + [crumbs]
    else:
        v = page["book"]
        own = {"@type": "Book", "@id": page["url"] + "#book", "name": v["name"],
               **({"isbn": v["isbn"]} if v.get("isbn") else {}),
               "position": v["n"], "url": page["url"],
               "author": {"@id": PERSON_ID}, "inLanguage": "en", "publisher": {"@id": ORG_ID},
               "isPartOf": {"@id": SERIES_ID}, "image": f"{SITE}/books/art/{v['og']}",
               **({"bookFormat": v.get("book_format") or "https://schema.org/Paperback"}
                  if (v.get("isbn") or v.get("book_format")) else {})}
        if v.get("alt_name"):
            own["alternateName"] = v["alt_name"]
        if v.get("also_at"):
            own["sameAs"] = v["also_at"]
        nodes = [org, person, series, own, crumbs]
    return {"@context": "https://schema.org", "@graph": nodes}


def head_for(page: dict) -> str:
    og_book = ""
    if page["book"]:
        og_book = (f'<meta property="og:book:author" content="Justin Helmer">\n'
                   f'<meta property="og:book:isbn" content="{page["book"]["isbn"]}">\n'
                   if page["book"].get("isbn") else "")
    return HEAD.format(
        title=esc(page["title"]), desc=esc(page["desc"]), keywords=esc(page["keywords"]),
        url=page["url"], og_type=page["og_type"], og_title=esc(page["og_title"]),
        og_desc=esc(page["og_desc"]),
        og_image_url=SITE + "/books/art/" + page["og_image"], og_alt=esc(page["og_alt"]),
        og_book=og_book, twitter_card=TWITTER_CARD, x=X_HANDLE, v=ASSET_V,
        jsonld=json.dumps(graph(page), ensure_ascii=False, indent=1))


def nav_for(page: dict) -> str:
    out = []
    for href, label in NAV:
        full = href if href.startswith("http") else SITE + href
        cur = ' aria-current="page"' if full == page["url"] else ""
        out.append(f'    <a href="{href}"{cur}>{label}</a>')
    return '<nav>\n' + "\n".join(out) + '\n  </nav>'


def share_buttons(page: dict) -> str:
    """The intent URLs the site's own share rows use, built per page."""
    from urllib.parse import quote
    u = quote(page["url"], safe="")
    t = quote(page["share_title"] + " — " + page["share_text"], safe="")
    items = [
        ("x", f"https://x.com/intent/post?url={u}&amp;text={t}&amp;hashtags={quote(page['hashtags'], safe='')}", "Share on X", "X"),
        ("fb", f"https://www.facebook.com/sharer/sharer.php?u={u}", "Share on Facebook", "Facebook"),
        ("li", f"https://www.linkedin.com/sharing/share-offsite/?url={u}", "Share on LinkedIn", "LinkedIn"),
        ("rd", f"https://www.reddit.com/submit?url={u}&amp;title={t}", "Share on Reddit", "Reddit"),
        ("wa", f"https://api.whatsapp.com/send?text={t}%20{u}", "Share on WhatsApp", "WhatsApp"),
        ("tg", f"https://t.me/share/url?url={u}&amp;text={t}", "Share on Telegram", "Telegram"),
        ("em", f"mailto:?subject={quote(page['share_title'], safe='')}&amp;body={t}%0A%0A{u}", "Share by email", "Email"),
    ]
    out = [f'<a class="share-btn {c}" href="{href}" target="_blank" rel="noopener noreferrer" '
           f'aria-label="{label}">{text}</a>' for c, href, label, text in items]
    out.append(f'<button type="button" class="share-btn" data-copy-link data-share-url="{page["url"]}">Copy link</button>')
    out.append('<button type="button" class="share-btn" data-native-share hidden>Share…</button>')
    return '<div class="share-row">' + "".join(out) + "</div>"


def share_block(page: dict) -> str:
    if page["book"] is None:
        body = (f'<section class="shelf share" id="share" aria-label="Share the shelf">\n'
                f'  <h2>Pass the door on</h2>\n'
                f'  <p class="note">One link, no login. Every page of the shelf is free to read; the printed '
                f'editions are sold through Amazon and Lulu.</p>\n'
                f'  {share_buttons(page)}\n'
                f'  <p class="share-note">The card that unfurls when you share this link is '
                f'<a href="{SITE}/books/art/{page["og_image"]}">this image</a>.</p>\n'
                f'</section>')
        return f'<!-- books-share:start -->\n{body}\n<!-- books-share:end -->'
    # reader pages: one compact line inside the lore nav, so the fixed-height
    # column does not lose room to a second button row
    from urllib.parse import quote
    u = quote(page["url"], safe="")
    t = quote(page["share_title"], safe="")
    links = [
        ("X", f"https://x.com/intent/post?url={u}&amp;text={t}&amp;hashtags={quote(page['hashtags'], safe='')}"),
        ("Facebook", f"https://www.facebook.com/sharer/sharer.php?u={u}"),
        ("Reddit", f"https://www.reddit.com/submit?url={u}&amp;title={t}"),
        ("Email", f"mailto:?subject={quote(page['share_title'], safe='')}&amp;body={t}%0A%0A{u}"),
    ]
    out = "".join(f'<a href="{href}" target="_blank" rel="noopener noreferrer">Share on {label}</a>'
                  for label, href in links)
    out += f'<button type="button" class="linklike" data-copy-link data-share-url="{page["url"]}">Copy link</button>'
    return (f'<!-- books-share:start -->\n      {out}\n      <!-- books-share:end -->')


H1_RE = re.compile(r'^\s*<!-- books-h1:start -->.*?<!-- books-h1:end -->\n', re.S | re.M)


def apply_page(page: dict, check: bool) -> list:
    p = ROOT / page["path"]
    src = p.read_text(encoding="utf-8", newline="")
    crlf = "\r\n" in src
    out = src.replace("\r\n", "\n")
    findings = []

    # 1. <head> whole
    m = re.search(r"<!DOCTYPE html>\n<html[^>]*>\n<head>.*?</head>", out, re.S)
    if not m:
        findings.append(f"{page['path']}: no <head> to replace")
        return findings
    new_head = head_for(page)
    out = out[:m.start()] + new_head + out[m.end():]
    if len(page["desc"]) > 158:
        findings.append(f"{page['path']}: meta description is {len(page['desc'])} chars "
                        f"(search snippets truncate past ~158)")

    # 2. section nav inside <header class="top">
    hm = re.search(r'(<header class="top">\n.*?</a>\n)(.*?)(</header>)', out, re.S)
    if hm:
        out = out[:hm.start(2)] + nav_for(page) + "\n" + out[hm.end(2):]
    else:
        findings.append(f"{page['path']}: header nav not found")

    # 3. asset version stamps
    out = re.sub(r'href="/books/haven\.css[^"]*"', f'href="/books/haven.css?v={ASSET_V}"', out)
    out = re.sub(r'src="/books/reader\.js[^"]*"', f'src="/books/reader.js?v={ASSET_V}"', out)
    out = re.sub(r'src="/books/share\.js[^"]*"', f'src="/books/share.js?v={ASSET_V}"', out)

    # 4. share row
    block = share_block(page)
    if "<!-- books-share:start -->" in out:
        out = re.sub(r"<!-- books-share:start -->.*?<!-- books-share:end -->",
                     lambda m: block, out, flags=re.S)
    elif page["book"] is None:
        out = out.replace('<section class="net">', block + '\n<section class="net">', 1)
    else:
        lm = re.search(r'(<nav class="lore"[^>]*>\n)(.*?)(\s*</nav>)', out, re.S)
        if lm:
            out = out[:lm.end(2)] + block + "\n" + out[lm.end(2):]
        else:
            findings.append(f"{page['path']}: lore nav not found for the share line")

    # 5. share script (all five pages) and the reader page h1
    if "/books/share.js" not in out:
        out = out.replace('<script src="/books/reader.js', '<script src="/books/share.js?v=%s"></script>\n<script src="/books/reader.js' % ASSET_V, 1)
        if "/books/share.js" not in out:  # hub: no reader.js
            out = out.replace("</body>", '<script src="/books/share.js?v=%s"></script>\n</body>' % ASSET_V, 1)
    if page["book"]:
        h1 = (f'<!-- books-h1:start -->\n  <h1 class="sr-only">{esc(page["book"]["name"])} — book '
              f'{page["book"]["n"]} of The Eternal Haven Chronicles by Justin Helmer</h1>\n'
              f'  <!-- books-h1:end -->\n')
        if "<!-- books-h1:start -->" in out:
            # own the text, not just its presence: a page cloned from a sibling must
            # not keep that sibling's title in its hidden h1
            out, n = H1_RE.subn(lambda _m: h1, out, count=1)
            if not n:
                findings.append(f"{page['path']}: h1 markers present but not matched")
        else:
            out = out.replace('<main class="room">\n', '<main class="room">\n' + h1, 1)

    if out != src.replace("\r\n", "\n"):
        findings.append(f"{page['path']}: {'would change' if check else 'rebuilt'}")
        if not check:
            p.write_text(out.replace("\n", "\r\n") if crlf else out, encoding="utf-8", newline="")
    return findings


def main() -> int:
    check = "--check" in sys.argv
    findings = []
    for page in PAGES:
        findings += apply_page(page, check)
    findings += normalize_story(check)
    findings += stamp_sitemap(check)
    for f in findings:
        print(("DRIFT  " if check else "WROTE  ") + f)
    if not findings:
        print("books section: no drift")
    print(f"{len(PAGES)} pages owned by this builder, asset version {ASSET_V}")
    return 1 if (check and findings) else 0


if __name__ == "__main__":
    sys.exit(main())
