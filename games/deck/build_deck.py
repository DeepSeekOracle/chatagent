#!/usr/bin/env python3
"""Build games/deck/index.html from games/catalog.json.

The deck is a view over the arcade catalog. catalog.json stays the source of
truth for which titles exist, their titles, hrefs and hall links; this script
adds the deck's presentation layer (category pill, badge, tech line, glow) and
renders everything server-side so the page is crawlable without JavaScript.

    python games/deck/build_deck.py          # rebuild index.html
    python games/deck/build_deck.py --check  # fail if index.html is stale

Add a game: put it in catalog.json with status "live" + href, then add an
EXTRAS entry below (a missing entry falls back to a derived badge and the
catalog blurb, so the build still works).
"""
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
CATALOG = REPO / "games" / "catalog.json"
TEMPLATE = ROOT / "index.template.html"
OUT = ROOT / "index.html"

# cat: filter pill. glow: hero ambient colour. tech: second chip on the card.
EXTRAS = {
    "lattice-marines": dict(
        cat="strategy", badge="Strategy · Isometric", tech="HTML5 Canvas · HF Hall",
        glow="rgba(56, 189, 248, 0.35)",
        desc="Place three HQs, branch build range, probe Battleship fog, and fight a never-ending campaign "
             "against local AI or a second player on one keyboard."),
    "lattice-swarm": dict(
        cat="strategy", badge="Strategy · Hex Command", tech="Hex Math · Local Save",
        glow="rgba(168, 85, 247, 0.35)",
        desc="Command node agents across a hexagonal resonance grid. Build, defend, and keep entropy from "
             "unraveling the lattice."),
    "eternal-lattice": dict(
        cat="cards", badge="Cards · Campaign", tech="Deckwright · Ranked Ladder",
        glow="rgba(234, 179, 8, 0.35)",
        desc="Champion card battles on the Eternal Haven playmat: campaign, Deckwright and Lattice Forge. "
             "Local-first, no account."),
    "stock-market-masters": dict(
        cat="strategy", badge="Strategy · Market", tech="Market Simulation · HF Hall",
        glow="rgba(34, 197, 94, 0.35)",
        desc="A never-ending play-money quotation board. Cash out whenever you like; the highest net worth "
             "takes the TOP Cashout hall."),
    "haven-rally": dict(
        cat="racing", badge="Racing · Time Trial", tech="Pseudo-3D · Ghost Laps",
        glow="rgba(249, 115, 22, 0.35)",
        desc="Arcade time trial on sunset highways: slide to boost, learn the course, then chase your own "
             "ghost and the AI drag strip."),
    "lattice-grand-prix": dict(
        cat="racing", badge="Racing · Unity 3D", tech="Unity WebGL · 60 FPS",
        glow="rgba(239, 68, 68, 0.35)",
        desc="A 20-event career across five ranks, rivals on their own racing lines, nitrous, and a pit lane. "
             "Free in the browser, no install."),
    "lattice-golf": dict(
        cat="sports", badge="Sports · Golf", tech="2.5D Ballistics · Live Rounds",
        glow="rgba(16, 185, 129, 0.35)",
        desc="Plant the marker, read the wind, watch the ball fly. Named courses, a nine-hole card, endless "
             "links and a campaign against the AI."),
    "fish-tank": dict(
        cat="sports", badge="Sim · Real Time", tech="Genetic Growth · Autonomous",
        glow="rgba(6, 182, 212, 0.35)",
        desc="An autonomous aquarium: eighteen species including rare marine fish and one octopus, growing "
             "through six ages while you watch."),
    "lattice-corridor": dict(
        cat="action", badge="Action · FPS", tech="PrBoom Engine · WAD Native",
        glow="rgba(244, 63, 94, 0.35)",
        desc="Freedoom Phase 1, Phase 2 and FreeDM, plus Lotan's Tomb, running on a real PrBoom engine. "
             "Load a WAD you own."),
    "lygo-dungeon": dict(
        cat="action", badge="Dungeon · RPG", tech="D20 System · Turn Battler",
        glow="rgba(139, 92, 246, 0.35)",
        desc="A still-frame dungeon crawler. Four locked characters, open d20 fights, and a wolf that gets "
             "harder by area."),
    "moonlit-tactics": dict(
        cat="strategy", badge="Tactics · Story", tech="Grid Tactics · Story Rich",
        glow="rgba(147, 51, 234, 0.35)",
        desc="The Moonlit Slumber through Eternal Haven Dawns. Serenya wakes in the loft; choose Cantor, "
             "Warden or Kindler."),
    "haven-desk": dict(
        cat="cards", badge="Desk · Retro OS", tech="Win98 Desktop Emulation",
        glow="rgba(20, 184, 166, 0.35)",
        desc="An unofficial LYGO desktop: teal field, grey windows, mail, pictures and a saver you can boot "
             "from."),
    "lattice-arena": dict(
        cat="action", badge="Battler · Spectate", tech="Auto-Battler · Live Lineup",
        glow="rgba(59, 130, 246, 0.35)",
        desc="Two AI teams, one stone ring. Name yourself, draft 1v1 to 5v5 from 33 kits, then watch every "
             "move land."),
    "lattice-chess": dict(
        cat="strategy", badge="Strategy · 3D Chess", tech="Three.js 3D · Shatter Physics",
        glow="rgba(156, 163, 175, 0.35)",
        desc="Sculpted stone chess in a gothic cathedral: cinematic captures, real shatter physics and a "
             "local chess AI."),
    "lattice-arcade": dict(
        cat="action", badge="Arcade · Generator", tech="Procedural Sprites · Pixel FX",
        glow="rgba(236, 72, 153, 0.35)",
        desc="Turn two photos into pixel fighters, then run a neon retro maze. Local sprite generation and "
             "local AI."),
    "lattice-city": dict(
        cat="strategy", badge="Builder · Endless", tech="Isometric 256 Tile Engine",
        glow="rgba(16, 185, 129, 0.35)",
        desc="Build a living pixel city, then expand into a 48x48 LYGO Endless district. 256 tiles, snapshot "
             "export, local AI."),
    "lattice-tennis": dict(
        cat="sports", badge="Sports · 3D Tennis", tech="Kinematics · Motion Support",
        glow="rgba(245, 158, 11, 0.35)",
        desc="3D arcade tennis with racket kinematics and expressive pilots. Keyboard, mouse, controller, or "
             "optional webcam motion."),
    "lattice-crypt": dict(
        cat="action", badge="Action · Roguelike", tech="Procedural Floors · HF Hall",
        glow="rgba(99, 102, 241, 0.35)",
        desc="Procedural dungeon descent: stack artifacts, clear floors, and survive the horde ramp without "
             "wiping the run."),
}

