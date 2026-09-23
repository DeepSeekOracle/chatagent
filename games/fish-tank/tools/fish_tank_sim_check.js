#!/usr/bin/env node
/* Fish Tank sim check: lifts the balance maths plus the water chemistry, the
   brains and the announcer event table straight out of tank.js and exercises
   them in a stub context, so the curves can be regression tested without a
   browser. Run: node tools/fish_tank_sim_check.js */
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
  const j = end ? src.indexOf(end, i) : -1;
  return j > 0 ? src.slice(i, j) : src.slice(i, src.indexOf("\n  };", i) + 5);
}

const tables = [
  "const HOUR = 3600000;",
  "const DAY = 24 * HOUR;",
  "const STARVE = 36 * HOUR;",
  "const FISH_CAP = 50;",
  "const HUNTER_CAP = 10;",
  "const STALK_LEAD = 22000;",
  "const STRIKE_WINDOW = 40000;",
  "const HATCH_MS = 20 * 60000;",
  "const EGG_CAP = 6;",
  "const CREW_LIFE = 30 * DAY;",
  grabConst("OX", "\n  const WASTE"),
  grabConst("WASTE", "\n  const"),
  grabConst("STAGES", "\n  const STAGE_DRAW"),
  grabConst("STAGE_DRAW", "\n  const FACE_RIGHT"),
  grabConst("SPECIES", "\n  const VITALS"),
  grabConst("VITALS", "\n  const PREDATORS"),
  grabConst("LIFE_CYCLE", "\n  const PRED_STAT"),
  grabConst("MOTION", "\n  /* Soft obstacles"),
  grabConst("DECOR", "\n  const TEMP_BAND"),
  grabConst("TEMP_BAND", "\n  const BIOS"),
  grabConst("CREW", "\n  const CREW_LIFE"),
  grabConst("THEMES", "\n  const THEME_ART"),
  grabConst("LOG_EVENTS", "\n  function readEvent"),
  grabConst("ANNOUNCE", "\n  const KEEPER_SAY"),
  grabConst("KEEPER_SAY", "\n  let keeperTag"),
  grabConst("FISH_VOICE", "\n  function fishVoice"),
  grabConst("KEEPERS", "\n  const CAST_ORDER"),
  'const CAST_ORDER = ["mara", "ellis", "ren", "june", "mateo", "nia", "mira", "sancora", "lyra", "reed", "calder", "kai"];'
].join("\n");

const helpers = [
  "function specOf(id) { return SPECIES.filter(function (s) { return s.id === id; })[0] || SPECIES[0]; }",
  "function cycleOf(species) { return LIFE_CYCLE[species] || [2, 6, 12, 24, 96, 168]; }",
  "function vitals(f) { return VITALS[f.species] || { hp: 100, regen: 5, hurt: 10, food: 16 }; }",
  "function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }",
  "function foodLeft(f, now) { return vitals(f).food * (hasPerk('meals') ? 1.28 : 1) * HOUR - (now - (f.lastFed || f.born)); }",
  "function bodyAge(f) { return f.growth || 0; }",
  "function ageOf(f, now) { return Math.max(0, now - f.born); }",
  "function moodOf() { return 'normal'; }",
  "function phase() { return (state.opts && state.opts.clock) === 'night' ? 'night' : 'day'; }",
  "function themeOf(id) { return THEMES[id] || THEMES.river; }",
  "function decorOf() { return DECOR[themeOf(state.theme).id] || DECOR.river; }",
  "function crewOf(id) { return CREW.filter(function (c) { return c.id === id; })[0]; }",
  "let _perks = [];",
  "function hasPerk(id) { return _perks.indexOf(id) >= 0; }",
  "let simDt = 0.016;",
  "let frameId = 0;",
  "let anchorCache = { frame: -1, by: {} };",
  "const BOND_KEEP = 8;",
  "const AR = 1.7;",
  grab("stageName"),
  grab("stageSpeed"),
  grab("traits"),
  grab("makeTraits"),
  grab("motionOf"),
  grab("bandOf"),
  grab("temperOf"),
  grab("socialOf"),
  grab("crowdLimit"),
  grab("crowdLoad"),
  grab("stratNow"),
  grab("tempAt"),
  grab("rhythm"),
  grab("comfort"),
  grab("tempNote"),
  grab("mixScale"),
  grab("speedOf"),
  grab("huntChance"),
  grab("weakestPrey"),
  grab("bandSteer"),
  grab("wallSteer"),
  grab("decorSteer"),
  grab("nearestShelter"),
  grab("simWater"),
  grab("tickHealth"),
  grab("unitDir"),
  grab("depthOf"),
  grab("span3"),
  grab("apart"),
  grab("hashId"),
  grab("bond"),
  grab("pruneBonds"),
  grab("bondPick"),
  grab("mem"),
  grab("hidingSpot"),
  grab("wary"),
  grab("anchorOf"),
  grab("isAnchor"),
  grab("slotFor"),
  grab("schoolSpread"),
  grab("homeOf"),
  grab("territorySteer"),
  grab("crewSteer"),
  grab("readEvent")
].join("\n");

