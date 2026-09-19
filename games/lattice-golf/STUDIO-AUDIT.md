# Lattice Golf — Studio Audit

**Build:** `index.html` (game.js v37 · game.css v25 · golf3d.js v18)
**Scope of this pass:** coarse layout, first-time legibility, and a graphics floor — the skeleton
(2.5D course renderer, club puzzle gameplay, campaign/live/endless modes) was sound and stays.

---

## 1. What was actually wrong

Found by playing the shipped build at full window size and reading the renderer, not by reading
the design notes.

| # | Finding | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | The whole course read as **near-black ink with one green ribbon** | the turf materials multiplied an already dark procedural map (`tex.grass` ≈ rgb 28/62/32) by a dark tint (`th.grass` 0x2a4a30) → final albedo ≈ 0.02–0.07. Only the fairway ribbon (`0x5ec46a`) survived. | lifted every turf texture to real grass values and moved the per-course tint to ~0.8 white (`th.turf/roughT/cutT`); hemi 0.72 → 0.95, ambient 0.22 → 0.34, exposure 1.08 → 1.14 |
| 2 | Water was a **flat dark disc** | `tex.water` was generated (and its UV offset animated every frame) but **no mesh ever used it** — the water meshes had a plain colour material | wired `tex.water` into the water material (repeat 4×4), raised albedo, added sheen (roughness 0.2 / metalness 0.12) and a lighter basin |
| 3 | Floating HUD text **vanished over bright turf** | `.hint` / `.keys` were bare text with a text-shadow, fine over black, unreadable over grass | every viewport label sits on a glass plinth (border + blur + shadow) |
| 4 | Shot result was **only in the rail log** | nothing surfaced the outcome where the player is looking | new `#shotChip` — tone-coded result plate over the course: `CUP`, `WATER`, `OUT OF BOUNDS`, `TREES · BALL STOPS`, `268 yd · FAIRWAY`, `ON THE GREEN`, with club / power / roll / distance to pin |
| 5 | Title screen was a **one-column wall**: radios, stream links, name, 6 golfer cards, 8 mode cards, donate row in one 480px scroll | single undifferentiated `.title-panel` | hero + four labelled sections (`Operator` · `Choose golfer` · `Courses` · `Ways to play`) and a footer row |
| 6 | Art panel showed a **cropped “ATTICE”** | title art `object-position: 38% center` on a column narrower than the image ratio | `object-position: 50% 30%`, wider art column |
| 7 | Hero content sat **below the fold on any long panel** | art column stretched to the panel's full height, so a bottom-anchored overlay landed off-screen | art column is now `position: sticky; height: 100vh; align-self: start` — the art holds while the picker scrolls |
| 8 | Club list gave **no sense of distance** | ten identical text rows | each club row carries a carry bar (`--bar` set in `paintClubs()`), gold when selected |
| 9 | Radio cluster was an **unlabelled strip of Play/Next/Mute + a running title** jammed against the dock | `.radio-inline` had no grouping | grouped into one bordered chip with a truncating title |
| 10 | No reason to replay a course | `save.rounds` / `save.bestHole` were written but never shown on the title screen | records surfaced: hero strip (last card / best / lifetime) and a per-course `best +2 · 38 strokes · 3 rounds` chip |

## 2. What changed, file by file

**`golf3d.js`** — graphics floor
- `makeTextures()`: grass / rough / fairway / green / sand / water lifted out of ink range; fairway keeps its mow stripes and edge falloff, green keeps its rotation stripes.
- `themeOf()`: every course now carries its own turf set — `turf`, `roughT` (first cut), `cutT` (approach), `fairTop`, `greenTop`, plus a brighter `pine`. Singularity Nine stays a dusk palette rather than becoming daylight.
- `rebuild()`: rough / first-cut / fairway / green materials read those tints; ground plane unchanged (same tint key).
- Water: textured, sheened, lighter basin.
- Lighting: hemisphere + ambient + exposure raised; ball radius 0.16 → 0.24 so it reads at hole-fit zoom.
- Untouched: hole geometry, `heightAt`, camera/orbit maths, OOB stakes, bunkers, cart paths, trees, ghosts, picking.

**`game.js`** — loop and feedback
- `flashResult(tone, main, sub)` + hooks on all four shot outcomes (cup / water-or-OOB / trees / carry).
- `paintClubs()`: per-club carry bars.
- `menuRecords()`, `bestRoundFor()`, `roundsFor()`, `fmtPar()`, `recChip()` — records read from the existing `save.rounds` / `save.bestHole`; nothing new is persisted.
- `menu()`: rebuilt markup (hero + sections), keeping every id (`nm`, `menuRadio`) and data attribute (`data-cast`, `data-go`) so the existing overlay click handler and key handler are untouched.

**`index.html`** — `#shotChip` element; shortened the keys line; cache-busts `game.css?v=25`, `golf3d.js?v=18`, `game.js?v=37`.

**`game.css`** — one appended “Studio pass” block (plus a narrow-screen section) that overrides by source order: glass plinths, chip-style HUD meta, the power bar turned into a single bottom control bar (readout chip + slider), sectioned glass rail panels, title screen hero/sections/records, clamped lore lines, 3-up golfer cards.

## 3. Verification

- `node --check` clean on both edited scripts.
- Live local playthrough (`http://127.0.0.1:8791/games/lattice-golf/`): menu → Pine Haven 9 → shot → chip, `errs: []` at every step.
- Shot feedback observed end to end: `220 yd · FAIRWAY / Driver 75% · roll 11 yd · 464 yd to pin`, and the rail log line agreeing (`Driver 75% → 220.3 yd carry + 11 yd roll · fairway → fairway`).
- Records path exercised with a seeded save: hero read `Pine Haven Championship · +5 (41 over 9)` / `Best Coral Lattice Links · +2 (38)` / `Lifetime 7 rounds · 36 holes walked`; course chips read `best +5 · 41 strokes · 1 round`, `best +2 · 38 strokes · 1 round`, `no card saved yet` for unplayed courses.
- Before/after captures: `lg-hole1.jpg` (ink course) → `lg-hole2.jpg` (turf + water + trees), `lg-menu2.jpg` → `lg-menu3.jpg` (wall → hero + sections).

## 4. Open items (not done, on purpose)

- Scorecard sheet and the live-match rail keep their previous styling; they were legible and the pass was scoped to the round loop and the title screen.
- The 2D fallback path (`use3d === false`) keeps its original palette: the same albedo reasoning applies, but it is not the shipped path.
- `--bar` carry bars are proportional to the longest club, not to the current club's *usable* range from the ball's lie; the caddie panel remains the authority on that.
- No automated harness exists for this game (unlike `tools/haven_rally_qa.js`); verification was browser-driven.

## 5. Landing

Committed locally only. Nothing pushed — per standing rule, this waits on an explicit ask.
