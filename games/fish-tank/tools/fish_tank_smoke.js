#!/usr/bin/env node
/* Fish Tank smoke test: syntax, structure, and the rules the game promises.
   Run: node tools/fish_tank_smoke.js   (from games/fish-tank) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const here = __dirname;
const root = path.join(here, "..");
const jsPath = path.join(root, "tank.js");
const htmlPath = path.join(root, "index.html");
const cssPath = path.join(root, "tank.css");

const js = fs.readFileSync(jsPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

let fails = 0;
function must(label, cond) {
  if (!cond) {
    fails += 1;
    console.log("FAIL  " + label);
  } else {
    console.log("ok    " + label);
  }
}

/* 1. the file has to parse (compile only: the module needs a DOM to run) */
try {
  new vm.Script(js, { filename: "tank.js" });
  must("tank.js parses", true);
} catch (e) {
  must("tank.js parses: " + e.message, false);
}

/* 2. cache-busted asset wiring */
const jsV = /tank\.js\?v=(\d+)/.exec(html);
const cssV = /tank\.css\?v=(\d+)/.exec(html);
must("index.html loads tank.js with a version", !!jsV);
must("index.html loads tank.css with a version", !!cssV);
must("version is a number", jsV && Number(jsV[1]) >= 21);

/* 3. the rules the title advertises must still be in the code */
must("tank holds 50 fish", js.indexOf("const FISH_CAP = 50;") >= 0);
must("hunters have their own cap of 10", js.indexOf("const HUNTER_CAP = 10;") >= 0 && js.indexOf("state.predators.length < HUNTER_CAP") >= 0);
must("a bite starts at 25%", js.indexOf("clamp(0.25 + (1 - hpRatio) * 0.4 + (1 - fedRatio) * 0.3, 0.25, 0.85)") >= 0);
must("hunter takes the weakest", js.indexOf("function weakestPrey(now)") >= 0);
must("two misses kill the hunter", js.indexOf("(p.fails || 0) < 2") >= 0);
must("a boss enters after an hour of quiet", js.indexOf("now - state.clearSince >= HOUR") >= 0);
must("a bite leaves a baby hunter", js.indexOf("state.predators.push(makePredator(p.kind, false))") >= 0);
must("hunger kills in about a day and a half", js.indexOf("const STARVE = 36 * HOUR;") >= 0);
must("save stays in this browser", js.indexOf('const SAVE = "lygo_fish_tank_v1";') >= 0);

