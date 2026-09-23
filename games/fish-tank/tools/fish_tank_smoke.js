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
must("hunter takes the weakest, alone and soft over weak but guarded", js.indexOf("function weakestPrey(now, exact)") >= 0 &&
  js.indexOf("function preyScore(f, now)") >= 0 && js.indexOf("s += (1 - schoolSafety(f)) * 0.5;") >= 0);
must("two misses kill the hunter", js.indexOf("(p.fails || 0) < 2") >= 0);
must("a boss enters after an hour of quiet", js.indexOf("now - state.clearSince >= quietNeed()") >= 0 && js.indexOf("HOUR / 2") >= 0);
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
must("tank sounds can be turned off", js.indexOf('getElementById("optSoundAmbient")') >= 0 && html.indexOf('id="optSoundTalk"') >= 0 && js.indexOf("function syncLoops()") >= 0);
["mira.jpg", "sancora.jpg", "lyra.jpg", "reed.jpg", "calder.jpg", "kai.jpg", "mara.png", "ellis_talk.png", "ren_talk.png", "june_talk.png", "mateo_talk.png", "nia_talk.png"].forEach(function (name) {
  const p = path.join(root, "assets", "keepers", name);
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  must(name + " is a real portrait", !!(st && st.size > 4000));
});
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
must("pairs court in good water", js.indexOf("function breedCheck(now)") >= 0 &&
  js.indexOf("function breedReady(stage, b)") >= 0 && js.indexOf("if ((state.quality || 0) < b.min) continue;") >= 0 &&
  js.indexOf("if (Math.random() > b.roll) { state._breedTry[id] = now; continue; }") >= 0 &&
  js.indexOf("const BREED_RETRY = 4 * 60000;") >= 0);
must("eggs hatch into fry with parents", js.indexOf("function tickEggs(now)") >= 0 &&
  js.indexOf("fry.parents = (e.parents || []).filter(isDna).slice(0, 2);") >= 0 &&
  js.indexOf("fry.parentNames = (e.parentNames || []).slice(0, 2);") >= 0);
must("fry inherit traits with a mutation", js.indexOf("traits: makeTraits(traits(a), traits(b))") >= 0);
must("clutch size is capped", js.indexOf("const EGG_CAP = 6;") >= 0 &&
  js.indexOf("const clutch = (breedOf(a.species) || { eggs: [2, 3] }).eggs;") >= 0 &&
  js.indexOf("const n = Math.min(room, clutch[0] + Math.round(Math.random() * span));") >= 0);
must("foul water kills eggs", js.indexOf("never hatch. The water is foul.") >= 0);
must("a life that goes on the board carries its whole identity", js.indexOf('name: state.owner || "Keeper",') >= 0 &&
  js.indexOf("fish: row.name,") >= 0 && js.indexOf("dna: row.dna,") >= 0 && js.indexOf("gen: row.gen,") >= 0 &&
  js.indexOf("hours: row.score,") >= 0);
must("the local cemetery row names its keeper too", js.indexOf('keeper: state.owner || "Keeper"') >= 0);
must("only a real life is inscribed, never a fish that never lived an hour", js.indexOf("ArcadeLedger.fish && row.score >= 1") >= 0 &&
  js.indexOf("ArcadeLedger.fish && leadHours >= 1") >= 0);
must("the tank reads the public hall back", js.indexOf("const HALL_URL = ") >= 0 && js.indexOf("function fetchHall(force)") >= 0 &&
  js.indexOf("state.hallPublic = {") >= 0 && js.indexOf('["public hall", state.hallPublic') >= 0);
must("firsts pay points", js.indexOf("const GOALS = [") >= 0 && js.indexOf("function checkGoals(now)") >= 0);
must("traits are named in the rail", js.indexOf("TRAIT_WORDS") >= 0 && html.indexOf('id="goals"') >= 0);
must("water trouble is reported", html.indexOf('id="waterNote"') >= 0 && js.indexOf("gulp at the surface") >= 0);
must("LYGO Claw and the crab walk the sand", js.indexOf('id: "claw"') >= 0 && js.indexOf('id: "crab"') >= 0 && js.indexOf("walk: true") >= 0 && js.indexOf("under the rockwork") >= 0);
must("Volt the eel can spawn as a boss", js.indexOf('eel: { id: "eel"') >= 0 && js.indexOf('"pike", "cinder", "gar", "eel"') >= 0 && js.indexOf("function shockFish(p)") >= 0);
must("one octopus inks when chased", js.indexOf('id: "octo"') >= 0 && js.indexOf("chance -= 0.10") >= 0 &&
  js.indexOf("function releaseInk(f, now)") >= 0 && js.indexOf("One octopus already keeps this glass.") >= 0);