const probe = `({
  OX: OX, WASTE: WASTE, MOTION: MOTION, DECOR: DECOR, TEMP_BAND: TEMP_BAND, SPECIES: SPECIES, VITALS: VITALS,
  THEMES: THEMES, CREW: CREW, LOG_EVENTS: LOG_EVENTS, ANNOUNCE: ANNOUNCE, KEEPER_SAY: KEEPER_SAY,
  clamp: clamp, comfort: comfort, tempNote: tempNote, tempAt: tempAt, stratNow: stratNow, crowdLoad: crowdLoad,
  crowdLimit: crowdLimit, rhythm: rhythm, speedOf: speedOf, huntChance: huntChance, weakestPrey: weakestPrey,
  bandSteer: bandSteer, wallSteer: wallSteer, decorSteer: decorSteer, nearestShelter: nearestShelter,
  simWater: simWater, tickHealth: tickHealth, makeTraits: makeTraits, bandOf: bandOf, motionOf: motionOf,
  bond: bond, bondPick: bondPick, pruneBonds: pruneBonds, mem: mem, hidingSpot: hidingSpot, wary: wary,
  anchorOf: anchorOf, isAnchor: isAnchor, slotFor: slotFor, schoolSpread: schoolSpread, homeOf: homeOf,
  territorySteer: territorySteer, crewSteer: crewSteer, readEvent: readEvent, foodLeft: foodLeft,
  BOND_KEEP: BOND_KEEP, FISH_VOICE: FISH_VOICE, KEEPERS: KEEPERS, CAST_ORDER: CAST_ORDER, state: state, setPerks: function (list) { _perks = list; }, bumpFrame: function () { frameId += 1; } })`;

const sandbox = {
  console, Date, Math, window: { ArcadeLedger: null },
  state: {
    temp: 25, theme: "river", quality: 86, algae: 8, oxygen: 92, waste: 10, mode: "standard",
    crew: [], fish: [], waterAt: Date.now(), opts: { heater: true, temp: 25, clock: "day" },
    eggs: [], points: 0, log: [], trend: null
  }
};
vm.createContext(sandbox);
let api;
try {
  api = vm.runInContext(tables + "\n" + helpers + "\n;" + probe, sandbox);
} catch (e) {
  console.log("FAIL  the lifted maths compiles: " + e.message);
  process.exit(1);
}
must("the lifted maths compiles", true);

const now = Date.now();
function mkFish(species, hoursOld, hp) {
  const v = api.VITALS[species] || { hp: 100, food: 16 };
  return {
    id: species + "-" + Math.random().toString(36).slice(2, 6),
    species: species, hp: hp == null ? v.hp : hp, lastFed: now - 0.1 * 3600000,
    born: now - hoursOld * 3600000, growth: hoursOld * 3600000, traits: api.makeTraits(),
    x: 0.5, y: 0.5, z: 0.5, vx: 0, vy: 0, state: "cruise"
  };
}

