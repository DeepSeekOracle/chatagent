/* LYGO Arena — the shell.
   The menu, the draft, the fight HUD and the results board. The engine owns the battle;
   this file owns everything a spectator reads: who is on the floor, who is winning, what
   just happened, and what the champions actually do to each other. */
(function (w) {
  "use strict";
  const R = w.LYGO_ARENA;
  const E = w.ArenaEngine;
  const SAVE = "lygo_lattice_arena_v1";
  const $ = (id) => document.getElementById(id);
  const el = (t, cls, html) => { const e = document.createElement(t); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const persist = Object.assign(
    { team: ["kael", "vale", "lyra"], mode: 3, speed: 1, wins: 0, losses: 0, filter: "champ", name: "", books: {}, bestStreak: 0 },
    (() => { try { return JSON.parse(localStorage.getItem(SAVE) || "{}"); } catch (e) { return {}; } })()
  );
  function save() {
    persist.team = your.slice();
    try { localStorage.setItem(SAVE, JSON.stringify(persist)); } catch (e) {}
  }

  let your = (persist.team || []).filter((id) => R.byId[id]).slice(0, 5);
  let foeIds = [];
  let lastMatch = null;
  let rows = { you: [], foe: [] };
  let feedLen = 0;
  let overlayMode = null;
  let gateHeld = false;
  let menuTab = "home";
  let inspectId = "kael";
  let hallRows = [];
  let gauntlet = false;
  let streak = 0;
  let nextSeed = 0;

  const MODE_LABEL = { 1: "1v1", 2: "2v2", 3: "3v3", 5: "5v5" };

  /* ------------------------------------------------------------------ sound --- */
  const SFX_NAMES = ["click", "count", "fight", "hit", "big", "cast", "heal", "summon", "kill", "warn", "win", "lose"];
  const SFX_GAIN = { click: 0.35, count: 0.4, hit: 0.32, cast: 0.38, big: 0.5, heal: 0.42, summon: 0.46, kill: 0.5, warn: 0.46, fight: 0.5, win: 0.55, lose: 0.5 };
  let audio = null, muted = false, sfxBuf = {}, sfxReady = false, sfxGate = 0, lastCount = "", fought = false;
  function ensureAudio() {
    if (!audio) audio = new (w.AudioContext || w.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    return audio;
  }
  function loadSfx() {
    const ctx = ensureAudio();
    const kit = (w.LYGO_ATTACKS && w.LYGO_ATTACKS.sfxNames()) || [];
    const names = SFX_NAMES.concat(kit.filter((n) => SFX_NAMES.indexOf(n) < 0));
    return Promise.all(names.map((name) => fetch("./assets/sfx/" + name + ".wav")
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => { sfxBuf[name] = decoded; })
      .catch(() => {}))).then(() => { sfxReady = true; });
  }
  function blip(type, gain) {
    if (muted) return;
    try {
      const ctx = ensureAudio();
      const buf = sfxBuf[type];
      if (buf) {
        const src = ctx.createBufferSource();
        const g = ctx.createGain();
        src.buffer = buf;
        g.gain.value = gain || SFX_GAIN[type] || 0.36;
        src.connect(g); g.connect(ctx.destination);
        src.start();
        return;
      }
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(440, t);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.09);
    } catch (e) {}
  }
  function playEvent(ev) {
    const now = performance.now();
    if (ev.kind === "kill") { blip("kill"); return; }
    if (ev.kind === "gift") { blip("heal"); return; }
    if (ev.kind === "summon") { blip("summon"); return; }
    if (ev.kind === "warn") { blip("warn"); return; }
    if (ev.kind === "move") {
      if (ev.sfx) { blip(ev.sfx, 0.4); return; }
      if (now - sfxGate < 120) return;
      sfxGate = now;
      blip(/falls|cuts down|heavy|slam/i.test(ev.text || "") ? "big" : "cast");
    }
  }

  /* ------------------------------------------------------------ gate/hall --- */
  function gateHold(on, ms) {
    gateHeld = !!on;
    try {
      if (w.LYGO_GATE && w.LYGO_GATE.hold) w.LYGO_GATE.hold(on);
      if (on === false && ms && w.LYGO_GATE.suppress) w.LYGO_GATE.suppress(ms);
    } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function teamKey() { return persist.mode + "|" + your.join(","); }
  function teamNames() { return your.map((id) => (R.byId[id] ? R.byId[id].name : id)); }
  function touchBook(won) {
    persist.books = persist.books || {};
    const key = teamKey();
    const row = persist.books[key] || { wins: 0, losses: 0 };
    row.names = teamNames();
    row.mode = MODE_LABEL[persist.mode];
    if (won) row.wins++;
    else row.losses++;
    persist.books[key] = row;
    return row;
  }
  function bookLines() {
    const books = persist.books || {};
    return Object.keys(books).map((k) => {
      const b = books[k];
      const modeN = k.split("|")[0];
      return {
        name: persist.name || "You",
        wins: b.wins || 0,
        losses: b.losses || 0,
        mode: b.mode || MODE_LABEL[modeN] || modeN,
        team: (b.names || []).join(" · "),
        teamKey: k.split("|")[1] || ""
      };
    }).filter((b) => b.wins || b.losses).sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses));
  }
  function lineupBook() {
    return (persist.books || {})[teamKey()] || { wins: 0, losses: 0 };
  }
  function recordLine(r, local) {
    const team = r.team || "";
    return "<div class='hall-line" + (local ? " local" : "") + "'><b>" + esc(r.name || "Spectator") + "</b>" +
      "<span><span class='wins'>" + (r.wins || 0) + "W</span> / <span class='losses'>" + (r.losses || 0) + "L</span></span>" +
      "<em>" + esc(r.mode || "") + (team ? " · " + esc(team) : "") + "</em></div>";
  }
  function postResult(won, mode, mvp) {
    const name = (persist.name || "").trim().slice(0, 18);
    if (!name) return;
    const book = (persist.books || {})[teamKey()] || { wins: 0, losses: 0 };
    const match = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try {
      if (w.ArcadeLedger && w.ArcadeLedger.arena) {
        w.ArcadeLedger.arena({
          name: name,
          score: book.wins,
          wins: book.wins,
          losses: book.losses,
          mode: MODE_LABEL[mode],
          team: teamNames().join(" · "),
          teamKey: your.join(","),
          outcome: won ? "win" : "loss",
          mvp: mvp || "",
          match: match,
          date: new Date().toISOString().slice(0, 10)
        });
      }
    } catch (e) {}
  }
  const HALL_FEEDS = [
    "https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins/resolve/main/arcade.json",
    "https://deepseekoracle-lattice-marines-ledger.hf.space/arcade.json",
    "https://deepseekoracle-lattice-marines-ledger.hf.space/arena/ledger.json"
  ];
  function rowsFromHall(data) {
    if (!data) return [];
    if (data.books && data.books["lattice-arena"]) {
      const book = data.books["lattice-arena"];
      return book.rows || book.standings || [];
    }
    if (Array.isArray(data.standings)) return data.standings;
    if (Array.isArray(data.rows)) return data.rows;
    return [];
  }
  async function pullHall() {
    for (let i = 0; i < HALL_FEEDS.length; i++) {
      try {
        const r = await fetch(HALL_FEEDS[i], { cache: "no-store" });
        if (!r.ok) continue;
        const list = rowsFromHall(await r.json());
        if (list && list.length) {
          hallRows = list.slice();
          if (overlayMode === "menu") {
            document.querySelectorAll(".hall-live").forEach((box) => { box.innerHTML = hallBlock(); });
          }
          return;
        }
      } catch (e) {}
    }
  }
  function hallBlock() {
    const pub = hallRows.slice().sort((a, b) => ((b.wins || 0) - (a.wins || 0)) || ((a.losses || 0) - (b.losses || 0)));
    const mine = bookLines();
    let html = "";
    if (pub.length) html += pub.slice(0, 12).map((r) => recordLine(r, false)).join("");
    else html += "<p class='muted'>The public hall is empty. A named finish is the first line.</p>";
    if (mine.length) {
      html += "<p class='kicker' style='margin-top:.8rem'>This browser</p>";
      html += mine.slice(0, 8).map((r) => recordLine(r, true)).join("");
    }
    return html;
  }

  /* ---------------------------------------------------------------- menu --- */
  function modeCards() {
    return [1, 2, 3, 5].map((n) => {
      const on = persist.mode === n ? " on" : "";
      return "<button type='button' class='mode-card" + on + "' data-mode='" + n + "'>" +
        "<b>" + MODE_LABEL[n] + "</b><span>" +
        ({ 1: "one on one — the clean read", 2: "pairs, every kit matters", 3: "the classic team fight", 5: "a full roster war" }[n]) +
        "</span></button>";
    }).join("");
  }
  function artSrc(f) {
    return f.portrait ? "./assets/" + f.portrait : E.iconFor(f);
  }
  function stashRadio() {
    const dock = $("radioDock");
    const home = $("battleRadio");
    if (dock && home && dock.parentElement !== home) home.appendChild(dock);
  }
  function placeRadio() {
    const dock = $("radioDock");
    const opt = $("optRadio");
    const home = $("battleRadio");
    const dest = menuTab === "options" && opt ? opt : home;
    if (dock && dest && dock.parentElement !== dest) dest.appendChild(dock);
  }
  function paintSfx() {
    document.querySelectorAll("[data-act='mute']").forEach((b) => {
      b.classList.toggle("on", muted);
      b.textContent = muted ? "SFX off" : "SFX on";
    });
  }
  function lineupNames() {
    return your.map((id) => (R.byId[id] ? R.byId[id].name : id)).join(", ");
  }
  function rosterButton(f) {
    const on = inspectId === f.id ? " on" : "";
    const picked = your.includes(f.id) ? " picked" : "";
    return "<button type='button' class='rpick" + on + picked + "' data-id='" + f.id + "'>" +
      "<img src='" + artSrc(f) + "' alt=''><span><b>" + esc(f.name) + "</b><u>" + esc(f.tag) + "</u></span></button>";
  }
  function dossierHtml(f) {
    if (!f) return "<p class='muted'>Pick a name from the list.</p>";
    const mates = your.map((id) => R.byId[id]).filter(Boolean);
    const b = R.build(f, mates.length ? mates : [f], null, Math.random);
    const picked = your.includes(f.id);
    const full = !picked && your.length >= persist.mode;
    const stats = [
      ["Health", b.max], ["Damage", Math.round(b.dmg)], ["Attacks", b.rate.toFixed(2) + "/s"],
      ["Speed", f.speed.toFixed(1)], ["Armor", b.armor], ["Range", f.range.toFixed(1)],
      ["Mana", b.manaMax], ["Crit", Math.round(b.crit * 100) + "%"], ["Power", b.power]
    ];
    const moves = (b.moves || []).map((m) => "<li><b>" + esc(m.name) + "</b><span>" + esc(m.text || "") + "</span></li>").join("");
    const cards = (f.cards || []).map((id) => {
      const c = R.CARDS[id];
      if (!c) return "";
      return "<li><b>" + esc(c.name) + "</b><i>" + esc(c.tag) + "</i><span>" + esc(c.text || "") + "</span></li>";
    }).join("");
    const clsName = { champ: "Champion", beast: "Crypt creature", pet: "Beast" }[f.cls] || f.cls;
    return "<article class='dossier'>" +
      "<div class='dossier-hero'>" +
        "<img class='" + (f.portrait ? "" : "spr") + "' src='" + artSrc(f) + "' alt=''>" +
        "<div><p class='kicker'>" + esc(clsName) + "</p><h2>" + esc(f.name) + "</h2>" +
        "<p class='tagline'>" + esc(f.tag) + "</p>" +
        "<p>" + esc(f.bio) + "</p>" +
        "<p class='fcounter'>" + esc(f.counter) + "</p>" +
        (f.atk ? "<p class='muted'>Basic attack: " + esc(f.atk.name) + "</p>" : "") +
        "<button type='button' class='btn gold' data-add='" + f.id + "'" + (full ? " disabled" : "") + ">" +
          (picked ? "Remove from team" : full ? "Team is full" : "Add to team") + "</button></div></div>" +
      "<div class='stat-grid'>" + stats.map(([k, v]) => "<div><b>" + v + "</b><span>" + k + "</span></div>").join("") + "</div>" +
      "<h3>Moves</h3><ul class='kit-list'>" + (moves || "<li><span>No special moves.</span></li>") + "</ul>" +
      "<h3>Cards</h3><ul class='kit-list'>" + (cards || "<li><span>No cards.</span></li>") + "</ul></article>";
  }
  function screenTitle() {
    const line = lineupBook();
    const ready = your.length === persist.mode && !!(persist.name || "").trim();
    const names = lineupNames() || "no one fielded";
    return "<div class='title-screen'>" +
      "<div class='title-art'><img src='./assets/menu.jpg' alt='Four fighters at a cyan lattice gate in a torchlit stone crypt' width='1280' height='720'></div>" +
      "<div class='title-panel'>" +
        "<p class='kicker'>Δ9Φ963 · chatagent.ca</p><h1>LYGO Arena</h1>" +
        "<p class='lede'>Two AI teams. One stone ring. Name yourself, build a team, then watch them fight.</p>" +
        "<label class='name-block'>Your name<input class='callsign' id='callSign' maxlength='18' value='" + esc(persist.name || "") + "' placeholder='What should the hall call you?' autocomplete='nickname'></label>" +
        "<div class='menu-actions'>" +
          "<button type='button' class='btn gold' id='btnFight'" + (ready ? "" : "") + "><b>Fight</b><span>" + MODE_LABEL[persist.mode] + " · " + esc(names) + "</span></button>" +
          "<button type='button' class='btn' id='btnGauntlet'><b>Gauntlet</b><span>Same team. A new ring after every win. Best streak " + (persist.bestStreak || 0) + ".</span></button>" +
          "<button type='button' class='btn' data-tab='team'><b>Team select</b><span>" + your.length + "/" + persist.mode + " picked · read a kit before you field it</span></button>" +
          "<button type='button' class='btn' data-tab='options'><b>Options</b><span>Fight sounds, speed, and the radio</span></button>" +
          "<button type='button' class='btn' data-tab='how'><b>How to play</b><span>What the teams actually do</span></button>" +
          "<button type='button' class='btn' data-tab='hall'><b>Hall</b><span>Win / loss lines for named teams</span></button>" +
        "</div>" +
        "<p class='tally'><b>This lineup</b> <span class='wins'>" + (line.wins || 0) + "W</span> / <span class='losses'>" + (line.losses || 0) + "L</span>" +
          " · <b>This browser</b> <span class='wins'>" + persist.wins + "W</span> / <span class='losses'>" + persist.losses + "L</span>" +
          " · <b>Best gauntlet</b> " + (persist.bestStreak || 0) + "</p>" +
        (ready ? "" : "<p class='muted'>" + (your.length < persist.mode ? "Team select still needs " + (persist.mode - your.length) + " more." : "Put your name in. The hall keeps it with this team.") + "</p>") +
        "<div class='donate-row'>" +
          "<a class='donate-paypal' href='https://www.paypal.com/paypalme/ExcavationPro' target='_blank' rel='noopener'>PayPal.me/ExcavationPro</a>" +
          "<a class='donate-patreon' href='https://www.patreon.com/Excavationpro/posts/chatagent-ca-api-170485961' target='_blank' rel='noopener'>Patreon</a>" +
        "</div>" +
        "<p class='muted'>Optional. The arena stays free.</p>" +
      "</div></div>";
  }
  function screenTeam() {
    const list = R.ROSTER.filter((f) => f.cls === persist.filter);
    const look = R.byId[inspectId] || list[0] || R.ROSTER[0];
    if (look) inspectId = look.id;
    const filters = [
      ["champ", "Champions"], ["beast", "Creatures"], ["pet", "Beasts"]
    ].map(([id, label]) => "<button type='button' class='tab" + (persist.filter === id ? " on" : "") + "' data-filter='" + id + "'>" + label + "</button>").join("");
    const tray = your.length ? your.map((id) => {
      const f = R.byId[id];
      return "<button type='button' class='slot' data-drop='" + f.id + "'><img src='" + artSrc(f) + "' alt=''><b>" + esc(f.name) + "</b></button>";
    }).join("") : "<p class='muted'>No one fielded yet.</p>";
    return "<div class='team-screen'>" +
      "<div class='team-head'><div class='team-title'><button type='button' class='btn' data-tab='home'>Back</button>" +
        "<h2>Team select <span>" + your.length + "/" + persist.mode + "</span></h2></div>" +
        "<div class='modes'>" + modeCards() + "</div></div>" +
      "<div class='team-body'><div class='roster-col'>" +
        "<div class='filters'>" + filters +
          "<button type='button' class='tab' data-draft='1'>Random</button>" +
          "<button type='button' class='tab' data-clear='1'>Clear</button></div>" +
        list.map(rosterButton).join("") +
      "</div>" + dossierHtml(look) + "</div>" +
      "<div class='team-foot'><div class='tray'>" + tray + "</div>" +
        "<button type='button' class='btn gold' data-tab='home'>Done</button></div></div>";
  }
  function screenOptions() {
    const speeds = [1, 2, 4, 8].map((n) => "<button type='button' class='btn ghost" + (persist.speed === n ? " on" : "") + "' data-speed='" + n + "'>" + n + "×</button>").join("");
    return "<div class='plain-screen'>" +
      "<button type='button' class='btn' data-tab='home'>Back</button>" +
      "<p class='kicker'>Options</p><h1>Options</h1>" +
      "<h2>Fight sounds</h2>" +
      "<p class='lede'>These are the hits, casts, and the result. The radio is separate.</p>" +
      "<button type='button' class='btn" + (muted ? " on" : "") + "' data-act='mute'>" + (muted ? "SFX off" : "SFX on") + "</button>" +
      "<h2>Battle speed</h2><div class='speed'>" + speeds + "</div>" +
      "<h2>Radio</h2>" +
      "<p class='lede'>Excavationpro, from the listen portal. It keeps playing when the fight starts. Mute here is the music.</p>" +
      "<div id='optRadio'></div>" +
      "<p style='margin-top:.8rem'><button type='button' class='btn' data-act='full'>Fullscreen</button></p>" +
      "</div>";
  }
  function screenHow() {
    return "<div class='plain-screen how'>" +
      "<button type='button' class='btn' data-tab='home'>Back</button>" +
      "<p class='kicker'>Guide</p><h1>How to play</h1><ol>" +
      "<li>Put your name in on the title screen. The hall keeps a win/loss line for that name and the exact team you field.</li>" +
      "<li>Team select is its own screen. Choose 1v1, 2v2, 3v3, or 5v5, then open a fighter and read the stats, moves, and cards. Add the ones you want.</li>" +
      "<li>Both sides are AI. Nobody is steered. Each kit swings its own attack: Ashmane bites, Tuskward tramples, and the champions do not share a swing.</li>" +
      "<li>Ranged kits kite, melee kits commit, healers wait for a wound, and a body that has not landed a hit in five seconds stops being careful and charges.</li>" +
      "<li>Challengers are drawn from the full roster, so you never know what walks in.</li>" +
      "<li>Every ring has a law, named before the fight. Stone takes no side. Frost shortens every stride. Ember burns the centre. Gold sparks the killer. Lattice hurries cooldowns. Void leaves a slow pocket where a body falls. Tide shoves the floor. Root feeds whoever is still standing.</li>" +
      "<li>Gauntlet keeps this team and draws a new ring after each win. The streak stays on this browser. Each fight still posts as a normal hall line.</li>" +
      "<li>The radio lives in Options, and on the dock once a fight is open. <b>SFX</b> (or <b>M</b>) mutes the fight sounds only.</li>" +
      "<li>Keys during a fight: <b>Space</b> pause · <b>1 2 3 4</b> speed · <b>M</b> fight sounds · <b>Esc</b> title · <b>R</b> rematch.</li>" +
      "</ol></div>";
  }
  function screenHall() {
    return "<div class='plain-screen'>" +
      "<button type='button' class='btn' data-tab='home'>Back</button>" +
      "<p class='kicker'>Live hall</p><h1>Hall</h1>" +
      "<p class='lede'>Each line is one player and one lineup. The public book is the shared hall. This browser keeps its own copy until that write lands.</p>" +
      "<div class='hall-live'>" + hallBlock() + "</div>" +
      "<p class='muted' style='margin-top:.8rem'><a href='./ledger.html'>Open the full hall</a></p></div>";
  }
  function renderMenu() {
    const root = $("menu");
    const keepScroll = (root.querySelector(".roster-col") || {}).scrollTop || 0;
    stashRadio();
    overlayMode = "menu";
    /* every route back to the menu — Escape, the Menu button, "change team" from the results
       board — lands here, so this is the one place the reminder hold has to be released.
       Leaving it held would keep the supporter card away for the rest of the visit. */
    if (gateHeld) gateHold(false, 120000);
    $("menu").classList.remove("hidden");
    $("battle").classList.add("hidden");
    document.body.classList.add("in-menu");
    document.body.classList.remove("in-battle");
    $("overlay").className = "overlay";
    const pages = { home: screenTitle, team: screenTeam, options: screenOptions, how: screenHow, hall: screenHall };
    root.innerHTML = (pages[menuTab] || screenTitle)();
    placeRadio();
    const named = $("callSign");
    if (named) {
      named.addEventListener("input", () => {
        persist.name = named.value.replace(/\s+/g, " ").trim().slice(0, 18);
        save();
      });
    }
    const col = root.querySelector(".roster-col");
    if (col) col.scrollTop = keepScroll;
    const seen = root.querySelector(".rpick.on");
    if (seen && keepScroll === 0) seen.scrollIntoView({ block: "nearest" });
  }

  function onMenuClick(ev) {
    const t = ev.target.closest("[data-mode],[data-id],[data-drop],[data-filter],[data-draft],[data-clear],[data-tab],[data-add]");
    if (!t) return;
    blip("click");
    if (t.dataset.tab) { menuTab = t.dataset.tab; renderMenu(); return; }
    if (t.dataset.mode) {
      persist.mode = +t.dataset.mode;
      while (your.length > persist.mode) your.pop();
      menuTab = "team";
      save(); renderMenu(); return;
    }
    if (t.dataset.filter) { persist.filter = t.dataset.filter; menuTab = "team"; save(); renderMenu(); return; }
    if (t.dataset.draft) {
      your = R.draw(persist.mode).map((f) => f.id);
      inspectId = your[0] || inspectId;
      menuTab = "team";
      save(); renderMenu(); return;
    }
    if (t.dataset.clear) { your = []; menuTab = "team"; save(); renderMenu(); return; }
    if (t.dataset.drop) {
      your = your.filter((id) => id !== t.dataset.drop);
      inspectId = t.dataset.drop;
      menuTab = "team";
      save(); renderMenu(); return;
    }
    if (t.dataset.add) {
      const id = t.dataset.add;
      if (your.includes(id)) your = your.filter((x) => x !== id);
      else if (your.length < persist.mode) your = your.concat([id]);
      inspectId = id;
      menuTab = "team";
      save(); renderMenu(); return;
    }
    if (t.dataset.id) {
      inspectId = t.dataset.id;
      menuTab = "team";
      renderMenu();
    }
  }

  /* ------------------------------------------------------------------ VS --- */
  function renderVS() {
    const ov = $("overlay");
    overlayMode = "vs";
    const you = your.map((id) => R.byId[id]);
    const foe = foeIds.map((id) => R.byId[id]);
    const side = (list, cls) => "<div class='vside " + cls + "'>" + list.map((f) => {
      const b = R.build(f, [], null, Math.random);
      return "<div class='vcard'><img src='" + (f.portrait ? "./assets/" + f.portrait : E.iconFor(f)) + "' alt=''>" +
        "<div><b>" + f.name + "</b><u>" + f.tag + "</u>" + b.moves.map((m) => "<em>" + m.name + "</em>").join("") +
        "<span class='pw'>PWR " + b.power + "</span></div></div>";
    }).join("") + "</div>";
    ov.className = "overlay show";
    const law = E.lawFor(nextSeed);
    ov.innerHTML = "<div class='sheet vs-sheet'><h1 class='vs'>" + (gauntlet ? "Gauntlet " + streak + " · " : "") + MODE_LABEL[persist.mode] + "</h1>" +
      "<p class='kicker'>" + esc(law.name) + "</p>" +
      "<div class='vsgrid'>" + side(you, "you") + "<div class='vsmark'>vs</div>" + side(foe, "foe") + "</div>" +
      "<p class='lede center'>" + esc(law.line) + (gauntlet ? " Win, and the next ring draws new challengers." : " The challengers are drawn from the full roster.") + "</p>" +
      "<div class='modes'><button type='button' class='btn gold big' id='btnGo'>Open the arena</button>" +
      "<button type='button' class='btn' id='btnBackMenu'>Change team</button></div></div>";
    label = "vs";
    ov.onclick = (ev) => {
      /* the challengers shown on this sheet are the ones that fight: begin(false) keeps the
         set drawn when Fight was pressed, so the reveal is never a lie. */
      const go = ev.target.closest && ev.target.closest("#btnGo");
      const back = ev.target.closest && ev.target.closest("#btnBackMenu");
      if (go) begin(false);
      else if (back) leaveToMenu("team");
    };
  }
  let label = "vs";

  /* --------------------------------------------------------------- battle --- */
  function teamPanel(team) {
    const box = $("team" + (team === 0 ? "You" : "Foe"));
    box.innerHTML = "<div class='theading'><h3>" + (team === 0 ? "Your team" : "Challengers") +
      "</h3><span class='tag' id='" + (team === 0 ? "youTag" : "foeTag") + "'></span></div>" +
      "<div class='trows' id='" + (team === 0 ? "youRows" : "foeRows") + "'></div>";
  }
  function buildRows() {
    const S = E.state();
    ["you", "foe"].forEach((side, i) => {
      const list = i === 0 ? S.your : S.foe;
      const box = $(side === "you" ? "youRows" : "foeRows");
      box.innerHTML = "";
      rows[side] = list.map((e) => {
        const b = e.b;
        const icon = b.spr.sheet ? R.byId[b.id] && R.byId[b.id].portrait : null;
        const src = b.portrait ? "./assets/" + b.portrait : iconForBuilt(b);
        const row = el("div", "trow");
        row.innerHTML =
          "<img class='tart' src='" + src + "' alt=''>" +
          "<div class='tmain'><div class='tname'><b>" + b.name + "</b><span class='tpw'>" + (b.power || "") + "</span></div>" +
          "<div class='tbar'><i class='hp'></i><i class='shd'></i></div>" +
          "<div class='tstatus'></div></div>" +
          "<div class='tcds'>" + b.moves.map((m) => "<i title='" + m.name + " · " + m.text.replace(/'/g, "") + "'>" + m.name.slice(0, 2) + "</i>").join("") + "</div>";
        box.appendChild(row);
        return {
          e, row, hp: row.querySelector(".hp"), shd: row.querySelector(".shd"),
          st: row.querySelector(".tstatus"), cds: Array.from(row.querySelectorAll(".tcds i"))
        };
      });
    });
  }
  const iconCacheBuilt = {};
  function iconForBuilt(b) {
    if (iconCacheBuilt[b.id]) return iconCacheBuilt[b.id];
    const tpl = R.byId[b.id];
    const src = tpl ? E.iconFor(tpl) : "";
    iconCacheBuilt[b.id] = src;
    return src;
  }
  function paintHud() {
    const S = E.state();
    if (!S.your.length) return;
    ["you", "foe"].forEach((side) => {
      rows[side].forEach((r) => {
        const e = r.e;
        const frac = Math.max(0, Math.min(1, e.hp / e.max));
        r.hp.style.width = (frac * 100).toFixed(1) + "%";
        r.hp.className = "hp" + (e.team === 0 ? "" : " foe") + (e.dead ? " dead" : "") + (frac < 0.3 ? " low" : "");
        r.shd.style.width = (e.shd > 0 ? Math.min(100, (e.shd / e.max) * 100) : 0) + "%";
        r.row.classList.toggle("down", !!e.dead);
        const st = E.statusList(e).slice(0, 4).map(([k]) => "<i class='st " + k + "'>" + k + "</i>").join("");
        if (r.st.dataset.k !== st) { r.st.innerHTML = st; r.st.dataset.k = st; }
        e.b.moves.forEach((m, i) => {
          const c = r.cds[i];
          if (!c) return;
          const ready = e.cds[i] <= 0 && e.mana >= E.moveCost(m);
          c.className = "cd" + (ready ? " ready" : " cool") + (e.dead ? " off" : "");
          if (!ready && !e.dead) c.style.setProperty("--p", (1 - Math.min(1, e.cds[i] / (m.cd * e.b.cdMul))) * 100 + "%");
        });
      });
    });
    $("arenaClock").textContent = clockOf(S.time);
    $("youTag").textContent = alive(0) + " standing";
    $("foeTag").textContent = alive(1) + " standing";
    const cd = $("announce");
    if (S.phase === "count") {
      const n = String(Math.ceil(S.countdown));
      cd.textContent = n;
      cd.classList.add("show");
      if (n !== lastCount) { lastCount = n; blip("count"); }
    } else if (S.phase === "live" && S.time < 4) {
      cd.textContent = "FIGHT";
      cd.classList.add("show");
      if (!fought) { fought = true; blip("fight"); }
    } else cd.classList.remove("show");
    if (S.events.length !== feedLen) {
      const fresh = S.events.slice(feedLen);
      feedLen = S.events.length;
      fresh.forEach(playEvent);
      const f = $("feed");
      f.innerHTML = S.events.slice(-9).reverse().map((ev) => "<p class='" + ev.kind + "'><span>" + clockOf(ev.t) + "</span>" + ev.text + "</p>").join("");
    }
    const youBar = rows.you.reduce((s, r) => s + Math.max(0, r.e.hp), 0) / Math.max(1, rows.you.reduce((s, r) => s + r.e.max, 0));
    const foeBar = rows.foe.reduce((s, r) => s + Math.max(0, r.e.hp), 0) / Math.max(1, rows.foe.reduce((s, r) => s + r.e.max, 0));
    $("meterYou").style.width = (youBar * 100) + "%";
    $("meterFoe").style.width = (foeBar * 100) + "%";
    const note = $("dockStatus");
    if (note && S.lv) {
      const law = E.law();
      note.textContent = (law ? law.line : "") + (gauntlet ? " · Gauntlet streak " + streak : "");
    }
    if (S.phase === "over" && overlayMode === "battle") setTimeout(showResults, 1400);
  }
  function alive(team) { return E.state()[(team === 0 ? "your" : "foe")].filter((e) => !e.dead).length; }
  function clockOf(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ":" + (s < 10 ? "0" : "") + s; }

  function begin(reset) {
    persist.name = (($("callSign") && $("callSign").value) || persist.name || "").replace(/\s+/g, " ").trim().slice(0, 18);
    save();
    stashRadio();
    document.body.classList.remove("in-menu");
    document.body.classList.add("in-battle");
    if (reset || !foeIds.length) foeIds = R.draw(persist.mode, your).map((f) => f.id);
    $("overlay").className = "overlay";
    overlayMode = "battle";
    $("menu").classList.add("hidden");
    $("battle").classList.remove("hidden");
    teamPanel(0); teamPanel(1);
    E.newMatch({ you: your.slice(), foe: foeIds.slice() }, persist.mode, nextSeed);
    buildRows();
    feedLen = 0;
    lastCount = "";
    fought = false;
    gateHold(true);
    const lawNow = E.law();
    $("matchPill").textContent = (gauntlet ? "Gauntlet " + streak + " · " : "") + MODE_LABEL[persist.mode] + (lawNow ? " · " + lawNow.name : "");
    lastMatch = { your: your.slice(), foe: foeIds.slice() };
  }

  function showResults() {
    const S = E.state();
    if (overlayMode === "results") return;
    overlayMode = "results";
    const won = S.winner === 0;
    persist[won ? "wins" : "losses"]++;
    const book = touchBook(won);
    let streakNote = "";
    if (gauntlet) {
      if (won) {
        streak += 1;
        if (streak > (persist.bestStreak || 0)) persist.bestStreak = streak;
        streakNote = "Gauntlet streak " + streak + ". Best " + persist.bestStreak + ".";
      } else {
        streakNote = "Gauntlet ends at " + streak + ". Best " + (persist.bestStreak || 0) + ".";
        streak = 0;
      }
    }
    save();
    const all = S.your.concat(S.foe).map((e) => ({
      name: e.b.name, team: e.team, dmg: Math.round(e.dmgDone), kills: e.kills,
      heal: Math.round(e.healDone), taken: Math.round(e.taken), uses: Object.values(e.uses).reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.dmg - a.dmg);
    const mvp = all[0];
    const moveTally = {};
    S.your.forEach((e) => Object.keys(e.uses).forEach((n) => { moveTally[n] = (moveTally[n] || 0) + e.uses[n]; }));
    const best = Object.entries(moveTally).sort((a, b) => b[1] - a[1]).slice(0, 3);
    $("overlay").className = "overlay show";
    $("overlay").innerHTML = "<div class='sheet res-sheet " + (won ? "won" : "lost") + "'>" +
      "<p class='kicker'>" + MODE_LABEL[persist.mode] + " · " + clockOf(S.time) + "</p>" +
      "<h1>" + (won ? "Your team takes the arena" : "The challengers take the arena") + "</h1>" +
      "<p class='lede center'>" + (all.find((a) => a.team === (won ? 0 : 1)).name) + " led the damage. " +
      (best.length ? "Your most-used moves: " + best.map(([n, c]) => n + " ×" + c).join(", ") + "." : "") + "</p>" +
      "<div class='table'><div class='thead'><span>Fighter</span><span>Side</span><span>Damage</span><span>Kills</span><span>Healed</span><span>Moves</span></div>" +
      all.map((a) => "<div class='trowline" + (a.team === 0 ? " you" : "") + "'><span><b>" + a.name + "</b></span><span>" +
        (a.team === 0 ? "you" : "foe") + "</span><span>" + a.dmg + "</span><span>" + a.kills + "</span><span>" + a.heal + "</span><span>" + a.uses + "</span></div>").join("") +
      "</div>" +
      "<div class='tally'>This lineup: <span class='wins'>" + book.wins + "W</span> / <span class='losses'>" + book.losses + "L</span>" +
      " · " + esc(teamNames().join(" · ")) +
      "<br>This browser: <span class='wins'>" + persist.wins + "W</span> / <span class='losses'>" + persist.losses + "L</span>" +
      (persist.name ? " · " + esc(persist.name) : "") +
      (streakNote ? "<br>" + esc(streakNote) : "") + "</div>" +
      "<div class='modes'>" +
        (gauntlet && won
          ? "<button type='button' class='btn gold big' id='btnNext'>Next ring</button>" +
            "<button type='button' class='btn' id='btnAgain'>Rematch · same challengers</button>"
          : gauntlet
          ? "<button type='button' class='btn gold big' id='btnNext'>Run the gauntlet again</button>" +
            "<button type='button' class='btn' id='btnAgain'>Rematch · same challengers</button>"
          : "<button type='button' class='btn gold big' id='btnAgain'>Rematch · same challengers</button>" +
            "<button type='button' class='btn' id='btnNewFoe'>New challengers</button>") +
        "<button type='button' class='btn' id='btnMenu2'>Change team</button>" +
      "</div></div>";
    gateHold(false, 120000);
    blip(won ? "win" : "lose");
    postResult(won, persist.mode, mvp ? mvp.name : "");
    $("overlay").onclick = (ev) => {
      const again = ev.target.closest && ev.target.closest("#btnAgain");
      const fresh = ev.target.closest && ev.target.closest("#btnNewFoe");
      const next = ev.target.closest && ev.target.closest("#btnNext");
      const back = ev.target.closest && ev.target.closest("#btnMenu2");
      if (next) { foeIds = R.draw(persist.mode, your).map((f) => f.id); rollSeed(); renderVS(); }
      else if (again) begin(false);
      else if (fresh) { foeIds = R.draw(persist.mode, your).map((f) => f.id); rollSeed(); renderVS(); }
      else if (back) { $("battle").classList.add("hidden"); leaveToMenu("team"); }
    };
  }

  function rollSeed() { nextSeed = (Math.random() * 9999) | 0; }
  function endGauntlet() { gauntlet = false; streak = 0; }
  function leaveToMenu(tab) {
    endGauntlet();
    menuTab = tab || "home";
    $("battle").classList.add("hidden");
    renderMenu();
    gateHold(false, 60000);
  }
  function startListed(asGauntlet) {
    const named = (($("callSign") && $("callSign").value) || persist.name || "").replace(/\s+/g, " ").trim().slice(0, 18);
    if (!named || your.length !== persist.mode) {
      menuTab = your.length === persist.mode ? "home" : "team";
      renderMenu();
      if (!named && $("callSign")) $("callSign").focus();
      return;
    }
    blip("click");
    persist.name = named;
    gauntlet = !!asGauntlet;
    streak = 0;
    save();
    foeIds = R.draw(persist.mode, your).map((f) => f.id);
    rollSeed();
    renderVS();
  }

  /* ------------------------------------------------------------------ boot --- */
  async function boot() {
    const canvas = $("arena");
    await E.init(canvas);
    /* the menu should not show until the atlases are in, or cards come up blank */
    loadSfx();
    document.body.classList.add("ready");
    $("boot").classList.add("hidden");
    $("menu").addEventListener("click", onMenuClick);
    renderMenu();
    pullHall();
    setInterval(pullHall, 40000);
    E.setSpeed(persist.speed || 1);
    document.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("on", +b.dataset.speed === (persist.speed || 1)));

    document.body.addEventListener("click", (ev) => {
      const t = ev.target.closest("[data-speed],[data-act]");
      if (!t) return;
      if (t.dataset.speed) {
        persist.speed = +t.dataset.speed; save();
        E.setSpeed(persist.speed);
        document.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("on", +b.dataset.speed === persist.speed));
        return;
      }
      const act = t.dataset.act;
      if (act === "pause") { const s = E.state(); E.pause(!s.paused); $("btnPause").classList.toggle("on", !s.paused); }
      if (act === "menu") leaveToMenu("home");
      if (act === "rematch") begin(false);
      if (act === "newfoe") { foeIds = R.draw(persist.mode, your).map((f) => f.id); rollSeed(); renderVS(); }
      if (act === "mute") { muted = !muted; paintSfx(); }
      if (act === "full") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.target.tagName === "INPUT") return;
      if (ev.code === "Space" && overlayMode === "battle") { ev.preventDefault(); const s = E.state(); E.pause(!s.paused); $("btnPause").classList.toggle("on", !s.paused); }
      else if (ev.code === "KeyM") { muted = !muted; paintSfx(); }
      else if (ev.code === "KeyR" && overlayMode === "battle") begin(false);
      else if (ev.code === "Escape") {
        if (overlayMode === "battle" || overlayMode === "results" || overlayMode === "vs") {
          leaveToMenu("home");
        } else if (overlayMode === "menu" && menuTab !== "home") {
          menuTab = "home";
          renderMenu();
        }
      }
      else if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(ev.code)) {
        if (overlayMode !== "menu" && overlayMode !== "battle") return;
        const map = { Digit1: 1, Digit2: 2, Digit3: 4, Digit4: 8 };
        persist.speed = map[ev.code]; save(); E.setSpeed(persist.speed);
        document.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("on", +b.dataset.speed === persist.speed));
      }
    });
    /* the fight button lives inside the sheet, so bind it here as well as the grid */
    document.body.addEventListener("click", (ev) => {
      if (ev.target.closest && ev.target.closest("#btnFight")) startListed(false);
      else if (ev.target.closest && ev.target.closest("#btnGauntlet")) startListed(true);
    });
  }

  w.ArenaUI = { tick: paintHud, sfx: blip, rows: () => rows, state: () => ({ overlayMode, your, foeIds, persist }) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