["claw_l.png", "claw_r.png", "claw_l_walk.png", "claw_r_walk.png", "crab_l.png", "crab_r.png", "crab_l_walk.png", "crab_r_walk.png", "eel_adult.png", "eel_baby.png", "eel_adult_zap.png", "eel_adult_zap2.png", "eel_baby_zap.png", "octo_r.png", "octo_r_swim.png", "ink_1.png", "ink_2.png", "ink_3.png"].forEach(function (name) {
  const p = path.join(root, "assets", "fish", name);
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  must(name + " is a real sprite", !!(st && st.size > 8000));
});

/* 4b. phase 3: the water chemistry, the brains, and the announcer */
must("the water carries oxygen and waste", js.indexOf("state.oxygen == null") >= 0 && js.indexOf("const OX = {") >= 0 && js.indexOf("const WASTE = {") >= 0);
must("plants make oxygen and fish spend it", js.indexOf("const made = (OX.plant[themeOf(state.theme).id]") >= 0 && js.indexOf("const spent = fishN * OX.fish") >= 0);
must("warm water holds less oxygen", js.indexOf("const warm = clamp(1.22 - ((state.temp || 25) - 20) * 0.032") >= 0);
must("algae blooms with momentum and breathes at night", js.indexOf("const bloom = 0.5 + algae0 * 1.05;") >= 0 && js.indexOf("(night ? (state.algae || 0) * OX.algaeNight") >= 0);
must("thin water sends fish up for air", js.indexOf("state.oxygen == null ? 100 : state.oxygen) < OX.gasp") >= 0 && js.indexOf("function oxygenNote()") >= 0);
must("waste comes off the fish and the meals", js.indexOf("WASTE.meal") >= 0 && js.indexOf("function wasteNote()") >= 0);
must("the tank is warmer at the top than the sand", js.indexOf("function tempAt(y)") >= 0 && js.indexOf("function stratNow()") >= 0 && js.indexOf("const t = tempAt(f ? f.y : null);") >= 0);
must("crowding is a slope, not a cliff", js.indexOf("function crowdLoad()") >= 0 &&
  js.indexOf("function loadRatio()") >= 0 && js.indexOf("if (load > 0.85) delta -=") >= 0);
must("dawn and dusk are real hours", js.indexOf("function rhythm()") >= 0 && js.indexOf('hour === "dawn"') >= 0 && js.indexOf('hour === "dusk"') >= 0);
must("a water change adds air", js.indexOf("state.oxygen = clamp((state.oxygen == null ? 88 : state.oxygen) + 18") >= 0);
must("the water panel is on the rail", html.indexOf('id="waterPanel"') >= 0 && js.indexOf('getElementById("waterPanel")') >= 0 && js.indexOf("wgrid") >= 0);
must("the board shows oxygen", html.indexOf('id="mOxy"') >= 0);
must("fish keep bonds with each other", js.indexOf("function bond(f, o, delta)") >= 0 && js.indexOf("bonds") >= 0 && js.indexOf("function bondPick(f, want, min)") >= 0);
must("the school has a leader and slots", js.indexOf("function anchorOf(species)") >= 0 && js.indexOf("function slotFor(f, anchor)") >= 0 && js.indexOf("if (isAnchor(f) && state.fish.some(") >= 0);
must("a leader waits for its school", js.indexOf("isAnchor(f) && schoolSpread(f) > 0.34") >= 0);
must("a shoved fish remembers who did it", js.indexOf("mm.shovedBy = o.id") >= 0 && js.indexOf("f.mem.shovedBy === o.id") >= 0);
must("fish hold territory, loners against their own kind", js.indexOf("function homeOf(f)") >= 0 && js.indexOf("function territorySteer(f, out)") >= 0);
must("a chased fish remembers where it hid", js.indexOf("function hidingSpot(f)") >= 0 && js.indexOf("mm.hidSpot = { x: s.x + 0.05, y: s.y }") >= 0 && js.indexOf("function wary(f, now)") >= 0);
must("fish give the cleaners room and follow the stirrers", js.indexOf("function crewSteer(f, out)") >= 0 && js.indexOf("c.role === \"cory\" || c.role === \"turtle\"") >= 0);
must("a starving fish will risk it for a flake", js.indexOf("const desperate = !!(starving && flake0") >= 0);
must("the keeper reads real events", js.indexOf("const LOG_EVENTS = [") >= 0 && js.indexOf("function readEvent(text)") >= 0 && js.indexOf("function announce(key, vars)") >= 0);
must("every keeper has their own voice", js.indexOf("const KEEPER_SAY = {") >= 0 && js.indexOf("mara: {") >= 0 && js.indexOf("mateo: {") >= 0 && js.indexOf('announce("oxygen"') >= 0);
must("the keeper ducks the radio to talk", js.indexOf("function duckRadio(on)") >= 0 && js.indexOf("R.setVol(Math.max(0, radioWas * 0.35))") >= 0);
must("a meal makes a sound", js.indexOf('playSfx("nibble");') >= 0);
must("the card says how it lives with others", html.indexOf('id="charSocial"') >= 0 && js.indexOf("function socialLine(f)") >= 0);
must("the keeper box shows what it watches", html.indexOf('id="keeperTag"') >= 0 && js.indexOf('document.getElementById("keeperTag")') >= 0);