/* ---- temperature is a gradient ---- */
api.state.temp = 25;
must("tempAt with no depth is the tank number", api.tempAt(null) === 25);
must("the surface is warmer than the sand", api.tempAt(0.12) > api.tempAt(0.88));
must("the gradient stays inside a couple of degrees", api.tempAt(0.12) - api.tempAt(0.88) < 2.6);
must("tempAt is monotone top to bottom", api.tempAt(0.15) > api.tempAt(0.45) && api.tempAt(0.45) > api.tempAt(0.85));
api.state.opts.heater = false;
must("a cold room flattens the gradient", api.tempAt(0.12) - api.tempAt(0.88) < 1.6);
api.state.opts.heater = true;

/* ---- comfort reads the water the fish is actually in ---- */
const mossTop = mkFish("moss", 30); mossTop.y = 0.2;
const mossFloor = mkFish("moss", 30); mossFloor.y = 0.86;
api.state.temp = 26.4;
must("a cold-water fish feels the warm surface more than the sand", api.comfort(mossTop) > api.comfort(mossFloor));

/* ---- crowding is a slope ---- */
api.state.fish = [];
must("an empty tank has no crowd load", api.crowdLoad() === 0);
api.state.fish = new Array(30).fill(0).map(function () { return mkFish("ruby", 30); });
must("thirty fish is exactly a full glass", Math.abs(api.crowdLoad() - 1) < 1e-9);
must("the default limit is thirty", api.crowdLimit() === 30);
api.setPerks(["crowd"]);
must("the roomy-glass perk raises the limit", api.crowdLimit() === 42 && api.crowdLoad() < 1);
api.setPerks([]);

/* ---- oxygen: a balanced tank holds, a crowded one falls ---- */
function runWater(fishN, spanHours, crew) {
  api.state.fish = new Array(fishN).fill(0).map(function () { return mkFish("ruby", 30); });
  api.state.crew = (crew || []).map(function (role) { return { role: role }; });
  api.state.algae = 10; api.state.waste = 10; api.state.oxygen = 92; api.state.quality = 86;
  for (let h = 0; h < spanHours; h += 1) {
    api.state.waterAt = now + h * 3600000 - 3600000;
    api.simWater(now + h * 3600000);
  }
  return api.state.oxygen;
}
const ox12 = runWater(12, 6);
must("a balanced tank holds its oxygen", ox12 > api.OX.thin, Math.round(ox12));
const ox30 = runWater(30, 6);
must("a crowded tank loses it", ox30 < ox12 - 10, Math.round(ox30));
must("gasping comes before thin water", api.OX.gasp < api.OX.thin);
const oxEmpty = runWater(0, 3);
must("an empty planted tank climbs back", oxEmpty > 95, Math.round(oxEmpty));
api.state.fish = new Array(30).fill(0).map(function () { return mkFish("ruby", 30); });
api.state.crew = [];
api.state.waste = 60; api.state.oxygen = 40;
api.state.waterAt = now - 3600000;
api.simWater(now);
must("waste spends oxygen too", api.state.oxygen < 40);

/* ---- waste: fish and meals leave it, corys lift it ---- */
api.state.fish = new Array(12).fill(0).map(function () { return mkFish("ruby", 30); });
api.state.crew = []; api.state.waste = 10; api.state.algae = 5; api.state.waterAt = now - 3600000;
api.simWater(now);
const wasteDirty = api.state.waste;
api.state.waste = 10; api.state.crew = [{ role: "cory" }, { role: "cory" }];
api.state.waterAt = now - 3600000;
api.simWater(now);
must("corys lift the waste", api.state.waste < wasteDirty, api.state.waste.toFixed(1) + " vs " + wasteDirty.toFixed(1));

