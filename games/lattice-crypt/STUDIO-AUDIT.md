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
F3 FPS · M mute SFX · P pause · F11 fullscreen

## Pass 2 debug (launch)
- 13 arms (Seek/Chain/Barrage/Nova) with FX aliases so missing atlas cells do not blank bolts.
- Burst / spawnling / mend jobs reuse brute/wraith/shade frames.
- Pause layer hidden on new run, menu, and cleanup. Help will not stack on pause. Credit/fire blocked while paused.
- Mute restores synth bed. Menu ducks music.
- 40× pool restart smoke + string checks for new kinds.

## Pass 3 debug (official launch)
- Pooled chain bolts reset `_chained` so jumps work after recycle.
- Chain child spawns offset + grace so it does not immediately re-hit the same foe.
- `loadFloor` frees the shot pool (was leaking live counts every floor).
- Key-repeat no longer toggles P / M / F3 / F11 / L / Esc or spams credit.
- Deuteranopia filter is CSS-only (no missing `#cb-deut` SVG).
- Reduced motion ducks the synth bed. Color filter "default" clears `data-cb`.
- Juice frozen while paused.

## Pass 4 — studio quality ship
- Locked sim at `1/60` (max 3 catch-up steps). Camera/draw still rAF.
- Survival cap 300. Spatial foe grid. Off-screen AI LOD. DPR/trails/FX cull when FPS < 50.
- Cleanup recycles pools (100 restarts, shot `born` does not grow).
- `feel()` = SFX + burst/shake/hit-stop on hit, kill, hurt, pick, vial, pad, wave, boss, upgrade, credit, pause, exit.
- 3-layer synth bed (drone / pulse / tension) from wave, HP, horde.
- Coach bar 10s. Menu control hint. Death recap hook. Overlay/pause fades.
- Survival pads between plazas, extra plazas, 108 item scatter.

Confidence after studio ship: **88/100**. No Playwright visual lab; 60 FPS on a 2020 laptop is engineered (grid + LOD + 60Hz) not measured on that hardware in this pass.
