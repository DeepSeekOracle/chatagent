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
  const FACE_RIGHT = { dart: false, ruby: false, veil: false };
  const LIFE = 7 * DAY;
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
  const SPRITES = {};
  const TANKS = { day: new Image(), night: new Image() };
  TANKS.day.src = "./assets/tank-day.jpg";
  TANKS.night.src = "./assets/tank-night.jpg";
  STAGES.forEach(function (pair) {
    SPECIES.forEach(function (sp) {
      const img = new Image();
      img.src = "./assets/fish/" + sp.id + "_" + pair[0] + ".png";
      SPRITES[sp.id + "_" + pair[0]] = img;
    });
  });

  const canvas = document.getElementById("tank");
  const ctx = canvas.getContext("2d");
  let state = null;
  let selected = null;
  let bubbles = [];
  let last = performance.now();

  function specOf(id) { return SPECIES.filter(function (s) { return s.id === id; })[0] || SPECIES[0]; }
  function stageName(age) {
    let name = "baby";
    for (let i = 0; i < STAGES.length; i++) if (age >= STAGES[i][1]) name = STAGES[i][0];
    return name;
  }
  function moodOf(f, now) {
    if (now - f.lastFed > 8 * HOUR) return "sad";
    if (now - f.lastPlay < 20 * 60000) return "happy";
    return "normal";
  }
  function lifeOf(f) { return LIFE + (f.bonus || 0); }
  function ageOf(f, now) { return Math.max(0, now - f.born); }
  function hours(ms) { return Math.round(ms / HOUR * 10) / 10; }
  function price() { return 30 + state.fish.length * 18; }
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
  function fresh() {
    const now = Date.now();
    state = {
      points: 0,
      fish: [
        makeFish("glimmer", "Sunny"),
        makeFish("dart", "Stripe"),
        makeFish("puff", "Coral")
      ],
      cemetery: [],
      log: ["Three fish settle into the glass."],
      lastTick: now,
      owner: "Keeper"
    };
    save();
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
        return;
      }
    } catch (_) {}
    fresh();
  }

  function bury(f, now) {
    const age = ageOf(f, now);
    const row = {
      name: f.name,
      species: f.species,
      score: Math.round(age / HOUR),
      stage: stageName(age),
      date: new Date(now).toISOString().slice(0, 10)
    };
    state.cemetery.unshift(row);
    state.cemetery = state.cemetery.slice(0, 40);
    log(f.name + " rests in the cemetery after " + row.score + " hours.");
    if (window.ArcadeLedger && ArcadeLedger.fish) {
      ArcadeLedger.fish({
        name: row.name,
        score: row.score,
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
      if (ageOf(f, now) >= lifeOf(f)) dead.push(f);
    });
    if (!dead.length) return;
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
    const h = new Date().getHours();
    if (h >= 6 && h < 17) return "day";
    if (h >= 17 && h < 20) return "dusk";
    return "night";
  }

  function stepFish(f, dt) {
    const mood = moodOf(f, Date.now());
    const slow = mood === "sad" ? 0.55 : 1;
    if (f.actionT > 0) {
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
    const age = ageOf(f, now);
    const stage = stageName(age);
    const img = SPRITES[f.species + "_" + stage];
    const sc = STAGE_DRAW[stage] * specOf(f.species).bulk;
    const bh = Math.min(h * 0.22, 150) * sc;
    let bw = bh;
    if (img && img.complete && img.naturalWidth) bw = bh * (img.naturalWidth / img.naturalHeight);
    const bob = Math.sin(now / 400 + f.x * 12) * 6;
    let y = f.y * h + bob;
    if (f.action === "jump") {
      const u = Math.max(0, f.actionT / 1.1);
      y = h * 0.18 - Math.sin((1 - u) * Math.PI) * h * 0.12;
    }
    const x = f.x * w;
    ctx.save();
    ctx.translate(x, y);
    const artRight = FACE_RIGHT[f.species] !== false;
    const face = ((f.vx >= 0) === artRight) ? 1 : -1;
    ctx.scale(face, 1);
    const wag = Math.sin(now / 180 + f.y * 20) * 0.12;
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
    ctx.fillStyle = moodOf(f, now) === "sad" ? "#fb7185" : "#e8eef5";
    ctx.font = "600 13px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.name, x, y - bh / 2 - 8);
  }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const now = Date.now();
    const night = phase() === "night";
    const bg = night ? TANKS.night : TANKS.day;
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
    const list = state.fish.slice().sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (f) { drawFish(f, w, h, now); });
  }

  function renderRail() {
    const now = Date.now();
    const list = document.getElementById("fishList");
    list.innerHTML = state.fish.map(function (f) {
      const age = ageOf(f, now);
      const mood = moodOf(f, now);
      const left = Math.max(0, lifeOf(f) - age);
      return "<button type='button' class='fishline" + (f.id === selected ? " on" : "") + "' data-id='" + f.id + "'><b>" +
        esc(f.name) + "</b> <span class='mood-" + mood + "'>" + mood + "</span><br><span class='lore'>" +
        esc(specOf(f.species).name) + " · " + stageName(age) + " · " + hours(age) + "h · " + hours(left) + "h left</span></button>";
    }).join("") || "<p class='lore'>The tank is empty. Buy a fish.</p>";
    const graves = document.getElementById("graves");
    graves.innerHTML = state.cemetery.slice(0, 8).map(function (g) {
      return "<div class='grave'><b>" + esc(g.name) + "</b><br><span class='lore'>" + esc(g.species) + " · " + g.score + " hours · " + esc(g.stage) + "</span></div>";
    }).join("") || "<p class='lore'>No stones yet.</p>";
    document.getElementById("log").innerHTML = state.log.slice(0, 8).map(function (t) { return "<div>" + esc(t) + "</div>"; }).join("");
    document.getElementById("points").textContent = state.points + " pts";
    const clock = document.getElementById("clock");
    const d = new Date();
    clock.textContent = phase() + " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const now = Date.now();
    catchUp(now);
    state.fish.forEach(function (f) { stepFish(f, dt); });
    if (!state._pts || now - state._pts > 45000) {
      state._pts = now;
      state.fish.forEach(function (f) {
        const m = moodOf(f, now);
        state.points += m === "happy" ? 1 : m === "normal" ? 1 : 0;
      });
      if (state.fish.length) save();
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
    const now = Date.now();
    let n = 0;
    state.fish.forEach(function (f) {
      if (now - f.lastFed > 3 * HOUR) { f.lastFed = now; n++; }
    });
    log(n ? ("Flakes for " + n + ". Mood lifts. Life is still about a week unless you use pellets.") : "They are not hungry yet.");
    save();
    renderRail();
  };
  document.getElementById("pellet").onclick = function () {
    const f = state.fish.filter(function (x) { return x.id === selected; })[0];
    if (!f) { log("Choose a fish for a pellet."); return; }
    if (state.points < 15) { log("A pellet costs 15 points."); return; }
    state.points -= 15;
    f.bonus = Math.min(7 * DAY, (f.bonus || 0) + DAY);
    f.lastFed = Date.now();
    log(f.name + " takes a pellet. One more day on the clock.");
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

  load();
  const owner = document.getElementById("owner");
  if (owner) owner.value = state.owner || "Keeper";
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);
})();
