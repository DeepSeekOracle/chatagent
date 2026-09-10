# Lattice Crypt — Phase 0 audit (pipeline pass 1)

Entry: `index.html` → `radio.js`, `arcade-ledger.js`, `campaign.js`, `studio.js`, `game.js` IIFE.

## Architecture
- Single 2500-line IIFE. Overlay modes: `menu | sheet | null`. One `requestAnimationFrame` loop.
- No `setInterval`/`setTimeout` in the sim. Listeners are window-level and persist (by design).
- **Was:** `newRun` allocated shots/fx arrays without recycling; menu left live arrays until next run.
- **Now:** `cleanupGameState()` + `CryptStudio` pools, EventBus, juice, synth SFX.

## Performance
- Tiles already camera-culled. Foes/items culled. 280-cap Survival.
- **Was:** `getContext("2d")` with alpha; shot objects `new` every fire.
- **Now:** `{ alpha: false }`, shot pool, particle cap, F3 FPS meter, offscreen foe skip already in draw.

## Game feel
- **Was:** beep() one oscillator, no shake/stop/numbers.
- **Now:** hit-stop, shake ≤12px, particle burst, damage floaters, player-hit flash. Aura ticks skip juice (`dmg < 1`).

## UI
- Survival studio HUD exists. Ghost HP bar + color shift added. Button hover/active.

## Audio
- Radio is separate. Combat SFX now Web Audio via `CryptStudio.sfx` with ±5% pitch. **M** mutes. Autoplay resumes on first gesture.

## QA risks remaining
- No Playwright yet. No 100-restart memory lab in CI.
- Layered canvases not split (one canvas; juice drawn on top).
- 8 authored jobs / 9 arms / 19 survive cards — not 12 weapons.
- Foe archetypes mapped onto existing atlas (no new exploder/splitter sprites this pass).

## Controls added
F3 FPS · M mute SFX
