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
must(game.indexOf("Math.min(380") >= 0 && game.indexOf("function surviveCap") >= 0, "survive cap ramp");
must(game.indexOf("visibilitychange") >= 0, "tab pause");
must(game.indexOf("onBossPhase") >= 0, "boss phase");
["onFire","onPickup","onEnemyHit","onBossHit","onEnemyDeath","onKill","onBossDeath","onBossSpawn","onPlayerHit","onPlayerDeath","onWaveStart","onWaveComplete","onHeal","onDash"].forEach(function (ev) {
  must(game.indexOf(ev) >= 0, "event " + ev);
});
must(html.indexOf("game.js?v=49") >= 0, "cache-bust");
must(game.indexOf("kind: \"bond\"") >= 0 && game.indexOf("packhide") >= 0 && game.indexOf("callpack") >= 0, "bond pet cards");
must(game.indexOf("function pollSelectChar") >= 0 && game.indexOf("buttons[8]") >= 0, "pad select opens sheet");
must(game.indexOf("function spawnPet") >= 0 && game.indexOf("Ashmane") >= 0 && game.indexOf("Glassbarb") >= 0, "mythic pets");
must(game.indexOf("function aiInput") >= 0 && game.indexOf("bondPickHtml") >= 0, "AI companion pick");
must(game.indexOf("Brotato") < 0 && html.indexOf("Brotato") < 0, "haven-original copy");
must(game.indexOf("strokeRect(Math.round(dx)") < 0, "no foe square frame");
must(game.indexOf("Start small. The lattice grows with you.") >= 0, "survive start dump");
must(game.indexOf("0.48 + 0.035") >= 0 && game.indexOf("0.28 * (w - 1)") >= 0, "survive dmg+hp curve");
must(game.indexOf("minSep") >= 0 && game.indexOf("cast-art") >= 0, "fog spawn + roster art");
must(game.indexOf("hp: 200") >= 0 && game.indexOf("cistern") >= 0 && game.indexOf("originpulse") >= 0, "200hp+well cards");
must(game.indexOf("stitch") >= 0 && game.indexOf("echoer") >= 0 && game.indexOf("veilkin") >= 0 && game.indexOf("rollFoeMut") >= 0, "new foes+muts");
must(game.indexOf("hpScale") >= 0 && game.indexOf("hallMark") >= 0, "scale+hall");
must(game.indexOf("up-cabinet") >= 0 && game.indexOf("secondwind") >= 0, "arcade upgrade");
must(game.indexOf("latticearc") >= 0 && game.indexOf("unspool") >= 0 && game.indexOf("titheking") >= 0 && game.indexOf("nameeater") >= 0, "new loot and super bosses");
must(game.indexOf("originwell") >= 0 && game.indexOf("accordseal") >= 0, "legendaries");
must(game.indexOf("toggleChar") >= 0 && game.indexOf("closeChar") >= 0 && game.indexOf("INV_BAG") >= 0, "character bag");
must(game.indexOf("updateFog") >= 0 && game.indexOf("drawFog") >= 0, "fog of war");
must(html.indexOf("data-radio-vol") >= 0, "radio volume");
must(game.indexOf("function options") >= 0, "options menu");
console.log("crypt_studio_qa ok", { smoke: "pass", layers: 4, events: 14, remap: true, spatial: true });