/* 4. phase 2: the sim surface */
must("motion profiles for every species", js.indexOf("const MOTION = {") >= 0 && (js.match(/glide: 0\./g) || []).length >= 10);
must("decor the fish steer around", js.indexOf("const DECOR = {") >= 0 && js.indexOf("function decorSteer(f, out)") >= 0);
must("decor has real extents and a kind", js.indexOf("rx: 0.") >= 0 && js.indexOf("kind: \"weed\"") >= 0 && js.indexOf("if (d.kind === \"weed\") return;") >= 0);
must("comfort bands per species", js.indexOf("const TEMP_BAND = {") >= 0 && js.indexOf("function comfort(f)") >= 0);
must("boids: separation, alignment, cohesion", js.indexOf("function shoalSteer(f, out)") >= 0 && js.indexOf("const coh = unitDir(f, cx, cy);") >= 0);
must("big fish shove small ones", js.indexOf("if (sizeF > 1.12 && d < sepR * 1.8)") >= 0);
must("walls are anticipated, not hit", js.indexOf("function wallSteer(f, out)") >= 0 && js.indexOf("const px = f.x + f.vx * 0.7") >= 0);
must("depth bands are a force", js.indexOf("function bandSteer(f, out, override)") >= 0);
must("heading is rate limited", js.indexOf("const rate = m.turn * (1 + tr.bold * 0.35)") >= 0);
must("tail beat tracks effort", js.indexOf("f.phase = (f.phase || 0) + dt * beat;") >= 0);
must("banking and pitch on the body", js.indexOf("f.bank = (f.bank || 0) +") >= 0 && js.indexOf("f.pitch = (f.pitch || 0) +") >= 0);
must("speed is accelerated, not snapped", js.indexOf("function applyVelocity(f, dt, wx, wy, cap, glide)") >= 0 && js.indexOf("f.vx += clamp(vx - f.vx, -step, step);") >= 0);
must("fish tire while bolting", js.indexOf("f.stamina = clamp((f.stamina == null ? 1 : f.stamina)") >= 0);
must("fish glide and rest", js.indexOf('f.state === "glide"') >= 0 && js.indexOf('f.state === "rest"') >= 0);
must("grazers work the gravel", js.indexOf("state.algae = clamp((state.algae || 0) - 0.05, 0, 100)") >= 0);
must("night puts them down to rest", js.indexOf("const restT = (night ? 0.36 : 0.05)") >= 0);
must("temperature drives gasping", js.indexOf('f.state = "gasp"') >= 0 && js.indexOf("if (comfort(f) > 2.5)") >= 0);
must("a hand startles the fish under it", js.indexOf("if (hand && hand.dip > 0.2 && f.y < 0.38)") >= 0);
must("the hunter visibly stalks its victim", js.indexOf('log(p.name + " turns toward " + victim.name') >= 0 && js.indexOf("p.pending = true;") >= 0);
must("the shoal shelters in the weeds", js.indexOf('f.state = "shelter"') >= 0 && js.indexOf("const s = nearestShelter(f.x, f.y, 1.4);") >= 0);
must("a bite can miss at the last moment", js.indexOf('reason === "contact"') >= 0 && js.indexOf('state.dodge = (state.dodge || 0) + 1;') >= 0);
must("tank hour grows each species on its own clock", js.indexOf("const LIFE_CYCLE = {") >= 0 && js.indexOf("addGrowthHours(f, fed ? 2 : 1)") >= 0);
must("JAWS is the shark elder and battles once an hour", js.indexOf('p.name = "JAWS"') >= 0 && js.indexOf("function predatorBattle(a, b)") >= 0 && js.indexOf("One predator battle this tank hour.") >= 0);
must("tank sounds can be turned off", js.indexOf('getElementById("optSound")') >= 0 && html.indexOf('id="optSound"') >= 0 && js.indexOf("function syncLoops()") >= 0);
["shark_baby.png", "shark_adult.png", "shark_elder.png", "shark_elder_stalk.png"].forEach(function (name) {
  const p = path.join(root, "assets", "fish", name);
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  must(name + " is a real sprite", !!(st && st.size > 8000));
});
["pump.wav", "death.wav", "chase.wav", "omen.wav", "bite.wav", "battle.wav", "feed.wav"].forEach(function (name) {
  const p = path.join(root, "assets", "sfx", name);
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  must(name + " is a sound", !!(st && st.size > 4000));
});
must("pairs court in good water", js.indexOf("function breedCheck(now)") >= 0 && js.indexOf('grown === "adult" || grown === "elder"') >= 0);
must("eggs hatch into fry with parents", js.indexOf("function tickEggs(now)") >= 0 && js.indexOf("fry.parents = (e.parents || []).slice();") >= 0);
must("fry inherit traits with a mutation", js.indexOf("traits: makeTraits(traits(a), traits(b))") >= 0);
must("clutch size is capped", js.indexOf("const EGG_CAP = 6;") >= 0 && js.indexOf("const n = Math.min(room, Math.random() < 0.35 ? 3 : 2);") >= 0);
must("foul water kills eggs", js.indexOf("never hatch. The water is foul.") >= 0);
must("firsts pay points", js.indexOf("const GOALS = [") >= 0 && js.indexOf("function checkGoals(now)") >= 0);
must("traits are named in the rail", js.indexOf("TRAIT_WORDS") >= 0 && html.indexOf('id="goals"') >= 0);
must("water trouble is reported", html.indexOf('id="waterNote"') >= 0 && js.indexOf("gulp at the surface") >= 0);
must("LYGO Claw and the crab walk the sand", js.indexOf('id: "claw"') >= 0 && js.indexOf('id: "crab"') >= 0 && js.indexOf("walk: true") >= 0 && js.indexOf("under the rockwork") >= 0);
must("Volt the eel can spawn as a boss", js.indexOf('eel: { id: "eel"') >= 0 && js.indexOf('"pike", "cinder", "gar", "eel"') >= 0 && js.indexOf("function shockFish(p)") >= 0);
must("one octopus inks when chased", js.indexOf('id: "octo"') >= 0 && js.indexOf("chance - 0.10") >= 0 && js.indexOf("function releaseInk(f, now)") >= 0 && js.indexOf("One octopus already keeps this glass.") >= 0);
["claw_l.png", "claw_r.png", "claw_l_walk.png", "claw_r_walk.png", "crab_l.png", "crab_r.png", "crab_l_walk.png", "crab_r_walk.png", "eel_adult.png", "eel_baby.png", "eel_adult_zap.png", "eel_adult_zap2.png", "eel_baby_zap.png", "octo_r.png", "octo_r_swim.png", "ink_1.png", "ink_2.png", "ink_3.png"].forEach(function (name) {
  const p = path.join(root, "assets", "fish", name);
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  must(name + " is a real sprite", !!(st && st.size > 8000));
});

/* 5. ambient water, and the reduced-motion contract */
must("light shafts", js.indexOf('ctx.globalCompositeOperation = "lighter"') >= 0);
must("motes drift with depth", js.indexOf("function drawMotes(w, h, front)") >= 0);
must("ripples", js.indexOf("function addRipple(x, y)") >= 0);
must("glass vignette", js.indexOf("function drawGlass(w, h)") >= 0);
must("ground shadow under each fish", js.indexOf("ctx.ellipse(x, h * 0.9, bw * 0.32, bh * 0.09, 0, 0, Math.PI * 2);") >= 0);
must("depth scales and fades the fish", js.indexOf("ctx.globalAlpha = 0.38 + z * 0.62;") >= 0 && js.indexOf("function apart(a, b)") >= 0);
must("reduced motion still respected", js.indexOf("state.opts.motion !== false") >= 0 && js.indexOf("state.opts.motion === false") >= 0);
must("lantern glows at night only", js.indexOf('motionOf(f).glow === true && phase() !== "day"') >= 0);

/* 6. the read-only view is read-only */
const api = js.slice(js.indexOf("window.FishTank = {"));
must("window.FishTank exists", api.length > 0);
must("the api is read-only", api.indexOf(".push(") < 0 && api.indexOf("state.fish =") < 0);

/* 7. html/css surface */
must("board shows eggs and lineage", html.indexOf('id="mEggs"') >= 0 && html.indexOf('id="mGen"') >= 0);
must("instructions mention generations", html.indexOf("leave eggs on the rockwork") >= 0);
must("css styles the goal list", css.indexOf(".goal.done") >= 0 && css.indexOf(".fishline .gen") >= 0);

console.log("");
if (fails) {
  console.log(fails + " smoke check(s) failed");
  process.exit(1);
}
console.log("all smoke checks passed");
