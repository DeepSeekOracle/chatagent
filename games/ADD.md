# Add a game to the arcade

The arcade is driven by `catalog.json`. HTML pages that list titles read that file.

## Checklist

1. Create a playable folder: `/games/<slug>/index.html` (relative assets inside that folder).
2. Add a 1200×630 cover at `/games/<slug>/og.jpg` (or `assets/og.jpg`).
3. Append one object to `games` in `catalog.json`:
   - `id` / `slug` matching the folder
   - `status`: `"live"` when playable, `"coming"` for a teaser card
   - `href`: `/games/<slug>/`
   - `featured`: `true` to also show on the homepage
   - `order`: lower numbers first
4. Add `<loc>https://chatagent.ca/games/<slug>/</loc>` to `sitemap.xml` (and the eternalhaven sitemap if mirrored).
5. On the game page, put **All games** in the header, footer, or title menu — not a floating overlay. HTML5 titles: `<a class="games-mini" href="/games/">All games</a>` in the header plus a footer/menu link. Bundled (Vite) titles: a `.games-chrome` bar in `index.html` plus `/games/hub.css`.

6. Mirror the folder + catalog to eternalhaven when the title ships on both hosts.
7. Leave `slot-next` in the catalog (or replace it) so the arcade always shows an open slot.
8. Wire the title to the live hall: POST finishes to the arcade Space (`arcade-ledger.js` + `/rally|/golf|/swarm|/eternal/submit`, or Marines `/submit` / SMM `/smm/submit`). Add `ledger.html` that reads the public JSON. List play + hall in `catalog.json` and `/games/live.json`. The Hub at `/games/` shows all six books.

Do not put secrets, tokens, or PayPal credentials in game folders.
