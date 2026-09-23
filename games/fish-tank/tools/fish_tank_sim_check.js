#!/usr/bin/env node
/* Fish Tank sim check: pulls the balance maths straight out of tank.js and runs
   it in a stub context, so the curves can be regression-tested without a browser.
   Run: node tools/fish_tank_sim_check.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "..", "tank.js"), "utf8");

let fails = 0;
function must(label, cond, extra) {
  if (!cond) {
    fails += 1;
    console.log("FAIL  " + label + (extra == null ? "" : "  (" + extra + ")"));
  } else {
    console.log("ok    " + label);
  }
}

/* --- lift functions and tables out of the IIFE --- */
function grab(name) {
  const head = "function " + name + "(";
  const i = src.indexOf(head);
  if (i < 0) throw new Error("missing function " + name);
  let depth = 0, j = i;
  for (; j < src.length; j += 1) {
    if (src[j] === "{") depth += 1;
    else if (src[j] === "}") {
      depth -= 1;
      if (depth === 0) { j += 1; break; }
    }
  }
  return src.slice(i, j);
}
function grabConst(name, end) {
  const i = src.indexOf("const " + name + " = ");
  if (i < 0) throw new Error("missing const " + name);
  const j = src.indexOf(end, i);
  return src.slice(i, end ? j : src.indexOf("\n", src.indexOf("];", i) + 1));
}

const tables = [
  "const HOUR = 3600000;",
  "const DAY = 24 * HOUR;",
  "const STARVE = 36 * HOUR;",
  "const FISH_CAP = 50;",
  "const STALK_LEAD = 22000;",
  "const STRIKE_WINDOW = 40000;",
  "const HATCH_MS = 20 * 60000;",
  "const EGG_CAP = 6;",
  grabConst("STAGES", "\n  const STAGE_DRAW"),
  grabConst("SPECIES", "\n  const VITALS"),
  grabConst("VITALS", "\n  const PREDATORS"),
  grabConst("MOTION", "\n  /* Soft obstacles"),
  grabConst("DECOR", "\n  const TEMP_BAND"),
  grabConst("TEMP_BAND", "\n  const TRAIT_WORDS")
].join("\n");

const helpers = [
  "function specOf(id) { return SPECIES.filter(function (s) { return s.id === id; })[0] || SPECIES[0]; }",
  "function vitals(f) { return VITALS[f.species] || { hp: 100, regen: 5, hurt: 10, food: 16 }; }",
  "function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }",
  "function foodLeft(f, now) { return vitals(f).food * HOUR - (now - (f.lastFed || f.born)); }",
  "function bodyAge(f) { return f.growth || 0; }",
  "function moodOf() { return 'normal'; }",
  "function decorOf() { return DECOR[state.theme] || DECOR.river; }",
  grab("stageName"),
  grab("stageSpeed"),
  grab("traits"),
  grab("makeTraits"),
  grab("motionOf"),
  grab("bandOf"),
  grab("comfort"),
  grab("speedOf"),
  grab("huntChance"),
  grab("weakestPrey"),
  grab("bandSteer"),
  grab("wallSteer"),
  grab("decorSteer"),
  grab("nearestShelter")
].join("\n");

const probe = `function specOf_(){}
  ({ MOTION: MOTION, DECOR: DECOR, TEMP_BAND: TEMP_BAND, SPECIES: SPECIES, VITALS: VITALS,
     clamp: clamp, comfort: comfort, speedOf: speedOf, huntChance: huntChance, weakestPrey: weakestPrey,
     bandSteer: bandSteer, wallSteer: wallSteer, decorSteer: decorSteer, nearestShelter: nearestShelter,
     makeTraits: makeTraits, bandOf: bandOf, motionOf: motionOf, state: state, FISH_CAP: FISH_CAP, HATCH_MS: HATCH_MS, EGG_CAP: EGG_CAP, STALK_LEAD: STALK_LEAD, STRIKE_WINDOW: STRIKE_WINDOW })`;

const sandbox = { console, Date, Math, state: { temp: 25, theme: "river", quality: 80, fish: [] }, AR: 1.7 };
vm.createContext(sandbox);
const api = vm.runInContext(tables + "\n" + helpers + "\n;" + probe, sandbox);

const now = Date.now();
function mkFish(species, hpRatio, fedHours, hoursOld, stamina) {
  const v = api.VITALS[species] || { hp: 100, food: 16 };
  return {
    species: species, hp: v.hp * hpRatio, lastFed: now - fedHours * 3600000,
    born: now - hoursOld * 3600000, growth: hoursOld * 3600000,
    traits: api.makeTraits(), stamina: stamina == null ? 1 : stamina, state: "cruise"
  };
}

