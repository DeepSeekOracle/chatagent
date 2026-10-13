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
    { team: ["kael", "vale", "lyra"], mode: 3, speed: 1, wins: 0, losses: 0, filter: "champ", name: "", books: {} },
    (() => { try { return JSON.parse(localStorage.getItem(SAVE) || "{}"); } catch (e) { return {}; } })()
  );
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(persist)); } catch (e) {} }

  let your = (persist.team || []).filter((id) => R.byId[id]).slice(0, 5);
  let foeIds = [];
  let lastMatch = null;
  let rows = { you: [], foe: [] };
  let feedLen = 0;
  let overlayMode = null;
  let gateHeld = false;
  let menuTab = "home";
  let hallRows = [];

  const MODE_LABEL = { 1: "1v1", 2: "2v2", 3: "3v3", 5: "5v5" };

  /* ------------------------------------------------------------------ sound --- */
  let audio = null, muted = false;
  function blip(type) {
    if (muted) return;
    try {
      if (!audio) audio = new (w.AudioContext || w.webkitAudioContext)();
      const t = audio.currentTime;
      const o = audio.createOscillator(), g = audio.createGain();
      const table = {
        hit: [220, 0.06, "square", 0.05], big: [140, 0.12, "square", 0.07],
        kill: [90, 0.22, "sawtooth", 0.08], cast: [520, 0.09, "triangle", 0.05],
        start: [660, 0.3, "triangle", 0.09], win: [880, 0.5, "triangle", 0.1], lose: [180, 0.5, "sine", 0.09]
      }[type] || [300, 0.08, "square", 0.05];
      o.type = table[2]; o.frequency.setValueAtTime(table[0], t);
      o.frequency.exponentialRampToValueAtTime(Math.max(60, table[0] * 0.5), t + table[1]);
      g.gain.setValueAtTime(table[3], t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + table[1]);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + table[1] + 0.02);
    } catch (e) {}
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
  function fighterCard(f) {
    const built = R.build(f, [], null, Math.random);
    const art = f.portrait ? "<img src='./assets/" + f.portrait + "' alt=''>" : "<img class='spr' src='" + E.iconFor(f) + "' alt=''>";
    const picked = your.includes(f.id);
    const kit = f.moves.map((m) => "<em>" + R.MOVES[m].name + "</em>").join("");
    const cards = f.cards.map((c) => "<i>" + R.CARDS[c].tag + "</i>").join("");
    return "<button type='button' class='fcard" + (picked ? " picked" : "") + "' data-id='" + f.id + "'>" +
      "<div class='fart'>" + art + "<span class='cls " + f.cls + "'>" + f.cls + "</span></div>" +
      "<div class='fmeta'><b>" + f.name + "</b><u>" + f.tag + "</u><span class='pw'>PWR " + built.power + "</span></div>" +
      "<div class='fkit'>" + kit + "</div>" +
      "<div class='fcards'>" + cards + "</div>" +
      "<div class='fbio'>" + f.bio + "</div>" +
      "<div class='fcounter'>" + f.counter + "</div>" +
      "</button>";
  }
  function renderMenu() {
    const panel = $("menuPanel");
    const keepScroll = (panel.querySelector(".grid") || {}).scrollTop || 0;
    overlayMode = "menu";
    /* every route back to the menu — Escape, the Menu button, "change team" from the results
       board — lands here, so this is the one place the reminder hold has to be released.
       Leaving it held would keep the supporter card away for the rest of the visit. */
    if (gateHeld) gateHold(false, 120000);
    $("menu").classList.remove("hidden");
    $("battle").classList.add("hidden");
    $("overlay").className = "overlay";
    const list = R.ROSTER.filter((f) => f.cls === persist.filter);
    const youBuilt = your.map((id) => R.build(R.byId[id], [], null, Math.random));
    const power = youBuilt.reduce((s, b) => s + b.power, 0);
    const line = lineupBook();
    const ready = your.length === persist.mode && !!(persist.name || "").trim();
    const tab = (id, label) => "<button type='button' class='tab" + (menuTab === id ? " on" : "") + "' data-tab='" + id + "'>" + label + "</button>";
    panel.innerHTML =
      "<p class='kicker'>Δ9Φ963 · chatagent.ca</p>" +
      "<h1>LYGO Arena</h1>" +
      "<nav class='menu-tabs' aria-label='Menu'>" +
        tab("home", "Home") + tab("team", "Team") + tab("how", "Guide") + tab("hall", "Hall") +
      "</nav>" +
      "<div id='panelHome'" + (menuTab === "home" ? "" : " class='hidden'") + ">" +
        "<p class='lede'>Two AI teams. One stone ring. Name yourself, pick a roster, then watch. " +
        "Every kit fights on its own moves, cards and cooldowns. Challengers are drawn blind.</p>" +
        "<div class='modes'>" + modeCards() + "</div>" +
        "<div class='tally' style='margin-top:.7rem'><b>This lineup</b> " +
          "<span class='wins'>" + (line.wins || 0) + "W</span> / <span class='losses'>" + (line.losses || 0) + "L</span>" +
          " · <b>This browser</b> <span class='wins'>" + persist.wins + "W</span> / <span class='losses'>" + persist.losses + "L</span>" +
          " · <b>Power</b> " + power + "</div>" +
        "<div class='hall-live' style='margin-top:.6rem'>" + hallBlock() + "</div>" +
      "</div>" +
      "<div id='panelTeam'" + (menuTab === "team" ? "" : " class='hidden'") + ">" +
        "<div class='builder'>" +
          "<div class='builder-head'>" +
            "<h2>Your team <span id='teamCount'>" + your.length + "/" + persist.mode + "</span></h2>" +
            "<div class='filters'>" +
              "<button type='button' class='tab" + (persist.filter === "champ" ? " on" : "") + "' data-filter='champ'>Champions</button>" +
              "<button type='button' class='tab" + (persist.filter === "beast" ? " on" : "") + "' data-filter='beast'>Creatures</button>" +
              "<button type='button' class='tab" + (persist.filter === "pet" ? " on" : "") + "' data-filter='pet'>Beasts</button>" +
              "<button type='button' class='tab' data-draft='1'>Random draft</button>" +
              "<button type='button' class='tab' data-clear='1'>Clear</button>" +
            "</div>" +
          "</div>" +
          "<div class='tray' id='tray'>" + (your.length ? your.map((id) => {
            const f = R.byId[id];
            return "<button type='button' class='slot' data-drop='" + f.id + "'>" +
              "<img src='" + (f.portrait ? "./assets/" + f.portrait : E.iconFor(f)) + "' alt=''>" +
              "<b>" + f.name + "</b></button>";
          }).join("") : "<p class='muted'>Nothing picked yet — choose from the roster below.</p>") + "</div>" +
          "<div class='grid'>" + list.map(fighterCard).join("") + "</div>" +
        "</div>" +
      "</div>" +
      "<div id='panelHow' class='how" + (menuTab === "how" ? "" : " hidden") + "'>" +
        "<p class='kicker'>Instructions</p>" +
        "<ol>" +
          "<li>Put your name in. The hall keeps a win/loss line for each lineup you field under that name. No account.</li>" +
          "<li>Pick 1v1, 2v2, 3v3 or 5v5, then fill the team from champions, crypt creatures and beasts. Click a slot to drop someone.</li>" +
          "<li>Both sides are AI. Nobody is steered. Ranged kits kite, melee kits commit, healers wait for a wound, and a body that has not landed a hit in five seconds stops being careful and charges.</li>" +
          "<li>Three moves and three cards per kit, taken from the Lattice Crypt numbers. The challengers are drawn from the full roster, so you never know what walks in.</li>" +
          "<li>Keys during a fight: <b>Space</b> pause · <b>1 2 3 4</b> speed (1× 2× 4× 8×) · <b>M</b> mute · <b>Esc</b> menu · <b>R</b> rematch.</li>" +
        "</ol>" +
      "</div>" +
      "<div id='panelHall'" + (menuTab === "hall" ? "" : " class='hidden'") + ">" +
        "<p class='kicker'>Live hall</p>" +
        "<p class='lede'>Each line is one player and one lineup: wins, losses, and the kits they fielded. The public book is the Hugging Face hall. This browser keeps its own copy until that write lands.</p>" +
        "<div class='hall-live'>" + hallBlock() + "</div>" +
        "<p class='muted' style='margin-top:.6rem'><a href='./ledger.html'>Open the full hall</a></p>" +
      "</div>" +
      "<div class='menu-foot'>" +
        "<label class='name-block'>Your name" +
          "<input class='callsign' id='callSign' maxlength='18' value='" + esc(persist.name || "") + "' placeholder='What should the hall call you?' autocomplete='nickname'>" +
        "</label>" +
        "<button type='button' class='btn gold big' id='btnFight'" + (ready ? "" : " disabled") + ">Fight — " + MODE_LABEL[persist.mode] + "</button>" +
      "</div>" +
      (ready ? "" : "<p class='muted'>" + (your.length < persist.mode ? "Open Team and fill the lineup." : "Name yourself. The hall keeps a win/loss line for that name and this team.") + "</p>") +
      "<div class='donate-row'>" +
        "<a class='donate-paypal' href='https://www.paypal.com/paypalme/ExcavationPro' target='_blank' rel='noopener'>PayPal.me/ExcavationPro</a>" +
        "<a class='donate-patreon' href='https://www.patreon.com/Excavationpro/posts/chatagent-ca-api-170485961' target='_blank' rel='noopener'>Patreon</a>" +
        "<a class='btn' href='./ledger.html'>Live hall</a>" +
        "<a class='btn' href='./whitepaper.html'>Whitepaper</a>" +
        "<a class='btn' href='/games/'>All games</a>" +
      "</div>" +
      "<p class='muted'>Optional. The arena stays free. A tip never changes a kit or a record.</p>";
    const named = $("callSign");
    if (named) {
      named.addEventListener("input", () => {
        persist.name = named.value.replace(/\s+/g, " ").trim().slice(0, 18);
        save();
        const fight = $("btnFight");
        if (fight) fight.disabled = !(persist.name && your.length === persist.mode);
      });
    }
    const g = panel.querySelector(".grid");
    if (g) g.scrollTop = keepScroll;
  }

  function onMenuClick(ev) {
    const t = ev.target.closest("[data-mode],[data-id],[data-drop],[data-filter],[data-draft],[data-clear],[data-tab]");
    if (!t) {
      if (ev.target.id === "btnFight") { void 0; }
      return;
    }
    if (t.dataset.tab) { menuTab = t.dataset.tab; renderMenu(); return; }
    if (t.dataset.mode) {
      persist.mode = +t.dataset.mode;
      while (your.length > persist.mode) your.pop();
      save(); renderMenu(); return;
    }
    if (t.dataset.filter) { persist.filter = t.dataset.filter; menuTab = "team"; save(); renderMenu(); return; }
    if (t.dataset.draft) {
      your = R.draw(persist.mode).map((f) => f.id);
      menuTab = "team";
      save(); renderMenu(); return;
    }
    if (t.dataset.clear) { your = []; save(); renderMenu(); return; }
    if (t.dataset.drop) { your = your.filter((id) => id !== t.dataset.drop); save(); renderMenu(); return; }
    if (t.dataset.id) {
      const id = t.dataset.id;
      if (your.includes(id)) your = your.filter((x) => x !== id);
      else if (your.length < persist.mode) your = your.concat([id]);
      save(); renderMenu(); return;
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
    ov.innerHTML = "<div class='sheet vs-sheet'><h1 class='vs'>" + MODE_LABEL[persist.mode] + "</h1>" +
      "<div class='vsgrid'>" + side(you, "you") + "<div class='vsmark'>vs</div>" + side(foe, "foe") + "</div>" +
      "<p class='lede center'>The challengers are drawn from the full roster — champions, crypt creatures and the pack.</p>" +
      "<div class='modes'><button type='button' class='btn gold big' id='btnGo'>Open the arena</button>" +
      "<button type='button' class='btn' id='btnBackMenu'>Change team</button></div></div>";
    label = "vs";
    ov.onclick = (ev) => {
      /* the challengers shown on this sheet are the ones that fight: begin(false) keeps the
         set drawn when Fight was pressed, so the reveal is never a lie. */
      if (ev.target.id === "btnGo") begin(false);
      else if (ev.target.id === "btnBackMenu") renderMenu();
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
    if (S.phase === "count") { cd.textContent = Math.ceil(S.countdown) + ""; cd.classList.add("show"); }
    else if (S.phase === "live" && S.time < 4) { cd.textContent = "FIGHT"; cd.classList.add("show"); }
    else cd.classList.remove("show");
    if (S.events.length !== feedLen) {
      feedLen = S.events.length;
      const f = $("feed");
      f.innerHTML = S.events.slice(-9).reverse().map((ev) => "<p class='" + ev.kind + "'><span>" + clockOf(ev.t) + "</span>" + ev.text + "</p>").join("");
    }
    const youBar = rows.you.reduce((s, r) => s + Math.max(0, r.e.hp), 0) / Math.max(1, rows.you.reduce((s, r) => s + r.e.max, 0));
    const foeBar = rows.foe.reduce((s, r) => s + Math.max(0, r.e.hp), 0) / Math.max(1, rows.foe.reduce((s, r) => s + r.e.max, 0));
    $("meterYou").style.width = (youBar * 100) + "%";
    $("meterFoe").style.width = (foeBar * 100) + "%";
    if (S.phase === "over" && overlayMode === "battle") setTimeout(showResults, 1400);
  }
  function alive(team) { return E.state()[(team === 0 ? "your" : "foe")].filter((e) => !e.dead).length; }
  function clockOf(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ":" + (s < 10 ? "0" : "") + s; }

  function begin(reset) {
    persist.name = (($("callSign") && $("callSign").value) || persist.name || "").replace(/\s+/g, " ").trim().slice(0, 18);
    save();
    if (reset || !foeIds.length) foeIds = R.draw(persist.mode, your).map((f) => f.id);
    $("overlay").className = "overlay";
    overlayMode = "battle";
    $("menu").classList.add("hidden");
    $("battle").classList.remove("hidden");
    teamPanel(0); teamPanel(1);
    E.newMatch({ you: your.slice(), foe: foeIds.slice() }, persist.mode);
    buildRows();
    feedLen = 0;
    gateHold(true);
    blip("start");
    $("matchPill").textContent = MODE_LABEL[persist.mode];
    lastMatch = { your: your.slice(), foe: foeIds.slice() };
  }

  function showResults() {
    const S = E.state();
    if (overlayMode === "results") return;
    overlayMode = "results";
    const won = S.winner === 0;
    persist[won ? "wins" : "losses"]++;
    const book = touchBook(won);
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
      (persist.name ? " · " + esc(persist.name) : "") + "</div>" +
      "<div class='modes'>" +
        "<button type='button' class='btn gold big' id='btnAgain'>Rematch · same challengers</button>" +
        "<button type='button' class='btn' id='btnNewFoe'>New challengers</button>" +
        "<button type='button' class='btn' id='btnMenu2'>Change team</button>" +
      "</div></div>";
    gateHold(false, 120000);
    blip(won ? "win" : "lose");
    postResult(won, persist.mode, mvp ? mvp.name : "");
    $("overlay").onclick = (ev) => {
      const id = ev.target.id;
      if (id === "btnAgain") begin(false);
      else if (id === "btnNewFoe") { foeIds = R.draw(persist.mode, your).map((f) => f.id); renderVS(); }
      else if (id === "btnMenu2") { $("battle").classList.add("hidden"); renderMenu(); }
    };
  }

  /* ------------------------------------------------------------------ boot --- */
  async function boot() {
    const canvas = $("arena");
    await E.init(canvas);
    /* the menu should not show until the atlases are in, or cards come up blank */
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
        document.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("on", b === t));
        return;
      }
      const act = t.dataset.act;
      if (act === "pause") { const s = E.state(); E.pause(!s.paused); $("btnPause").classList.toggle("on", !s.paused); }
      if (act === "menu") { $("battle").classList.add("hidden"); renderMenu(); gateHold(false, 60000); }
      if (act === "rematch") begin(false);
      if (act === "newfoe") { foeIds = R.draw(persist.mode, your).map((f) => f.id); renderVS(); }
      if (act === "mute") { muted = !muted; $("btnMute").classList.toggle("on", muted); }
      if (act === "full") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.target.tagName === "INPUT") return;
      if (ev.code === "Space" && overlayMode === "battle") { ev.preventDefault(); const s = E.state(); E.pause(!s.paused); $("btnPause").classList.toggle("on", !s.paused); }
      else if (ev.code === "KeyM") { muted = !muted; $("btnMute").classList.toggle("on", muted); }
      else if (ev.code === "KeyR" && overlayMode === "battle") begin(false);
      else if (ev.code === "Escape") { if (overlayMode === "battle") { $("battle").classList.add("hidden"); renderMenu(); } else if (overlayMode === "results") { $("battle").classList.add("hidden"); renderMenu(); } }
      else if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(ev.code)) {
        if (overlayMode !== "menu" && overlayMode !== "battle") return;
        const map = { Digit1: 1, Digit2: 2, Digit3: 4, Digit4: 8 };
        persist.speed = map[ev.code]; save(); E.setSpeed(persist.speed);
        document.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("on", +b.dataset.speed === persist.speed));
      }
    });
    /* the fight button lives inside the sheet, so bind it here as well as the grid */
    document.body.addEventListener("click", (ev) => {
      if (ev.target.id === "btnFight") {
        const named = (($("callSign") && $("callSign").value) || persist.name || "").replace(/\s+/g, " ").trim().slice(0, 18);
        if (!named || your.length !== persist.mode) {
          menuTab = your.length === persist.mode ? "home" : "team";
          renderMenu();
          if (!named && $("callSign")) $("callSign").focus();
          return;
        }
        persist.name = named;
        save();
        foeIds = R.draw(persist.mode, your).map((f) => f.id);
        renderVS();
      }
    });
  }

  w.ArenaUI = { tick: paintHud, rows: () => rows, state: () => ({ overlayMode, your, foeIds, persist }) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