/* ---- algae: it blooms, and grazers hold it ---- */
api.state.fish = new Array(10).fill(0).map(function () { return mkFish("ruby", 30); });
api.state.crew = []; api.state.algae = 20; api.state.waterAt = now - 3600000;
api.simWater(now);
must("green grows while nobody grazes", api.state.algae > 20, api.state.algae.toFixed(1));
api.state.algae = 20; api.state.crew = [{ role: "snail" }, { role: "snail" }, { role: "snail" }];
api.state.waterAt = now - 3600000;
api.simWater(now);
must("three snails turn it around", api.state.algae < 20, api.state.algae.toFixed(1));
api.state.crew = [];
api.state.algae = 96; api.state.waterAt = now - 6 * 3600000;
api.simWater(now);
must("algae never exceeds a hundred", api.state.algae <= 100);

/* ---- health: thin water hurts, clean water heals ---- */
api.state.fish = [mkFish("ruby", 30, 100)];
api.state.oxygen = 90; api.state.waste = 5; api.state.algae = 5; api.state.quality = 90;
api.state.fish[0].hpAt = now - 3600000;
api.tickHealth(api.state.fish[0], now);
must("clean water heals a fish", api.state.fish[0].hp > 100);
api.state.fish[0].hp = 100; api.state.fish[0].hpAt = now - 3600000;
api.state.oxygen = 40;
api.tickHealth(api.state.fish[0], now);
must("thin water drains one", api.state.fish[0].hp < 100, api.state.fish[0].hp.toFixed(1));
api.state.fish[0].hp = 100; api.state.fish[0].hpAt = now - 3600000;
api.state.oxygen = 90;
api.tickHealth(api.state.fish[0], now);
must("and it heals again once the air is back", api.state.fish[0].hp > 100);
api.state.fish[0].hp = 100; api.state.fish[0].hpAt = now - 3600000;
api.state.fish = new Array(34).fill(0).map(function () { return mkFish("ruby", 30, 100); });
api.state.fish[0].hpAt = now - 3600000;
api.state.oxygen = 90; api.state.quality = 90; api.state.algae = 5;
api.tickHealth(api.state.fish[0], now);
must("crowding drains the ones that are already tight", api.state.fish[0].hp < 100, api.state.fish[0].hp.toFixed(1));

/* ---- bonds: they build near, decay apart, and stay small in the save ---- */
const a = mkFish("glimmer", 30), b = mkFish("glimmer", 30);
for (let i = 0; i < 400; i += 1) api.bond(a, b, 0.06 * 0.016);
must("swimming together builds a bond", (a.bonds[b.id] || 0) > 0.2, (a.bonds[b.id] || 0).toFixed(3));
const held = a.bonds[b.id];
for (let i = 0; i < 400; i += 1) api.bond(a, b, -0.012 * 0.016);
must("time apart wears it down", a.bonds[b.id] < held);
const c = mkFish("ruby", 30), d = mkFish("dart", 30);
api.state.fish = [a, b, c, d];
must("the strongest companion is the one it keeps", api.bondPick(a, 1, 0.05).f.id === b.id);
a.bonds[c.id] = -0.4; a.bonds[d.id] = -0.5;
must("and it remembers who to avoid", api.bondPick(a, -1, 0.2).f.id === d.id);
for (let i = 0; i < 20; i += 1) { const x = mkFish("dart", 30); a.bonds[x.id] = 0.1 + i * 0.01; }
api.pruneBonds(a);
must("the save keeps a handful of bonds, not a list", Object.keys(a.bonds).length <= api.BOND_KEEP, Object.keys(a.bonds).length);

/* ---- the school elects a leader and the rest take slots ---- */
const lead = mkFish("glimmer", 40), f1 = mkFish("glimmer", 20), f2 = mkFish("glimmer", 20);
lead.traits = { bold: 0.7, social: 0.95, appetite: 0.5, vigor: 0.5 };
f1.traits = { bold: 0.3, social: 0.3, appetite: 0.5, vigor: 0.5 };
f2.traits = { bold: 0.3, social: 0.3, appetite: 0.5, vigor: 0.5 };
api.state.fish = [lead, f1, f2];
api.bumpFrame();
must("the most social fish leads the school", api.anchorOf("glimmer") === lead);
must("and it knows it", api.isAnchor(lead) === true && api.isAnchor(f1) === false);
api.state.fish = [f1, f2];
api.bumpFrame();
must("when the leader dies the school elects another", api.anchorOf("glimmer") === f1 || api.anchorOf("glimmer") === f2);
const slot = api.slotFor(f1, lead);
must("a follower keeps a slot near the leader", Math.hypot(slot.x - lead.x, (slot.y - lead.y) * 1.7) < 0.3);
api.state.fish = [lead, f1, f2];
api.bumpFrame();
f1.x = 0.62; f1.y = 0.55; f2.x = 0.40; f2.y = 0.44;
must("spread is measured inside the school", api.schoolSpread(lead) > 0.1, api.schoolSpread(lead).toFixed(2));