/* ---- tables ---- */
let speciesOk = true, bandsOk = true;
Object.keys(api.VITALS).forEach(function (id) {
  const m = api.MOTION[id];
  if (!m || !api.TEMP_BAND[id]) speciesOk = false;
  if (m && !(m.band[0] > 0.02 && m.band[1] < 0.95 && m.band[0] < m.band[1] && m.burst > m.cruise)) bandsOk = false;
});
must("every species has motion, a band and a comfort range", speciesOk);
must("bands sit inside the glass with burst above cruise", bandsOk);
Object.keys(api.DECOR).forEach(function (theme) {
  const list = api.DECOR[theme];
  must(theme + " has decor the fish steer around", list.length >= 6);
  must(theme + " has shelter and an egg spot", list.some(function (d) { return d.shelter; }) && list.some(function (d) { return d.egg; }));
});
must("the rug is capped", api.FISH_CAP === 50);

/* ---- hunting: the advertised odds ---- */
const full = mkFish("ruby", 1, 0.1, 30);
const hurt = mkFish("ruby", 0.2, 8, 30);
api.state.temp = 25;
must("a full fed fish is a 25% bite", api.huntChance(mkFish("ruby", 1, 0, 30), now) === 0.25, api.huntChance(full, now));
must("a hurt starving fish is dearer", api.huntChance(hurt, now) > 0.6, api.huntChance(hurt, now));
let inRange = true, mono = true, prev = Infinity;
for (let r = 0; r <= 1.0001; r += 0.05) {
  const f = mkFish("dart", r, 0.2 + (1 - r) * 10, 30);
  const c = api.huntChance(f, now);
  if (c < 0.25 - 1e-9 || c > 0.85 + 1e-9) inRange = false;
  if (c > prev + 1e-9) mono = false;
  prev = c;
}
must("the bite never leaves 25%..85%", inRange);
must("better condition never raises the odds", mono);
if (!mono) {
  const curve = [];
  for (let r = 0; r <= 1.0001; r += 0.1) curve.push(+api.huntChance(mkFish("dart", r, 0.2 + (1 - r) * 10, 30), now).toFixed(3));
  console.log("      curve worst->best:", curve.join(" "));
}
must("the stalk opens before the hunt and closes inside it", api.STALK_LEAD > 0 && api.STRIKE_WINDOW > api.STALK_LEAD / 2);
must("a hunted fish finds its cover", !!api.nearestShelter(0.07, 0.42, 0.55));

/* ---- weakest first ---- */
api.state.fish = [mkFish("ruby", 0.9, 1, 30), mkFish("ruby", 0.3, 1, 30), mkFish("ruby", 0.6, 1, 30)];
must("hunter takes the weakest fish", api.weakestPrey(now).hp === api.VITALS.ruby.hp * 0.3);
api.state.fish = [];
must("no prey, no target", api.weakestPrey(now) === null);

/* ---- water temperature ---- */
const band = api.TEMP_BAND.moss;
api.state.temp = (band[0] + band[1]) / 2;
must("comfort is zero inside the band", api.comfort(mkFish("moss", 1, 0.1, 30)) === 0);
api.state.temp = band[1] + 3;
must("comfort measures how far out of band", Math.abs(api.comfort(mkFish("moss", 1, 0.1, 30)) - 3) < 1e-9);
let gaspable = 0;
Object.keys(api.TEMP_BAND).forEach(function (id) {
  api.state.temp = 30;                       /* the Options slider tops out here */
  if (api.comfort({ species: id }) > 2.5) gaspable += 1;
});
must("cranking the heater past 30 can make fish gasp", gaspable >= 4, gaspable + " species");
api.state.temp = 25;
let cold = 0;
Object.keys(api.TEMP_BAND).forEach(function (id) {
  api.state.temp = 20;                       /* and it bottoms out here */
  if (api.comfort({ species: id }) > 2.5) cold += 1;
});
must("chilling to 20 can too", cold >= 4, cold + " species");
api.state.temp = 25;

/* ---- speed: effort, fatigue, age ---- */
let order = true, tired = true, young = true;
Object.keys(api.VITALS).forEach(function (id) {
  const f = mkFish(id, 1, 0.1, 30);
  const burst = api.speedOf(f, now, "burst");
  const cruise = api.speedOf(f, now, "cruise");
  const rest = api.speedOf(f, now, "rest");
  if (!(burst > cruise && cruise > rest)) order = false;
  f.state = "flee";
  const fresh = api.speedOf(f, now, "panic");
  f.stamina = 0;
  if (!(api.speedOf(f, now, "panic") < fresh * 0.65)) tired = false;
  const baby = mkFish(id, 1, 0.1, 1);
  if (api.speedOf(baby, now, "cruise") >= api.speedOf(mkFish(id, 1, 0.1, 30), now, "cruise")) young = false;
});
must("burst beats cruise beats rest, for every species", order);
must("a tired fish cannot hold a sprint", tired);
must("fry are slower than adults", young);

