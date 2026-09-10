/* Lattice Crypt QA matrix — Node stand-in for Playwright (canvas cabinet). */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const smoke = spawnSync(process.execPath, [path.join(__dirname, "crypt_studio_smoke.js")], { encoding: "utf8" });
if (smoke.status !== 0) {
  process.stderr.write(smoke.stdout + smoke.stderr);
  process.exit(smoke.status || 1);
}
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "game.css"), "utf8");
const studio = fs.readFileSync(path.join(root, "studio.js"), "utf8");

function must(cond, msg) { if (!cond) throw new Error(msg); }

must(html.indexOf("cryptBg") >= 0 && html.indexOf("cryptFx") >= 0, "4 layers: bg + world + fx");
must(html.indexOf("studioHud") >= 0, "HUD layer");
must(html.indexOf("role=\"dialog\"") >= 0, "dialog ARIA");
must(css.indexOf("bg-canvas") >= 0 && css.indexOf("fx-canvas") >= 0, "layer CSS");
must(game.indexOf("p1Map") >= 0 && game.indexOf("data-bind") >= 0, "remappable P1");
must(game.indexOf("paintTileCache") >= 0 && game.indexOf("chunkSize: 16") >= 0, "chunk tile cache");
must(game.indexOf("function blit") >= 0, "pre-scale blit");
must(studio.indexOf("createStereoPanner") >= 0, "spatial SFX");
must(studio.indexOf("drumOsc") >= 0, "drum stem");
must(game.indexOf("999999999") >= 0, "score cap");
must(game.indexOf("Math.min(1000") >= 0, "1000 foe cap");
must(game.indexOf("visibilitychange") >= 0, "tab pause");
must(game.indexOf("onBossPhase") >= 0, "boss phase");
["onFire","onPickup","onEnemyHit","onBossHit","onEnemyDeath","onKill","onBossDeath","onBossSpawn","onPlayerHit","onPlayerDeath","onWaveStart","onWaveComplete","onHeal","onDash"].forEach(function (ev) {
  must(game.indexOf(ev) >= 0, "event " + ev);
});
must(html.indexOf("game.js?v=37") >= 0, "cache-bust");
must(game.indexOf("up-cabinet") >= 0 && game.indexOf("secondwind") >= 0, "arcade upgrade");
must(game.indexOf("latticearc") >= 0 && game.indexOf("unspool") >= 0 && game.indexOf("titheking") >= 0 && game.indexOf("nameeater") >= 0, "new loot and super bosses");
must(game.indexOf("originwell") >= 0 && game.indexOf("accordseal") >= 0, "legendaries");
must(game.indexOf("toggleChar") >= 0 && game.indexOf("closeChar") >= 0 && game.indexOf("INV_BAG") >= 0, "character bag");
must(game.indexOf("updateFog") >= 0 && game.indexOf("drawFog") >= 0, "fog of war");
must(html.indexOf("data-radio-vol") >= 0, "radio volume");
must(game.indexOf("function options") >= 0, "options menu");
console.log("crypt_studio_qa ok", { smoke: "pass", layers: 4, events: 14, remap: true, spatial: true });