/* ---- territory: a loner has a patch and holds it ---- */
const loner = mkFish("azure", 40);
api.state.fish = [loner];
loner.x = 0.9; loner.y = 0.6;
const home = api.homeOf(loner);
must("every fish gets a home patch", home && home.x > 0.1 && home.x < 0.9 && home.y > 0.1 && home.y < 0.9);
must("the patch is stable once set", api.homeOf(loner) === home);
const outT = { x: 0, y: 0 };
api.territorySteer(loner, outT);
must("and pulls back toward it", Math.sign(outT.x) === Math.sign(home.x - loner.x) || Math.abs(home.x - loner.x) < 0.26, outT.x.toFixed(2));
const mate = mkFish("azure", 40);
loner.home = { x: 0.80, y: 0.50 };
mate.home = { x: 0.20, y: 0.20 };
loner.x = 0.80; loner.y = 0.50;
mate.x = 0.83; mate.y = 0.51;
api.state.fish = [loner, mate];
api.bumpFrame();
outT.x = 0; outT.y = 0;
api.territorySteer(loner, outT);
must("an intruder of its own kind gets pushed off", Math.hypot(outT.x, outT.y) > 0.05, Math.hypot(outT.x, outT.y).toFixed(3));

/* ---- cleaners are neighbours ---- */
const near = mkFish("glimmer", 30);
api.state.fish = [near];
near.x = 0.5; near.y = 0.45;
api.state.crew = [{ role: "jelly", x: 0.52, y: 0.45 }];
const outJ = { x: 0, y: 0 };
api.crewSteer(near, outJ);
must("a fish gives a jelly room", outJ.x < 0, outJ.x.toFixed(3));
const bottom = mkFish("moss", 30);
bottom.y = 0.8; bottom.x = 0.6; bottom.lastFed = now - 30 * 3600000;
api.state.fish = [bottom];
api.state.crew = [{ role: "cory", x: 0.7, y: 0.8 }];
const outC = { x: 0, y: 0 };
api.crewSteer(bottom, outC);
must("a hungry bottom feeder follows the cory", outC.x > 0, outC.x.toFixed(3));

/* ---- memory ---- */
const scared = mkFish("dart", 30);
api.mem(scared).chasedAt = now;
must("a fish that was chased is wary", api.wary(scared, now) === true);
api.mem(scared).hidSpot = { x: 0.2, y: 0.5 };
api.mem(scared).hidAt = now;
must("and it knows where it hid", api.hidingSpot(scared) !== null);
api.mem(scared).hidAt = now - 300000;
must("old hiding places are forgotten", api.hidingSpot(scared) === null);
const fed = mkFish("ruby", 30);
api.mem(fed).ateAt = now;
must("a meal is remembered", api.mem(fed).ateAt === now);

