#!/usr/bin/env python3
"""Copy site-kit onto a publisher domain root (index, 404, contact, thanks, sitemap)."""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

KIT = Path(r"D:\chatagent\assets")
FAV = KIT / "favicon.svg"
CSS = KIT / "site-kit.css"
JS = KIT / "site-kit.js"

HEAD_BITS = """<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/favicon.svg">
<link rel="stylesheet" href="/assets/site-kit.css">
"""

TAIL = """
<div class="sticky-cta" aria-label="Mobile actions">
  <a class="pri" href="{pri_href}">{pri}</a>
  <a class="sec" href="{sec_href}">{sec}</a>
</div>
<div class="cookie-banner" id="cookieBanner" role="dialog" aria-label="Cookie consent">
  <div>Ads may use cookies after you accept. <a href="/privacy.html">Privacy</a></div>
  <div>
    <button type="button" class="ok" id="cookieOk">Accept</button>
    <button type="button" class="no" id="cookieNo">Decline</button>
  </div>
</div>
<script src="/assets/site-kit.js" defer></script>
"""

FORM = """
    <h2>On-site form</h2>
    <p>Public contact remains <a href="https://x.com/excavationpro">@Excavationpro</a> on X and GitHub DeepSeekOracle. No street address is published.</p>
    <form class="contact-form" id="contactForm" action="/thanks.html" method="get" novalidate>
      <div class="field">
        <label for="cname">Name</label>
        <input id="cname" name="name" required autocomplete="name">
        <p class="field-err">Please enter your name.</p>
      </div>
      <div class="field">
        <label for="cemail">Email</label>
        <input id="cemail" name="email" type="email" required autocomplete="email">
        <p class="field-err">Please enter a valid email.</p>
      </div>
      <div class="field">
        <label for="cmsg">Message</label>
        <textarea id="cmsg" name="msg" rows="5" required></textarea>
        <p class="field-err">Please write a short message. Do not paste secrets.</p>
      </div>
      <button type="submit">Send</button>
    </form>
"""


def thanks_html(host: str, brand: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en" data-cookie-key="{host.split('.')[0]}_cookies">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thank you — {brand}</title>
<meta name="description" content="Thanks for writing to {brand}.">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://{host}/thanks.html">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site-kit.css">
<meta property="og:title" content="Thank you — {brand}">
<meta property="og:image" content="https://{host}/assets/og-home.jpg">
<meta property="og:image:alt" content="{brand}">
</head>
<body>
<header><p><a href="/">{brand}</a></p></header>
<main>
  <h1>Thank you</h1>
  <p>Message noted. Public contact: <a href="https://x.com/excavationpro">@Excavationpro</a>.</p>
  <p><a href="/">Home</a></p>
</main>
</body>
</html>
"""


def patch_html(path: Path, host: str, pri: str, pri_h: str, sec: str, sec_h: str, cookie: str) -> None:
    t = path.read_text(encoding="utf-8", errors="replace")
    if 'data-cookie-key' not in t:
        t = t.replace("<html lang=\"en\">", f'<html lang="en" data-cookie-key="{cookie}">', 1)
        t = t.replace("<html lang=\"en\" ", f'<html lang="en" data-cookie-key="{cookie}" ', 1)
    if 'rel="icon"' not in t and "<head>" in t:
        t = t.replace("<head>", "<head>\n" + HEAD_BITS, 1)
    elif "/assets/site-kit.css" not in t and "</head>" in t:
        t = t.replace("</head>", HEAD_BITS + "</head>", 1)
    if 'og:image:alt' not in t and 'property="og:image"' in t:
        t = t.replace(
            'property="og:image"',
            'property="og:image"',
            1,
        )
        t = t.replace(
            "</head>",
            f'<meta property="og:image:alt" content="{host}">\n</head>',
            1,
        )
    if 'id="lygoLoad"' not in t and "<body" in t:
        t = t.replace("<body class=\"home\">", '<body class="home">\n<div id="lygoLoad" class="lygo-load">Loading</div>', 1)
    tail = TAIL.format(pri=pri, pri_href=pri_h, sec=sec, sec_href=sec_h)
    if 'id="cookieBanner"' not in t and "</body>" in t:
        t = t.replace("</body>", tail + "\n</body>", 1)
    path.write_text(t, encoding="utf-8")


def patch_contact(path: Path) -> None:
    t = path.read_text(encoding="utf-8", errors="replace")
    if 'id="contactForm"' in t:
        return
    needle = "<h2>How to reach"
    if needle in t:
        t = t.replace(needle, FORM + "\n    " + needle, 1)
    else:
        t = t.replace("</article>", FORM + "\n</article>", 1)
    path.write_text(t, encoding="utf-8")


def patch_sitemap(path: Path, host: str) -> None:
    if not path.is_file():
        return
    t = path.read_text(encoding="utf-8", errors="replace")
    loc = f"https://{host}/thanks.html"
    if loc in t:
        return
    t = t.replace("</urlset>", f"  <url><loc>{loc}</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n</urlset>")
    path.write_text(t, encoding="utf-8")


def apply(root: Path, host: str, brand: str, pri: str, pri_h: str, sec: str, sec_h: str) -> None:
    cookie = host.split(".")[0] + "_cookies"
    assets = root / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copy2(FAV, assets / "favicon.svg")
    shutil.copy2(FAV, root / "favicon.svg")
    shutil.copy2(CSS, assets / "site-kit.css")
    js = JS.read_text(encoding="utf-8")
    if "data-cookie-key" not in js:
        js = js.replace(
            'var key = "chatagent_cookies";',
            'var key = document.documentElement.getAttribute("data-cookie-key") || "site_cookies";',
        )
        JS.write_text(js, encoding="utf-8")
        js = JS.read_text(encoding="utf-8")
    shutil.copy2(JS, assets / "site-kit.js")
    for name in ("index.html", "404.html", "contact.html"):
        p = root / name
        if p.is_file():
            patch_html(p, host, pri, pri_h, sec, sec_h, cookie)
    cp = root / "contact.html"
    if cp.is_file():
        patch_contact(cp)
    (root / "thanks.html").write_text(thanks_html(host, brand), encoding="utf-8")
    patch_sitemap(root / "sitemap.xml", host)
    print("applied", host)


def main() -> int:
    # fix chatagent js cookie key first
    js = JS.read_text(encoding="utf-8")
    if 'getAttribute("data-cookie-key")' not in js:
        js = js.replace(
            'var key = "chatagent_cookies";',
            'var key = document.documentElement.getAttribute("data-cookie-key") || "chatagent_cookies";',
        )
        JS.write_text(js, encoding="utf-8")
    sites = [
        (r"D:\eternalhaven", "eternalhaven.ca", "Eternal Haven", "Essays", "/blog/", "Donate", "https://www.paypal.com/paypalme/ExcavationPro"),
        (r"D:\excavationpro-ca", "excavationpro.ca", "Excavationpro", "Listen", "https://asiancoastline.com/listen.html", "Donate", "https://www.paypal.com/paypalme/ExcavationPro"),
        (r"D:\deepseekoracle-com", "deepseekoracle.com", "DeepSeek Oracle", "Home", "/", "Donate", "https://www.paypal.com/paypalme/ExcavationPro"),
        (r"D:\asiancoastline", "asiancoastline.com", "asiancoastline", "Player", "/listen.html", "Donate", "https://www.paypal.com/paypalme/ExcavationPro"),
        (r"D:\bpmfinder", "bpmfinder.ca", "BPMfinder", "Tool", "/app.html", "Guides", "/guides.html"),
    ]
    for args in sites:
        apply(Path(args[0]), *args[1:])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