/* 4c. the cast: twelve keepers, six of them still portraits, all of them talking */
must("twelve keepers on the cast", js.indexOf("const CAST_ORDER = [") >= 0 && (js.match(/cast: "lattice"/g) || []).length === 6);
must("the lattice six are wired by name", ["mira", "sancora", "lyra", "reed", "calder", "kai"].every(function (id) {
  return js.indexOf('id: "' + id + '"') >= 0;
}));
must("Calder Voss is Justin, the steward, in this glass", js.indexOf('name: "Justin", tag: "Steward"') >= 0);
must("static art still gets the bubble and the tag", js.indexOf("function keeperArt(id, beat)") >= 0 && js.indexOf("function keeperCardArt(id)") >= 0);
must("a keeper without a talking frame still leans in", js.indexOf('img.classList.toggle("talking"') >= 0 && css.indexOf(".keeper-box img.talking") >= 0);
must("every keeper has idle chatter and topic lines", js.indexOf("idle: [") >= 0 && js.indexOf("function keeperChatter(now)") >= 0);
must("the twelve keepers all have voices", (js.match(/rate: 0\./g) || []).length >= 12 && !/[\\s]KEEPERS\[menuKeeper\] \|\| KEEPERS\.mara/.test(js));
must("the keeper menu draws the whole cast in order", js.indexOf("CAST_ORDER.map(function (id)") >= 0);
must("every keeper opens the tank in their own words", (js.match(/greet: "/g) || []).length === 12 && js.indexOf(".greet || ") >= 0);

/* 4d. two dials for sound: the tank mix, and the water bed on its own */
must("the ambient water has its own volume dial", html.indexOf('id="optAmbientVol"') >= 0 && html.indexOf('id="optAmbientVal"') >= 0);
must("it sits beside its switch and apart from the tank sound dial",
  html.indexOf('id="optAmbientVol"') > html.indexOf('id="optSoundAmbient"') && html.indexOf('id="optAmbientVol"') < html.indexOf('id="optSoundVol"'));
must("the dial is stored on the tank, not on the radio", js.indexOf("soundAmbientVol: 1") >= 0 && js.indexOf("o.soundAmbientVol = Math.max(0, Math.min(100") >= 0);
must("it scales both water loops and nothing else",
  js.indexOf("tuneLoop(SFX.pump, ambient, sfxVol() * 0.42 * ambientVol())") >= 0 &&
  js.indexOf("tuneLoop(SFX.omen, jaws, sfxVol() * 0.4 * ambientVol())") >= 0);
must("the ambient dial reads back into the panel", js.indexOf('document.getElementById("optAmbientVal").textContent = Math.round(o.soundAmbientVol * 100)') >= 0);

/* 4e. the fish card: a placard on the left of the glass */
must("the fish card is in the stage, on the left of the glass",
  html.indexOf('id="fishCard"') >= 0 && html.indexOf('id="fishCard"') < html.indexOf('class="tankwrap"'));
must("it carries the fish's own metadata", ["fishCardPic", "fishCardSpecies", "fishCardName", "fishCardChips",
  "fishCardSocial", "fishCardRows", "fishCardWord", "fishCardKeeperPic", "fishCardKeeperNote"].every(function (id) {
  return html.indexOf('id="' + id + '"') >= 0;
}));
must("it fades on its own and hides after", js.indexOf("function hideFishCard()") >= 0 && js.indexOf("const FISH_CARD_MS = 9000") >= 0 &&
  css.indexOf(".fish-card.fade") >= 0 && css.indexOf(".fish-card.hidden") >= 0);
must("clicking a fish opens it, from the list or the glass", js.indexOf("if (f) showFishCard(f); else hideFishCard();") >= 0 &&
  js.indexOf("if (hit) pick(hit.id); else hideFishCard();") >= 0);
must("the placard is tank themed, not a browser dialog", js.indexOf("function showFishCard(f)") >= 0 &&
  css.indexOf(".fish-card {") >= 0 && css.indexOf(".fish-card-rows dt") >= 0 && css.indexOf("linear-gradient(180deg, #0b1c24ee") >= 0 &&
  (js.match(/fishCardRows|fishCardChips/g) || []).length >= 2);
must("the keeper signs the fish card in their own voice", js.indexOf("const FISH_VOICE = {") >= 0 && js.indexOf("function fishVoice(f)") >= 0);

/* 4f. clicking a fish: you hit what you see, and nothing eats the click */
must("the hit test uses the box the sprite was drawn in", js.indexOf("hitBoxes[f.id] = { x: x, y: y, bw: bw, bh: bh, z: z, at: now }") >= 0 &&
  js.indexOf("function fishAt(x, y, w, h)") >= 0 && js.indexOf("const cx = box ? box.x / w : f.x;") >= 0);
must("the name plate above a fish is part of the target", js.indexOf("y >= cy - hh - HIT_LABEL") >= 0);
must("a near miss still picks the nearest fish", js.indexOf("if (!inBox && dist > HIT_FAR) return;") >= 0 && js.indexOf("const HIT_FAR = 0.1;") >= 0);
must("no more depth penalty pushing far fish out of reach", js.indexOf("(1 - depthOf(f)) * 0.045") < 0);
must("stale boxes are dropped each frame", js.indexOf("if (hitBoxes[k].at !== now) delete hitBoxes[k];") >= 0);
must("the canvas click is guarded when no tank is loaded", js.indexOf('canvas.addEventListener("click", function (e) {\n    if (!state || !state.fish) return;') >= 0);
must("the fish card never swallows a click meant for a fish", /\.fish-card \{[^}]*pointer-events: none/.test(css));
must("and neither does the keeper box", /\.keeper-box \{[^}]*pointer-events:none/.test(css) || /\.keeper-box \{[^}]*pointer-events: none/.test(css));

/* 4g. DNA: a fingerprint per fish, a chain per lineage, and a way to check it */
must("every fish is hashed from its own genome", js.indexOf("function dnaFor(species, gen, sex, traits, parents, born, salt)") >= 0 &&
  js.indexOf('return "LG1-" + dnaCode(species) + "-" + hex.slice(0, 12);') >= 0 && js.indexOf("const f = {") >= 0 &&
  js.indexOf("return giveDna(f);") >= 0);
must("the hash covers species, generation, sex, traits, both parents and a birth salt",
  js.indexOf("return [DNA_SALT, species, gen || 1, sex || \"?\",") >= 0 && js.indexOf("function traitCode(t)") >= 0 &&
  js.indexOf("(parents || []).slice(0, 2).join(\"+\")") >= 0);
must("a fish's DNA can be recomputed and checked", js.indexOf("function verifyDna(f)") >= 0 &&
  js.indexOf('reason: want === f.dna ? "genome matches the hash" : "hash does not match the genome"') >= 0);
must("offspring inherit both parents' hashes, not their names", js.indexOf("parents: [a.dna, b.dna].filter(isDna)") >= 0 &&
  js.indexOf("fry.parents = (e.parents || []).filter(isDna).slice(0, 2);") >= 0 && js.indexOf("giveDna(fry, true);") >= 0);
must("the chain can be walked through the gene bank", js.indexOf("function lineageOf(f)") >= 0 &&
  js.indexOf("function bankFish(f)") >= 0 && js.indexOf("const DNA_BANK_CAP = 260;") >= 0);
must("old saves get DNA without hashing their legacy name-parents", js.indexOf("f.parentNames = (f.parentNames || []).concat(f.parents.filter(function (q) { return !isDna(q); })).slice(0, 2);") >= 0);
must("the fish card and the rail line show the DNA", js.indexOf('["DNA", f.dna || "—"],') >= 0 &&
  js.indexOf('["Genome", dnaLine(f)]') >= 0 && js.indexOf('"<span>dna ok</span>"') >= 0);
must("the tank exposes a verifier", js.indexOf("verify: function (id) {") >= 0 && js.indexOf("window.FishTank.verify") < 0 &&
  js.indexOf("dnaOk: state ? state.fish.filter(function (f) { return verifyDna(f).ok; }).length : 0,") >= 0);

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