/* ---- the announcer reads the event stream ---- */
const keys = {};
api.LOG_EVENTS.forEach(function (e) { keys[e.key] = 1; });
const missing = [];
Object.keys(keys).forEach(function (k) { if (!api.ANNOUNCE[k] || !api.ANNOUNCE[k].lines || !api.ANNOUNCE[k].lines.length) missing.push(k); });
must("every event the game logs has something to say", missing.length === 0, missing.join(","));
must("events carry a priority and a tag", Object.keys(api.ANNOUNCE).every(function (k) {
  const ev = api.ANNOUNCE[k];
  return !!ev.tag && typeof ev.pri === "number";
}));
const TOPICS = ["night", "day", "dawn", "dusk", "variety", "mono", "full", "few", "crew", "eggs", "calm"];
const badVoice = [];
Object.keys(api.KEEPER_SAY).forEach(function (who) {
  if (!api.KEEPERS[who]) badVoice.push(who);
  Object.keys(api.KEEPER_SAY[who]).forEach(function (k) {
    if (!api.ANNOUNCE[k] && TOPICS.indexOf(k) < 0) badVoice.push(who + "." + k);
  });
});
must("every keeper voice belongs to a real keeper and a real event or topic", badVoice.length === 0, badVoice.join(","));

/* ---- the cast: twelve keepers, six of them static art from the lattice ---- */
const castIds = Object.keys(api.KEEPERS);
must("there are twelve keepers", castIds.length === 12 && api.CAST_ORDER.length === 12, castIds.length);
must("the six hand-drawn keepers are still here", ["mara", "ellis", "ren", "june", "mateo", "nia"].every(function (id) { return !!api.KEEPERS[id]; }));
must("six keepers come from the lattice cast", castIds.filter(function (id) { return api.KEEPERS[id].cast === "lattice"; }).length === 6,
  castIds.filter(function (id) { return api.KEEPERS[id].cast === "lattice"; }).join(","));
must("the lattice six are the golf cast", ["mira", "sancora", "lyra", "reed", "calder", "kai"].every(function (id) {
  return api.KEEPERS[id] && api.KEEPERS[id].cast === "lattice";
}));
must("Calder Voss is Justin here, and not a copy of anyone else", api.KEEPERS.calder.name === "Justin" && api.KEEPERS.calder.tag === "Steward");
must("static art still gets the bubble and the voice, only the picture holds still",
  castIds.filter(function (id) { const k = api.KEEPERS[id]; return k.cast === "lattice" && k.talk === false && k.ext === "jpg"; }).length === 6);
must("every keeper has a voice to speak with", castIds.every(function (id) {
  return api.KEEPERS[id].pitch > 0.5 && api.KEEPERS[id].rate > 0.5 && typeof api.KEEPERS[id].bio === "string" && api.KEEPERS[id].bio.length > 40;
}));
must("every keeper has their own idle chatter", castIds.every(function (id) {
  return api.KEEPERS[id].idle && api.KEEPERS[id].idle.length >= 3;
}));
must("every keeper has topic lines of their own", castIds.every(function (id) {
  const l = api.KEEPERS[id].lines;
  return l && Object.keys(l).length >= 4;
}));
must("every keeper's topics are real topics", (function () {
  const ok = ["night", "day", "dawn", "dusk", "variety", "mono", "full", "few", "crew", "eggs", "calm"];
  return castIds.every(function (id) {
    return Object.keys(api.KEEPERS[id].lines).every(function (k) { return ok.indexOf(k) >= 0; });
  });
})());
must("every keeper reacts to events in their own words", castIds.every(function (id) {
  const v = api.KEEPER_SAY[id];
  return v && Object.keys(v).length >= 3;
}));
must("no keeper has a line for an event that does not exist", (function () {
  const bad = [];
  Object.keys(api.KEEPER_SAY).forEach(function (who) {
    Object.keys(api.KEEPER_SAY[who]).forEach(function (k) {
      if (!api.ANNOUNCE[k] && TOPICS.indexOf(k) < 0) bad.push(who + "." + k);
    });
  });
  return bad.length === 0;
})());
must("every keeper can talk about a single fish too", castIds.every(function (id) {
  const v = api.FISH_VOICE[id];
  return v && v.fine && v.watch && v.thin;
}));

