# Lattice Crypt — studio brief (phases 0–8)

Entry: `index.html` → `radio.js`, `arcade-ledger.js`, `campaign.js`, `studio.js`, `game.js` IIFE.

## Phase 0 — Audit
- Loop: rAF draw + locked `1/60` sim (max 3 catch-up steps). Overlays: `menu | sheet | pause | null`.
- No `setInterval` in the sim. Window listeners persist by design (one set).
- Entities: players, foes (pooled), shots (pooled), items, gens, pads, FX, particles, floaters.
- Systems: spawn, swept collision, spatial foe grid, scoring, waves, upgrades, vials, ledger.

## Phase 1 — Architecture
- `cleanupGameState()` frees shots + foes, then `CryptStudio.cleanup()`.
- `isActive` on shots/foes; pool `free` is a no-op if already inactive.
- EventBus: `onFire`, `onPickup`, `onEnemyHit`, `onBossHit`, `onEnemyDeath`, `onKill`, `onBossDeath`, `onBossSpawn`, `onBossPhase`, `onPlayerHit`, `onPlayerDeath`, `onWaveStart`, `onWaveComplete`, `onHeal`, `onDash`.
- Pools: shots 320, particles 420, floaters 96, foes 320. Drain keeps the free list.
- 100-restart smoke: shot `born` stays flat.

## Phase 2 — Performance
- `{ alpha: false }` world canvas. Integer `drawImage` positions. No `shadowBlur`.
- Layered: world `#crypt`, VFX `#cryptFx`, HUD CSS.
- F3 FPS: fps, ms, entities, particles, restarts, shots, draws, MB.
- LOD when FPS < 50 or < 55 for 2s: DPR 1, trail skip, particle cap, off-screen AI.
- Survival cap 300. Spatial query for shots/melee. Camera tile cull.
- Atlases already packed. Heap warn at 150MB (Chromium `performance.memory`).

## Phase 3 — Juice
- `feel()` layers SFX + burst/shake/hit-stop/flash per event.
- Knockback on hit. Squash/stretch while `hurt`. Damage floaters. Player-hit flash.
- Hit-stop scaled (hit vs boss). Shake ≤ 12px.
- Buttons: hover/active scale. Overlay/pause opacity fades.

## Phase 4 — UI
- Survival HUD: wave (pulse), score (count-up), XP, clock, ghost HP, arms, pills.
- Full-width-ish boss bar (name + fill, phase II).
- Coach 10s. Menu control hint. Death recap hook.
- Loading boot copy. Pause/menu `role=dialog`. Buttons ≥ 44px.

## Phase 5 — Audio
- Web Audio SFX, ±5% pitch. Autoplay resume on first gesture.
- Independent SFX / bed sliders + mute + synth toggle, persisted.
- 3-layer bed (drone / pulse / tension). Boss ducks bed. Low HP heartbeat.
- Radio remains a separate dock.

## Phase 6 — Content
- Seeded Survival 256×224 + plazas, highways, pad links, 108 items.
- 8+ jobs: wraith, brute, imp, hurler, shade, burst, spawnling, mend (+ thief, drain).
- 8 named bosses, phase II at 50% HP (speed + fire rate).
- 13 arms. 23 Survival upgrade cards. Campaign 24 authored floors.

## Phase 7 — QA
- Node smoke: syntax, 100 restarts, foe pool recycle, string matrix (pause, events, coach, volumes, fx layer, tab-pause).
- Blur clears keys. `visibilitychange` pauses. Canvas follows resize. Color filters. Score cap 999999999.
- Playwright visual lab not in this repo (no browser CI here).

## Phase 8 — Polish
- Reduced motion. Colorblind modes. Volume sliders. Screen-reader dialogs.
- Auto particle cull. Entity cap 300. Pitch variation on SFX.

## Finish pass (brief closed)
- 4 layers: `#cryptBg` tiles (chunk cache) · `#crypt` entities · `#cryptFx` juice · CSS HUD.
- Pre-scaled `blit()` cache — `drawImage` of dest-size canvases, not runtime scale.
- P1 remappable keys on the menu (click, then press).
- Spatial SFX via `StereoPannerNode` from world X.
- 4th music stem (drum pulse). Survival `chunkSize: 16` tile cache key.
- Sprites stay PNG (transparency). No Howler (Web Audio covers routing).
- QA: `tools/crypt_studio_qa.js` (smoke + layer/event/remap/spatial matrix). Playwright not required for this canvas cabinet.

## Release readiness
Live: https://chatagent.ca/games/lattice-crypt/  
Cache: `game.js?v=29` `studio.js?v=6` `game.css?v=13`

**Confidence: 94/100.** 60 FPS @ 300 foes is engineered (grid + LOD + 60Hz + tile cache), not timed on a 2020 laptop in this pass.