/* ---- steering signs ---- */
const mossy = mkFish("moss", 1, 0.1, 30);
mossy.y = 0.3;                                        /* far above its 0.6..0.88 band */
let push = { x: 0, y: 0 };
api.bandSteer(mossy, push, null);
must("depth pulls a fish back to its band", push.y > 0);
mossy.y = 0.8;
push = { x: 0, y: 0 };
api.bandSteer(mossy, push, null);
must("and back down from too low", push.y < 0);
const wanderer = mkFish("ruby", 1, 0.1, 30);
wanderer.x = 0.05; wanderer.y = 0.5; wanderer.vx = -0.2; wanderer.vy = 0;
push = { x: 0, y: 0 };
api.wallSteer(wanderer, push);
must("walls push inward", push.x > 0);
wanderer.x = 0.95; wanderer.y = 0.5; wanderer.vx = 0.2;
push = { x: 0, y: 0 };
api.wallSteer(wanderer, push);
must("both walls push inward", push.x < 0);
wanderer.x = 0.5; wanderer.y = 0.12; wanderer.vx = 0; wanderer.vy = -0.1;
push = { x: 0, y: 0 };
api.wallSteer(wanderer, push);
must("the surface is a ceiling", push.y > 0);

/* ---- decor avoidance ---- */
let decorShape = true, weedCount = 0, solidCount = 0;
Object.keys(api.DECOR).forEach(function (theme) {
  api.DECOR[theme].forEach(function (d) {
    if (!(d.rx > 0.02 && d.ry > 0.03)) decorShape = false;
    if (d.kind === "weed") weedCount += 1;
    else solidCount += 1;
  });
});
must("every decor mark has real extents", decorShape, weedCount + " weed, " + solidCount + " solid");
const rock = api.DECOR.river.filter(function (d) { return d.kind === "solid"; })[2];
const inRock = mkFish("ruby", 1, 0.1, 30);
inRock.x = rock.x + 0.004; inRock.y = rock.y;
push = { x: 0, y: 0 };
api.decorSteer(inRock, push);
must("a fish noses out of the rockwork", Math.hypot(push.x, push.y) > 0);
const overRock = mkFish("ruby", 1, 0.1, 30);
overRock.x = rock.x; overRock.y = rock.y - rock.ry * 0.5;     /* above it: the pancake bug */
push = { x: 0, y: 0 };
api.decorSteer(overRock, push);
must("rock blocks vertically too, not just sideways", push.y < 0);
const weed = api.DECOR.river.filter(function (d) { return d.kind === "weed"; })[0];
const inWeed = mkFish("ruby", 1, 0.1, 30);
inWeed.x = weed.x; inWeed.y = weed.y;
push = { x: 0, y: 0 };
api.decorSteer(inWeed, push);
must("weeds are cover, not walls", push.x === 0 && push.y === 0);
must("the shoal can find that cover", !!api.nearestShelter(weed.x, weed.y, 1.7));
const away = mkFish("ruby", 1, 0.1, 30);
away.x = 0.62; away.y = 0.17;
push = { x: 0, y: 0 };
api.decorSteer(away, push);
must("and open water stays open", push.x === 0 && push.y === 0);

/* ---- generations ---- */
must("eggs hatch in twenty minutes", api.HATCH_MS === 20 * 60000);
must("a clutch fits under the cap", api.EGG_CAP >= 3);
let mutated = true, centred = true;
for (let i = 0; i < 400; i += 1) {
  const pa = { bold: 0.9, social: 0.9, appetite: 0.9, vigor: 0.9 };
  const pb = { bold: 0.9, social: 0.9, appetite: 0.9, vigor: 0.9 };
  const kid = api.makeTraits(pa, pb);
  Object.keys(kid).forEach(function (k) {
    if (kid[k] < 0.03 || kid[k] > 0.97) mutated = false;
    if (Math.abs(kid[k] - 0.9) > 0.4) centred = false;
  });
}
must("traits stay inside the range", mutated);
must("the young stay near their parents", centred);

console.log("");
if (fails) {
  console.log(fails + " sim check(s) failed");
  process.exit(1);
}
console.log("all sim checks passed");