must("the cast has a lot to say", (function () {
  let n = 0;
  castIds.forEach(function (id) {
    const k = api.KEEPERS[id];
    n += k.idle.length;
    Object.keys(k.lines).forEach(function (top) { n += k.lines[top].length; });
    const v = api.KEEPER_SAY[id] || {};
    Object.keys(v).forEach(function (ev) { n += v[ev].length; });
  });
  return n;
})() >= 260, (function () {
  let n = 0;
  castIds.forEach(function (id) {
    const k = api.KEEPERS[id];
    n += k.idle.length;
    Object.keys(k.lines).forEach(function (top) { n += k.lines[top].length; });
    const v = api.KEEPER_SAY[id] || {};
    Object.keys(v).forEach(function (ev) { n += v[ev].length; });
  });
  return n;
})());

/* the lines the game actually writes must all be caught by the event table */
const LINES = [
  ["Spike is eaten.", "death", "Spike"],
  ["Nemo dies unfed after 22 hours.", "death", "Nemo"],
  ["Bubbles dies in a dirty tank after 40 hours.", "death", "Bubbles"],
  ["Koiton rests of old age after 320 hours.", "death", "Koiton"],
  ["Reed rolls 44 against 27% and eats Fan. It has one more hour.", "bite", "Fan"],
  ["Reed rolls 61 against 27% and misses Fan at the last moment.", "dodge", "Fan"],
  ["Reed turns toward Fan, the weakest. The shoal scatters.", "stalk", "Fan"],
  ["Boss Sable enters. One hunter a tank hour. A full fish is 25%.", "hunt", ""],
  ["Eight throws a cloud of black ink.", "ink", "Eight"],
  ["Disc and Stripe turn slow circles. Ruby eggs are coming.", "court", "Disc"],
  ["Disc and Disc Two leave 2 Ruby eggs on the rockwork.", "egg", "Disc"],
  ["A fry hatches by the rockwork: Ruby 2, generation 2, from Disc and Disc Two. +12", "birth", "Ruby 2"],
  ["First time — One fish grows to adult. +20 pts.", "first", ""],
  ["You change a third of the water. Algae drops. The glass clears.", "water", ""],
  ["Fan joins. A baby.", "buy", "Fan"],
  ["Nerite starts work.", "crew", "Nerite"],
  ["Reed slips into the far water.", "leave", "Reed"],
  ["A man's hand reaches over the glass.", "feed", ""],
  ["The glass was empty. A fry drifted in so the tank can go on.", "empty", ""],
  ["Volt cracks the water. 4 fish jolt.", "shock", "Volt"],
  ["Greymaw becomes JAWS. It is larger, it stalks, and an eat hour can take two fish.", "jaws", ""],
  ["Reed is grown. It hunts on the next tank hour.", "grow", "Reed"],
  ["Nerite finishes a month of work.", "retire", "Nerite"]
];
const unmatched = [];
LINES.forEach(function (row) {
  const hit = api.LOG_EVENTS.filter(function (e) { return e.re.test(row[0]); });
  if (!hit.length) { unmatched.push(row[0]); return; }
  if (row[1] && hit[0].key !== row[1]) unmatched.push(row[0] + " -> " + hit[0].key);
  const m = hit[0].re.exec(row[0]);
  const vars = m ? (hit[0].pick ? hit[0].pick(m) : { name: m[1] }) : {};
  if (row[2] && vars.name !== row[2]) unmatched.push(row[0] + " names " + vars.name);
});
must("the announcer catches every real log line", unmatched.length === 0, unmatched.join(" | "));

/* ---- the rules the title still promises ---- */
must("a full fed fish is still a 25% bite", (function () {
  const full = mkFish("ruby", 30);
  full.lastFed = now;
  return api.huntChance(full, now) === 0.25;
})());
must("the bite still caps at 85%", (function () {
  const f = mkFish("ruby", 30, api.VITALS.ruby.hp * 0.1);
  f.lastFed = now - 40 * 3600000;
  return api.huntChance(f, now) <= 0.85 + 1e-9;
})());
must("a hunted fish can still find cover", !!api.nearestShelter(0.07, 0.42, 1.7));
must("speed still orders burst over cruise over rest", (function () {
  const f = mkFish("dart", 30);
  return api.speedOf(f, now, "burst") > api.speedOf(f, now, "cruise") && api.speedOf(f, now, "cruise") > api.speedOf(f, now, "rest");
})());
must("every species has a temperature band and a motion profile", Object.keys(api.VITALS).every(function (id) {
  return !!api.TEMP_BAND[id] && !!api.MOTION[id];
}));
must("every theme has plants that make oxygen", Object.keys(api.THEMES).every(function (id) { return api.OX.plant[id] > 0; }));

