/* Fish Tank — autonomous aquarium. Age is real time. Saves stay in this browser. */
(() => {
  const SAVE = "lygo_fish_tank_v1";
  const HOUR = 3600000;
  const DAY = 24 * HOUR;
  const STAGES = [
    ["baby", 0],
    ["infant", 2 * HOUR],
    ["child", 6 * HOUR],
    ["teen", 12 * HOUR],
    ["adult", DAY],
    ["elder", 4 * DAY]
  ];
  const STAGE_DRAW = { baby: 0.42, infant: 0.55, child: 0.7, teen: 0.84, adult: 1, elder: 0.95 };
  const FACE_RIGHT = {};
  const LIFE = 7 * DAY;
  const STARVE = 36 * HOUR;
  const FED_FAST = 6 * HOUR;
  const SPECIES = [
    { id: "glimmer", name: "Glimmer", play: "jump", bulk: 1, blurb: "Jumps the surface." },
    { id: "azure", name: "Azure", play: "flare", bulk: 0.92, blurb: "Flares and turns." },
    { id: "dart", name: "Dart", play: "race", bulk: 0.78, blurb: "Races the glass." },
    { id: "puff", name: "Puff", play: "boop", bulk: 0.88, blurb: "Play-bumps friends." },
    { id: "lantern", name: "Lantern", play: "glow", bulk: 0.74, blurb: "Shines after dusk." },
    { id: "moss", name: "Moss", play: "clean", bulk: 0.96, blurb: "Works the gravel." },
    { id: "ruby", name: "Ruby", play: "school", bulk: 1, blurb: "Stays with the school." },
    { id: "veil", name: "Veil", play: "dance", bulk: 1.05, blurb: "Drifts in long arcs." },
    { id: "sunscale", name: "Sunscale", play: "lap", bulk: 1.12, blurb: "Slow laps, larger tips." },
    { id: "pearl", name: "Pearl", play: "flash", bulk: 0.7, blurb: "Flashes a fan tail." }
  ];
  const CREW = [
    { id: "snail", name: "Nerite", cost: 20, blurb: "Scrapes algae off the glass." },
    { id: "otto", name: "Algae eater", cost: 28, blurb: "Lives on the green film." },
    { id: "cory", name: "Cory", cost: 28, blurb: "Bottom feeder. Lifts the waste." },
    { id: "jelly", name: "Moon jelly", cost: 36, blurb: "Pulses when the water is kind." },
    { id: "turtle", name: "Pond turtle", cost: 50, blurb: "Grazes and cruises the whole tank." }
  ];
  const CREW_LIFE = 30 * DAY;
  const CREW_SPRITES = {};
  const CREW_H = { snail: 0.12, otto: 0.075, cory: 0.1, jelly: 0.2, turtle: 0.16 };
  const SPRITES = {};
  const THEMES = {
    river: { id: "river", name: "River garden", blurb: "Clear water, plants, and a stone arch.", temp: 25, algae: 1, day: "tank-day.jpg", night: "tank-night.jpg" },
    coral: { id: "coral", name: "Coral shelf", blurb: "Warm shallows, corals, and an anemone.", temp: 27, algae: 1.15, day: "coral-day.jpg", night: "coral-night.jpg" },
    bog: { id: "bog", name: "Blackwater", blurb: "Tea-stained water, roots, and leaf litter.", temp: 23, algae: 0.7, day: "bog-day.jpg", night: "bog-night.jpg" }
  };
  const THEME_ART = {};
  Object.keys(THEMES).forEach(function (id) {
    THEME_ART[id] = { day: new Image(), night: new Image() };
    THEME_ART[id].day.src = "./assets/" + THEMES[id].day;
    THEME_ART[id].night.src = "./assets/" + THEMES[id].night;
  });
  CREW.forEach(function (c) {
    const img = new Image();
    img.src = "./assets/crew/" + c.id + ".png";
    CREW_SPRITES[c.id] = img;
  });
  STAGES.forEach(function (pair) {
    SPECIES.forEach(function (sp) {
      const img = new Image();
      img.src = "./assets/fish/" + sp.id + "_" + pair[0] + ".png";
      SPRITES[sp.id + "_" + pair[0]] = img;
    });
    ["l", "r"].forEach(function (dir) {
      const img = new Image();
      img.src = "./assets/fish/azure_" + pair[0] + "_" + dir + ".png";
      SPRITES["azure_" + pair[0] + "_" + dir] = img;
    });
  });

  const canvas = document.getElementById("tank");
  const ctx = canvas.getContext("2d");
  let state = null;
  let selected = null;
  let bubbles = [];
  let flakes = [];
  let hand = null;
  let last = performance.now();

  function specOf(id) { return SPECIES.filter(function (s) { return s.id === id; })[0] || SPECIES[0]; }
  function stageName(age) {
    let name = "baby";
    for (let i = 0; i < STAGES.length; i++) if (age >= STAGES[i][1]) name = STAGES[i][0];
    return name;
  }
  function moodOf(f, now) {
    if (state && state.quality < 32) return "sad";
    if (now - f.lastFed > 8 * HOUR) return "sad";
    if (now - f.lastPlay < 20 * 60000 && (!state || state.quality >= 55)) return "happy";
    return "normal";
  }
  function lifeOf(f) { return LIFE + (f.bonus || 0); }
  function ageOf(f, now) { return Math.max(0, now - f.born); }
  function bodyAge(f) { return f.growth || 0; }
  function accrueGrowth(f, now) {
    const from = f.growthAt || f.born || now;
    if (!f.growth) f.growth = 0;
    if (now > from) {
      let t = from;
      const boostEnd = (f.lastFed || f.born || from) + FED_FAST;
      if (t < boostEnd) {
        const end = Math.min(now, boostEnd);
        f.growth += (end - t) * 2.4;
        t = end;
      }
      if (t < now) f.growth += (now - t) * 0.7;
    }
    f.growthAt = now;
  }
  function hours(ms) { return Math.round(ms / HOUR * 10) / 10; }
  function price() { return 30 + state.fish.length * 18; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function crewOf(id) { return CREW.filter(function (c) { return c.id === id; })[0]; }
  function uid() { return "f" + Math.random().toString(36).slice(2, 8); }
  function log(t) {
    state.log.unshift(t);
    state.log = state.log.slice(0, 30);
  }
  function save() {
    try { localStorage.setItem(SAVE, JSON.stringify(state)); } catch (_) {}
  }
  function makeFish(species, name) {
    const now = Date.now();
    return {
      id: uid(),
      species: species,
      name: String(name || specOf(species).name).slice(0, 16),
      born: now,
      bonus: 0,
      growth: 0,
      growthAt: now,
      lastFed: now,
      lastPlay: now,
      x: 0.2 + Math.random() * 0.6,
      y: 0.35 + Math.random() * 0.4,
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.04),
      vy: 0,
      action: "",
      actionT: 0,
      tx: 0,
      ty: 0
    };
  }
  const STARTER_NAMES = { glimmer: "Sunny", dart: "Stripe", puff: "Coral", azure: "Veilblue", lantern: "Wick", moss: "Pebble", ruby: "Disc", veil: "Ribbon", sunscale: "Koi", pearl: "Fan" };
  let playing = false;
  let hasSave = false;
  let menuMode = "standard";
  let menuTheme = "river";
  let menuPicks = ["glimmer", "dart", "puff"];
  let heldOpts = null;
  function themeOf(id) { return THEMES[id] || THEMES.river; }
  function tankAge(now) { return Math.max(0, now - (state.openedAt || now)); }
  function fresh(picks, mode, ownerName, themeId) {
    const ids = (picks && picks.length ? picks : ["glimmer", "dart", "puff"]).slice(0, 3);
    const theme = themeOf(themeId);
    const now = Date.now();
    state = {
      points: 0,
      mode: mode || "standard",
      theme: theme.id,
      openedAt: now,
      fish: ids.map(function (id) { return makeFish(id, STARTER_NAMES[id] || specOf(id).name); }),
      cemetery: [],
      log: ["Three fish settle into the " + theme.name + ". Mode: " + (mode || "standard") + "."],
      lastTick: now,
      owner: String(ownerName || "Keeper").slice(0, 18)
    };
    ensureState();
    if (heldOpts) state.opts = Object.assign(state.opts, heldOpts);
    state.temp = theme.temp;
    state.opts.temp = theme.temp;
    save();
    hasSave = true;
  }
  function ensureState() {
    state.crew = state.crew || [];
    state.cemetery = state.cemetery || [];
    state.log = state.log || [];
    if (state.algae == null) state.algae = 8;
    if (state.quality == null) state.quality = 86;
    if (state.temp == null) state.temp = 25;
    if (!state.waterAt) state.waterAt = Date.now();
    if (!state.theme) state.theme = "river";
    (state.fish || []).forEach(function (f) {
      if (f.growth == null) f.growth = Math.max(0, Date.now() - (f.born || Date.now()));
      if (!f.growthAt) f.growthAt = Date.now();
      if (!f.lastFed) f.lastFed = f.born || Date.now();
    });
    if (!state.openedAt) {
      const births = (state.fish || []).map(function (f) { return f.born; }).filter(Boolean);
      state.openedAt = births.length ? Math.min.apply(null, births) : Date.now();
    }
    state.opts = Object.assign({
      names: true, board: true, motion: true, heater: true, temp: 25, clock: "real"
    }, state.opts || {});
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE) || "null");
      if (raw && Array.isArray(raw.fish)) {
        state = raw;
        state.cemetery = state.cemetery || [];
        state.log = state.log || [];
        state.points = state.points || 0;
        state.owner = state.owner || "Keeper";
        ensureState();
        if (!state.mode) state.mode = "standard";
        hasSave = true;
        return true;
      }
    } catch (_) {}
    hasSave = false;
    return false;
  }
  function makeCrew(role) {
    const spec = crewOf(role);
    return {
      id: uid(),
      role: role,
      name: spec ? spec.name : role,
      born: Date.now(),
      x: 0.15 + Math.random() * 0.7,
      y: role === "jelly" ? 0.28 : 0.8,
      vx: (Math.random() < 0.5 ? -1 : 1) * 0.02,
      wobble: Math.random() * 6
    };
  }

  function bury(f, now) {
    const age = ageOf(f, now);
    const row = {
      name: f.name,
      species: f.species || f.role || "",
      score: Math.round(age / HOUR),
      tankHours: Math.round(tankAge(now) / HOUR),
      theme: themeOf(state.theme).name,
      stage: f.species ? stageName(bodyAge(f)) : "crew",
      date: new Date(now).toISOString().slice(0, 10)
    };
    state.cemetery.unshift(row);
    state.cemetery = state.cemetery.slice(0, 40);
    log(f.cause === "hunger"
      ? (f.name + " dies unfed after " + row.score + " hours.")
      : (f.name + " rests of old age after " + row.score + " hours."));
    if (window.ArcadeLedger && ArcadeLedger.fish) {
      ArcadeLedger.fish({
        name: row.name,
        score: row.score,
        tankHours: row.tankHours,
        theme: row.theme,
        species: row.species,
        stage: row.stage,
        date: row.date,
        event: "life"
      });
    }
  }
  function catchUp(now) {
    const dead = [];
    state.fish.forEach(function (f) {
      accrueGrowth(f, now);
      const hunger = now - (f.lastFed || f.born) >= STARVE;
      const old = bodyAge(f) >= lifeOf(f);
      if (hunger || old) {
        f.cause = hunger ? "hunger" : "age";
        dead.push(f);
      }
    });
    const retired = [];
    (state.crew || []).forEach(function (c) {
      if (now - c.born >= CREW_LIFE) retired.push(c);
    });
    if (retired.length) {
      retired.forEach(function (c) { log(c.name + " finishes a month of work."); });
      state.crew = state.crew.filter(function (c) { return retired.indexOf(c) < 0; });
    }
    if (!dead.length) { if (retired.length) save(); return; }
    dead.forEach(function (f) { bury(f, now); });
    state.fish = state.fish.filter(function (f) { return dead.indexOf(f) < 0; });
    if (selected && dead.some(function (f) { return f.id === selected; })) selected = null;
    if (!state.fish.length) {
      const sp = SPECIES[(Math.random() * SPECIES.length) | 0].id;
      const fry = makeFish(sp, "Fry");
      state.fish.push(fry);
      selected = fry.id;
      log("The glass was empty. A fry drifted in so the tank can go on.");
    }
    save();
  }

  function award(f, n, why) {
    const mood = moodOf(f, Date.now());
    const gain = Math.max(1, Math.round(n * (mood === "happy" ? 1.25 : mood === "sad" ? 0.5 : 1)));
    state.points += gain;
    f.lastPlay = Date.now();
    log(f.name + " " + why + " +" + gain);
  }
  function nearest(f) {
    let best = null, bd = 1e9;
    state.fish.forEach(function (o) {
      if (o === f) return;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  }
  function startPlay(f) {
    const kind = specOf(f.species).play;
    const other = nearest(f);
    f.action = kind;
    f.actionT = kind === "jump" ? 1.1 : kind === "race" ? 2.4 : 1.8;
    if (kind === "race" && other) {
      other.action = "race";
      other.actionT = 2.4;
      f.tx = 0.9; other.tx = 0.9;
      award(f, 8, "races " + other.name);
    } else if (kind === "boop" && other) {
      f.tx = other.x; f.ty = other.y;
      other.action = "boop";
      other.actionT = 1.2;
      award(f, 6, "play-bumps " + other.name);
    } else if (kind === "jump") {
      award(f, 7, "jumps the surface");
    } else if (kind === "glow") {
      award(f, phase() === "night" ? 10 : 4, phase() === "night" ? "lights the night tank" : "glimmers");
    } else if (kind === "clean") {
      f.ty = 0.82;
      award(f, 6, "cleans the gravel");
    } else if (kind === "school") {
      award(f, 3 + Math.min(6, state.fish.length), "keeps the school together");
    } else if (kind === "dance") {
      award(f, 6, "dances a slow circle");
    } else if (kind === "lap") {
      award(f, 8, "finishes a long lap");
    } else if (kind === "flare") {
      award(f, 6, "flares");
    } else if (kind === "flash") {
      award(f, 5, "flashes a fan tail");
    } else {
      award(f, 4, "plays");
    }
  }

  function phase() {
    const mode = state && state.opts && state.opts.clock;
    if (mode === "day") return "day";
    if (mode === "night") return "night";
    const h = new Date().getHours();
    if (h >= 6 && h < 17) return "day";
    if (h >= 17 && h < 20) return "dusk";
    return "night";
  }

  function nearestFlake(f) {
    let best = null;
    let bestD = 0.7;
    flakes.forEach(function (fl) {
      if (fl.gone) return;
      const d = Math.hypot(fl.x - f.x, fl.y - f.y);
      if (d < bestD) { bestD = d; best = fl; }
    });
    return best;
  }
  function startHand(kind) {
    if (!state.fish.length) { log("No one is home to feed."); return false; }
    if (hand || flakes.length) { log("The last pinch is still in the water."); return false; }
    hand = { x: -0.12, t: 0, dur: kind === "pellet" ? 1.6 : 2.6, kind: kind, next: 0.35, drops: 0, max: kind === "pellet" ? 1 : 9 };
    log(kind === "pellet" ? "A hand offers one pellet." : "A hand crosses the glass and spills flakes.");
    return true;
  }
  function stepHand(dt) {
    if (hand) {
      hand.t += dt;
      const u = Math.min(1, hand.t / hand.dur);
      hand.x = -0.12 + u * 1.24;
      if (hand.t >= hand.next && hand.drops < hand.max && hand.x > 0.06 && hand.x < 0.94) {
        hand.drops += 1;
        hand.next = hand.t + (hand.kind === "pellet" ? 0.2 : 0.22);
        flakes.push({
          x: hand.x + (Math.random() - 0.5) * 0.04,
          y: 0.1,
          vy: 0.16 + Math.random() * 0.1,
          age: 0,
          pellet: hand.kind === "pellet"
        });
      }
      if (u >= 1) hand = null;
    }
    flakes.forEach(function (fl) {
      fl.age += dt;
      fl.y += fl.vy * dt;
      fl.x += Math.sin(fl.age * 3) * 0.01 * dt;
      if (fl.y > 0.84) { fl.y = 0.84; fl.vy = 0; }
    });
  }
  function resolveBites() {
    const now = Date.now();
    flakes.forEach(function (fl) {
      if (fl.gone) return;
      const near = state.fish.filter(function (f) {
        return Math.hypot(f.x - fl.x, f.y - fl.y) < 0.06;
      }).sort(function (a, b) {
        return Math.hypot(a.x - fl.x, a.y - fl.y) - Math.hypot(b.x - fl.x, b.y - fl.y);
      });
      if (!near.length) {
        if (fl.age > 8) {
          fl.gone = true;
          state.algae = clamp((state.algae || 0) + (fl.pellet ? 1.5 : 0.6), 0, 100);
        }
        return;
      }
      const winner = near[0];
      near.slice(1).forEach(function (loser) {
        const push = (loser.x - winner.x) || (Math.random() - 0.5);
        loser.vx += push * 1.4;
        loser.vy += 0.08;
        loser.face = loser.vx >= 0 ? 1 : -1;
      });
      winner.lastFed = now;
      winner.lastPlay = now;
      accrueGrowth(winner, now);
      if (fl.pellet) {
        winner.growth += 2 * HOUR;
        winner.bonus = Math.min(14 * DAY, (winner.bonus || 0) + DAY);
        log(near.length > 1
          ? (winner.name + " wins the pellet and grows. " + near[1].name + " is shoved off.")
          : (winner.name + " takes the pellet, grows faster, and gains a day."));
      } else {
        winner.growth += 0.75 * HOUR;
        winner.bonus = Math.min(14 * DAY, (winner.bonus || 0) + 10 * HOUR);
        if (near.length > 1 && Math.random() < 0.45) log(winner.name + " snatches a flake from " + near[1].name + " and grows.");
      }
      state.points += fl.pellet ? 2 : 1;
      fl.gone = true;
    });
    if (flakes.some(function (fl) { return fl.gone; })) {
      flakes = flakes.filter(function (fl) { return !fl.gone; });
      save();
    }
  }
  function drawHand(w, h) {
    if (!hand) return;
    const x = hand.x * w;
    const y = 6 + Math.sin(hand.t * 7) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#f0c9a0";
    ctx.fillRect(-16, -48, 32, 34);
    ctx.beginPath();
    ctx.ellipse(0, 2, 24, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    [-12, -4, 6, 14].forEach(function (fx, i) {
      ctx.beginPath();
      ctx.ellipse(fx, -8, 5, 13, (i - 1.5) * 0.18, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = hand.kind === "pellet" ? "#fbbf24" : "#b45309";
    ctx.beginPath();
    ctx.arc(0, 18, hand.kind === "pellet" ? 6 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawFlakes(w, h) {
    flakes.forEach(function (fl) {
      ctx.fillStyle = fl.pellet ? "#fbbf24" : "#d97706";
      ctx.beginPath();
      ctx.ellipse(fl.x * w, fl.y * h, fl.pellet ? 7 : 3.5, fl.pellet ? 5 : 2.2, fl.age, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function stepFish(f, dt) {
    const mood = moodOf(f, Date.now());
    const slow = mood === "sad" ? 0.55 : 1;
    const bite = nearestFlake(f);
    if (bite) {
      f.actionT = 0;
      f.action = "";
      const hungry = Date.now() - (f.lastFed || 0) > 3 * HOUR;
      const cap = (hungry ? 0.62 : 0.36) * slow;
      let vx = bite.x - f.x;
      let vy = bite.y - f.y;
      const mag = Math.hypot(vx, vy) || 1;
      f.vx = vx / mag * cap;
      f.vy = vy / mag * cap;
      state.fish.forEach(function (o) {
        if (o === f) return;
        if (Math.hypot(o.x - f.x, o.y - f.y) < 0.08 && Math.hypot(o.x - bite.x, o.y - bite.y) < 0.16) {
          f.vx += (f.x - o.x) * 1.1;
          f.vy += (f.y - o.y) * 0.6;
        }
      });
    } else if (f.actionT > 0) {
      f.actionT -= dt;
      if (f.action === "race") f.vx = 0.28 * slow;
      else if (f.action === "dance") {
        f.vx = Math.cos(f.actionT * 3) * 0.08;
        f.vy = Math.sin(f.actionT * 3) * 0.05;
      } else if (f.action === "clean") f.vy = 0.06;
      else if (f.action === "jump") f.vx *= 0.98;
      else if ((f.action === "boop" || f.action === "school") && f.tx) {
        f.vx = (f.tx - f.x) * 0.8;
        f.vy = ((f.ty || f.y) - f.y) * 0.8;
      }
      if (f.actionT <= 0) f.action = "";
    } else {
      if (Math.random() < dt * 0.35) f.vx = (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.05) * slow;
      if (Math.random() < dt * 0.25) f.vy = (Math.random() - 0.5) * 0.04 * slow;
      if (!f.nextPlay) f.nextPlay = Date.now() + 6000 + Math.random() * 14000;
      if (Date.now() > f.nextPlay) {
        f.nextPlay = Date.now() + 14000 + Math.random() * 22000;
        startPlay(f);
      }
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.x < 0.08) { f.x = 0.08; f.vx = Math.abs(f.vx); }
    if (f.x > 0.92) { f.x = 0.92; f.vx = -Math.abs(f.vx); }
    const top = f.action === "jump" ? 0.02 : 0.2;
    if (f.y < top) { f.y = top; f.vy = Math.abs(f.vy); }
    if (f.y > 0.86) { f.y = 0.86; f.vy = -Math.abs(f.vy) * 0.5; }
    f.vy *= 0.98;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(2, r.width * dpr);
    canvas.height = Math.max(2, r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawFish(f, w, h, now) {
    const age = bodyAge(f);
    const stage = stageName(age);
    if (f.vx > 0.004) f.face = 1;
    else if (f.vx < -0.004) f.face = -1;
    const goingRight = f.face !== -1;
    let img = SPRITES[f.species + "_" + stage];
    let useTurn = false;
    if (f.species === "azure") {
      const turned = SPRITES["azure_" + stage + "_" + (goingRight ? "r" : "l")];
      if (turned) { img = turned; useTurn = true; }
    }
    const sc = STAGE_DRAW[stage] * specOf(f.species).bulk;
    const bh = Math.min(h * 0.22, 150) * sc;
    let bw = bh;
    if (img && img.complete && img.naturalWidth) bw = bh * (img.naturalWidth / img.naturalHeight);
    const bob = state.opts.motion === false ? 0 : Math.sin(now / 400 + f.x * 12) * 6;
    let y = f.y * h + bob;
    if (f.action === "jump") {
      const u = Math.max(0, f.actionT / 1.1);
      y = h * 0.18 - Math.sin((1 - u) * Math.PI) * h * 0.12;
    }
    const x = f.x * w;
    ctx.save();
    ctx.translate(x, y);
    const artRight = FACE_RIGHT[f.species] !== false;
    const face = useTurn ? 1 : (((goingRight) === artRight) ? 1 : -1);
    ctx.scale(face, 1);
    const wag = state.opts.motion === false ? 0 : Math.sin(now / 180 + f.y * 20) * 0.12;
    ctx.rotate(wag * (f.action === "flare" ? 2.2 : 1));
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);
    else {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.ellipse(0, 0, bw / 2, bh / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (f.id === selected) {
      ctx.strokeStyle = "#fbbf24";
      ctx.strokeRect(x - bw / 2 - 4, y - bh / 2 - 4, bw + 8, bh + 8);
    }
    if (state.opts.names !== false) {
      ctx.fillStyle = moodOf(f, now) === "sad" ? "#fb7185" : "#e8eef5";
      ctx.font = "600 13px Syne, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.name, x, y - bh / 2 - 8);
    }
  }
  function drawCrew(c, w, h, now) {
    const t = now / 1000 + c.wobble;
    let x = c.x * w;
    let y = c.y * h;
    if (state.opts.motion !== false) {
      if (c.role === "jelly") y += Math.sin(t) * 10;
      else if (c.role === "turtle") y += Math.sin(t * 0.7) * 8;
      else y += Math.sin(t * 1.4) * 3;
    }
    const img = CREW_SPRITES[c.role];
    const bh = h * (CREW_H[c.role] || 0.12);
    let bw = bh;
    if (img && img.complete && img.naturalWidth) bw = bh * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.translate(x, y);
    if (c.role !== "jelly") ctx.scale(c.vx >= 0 ? 1 : -1, 1);
    const wag = state.opts.motion === false || c.role === "jelly" ? 0 : Math.sin(t * 3) * 0.06;
    ctx.rotate(wag);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);
    ctx.restore();
    if (state.opts.names !== false) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 12px Syne, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(c.name, x, y - bh / 2 - 8);
    }
  }
  function stepCrew(c, dt) {
    const slow = c.role === "snail" ? 0.35 : c.role === "jelly" ? 0.45 : 1;
    if (Math.random() < dt * 0.2) c.vx = (Math.random() < 0.5 ? -1 : 1) * 0.025 * slow;
    c.x += c.vx * dt;
    if (c.role === "jelly") c.y = 0.26 + Math.sin(Date.now() / 1400 + c.wobble) * 0.06;
    else if (c.role === "turtle") c.y = 0.48 + Math.sin(Date.now() / 1800 + c.wobble) * 0.12;
    else if (c.role === "otto") c.y = 0.34 + Math.sin(Date.now() / 2200 + c.wobble) * 0.18;
    else c.y = 0.8 + Math.sin(Date.now() / 900 + c.wobble) * 0.03;
    if (c.x < 0.08) { c.x = 0.08; c.vx = Math.abs(c.vx); }
    if (c.x > 0.92) { c.x = 0.92; c.vx = -Math.abs(c.vx); }
  }
  function simWater(now) {
    const hour = new Date().getHours();
    const ambient = 23 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 1.5;
    const target = state.opts.heater ? (state.opts.temp || 25) : ambient;
    state.temp += (target - state.temp) * 0.02;
    const prev = state.waterAt || now;
    const span = Math.min(72, Math.max(0, (now - prev) / HOUR));
    if (span < 0.004) return;
    state.waterAt = now;
    const fishN = state.fish.length;
    const grazers = state.crew.filter(function (c) { return c.role === "snail" || c.role === "otto" || c.role === "turtle"; }).length;
    const bottoms = state.crew.filter(function (c) { return c.role === "cory" || c.role === "turtle"; }).length;
    const day = phase() === "night" ? 0.35 : 1;
    const pace = (state.mode === "calm" ? 0.62 : state.mode === "busy" ? 1.45 : 1) * themeOf(state.theme).algae;
    state.algae = clamp(state.algae + span * pace * (0.9 * day + fishN * 0.32) - span * grazers * 2.1, 0, 100);
    state.quality = clamp(state.quality + span * (bottoms * 1.5 + grazers * 0.35 - fishN * 0.38 - state.algae * 0.03), 0, 100);
  }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const now = Date.now();
    const night = phase() === "night";
    const art = THEME_ART[themeOf(state.theme).id] || THEME_ART.river;
    const bg = night ? art.night : art.day;
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, w, h);
    else {
      ctx.fillStyle = night ? "#071525" : "#0c3a48";
      ctx.fillRect(0, 0, w, h);
    }
    if (phase() === "dusk") {
      ctx.fillStyle = "rgba(40,16,28,0.28)";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.14);
    ctx.bezierCurveTo(w * 0.3, h * 0.12, w * 0.7, h * 0.16, w, h * 0.13);
    ctx.stroke();
    bubbles.forEach(function (b) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2);
      ctx.stroke();
    });
    const film = (state.algae || 0) / 100;
    if (film > 0.02) {
      ctx.fillStyle = "rgba(34,92,28," + (0.08 + film * 0.38) + ")";
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillRect(0, h * 0.16, Math.max(4, w * film * 0.08), h * 0.62);
      ctx.fillRect(w - Math.max(4, w * film * 0.08), h * 0.16, Math.max(4, w * film * 0.08), h * 0.62);
    }
    if ((state.quality || 100) < 60) {
      ctx.fillStyle = "rgba(90,60,20," + ((60 - state.quality) / 180) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    const list = state.fish.slice().sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (f) { drawFish(f, w, h, now); });
    (state.crew || []).forEach(function (c) { drawCrew(c, w, h, now); });
    drawFlakes(w, h);
    drawHand(w, h);
  }

  function renderRail() {
    const now = Date.now();
    const list = document.getElementById("fishList");
    list.innerHTML = state.fish.map(function (f) {
      const mood = moodOf(f, now);
      const starveIn = Math.max(0, STARVE - (now - (f.lastFed || f.born)));
      return "<button type='button' class='fishline" + (f.id === selected ? " on" : "") + "' data-id='" + f.id + "'><b>" +
        esc(f.name) + "</b> <span class='mood-" + mood + "'>" + mood + "</span><br><span class='lore'>" +
        esc(specOf(f.species).name) + " · " + stageName(bodyAge(f)) + " · lived " + hours(ageOf(f, now)) + "h · unfed dies in " + hours(starveIn) + "h</span></button>";
    }).join("") || "<p class='lore'>The tank is empty. Buy a fish.</p>";
    const graves = document.getElementById("graves");
    graves.innerHTML = state.cemetery.slice(0, 8).map(function (g) {
      return "<div class='grave'><b>" + esc(g.name) + "</b><br><span class='lore'>" + esc(g.species) + " · fish " + g.score + "h · tank " + (g.tankHours || 0) + "h · " + esc(g.theme || "") + "</span></div>";
    }).join("") || "<p class='lore'>No stones yet.</p>";
    document.getElementById("log").innerHTML = state.log.slice(0, 8).map(function (t) { return "<div>" + esc(t) + "</div>"; }).join("");
    document.getElementById("points").textContent = state.points + " pts";
    const clock = document.getElementById("clock");
    const d = new Date();
    clock.textContent = themeOf(state.theme).name + " · " + phase() + " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const shop = document.getElementById("shop");
    const cost = price();
    shop.innerHTML = SPECIES.map(function (s) {
      return "<button type='button' class='btn' data-buy='" + s.id + "'>" + esc(s.name) + " · " + cost + "<br><span class='lore'>" + esc(s.blurb) + "</span></button>";
    }).join("");
    const f = state.fish.filter(function (x) { return x.id === selected; })[0];
    const name = document.getElementById("fishName");
    if (document.activeElement !== name) name.value = f ? f.name : "";
    document.getElementById("selMeta").textContent = f
      ? (specOf(f.species).name + " · " + specOf(f.species).blurb)
      : "Click a fish in the tank or the list.";
    const ranked = state.fish.slice().sort(function (a, b) { return ageOf(b, now) - ageOf(a, now); });
    const long = ranked.length ? ageOf(ranked[0], now) : 0;
    const hall = state.cemetery.reduce(function (m, g) { return Math.max(m, g.score || 0); }, 0);
    document.getElementById("mLiving").textContent = String(state.fish.length);
    document.getElementById("mLong").textContent = hours(long) + " h";
    document.getElementById("mTank").textContent = hours(tankAge(now)) + " h";
    document.getElementById("mBest").textContent = hall + " h";
    document.getElementById("mTemp").textContent = (Math.round(state.temp * 10) / 10) + "°";
    document.getElementById("mAlgae").textContent = Math.round(state.algae) + "%";
    const qEl = document.getElementById("mQual");
    qEl.textContent = String(Math.round(state.quality));
    qEl.className = state.quality >= 70 ? "q-good" : state.quality >= 40 ? "q-fair" : "q-poor";
    document.getElementById("board").classList.toggle("hidden", state.opts.board === false);
    document.getElementById("boardRows").innerHTML = "<div class='rowline head'><span>Name</span><span>Kind</span><span>Age</span><span>Mood</span></div>" +
      ranked.map(function (fish) {
        return "<div class='rowline'><span>" + esc(fish.name) + "</span><span>" + esc(specOf(fish.species).name) +
          "</span><span>" + hours(ageOf(fish, now)) + "h</span><span class='mood-" + moodOf(fish, now) + "'>" + moodOf(fish, now) + "</span></div>";
      }).join("") +
      (state.crew || []).map(function (c) {
        return "<div class='rowline'><span>" + esc(c.name) + "</span><span>cleaner</span><span>" +
          hours(ageOf(c, now)) + "h</span><span>work</span></div>";
      }).join("");
    const crewShop = document.getElementById("crewShop");
    crewShop.innerHTML = CREW.map(function (c) {
      const n = state.crew.filter(function (x) { return x.role === c.id; }).length;
      return "<button type='button' class='btn' data-crew='" + c.id + "'>" + esc(c.name) + " · " + c.cost +
        " <span class='lore'>(" + n + ") " + esc(c.blurb) + "</span></button>";
    }).join("");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function loop(t) {
    if (!playing || !state) { requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const now = Date.now();
    catchUp(now);
    simWater(now);
    stepHand(dt);
    state.fish.forEach(function (f) { stepFish(f, dt); });
    resolveBites();
    (state.crew || []).forEach(function (c) { stepCrew(c, dt); });
    if (!state._pts || now - state._pts > 45000) {
      state._pts = now;
      state.fish.forEach(function (f) {
        const m = moodOf(f, now);
        state.points += m === "happy" ? 1 : m === "normal" ? 1 : 0;
      });
      if (state.fish.length) save();
      if (window.ArcadeLedger && ArcadeLedger.fish && (!state._tankPost || now - state._tankPost > HOUR)) {
        state._tankPost = now;
        const lead = state.fish.slice().sort(function (a, b) { return ageOf(b, now) - ageOf(a, now); })[0];
        ArcadeLedger.fish({
          name: state.owner || "Keeper",
          score: lead ? Math.round(ageOf(lead, now) / HOUR) : 0,
          tankHours: Math.round(tankAge(now) / HOUR),
          theme: themeOf(state.theme).name,
          species: lead ? lead.species : "",
          stage: lead ? stageName(bodyAge(lead)) : "",
          fish: lead ? lead.name : "",
          date: new Date(now).toISOString().slice(0, 10),
          event: "tank"
        });
      }
    }
    if (Math.random() < dt * 3) {
      bubbles.push({ x: 0.15 + Math.random() * 0.7, y: 0.84, r: 2 + Math.random() * 4, v: 0.04 + Math.random() * 0.05 });
    }
    bubbles.forEach(function (b) { b.y -= b.v * dt; });
    bubbles = bubbles.filter(function (b) { return b.y > 0.12; });
    if (!state._paint || now - state._paint > 400) {
      state._paint = now;
      renderRail();
    }
    resize();
    draw();
    requestAnimationFrame(loop);
  }

  function pick(id) { selected = id; renderRail(); }
  document.getElementById("fishList").onclick = function (e) {
    const b = e.target.closest("[data-id]");
    if (b) pick(b.getAttribute("data-id"));
  };
  canvas.addEventListener("click", function (e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    let best = null, bd = 0.08;
    state.fish.forEach(function (f) {
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f; }
    });
    if (best) pick(best.id);
  });
  document.getElementById("fishName").addEventListener("change", function (e) {
    const f = state.fish.filter(function (x) { return x.id === selected; })[0];
    if (!f) return;
    f.name = String(e.target.value || f.name).slice(0, 16);
    save();
    renderRail();
  });
  document.getElementById("feed").onclick = function () {
    if (!startHand("flakes")) return;
    state.algae = clamp((state.algae || 0) + 3, 0, 100);
    renderRail();
  };
  document.getElementById("pellet").onclick = function () {
    if (!state.fish.length) { log("No one is home to feed."); return; }
    if (state.points < 15) { log("A pellet costs 15 points."); return; }
    state.points -= 15;
    if (!startHand("pellet")) { state.points += 15; return; }
    save();
    renderRail();
  };
  document.getElementById("shop").onclick = function (e) {
    const b = e.target.closest("[data-buy]");
    if (!b) return;
    if (state.fish.length >= 12) { log("The tank holds twelve."); return; }
    const cost = price();
    if (state.points < cost) { log("Need " + cost + " points."); return; }
    state.points -= cost;
    const sp = b.getAttribute("data-buy");
    const fish = makeFish(sp, specOf(sp).name);
    state.fish.push(fish);
    selected = fish.id;
    log(fish.name + " joins. A baby.");
    save();
    renderRail();
  };
  document.getElementById("owner").addEventListener("change", function (e) {
    state.owner = String(e.target.value || "Keeper").slice(0, 18);
    save();
  });
  document.getElementById("change").onclick = function () {
    if (state.points < 10) { log("A water change costs 10 points."); return; }
    state.points -= 10;
    state.algae = clamp(state.algae - 28, 0, 100);
    state.quality = clamp(state.quality + 24, 0, 100);
    log("You change a third of the water. Algae drops. The glass clears.");
    save();
    renderRail();
  };
  document.getElementById("crewShop").onclick = function (e) {
    const b = e.target.closest("[data-crew]");
    if (!b) return;
    if (state.crew.length >= 8) { log("Eight cleaners fill the work."); return; }
    const spec = crewOf(b.getAttribute("data-crew"));
    if (!spec) return;
    if (state.points < spec.cost) { log(spec.name + " costs " + spec.cost + " points."); return; }
    state.points -= spec.cost;
    state.crew.push(makeCrew(spec.id));
    log(spec.name + " starts work.");
    save();
    renderRail();
  };
  function syncOpt() {
    const o = state.opts;
    document.getElementById("optNames").checked = o.names !== false;
    document.getElementById("optBoard").checked = o.board !== false;
    document.getElementById("optMotion").checked = o.motion !== false;
    document.getElementById("optHeater").checked = !!o.heater;
    document.getElementById("optClock").value = o.clock || "real";
    document.getElementById("optTemp").value = String(o.temp || 25);
    document.getElementById("optTempVal").textContent = (o.temp || 25) + "°";
  }
  function readOpt() {
    const o = state.opts;
    o.names = document.getElementById("optNames").checked;
    o.board = document.getElementById("optBoard").checked;
    o.motion = document.getElementById("optMotion").checked;
    o.heater = document.getElementById("optHeater").checked;
    o.clock = document.getElementById("optClock").value || "real";
    o.temp = Number(document.getElementById("optTemp").value) || 25;
    document.getElementById("optTempVal").textContent = o.temp + "°";
    heldOpts = Object.assign({}, o);
    if (hasSave) save();
    if (playing) renderRail();
  }
  function showMenu() {
    playing = false;
    const cont = document.getElementById("menuContinue");
    if (cont) cont.disabled = !hasSave;
    document.getElementById("menu").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    paintCast();
  }
  function enterTank() {
    playing = true;
    last = performance.now();
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    const ownerEl = document.getElementById("owner");
    if (ownerEl) ownerEl.value = state.owner || "Keeper";
    resize();
    renderRail();
  }
  function paintCast() {
    const box = document.getElementById("menuCast");
    if (!box) return;
    box.innerHTML = SPECIES.map(function (s) {
      const on = menuPicks.indexOf(s.id) >= 0;
      return "<button type='button' data-pick='" + s.id + "' class='" + (on ? "on" : "") + "'>" + esc(s.name) + "</button>";
    }).join("");
  }
  function showPanel(which) {
    ["panelHome", "panelNew", "panelHow"].forEach(function (id) {
      document.getElementById(id).classList.toggle("hidden", id !== which);
    });
  }
  document.getElementById("menuContinue").onclick = function () {
    if (!hasSave || !state) return;
    enterTank();
  };
  document.getElementById("menuNew").onclick = function () { showPanel("panelNew"); paintCast(); };
  document.getElementById("menuHow").onclick = function () { showPanel("panelHow"); };
  document.getElementById("menuBack").onclick = function () { showPanel("panelHome"); };
  document.getElementById("howBack").onclick = function () { showPanel("panelHome"); };
  document.getElementById("menuOpt").onclick = function () {
    if (!state) {
      state = { fish: [], crew: [], cemetery: [], log: [], points: 0, owner: "Keeper", opts: heldOpts || {} };
      ensureState();
    }
    syncOpt();
    document.getElementById("optLayer").classList.remove("hidden");
  };
  document.getElementById("menuCast").onclick = function (e) {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    const id = b.getAttribute("data-pick");
    const ix = menuPicks.indexOf(id);
    if (ix >= 0) menuPicks.splice(ix, 1);
    else if (menuPicks.length < 3) menuPicks.push(id);
    paintCast();
    document.getElementById("menuNote").textContent = menuPicks.length === 3 ? "Three chosen." : ("Choose " + (3 - menuPicks.length) + " more.");
  };
  document.querySelectorAll("[data-theme]").forEach(function (btn) {
    btn.onclick = function () {
      menuTheme = btn.getAttribute("data-theme") || "river";
      document.querySelectorAll("[data-theme]").forEach(function (el) { el.classList.toggle("on", el === btn); });
    };
  });
  document.querySelectorAll("[data-mode]").forEach(function (btn) {
    btn.onclick = function () {
      menuMode = btn.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(function (el) { el.classList.toggle("on", el === btn); });
    };
  });
  document.getElementById("menuOpen").onclick = function () {
    if (menuPicks.length !== 3) {
      document.getElementById("menuNote").textContent = "Pick exactly three fish.";
      return;
    }
    const ownerName = document.getElementById("menuOwner").value;
    fresh(menuPicks.slice(), menuMode, ownerName, menuTheme);
    enterTank();
  };
  document.getElementById("btnMenu").onclick = function () {
    if (state) save();
    showMenu();
  };
  document.getElementById("btnOpt").onclick = function () {
    syncOpt();
    document.getElementById("optLayer").classList.remove("hidden");
  };
  document.getElementById("optClose").onclick = function () {
    readOpt();
    document.getElementById("optLayer").classList.add("hidden");
  };
  ["optNames", "optBoard", "optMotion", "optHeater", "optClock"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", readOpt);
  });
  document.getElementById("optTemp").addEventListener("input", readOpt);
  document.getElementById("optReset").onclick = function () {
    if (!window.confirm("Clear this tank, the cleaners, and the cemetery in this browser?")) return;
    fresh();
    const ownerEl = document.getElementById("owner");
    if (ownerEl) ownerEl.value = state.owner || "Keeper";
    document.getElementById("optLayer").classList.add("hidden");
    renderRail();
  };

  load();
  showMenu();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);
})();