PILLS = [
    ("all", "All Modules"),
    ("strategy", "Strategy"),
    ("racing", "Racing"),
    ("action", "Action & RPG"),
    ("cards", "Cards & Desk"),
    ("sports", "Sports & Sim"),
]

CORE = "https://chatagent.ca"


def esc(text):
    return html.escape(str(text), quote=True)


def jd(obj):
    """JSON for embedding in a <script> block."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def load_games():
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    games = []
    for g in data.get("games", []):
        if g.get("status") != "live" or not g.get("href"):
            continue
        extra = EXTRAS.get(g["id"], {})
        ledger = ""
        links = g.get("links") or []
        if links and links[0].get("href"):
            ledger = links[0]["href"]
            if not ledger.startswith("/"):
                ledger = "/" + ledger
        genre = (g.get("genre") or ["arcade"])[0]
        games.append({
            "id": g["id"],
            "title": g.get("title") or g["id"],
            "cat": extra.get("cat", "action"),
            "badge": extra.get("badge", genre.capitalize()),
            "tech": extra.get("tech", "Browser · No install"),
            "glow": extra.get("glow", "rgba(56, 189, 248, 0.3)"),
            "desc": extra.get("desc") or g.get("blurb") or g.get("tagline") or "",
            "url": g["href"],
            "ledger": ledger,
            "img": g.get("cover") or "/games/og.jpg",
            "alt": (g.get("coverAlt") or g.get("title") or "Game") + " key art",
            "blurb": g.get("blurb") or "",
            "genre": g.get("genre") or [],
            "players": g.get("players") or "",
        })
    games.sort(key=lambda x: x["title"].lower())
    # Lattice Marines opens the deck: it is the flagship isometric title.
    games.sort(key=lambda x: 0 if x["id"] == "lattice-marines" else 1)
    return games


def card_html(game, index):
    first = index < 2
    hall = (
        '<a class="card-btn-hall" href="{0}" title="{1} live hall">'
        '<svg class="ic ic-14" aria-hidden="true"><use href="#i-award"/></svg> Hall</a>'.format(
            esc(game["ledger"]), esc(game["title"]))
        if game["ledger"] else ""
    )
    return """      <article class="game-card{active}" data-index="{index}" data-cat="{cat}" tabindex="0" aria-label="{title} — open in the deck theater">
        <div class="card-thumb-wrap">
          <img class="card-thumb" src="{img}" alt="{alt}" width="640" height="336" {loading}>
          <div class="card-badge-row">
            <span class="card-cat-badge">{catlabel}</span>
            <span class="card-tech">{tech}</span>
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title"><a href="{url}">{title}</a></h3>
          <p class="card-desc">{desc}</p>
          <div class="card-footer">
            <a class="card-btn-play" href="{url}"><svg class="ic ic-14 ic-fill" aria-hidden="true"><use href="#i-play"/></svg> Play</a>
            {hall}
          </div>
        </div>
      </article>""".format(
        active=" active-preview" if index == 0 else "",
        index=index,
        cat=esc(game["cat"]),
        title=esc(game["title"]),
        img=esc(game["img"]),
        alt=esc(game["alt"]),
        loading="loading=\"eager\" fetchpriority=\"high\"" if first else "loading=\"lazy\"",
        catlabel=esc(game["badge"].split("·")[0].strip()),
        tech=esc(game["tech"].split("·")[0].strip()),
        url=esc(game["url"]),
        desc=esc(game["desc"]),
        hall=hall,
    )


def island(games):
    keys = ("id", "title", "cat", "badge", "tech", "glow", "desc", "url", "ledger", "img")
    return jd([{k: g[k] for k in keys} for g in games])


def jsonld(games, halls, updated):
    graph = [{
        "@type": "CollectionPage",
        "@id": CORE + "/games/deck/#page",
        "url": CORE + "/games/deck/",
        "name": "Arcade Deck",
        "description": "The chatagent.ca Arcade Deck: every live browser game in one console, with live score halls.",
        "isPartOf": {"@id": CORE + "/#website"},
        "about": {"@id": CORE + "/games/deck/#arcade"},
        "primaryImageOfPage": {"@id": CORE + "/games/deck/og-deck.jpg"},
        "breadcrumb": {"@id": CORE + "/games/deck/#crumbs"},
        "author": {"@type": "Person", "name": "Justin Helmer", "alternateName": "Excavationpro"},
        "publisher": {"@id": CORE + "/#org"},
        "datePublished": "2026-10-18",
        "dateModified": updated,
        "inLanguage": "en-CA",
    }, {
        "@type": "WebSite",
        "@id": CORE + "/#website",
        "url": CORE + "/",
        "name": "chatagent.ca",
        "publisher": {"@id": CORE + "/#org"},
        "inLanguage": "en-CA",
    }, {
        "@type": "Organization",
        "@id": CORE + "/#org",
        "name": "chatagent.ca",
        "url": CORE + "/",
        "founder": {"@type": "Person", "name": "Justin Helmer", "alternateName": "Excavationpro"},
        "sameAs": ["https://github.com/DeepSeekOracle", "https://x.com/Excavationpro"],
    }, {
        "@type": "BreadcrumbList",
        "@id": CORE + "/games/deck/#crumbs",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": CORE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Games", "item": CORE + "/games/"},
            {"@type": "ListItem", "position": 3, "name": "Arcade Deck", "item": CORE + "/games/deck/"},
        ],
    }, {
        "@type": "ItemList",
        "@id": CORE + "/games/deck/#arcade",
        "name": "Live arcade titles on chatagent.ca",
        "numberOfItems": len(games),
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "itemListElement": [{
            "@type": "ListItem",
            "position": i + 1,
            "item": {
                "@type": "VideoGame",
                "name": g["title"],
                "url": CORE + g["url"],
                "image": CORE + g["img"].split("?")[0],
                "description": g["blurb"][:300] or g["desc"],
                "genre": [x.capitalize() for x in g["genre"]] or ["Arcade"],
                "gamePlatform": "Web browser",
                "applicationCategory": "Game",
                "operatingSystem": "Any (HTML5)",
                "author": {"@type": "Person", "name": "Justin Helmer", "alternateName": "Excavationpro"},
                "publisher": {"@id": CORE + "/#org"},
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CAD",
                           "availability": "https://schema.org/InStock"},
            },
        } for i, g in enumerate(games)],
    }]
    return json.dumps({"@context": "https://schema.org", "@graph": graph},
                      ensure_ascii=False, indent=2)


def build():
    games = load_games()
    if not games:
        sys.exit("no live games found in games/catalog.json")

    template = TEMPLATE.read_text(encoding="utf-8")
    counts = {key: 0 for key, _ in PILLS}
    for g in games:
        counts["all"] += 1
        counts[g["cat"]] = counts.get(g["cat"], 0) + 1
    halls = sum(1 for g in games if g["ledger"])
    updated = date.today().isoformat()

    pills = "\n".join(
        '          <button class="pill{active}" type="button" data-cat="{cat}" aria-pressed="{pressed}">{label}'
        ' (<span data-count="{cat}">{n}</span>)</button>'.format(
            active=" active" if cat == "all" else "",
            pressed="true" if cat == "all" else "false",
            cat=cat, label=label, n=counts.get(cat, 0))
        for cat, label in PILLS
    )

    missing = [g["id"] for g in games if g["id"] not in EXTRAS]
    if missing:
        print("note: no deck extras for " + ", ".join(missing) + " (using catalog fallback)")

    out = (template
           .replace("{{CARDS}}", "\n".join(card_html(g, i) for i, g in enumerate(games)))
           .replace("{{PILLS}}", pills)
           .replace("{{COUNT}}", str(len(games)))
           .replace("{{HALL_COUNT}}", str(halls))
           .replace("{{DATA}}", island(games))
           .replace("{{JSONLD}}", jsonld(games, halls, updated)))

    if not re.search(r"\{\{[A-Z_]+\}\}", out):
        OUT.write_text(out, encoding="utf-8", newline="\n")
    else:
        sys.exit("unfilled tokens: " + ", ".join(sorted(set(re.findall(r"\{\{[A-Z_]+\}\}", out)))))

    print("built {0}: {1} cards, {2} halls, pills {3}".format(
        OUT.relative_to(REPO).as_posix(), len(games), halls,
        ", ".join("%s=%d" % (k, counts.get(k, 0)) for k, _ in PILLS)))


def check():
    before = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    build()
    after = OUT.read_text(encoding="utf-8")
    if before != after:
        print("index.html was stale; rebuilt")
        return 1
    print("index.html is current")
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    build()