/* ---- a day in the life: does the water hold for 24 tank hours? ---- */
function dayRun(fishN, hours, crew, waterChangeAt) {
  api.state.fish = new Array(fishN).fill(0).map(function () { return mkFish("ruby", 30, 100); });
  api.state.crew = (crew || []).map(function (role) { return { role: role }; });
  api.state.theme = "river";
  api.state.algae = 12; api.state.waste = 12; api.state.oxygen = 92; api.state.quality = 88;
  api.state.opts.clock = "day";
  const t0 = now;
  const rows = [];
  for (let h = 1; h <= hours; h += 1) {
    api.state.waterAt = t0 + (h - 1) * 3600000;
    if (waterChangeAt && h === waterChangeAt) {
      api.state.oxygen = api.clamp(api.state.oxygen + 18, 0, 100);
      api.state.waste = api.clamp(api.state.waste - 30, 0, 100);
      api.state.algae = api.clamp(api.state.algae - 28, 0, 100);
      api.state.quality = api.clamp(api.state.quality + 24, 0, 100);
    }
    api.simWater(t0 + h * 3600000);
    rows.push({ h: h, oxy: +api.state.oxygen.toFixed(1), waste: +api.state.waste.toFixed(1),
      algae: +api.state.algae.toFixed(1), quality: +api.state.quality.toFixed(1) });
  }
  return rows;
}
const mild = dayRun(12, 24, [{ role: "snail" }, { role: "cory" }]);
const last = mild[mild.length - 1];
must("a neglected twelve fish tank keeps its air but not its water",
  last.oxy > api.OX.thin && last.waste < 60 && last.quality < 25,
  "end of day untouched: oxy " + last.oxy + ", waste " + last.waste + ", algae " + last.algae + ", quality " + last.quality);
must("and the day shows on the gauges, not just at the end", mild[5].oxy < 95 && mild[0].quality > 55,
  "hour 6: oxy " + mild[5].oxy + ", quality " + mild[0].quality + " - hour 24: oxy " + last.oxy + ", quality " + last.quality);
const keptEvery = (function () {
  api.state.trend = null;
  return dayRun(12, 24, [{ role: "snail" }, { role: "cory" }, { role: "otto" }], 6);
})();
const keptEnd = keptEvery[keptEvery.length - 1];
must("a kept tank holds its quality for a day", keptEnd.quality > 25 && keptEnd.oxy > 85 && keptEnd.waste < 30,
  "end of day with a change at hour 6: oxy " + keptEnd.oxy + ", waste " + keptEnd.waste + ", quality " + keptEnd.quality);
const crowdDay = dayRun(30, 24, []);
const crow = crowdDay[crowdDay.length - 1];
must("a crowded tank goes thin inside a day", crow.oxy < api.OX.thin,
  "crowded end of day: oxy " + crow.oxy + ", quality " + crow.quality);
must("and a light tank does not just sit on the ceiling", mild[mild.length - 1].oxy < 100,
  "twelve fish end of day: oxy " + mild[mild.length - 1].oxy);
console.log("      twelve fish, 24h, untouched:  " + JSON.stringify(mild.filter(function (r) { return r.h % 6 === 0; })));
console.log("      twelve fish, 24h, water at 6: " + JSON.stringify(keptEvery.filter(function (r) { return r.h % 6 === 0; })));
console.log("      thirty fish, 24h, untouched:  " + JSON.stringify(crowdDay.filter(function (r) { return r.h % 6 === 0; })));

console.log("");
if (fails) {
  console.log(fails + " sim check(s) failed");
  process.exit(1);
}
console.log("all sim checks passed");
