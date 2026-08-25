(() => {
  "use strict";

  const LEDGER_PAGE = "./ledger.html";
  const LEDGER_POST = "https://deepseekoracle-lattice-marines-ledger.hf.space/smm/submit";
  const PAR = 100;
  const START = 500000;
  const LOTS = [500, 1000, 2000, 5000];
  const ACTIONS = ["up", "up", "down", "down", "div", "div"];
  const CENTS = [5, 5, 10, 10, 20, 20];
  const JACKPOT_CENTS = 50;
  const MEGA_CENTS = 100;
  const STOCK_WEIGHT = 8;
  const JACKPOT_WEIGHT = 1;

  const STOCKS = [
    { id: "gold", name: "Gold", ticker: "GLD", icon: "./assets/i-gold.jpg", color: "#e8c547" },
    { id: "silver", name: "Silver", ticker: "SLV", icon: "./assets/i-silver.jpg", color: "#c5cdd6" },
    { id: "bonds", name: "Bonds", ticker: "BND", icon: "./assets/i-bonds.jpg", color: "#7dcea0" },
    { id: "oil", name: "Oil", ticker: "OIL", icon: "./assets/i-oil.jpg", color: "#6b7280" },
    { id: "industrials", name: "Industrials", ticker: "IND", icon: "./assets/i-industrials.jpg", color: "#e8a0b4" },
    { id: "grain", name: "Grain", ticker: "GRN", icon: "./assets/i-grain.jpg", color: "#c6d94a" },
    { id: "timber", name: "Timber", ticker: "TMB", icon: "./assets/i-timber.jpg", color: "#c4a574" },
    { id: "utilities", name: "Utilities", ticker: "UTL", icon: "./assets/i-utilities.jpg", color: "#7eb6d9" }
  ];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dollars = (cents) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const px = (c) => "$" + (c / 100).toFixed(2);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  let S = null;
  let spinning = false;
  let spinAnim = null;

  function emptyHold() {
    const h = {};
    STOCKS.forEach((st) => { h[st.id] = 0; });
    return h;
  }

  function mkPlayer(name, kind) {
    return { name, kind, cash: START, hold: emptyHold(), alive: true, cashed: false, worth: START, jackpots: 0 };
  }

  function netWorth(p) {
    let w = p.cash;
    STOCKS.forEach((st) => { w += (p.hold[st.id] || 0) * S.price[st.id]; });
    return w;
  }

  function persistName() {
    try { return localStorage.getItem("smm-name") || "Floor Boss"; } catch (_) { return "Floor Boss"; }
  }

  function saveName(n) {
    try { localStorage.setItem("smm-name", n); } catch (_) {}
  }

  function stockById(id) { return STOCKS.find((s) => s.id === id); }

  function reelStock() {
    const bag = [];
    STOCKS.forEach((st) => {
      for (let i = 0; i < STOCK_WEIGHT; i++) bag.push(st.id);
    });
    for (let i = 0; i < JACKPOT_WEIGHT; i++) bag.push("jackpot");
    return pick(bag);
  }

  function pullOne() {
    const stock = reelStock();
    if (stock === "jackpot") return { stock: "jackpot", action: "jackpot", cents: JACKPOT_CENTS, jackpot: true };
    return { stock, action: pick(ACTIONS), cents: pick(CENTS), jackpot: false };
  }

  function payDiv(stockId, centsPerShare, why) {
    const st = stockById(stockId);
    if (!st) return 0;
    if (S.price[stockId] < PAR) {
      log(`${st.ticker} DIV skipped — under par ${px(S.price[stockId])}.`);
      return 0;
    }
    let paid = 0;
    S.players.forEach((p) => {
      if (!p.alive || p.cashed) return;
      const sh = p.hold[stockId] || 0;
      if (!sh) return;
      const add = sh * centsPerShare;
      p.cash += add;
      paid += add;
      log(`${p.name} collects ${dollars(add)} ${why} on ${st.ticker} (${sh} sh × ${centsPerShare}¢).`);
    });
    return paid;
  }

  function movePrice(stockId, delta) {
    const st = stockById(stockId);
    let p = S.price[stockId] + delta;
    if (p >= 200) {
      S.players.forEach((pl) => {
        if (pl.hold[stockId]) {
          pl.hold[stockId] *= 2;
          log(`${pl.name} split ${st.ticker} 2-for-1 → ${pl.hold[stockId]} shares.`);
        }
      });
      S.price[stockId] = PAR;
      log(`${st.ticker} hits $2.00 — split. Price back to par $1.00.`);
      recordHist(stockId);
      return;
    }
    if (p <= 0) {
      S.players.forEach((pl) => {
        if (pl.hold[stockId]) {
          log(`${pl.name} loses ${pl.hold[stockId]} ${st.ticker} — desk busted.`);
          pl.hold[stockId] = 0;
        }
      });
      S.price[stockId] = PAR;
      log(`${st.ticker} hits zero — bankrupt, reissued at par $1.00.`);
      recordHist(stockId);
      return;
    }
    S.price[stockId] = p;
    const dir = delta > 0 ? "UP" : "DOWN";
    log(`${st.ticker} ${dir} ${Math.abs(delta)}¢ → ${px(S.price[stockId])}.`);
    recordHist(stockId);
  }

  function recordHist(id) {
    if (!S.hist[id]) S.hist[id] = [PAR];
    S.hist[id].push(S.price[id]);
    if (S.hist[id].length > 40) S.hist[id].shift();
  }

  function sparkSvg(hist, color) {
    const w = 120, h = 36, max = 200;
    const arr = hist && hist.length ? hist : [PAR];
    const pts = arr.map((v, i) => {
      const x = arr.length === 1 ? w / 2 : (i / (arr.length - 1)) * w;
      const y = h - (clamp(v, 0, max) / max) * h;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const last = arr[arr.length - 1] >= PAR ? color : "#ef4444";
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${last}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }

  function applyPull(pull, mega) {
    if (mega) {
      log("DOUBLE JACKPOT — mega dividend $1.00 per share on every par-or-better desk.");
      STOCKS.forEach((st) => payDiv(st.id, MEGA_CENTS, "MEGA JACKPOT"));
      S.players.forEach((p) => { if (p === current() && p.alive) p.jackpots += 1; });
      return;
    }
    if (pull.jackpot) {
      const cur = current();
      if (cur) cur.jackpots += 1;
      log("JACKPOT — 50¢ dividend on every par-or-better desk you hold.");
      STOCKS.forEach((st) => {
        const p = current();
        if (!p || !p.hold[st.id]) return;
        if (S.price[st.id] < PAR) return;
        const add = p.hold[st.id] * JACKPOT_CENTS;
        p.cash += add;
        log(`${p.name} JACKPOT ${st.ticker} ${dollars(add)}.`);
      });
      return;
    }
    if (pull.action === "div") payDiv(pull.stock, pull.cents, "DIV");
    else if (pull.action === "up") movePrice(pull.stock, pull.cents);
    else movePrice(pull.stock, -pull.cents);
  }

  function current() {
    return S.players[S.turn] || null;
  }

  function living() {
    return S.players.filter((p) => p.alive && !p.cashed);
  }

  function log(msg) {
    S.log = (msg + "\n" + (S.log || "")).slice(0, 4000);
  }

  function lotOf() { return S.lot || 500; }

  function canBuy(p, id) {
    const cost = lotOf() * S.price[id];
    return p && p.alive && !p.cashed && S.phase === "trade" && p.cash >= cost && cost > 0;
  }
  function canSell(p, id) {
    return p && p.alive && !p.cashed && S.phase === "trade" && (p.hold[id] || 0) >= lotOf();
  }

  function buy(id) {
    const p = current();
    if (!canBuy(p, id) || p.kind === "ai") return;
    const n = lotOf();
    const cost = n * S.price[id];
    p.cash -= cost;
    p.hold[id] += n;
    log(`${p.name} buys ${n} ${stockById(id).ticker} @ ${px(S.price[id])} for ${dollars(cost)}.`);
    paint();
  }
  function sell(id) {
    const p = current();
    if (!canSell(p, id) || p.kind === "ai") return;
    const n = lotOf();
    const gain = n * S.price[id];
    p.hold[id] -= n;
    p.cash += gain;
    log(`${p.name} sells ${n} ${stockById(id).ticker} @ ${px(S.price[id])} for ${dollars(gain)}.`);
    paint();
  }

  function aiTrade(p) {
    const reserve = 80000;
    const ranked = STOCKS.slice().sort((a, b) => S.price[a.id] - S.price[b.id]);
    ranked.forEach((st) => {
      const price = S.price[st.id];
      const sh = p.hold[st.id] || 0;
      if (price >= 180 && sh >= 500) {
        const n = Math.min(sh, 2000);
        p.hold[st.id] -= n;
        p.cash += n * price;
        log(`${p.name} (AI) trims ${n} ${st.ticker} near the split tape.`);
      }
      if (price <= 15 && sh >= 500 && Math.random() < 0.55) {
        const n = Math.min(sh, 1000);
        p.hold[st.id] -= n;
        p.cash += n * price;
        log(`${p.name} (AI) dumps ${n} ${st.ticker} off the floor.`);
      }
    });
    const cheap = ranked.filter((st) => S.price[st.id] >= 5);
    for (const st of cheap) {
      if (p.cash <= reserve) break;
      const price = S.price[st.id];
      let want = 500;
      if (price >= PAR && price <= 140) want = 1000;
      if (price <= 40) want = 2000;
      const cost = want * price;
      if (p.cash - cost < reserve && price > 30) continue;
      if (p.cash >= cost) {
        p.cash -= cost;
        p.hold[st.id] += want;
        log(`${p.name} (AI) lifts ${want} ${st.ticker} @ ${px(price)}.`);
        if (Math.random() < 0.45) break;
      }
    }
  }

  function liquidate(p) {
    STOCKS.forEach((st) => {
      const sh = p.hold[st.id] || 0;
      if (!sh) return;
      p.cash += sh * S.price[st.id];
      p.hold[st.id] = 0;
    });
    p.worth = p.cash;
    p.cashed = true;
    p.alive = false;
  }

  function checkBroke(p) {
    if (p.cashed) return;
    const w = netWorth(p);
    const shares = STOCKS.reduce((n, st) => n + (p.hold[st.id] || 0), 0);
    if (w <= 0 || (p.cash < 500 * 5 && shares === 0)) {
      p.alive = false;
      p.worth = Math.max(0, w);
      log(`${p.name} is off the floor — broke.`);
    }
  }

  function nextAlive(from) {
    const n = S.players.length;
    for (let i = 1; i <= n; i++) {
      const p = S.players[(from + i) % n];
      if (p.alive && !p.cashed) return (from + i) % n;
    }
    return -1;
  }

  function maybeEnd() {
    const live = living();
    if (live.length === 0) {
      finish("The floor is empty. High scores are the cash-outs on the TOP Cashout hall.");
      return true;
    }
    return false;
  }

  function advanceTurn() {
    S.players.forEach((p) => { p.worth = netWorth(p); });
    S.players.forEach(checkBroke);
    if (maybeEnd()) return;
    const nxt = nextAlive(S.turn);
    if (nxt < 0) { finish("No desks remain."); return; }
    if (nxt <= S.turn) S.round += 1;
    if (maybeEnd()) return;
    S.turn = nxt;
    S.phase = "trade";
    const p = current();
    log(`— Turn ${S.round} · ${p.name}'s desk —`);
    paint();
    if (p.kind === "ai") setTimeout(runAiTurn, 500);
  }

  function runAiTurn() {
    const p = current();
    if (!p || p.kind !== "ai" || spinning) return;
    aiTrade(p);
    paint();
    setTimeout(() => spinBoth(), 400);
  }

  function stopDiceAnim() {
    if (spinAnim) { clearInterval(spinAnim); spinAnim = null; }
  }

  function startDiceAnim() {
    stopDiceAnim();
    const acts = ["▲ UP", "▼ DN", "DIV"];
    const cents = ["5¢", "10¢", "20¢"];
    spinAnim = setInterval(() => {
      document.querySelectorAll(".slot .die").forEach((die, n) => {
        const val = die.querySelector(".die-val");
        const ico = die.querySelector(".die-ico");
        if (!val) return;
        const k = n % 3;
        if (k === 0) {
          const st = pick(STOCKS);
          val.textContent = st.ticker;
          if (ico) ico.style.backgroundImage = `url(${st.icon})`;
        } else if (k === 1) val.textContent = pick(acts);
        else val.textContent = pick(cents);
      });
    }, 65);
  }

  function spinBoth() {
    const p = current();
    if (!p || spinning || S.phase !== "trade") return;
    spinning = true;
    S.phase = "spin";
    paint();
    startDiceAnim();
    const a = pullOne();
    const b = pullOne();
    setTimeout(() => {
      stopDiceAnim();
      S.lastPulls = [a, b];
      const mega = a.jackpot && b.jackpot;
      applyPull(a, mega);
      if (!mega) applyPull(b, false);
      spinning = false;
      S.phase = "resolve";
      paintMachines(false);
      paint();
      setTimeout(advanceTurn, p.kind === "ai" ? 1400 : 2200);
    }, 1400);
  }

  async function cashOut() {
    const p = current();
    if (!p || p.kind === "ai" || spinning || S.phase !== "trade") return;
    if (!confirm(`Cash out ${p.name} at ${dollars(netWorth(p))} and log it to TOP Cashout?`)) return;
    liquidate(p);
    log(`${p.name} CASHES OUT at ${dollars(p.worth)} — posted to the hall.`);
    const posted = await submitCashout(p);
    paint();
    const others = living().length > 0;
    showOverlay(`
      <div class="modal">
        <h2>Cashed out</h2>
        <p><b>${esc(p.name)}</b> locked ${dollars(p.worth)} after ${S.round} turn${S.round === 1 ? "" : "s"}.</p>
        <p class="sel-meta">${posted ? "Logged to the TOP Cashout hall (highest net worth ranks first)." : "Saved on this device. The live hall may still be waking — it will retry from the local queue."}</p>
        <div class="row">
          ${others ? `<button class="btn gold" id="keepOn">Keep the floor going</button>` : ""}
          <button class="btn${others ? "" : " gold"}" id="again">New floor</button>
          <a class="btn" href="${LEDGER_PAGE}">TOP Cashout</a>
        </div>
      </div>`);
    const keep = $("keepOn");
    if (keep) keep.onclick = () => { hideOverlay(); if (!maybeEnd()) advanceTurn(); };
    $("again").onclick = showMenu;
    if (!others) maybeEnd();
  }

  async function submitCashout(p) {
    const rec = {
      name: p.name,
      worth: Math.round(p.worth),
      cash: Math.round(p.cash),
      rounds: S.round,
      seats: S.players.length,
      jackpots: p.jackpots,
      date: new Date().toISOString().slice(0, 10),
      game: "stock-market-masters",
      event: "cashout"
    };
    try {
      const q = JSON.parse(localStorage.getItem("smm-queue") || "[]");
      q.push(rec);
      localStorage.setItem("smm-queue", JSON.stringify(q.slice(-40)));
    } catch (_) {}
    try {
      const r = await fetch(LEDGER_POST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rec)
      });
      const j = await r.json().catch(() => ({}));
      return !!(r.ok && j && j.ok);
    } catch (_) {
      return false;
    }
  }

  function finish(why) {
    S.phase = "over";
    S.players.sort((a, b) => (b.worth || netWorth(b)) - (a.worth || netWorth(a)));
    const cashed = S.players.filter((p) => p.cashed);
    log(why);
    paint();
    showOverlay(`
      <div class="modal">
        <h2>Bell</h2>
        <p>${esc(why)}</p>
        <ol>${S.players.map((p) => `<li><b>${esc(p.name)}</b> · ${dollars(p.worth || 0)}${p.cashed ? " cashed" : ""}${p.kind === "ai" ? " (AI)" : ""}</li>`).join("")}</ol>
        ${cashed.length ? `<p class="sel-meta">Cash-outs are ranked by net worth on the hall.</p>` : ""}
        <div class="row">
          <button class="btn gold" id="again">New floor</button>
          <a class="btn" href="${LEDGER_PAGE}">TOP Cashout</a>
        </div>
      </div>`, "");
    $("again").onclick = showMenu;
  }

  function pullLine(pl) {
    if (!pl) return "waiting";
    if (pl.jackpot) return "JACKPOT 50¢";
    const st = stockById(pl.stock);
    const act = pl.action === "up" ? "▲ UP" : pl.action === "down" ? "▼ DN" : "DIV";
    return (st ? st.ticker : "?") + "  " + act + "  " + pl.cents + "¢";
  }

  function dieFace(pl, which) {
    if (!pl) {
      if (which === 0) return { lab: "—", ico: "", cls: "" };
      if (which === 1) return { lab: "—", ico: "", cls: "" };
      return { lab: "—", ico: "", cls: "" };
    }
    if (which === 0) {
      if (pl.jackpot) return { lab: "JACKPOT", ico: "", cls: "jackpot" };
      const st = stockById(pl.stock);
      return { lab: st.ticker, ico: st.icon, cls: "" };
    }
    if (which === 1) {
      if (pl.jackpot) return { lab: "★ JP", ico: "", cls: "jackpot" };
      const map = { up: "▲ UP", down: "▼ DN", div: "DIV" };
      return { lab: map[pl.action] || pl.action, ico: "", cls: pl.action };
    }
    if (pl.jackpot) return { lab: "50¢", ico: "", cls: "jackpot" };
    return { lab: pl.cents + "¢", ico: "", cls: "" };
  }

  function ensureMachines() {
    const host = $("machines");
    if (!host) return;
    if (host.dataset.built === "1") {
      host.querySelectorAll(".slot").forEach((slot, i) => {
        if (!slot.querySelector(".last-roll")) {
          const p = document.createElement("p");
          p.className = "last-roll";
          p.id = "lastRoll" + i;
          slot.appendChild(p);
        }
      });
      return;
    }
    host.innerHTML = [0, 1].map((i) => `
      <article class="slot" data-slot="${i}">
        <div class="slot-cab">
          <p class="slot-tag">Dice ${i + 1}</p>
          <div class="slot-dice">
            <div class="die" data-d="0"><div class="die-ico"></div><div class="die-val">—</div></div>
            <div class="die" data-d="1"><div class="die-val">—</div></div>
            <div class="die" data-d="2"><div class="die-val">—</div></div>
          </div>
        </div>
        <p class="last-roll" id="lastRoll${i}">Last roll: waiting</p>
      </article>`).join("");
    host.dataset.built = "1";
  }

  function paintMachines(spin) {
    const host = $("machines");
    if (!host) return;
    ensureMachines();
    host.classList.toggle("is-spinning", !!spin);
    const pulls = S.lastPulls || [null, null];
    host.querySelectorAll(".slot").forEach((slot, i) => {
      const pl = pulls[i];
      slot.classList.toggle("has-roll", !!(pl && !spin));
      slot.querySelectorAll(".die").forEach((die, d) => {
        const face = dieFace(pl, d);
        const val = die.querySelector(".die-val");
        const ico = die.querySelector(".die-ico");
        die.className = "die " + face.cls + (spin ? " spinning" : "");
        if (!spin && val) val.textContent = face.lab;
        if (!spin && ico) ico.style.backgroundImage = face.ico ? `url(${face.ico})` : "none";
      });
      const line = slot.querySelector(".last-roll");
      if (line) line.textContent = spin ? "Rolling…" : ("Last roll: " + pullLine(pl));
    });
  }

  function ensureBoard() {
    const host = $("board");
    if (!host || host.dataset.built === "1") return;
    const ticks = [200, 175, 150, 125, 100, 75, 50, 25, 0];
    const scale = `<div class="yscale">${ticks.map((t) => `<span>${t === 100 ? "PAR" : "$" + (t / 100).toFixed(2)}</span>`).join("")}</div>`;
    const cols = STOCKS.map((st) => `
      <article class="col" data-col="${st.id}" style="--col:${st.color}">
        <header class="col-head">
          <div class="ico"><img src="${st.icon}" alt=""></div>
          <div>
            <div class="nm">${esc(st.name)}</div>
            <div class="tk">${st.ticker}</div>
          </div>
          <div class="px" id="px-${st.id}">$1.00</div>
        </header>
        <div class="spark-wrap" id="sp-${st.id}"></div>
        <div class="track" id="tr-${st.id}">
          <i class="parline" title="Par $1.00"></i>
          <div class="peg" id="peg-${st.id}"><img src="${st.icon}" alt="${esc(st.name)}"></div>
        </div>
        <div class="own" id="own-${st.id}"></div>
        <div class="acts">
          <button type="button" class="buy" data-buy="${st.id}">Buy</button>
          <button type="button" class="sell" data-sell="${st.id}">Sell</button>
        </div>
      </article>`).join("");
    host.innerHTML = `<div class="quote-title">Quotation Board · $0.00 to $2.00</div><div class="quote-grid">${scale}${cols}</div>`;
    host.dataset.built = "1";
    host.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => buy(b.getAttribute("data-buy")));
    host.querySelectorAll("[data-sell]").forEach((b) => b.onclick = () => sell(b.getAttribute("data-sell")));
  }

  function paintBoard() {
    const host = $("board");
    if (!host) return;
    ensureBoard();
    const p = current();
    const trade = S.phase === "trade" && p && p.kind !== "ai" && !spinning;
    STOCKS.forEach((st) => {
      const price = S.price[st.id];
      const own = p ? (p.hold[st.id] || 0) : 0;
      const pxEl = $("px-" + st.id);
      const peg = $("peg-" + st.id);
      const ownEl = $("own-" + st.id);
      const sp = $("sp-" + st.id);
      if (pxEl) {
        pxEl.textContent = px(price);
        pxEl.className = "px " + (price >= PAR ? "hot" : "cold");
      }
      if (peg) peg.style.bottom = (price / 200 * 100) + "%";
      if (ownEl) ownEl.textContent = own ? (own.toLocaleString() + " sh · " + dollars(own * price)) : "—";
      if (sp) sp.innerHTML = sparkSvg(S.hist[st.id], st.color);
      const buyBtn = host.querySelector(`[data-buy="${st.id}"]`);
      const sellBtn = host.querySelector(`[data-sell="${st.id}"]`);
      if (buyBtn) {
        buyBtn.textContent = "Buy " + lotOf();
        buyBtn.disabled = !(trade && canBuy(p, st.id));
      }
      if (sellBtn) {
        sellBtn.textContent = "Sell " + lotOf();
        sellBtn.disabled = !(trade && canSell(p, st.id));
      }
    });
  }

  function paintBank() {
    const host = $("bank");
    if (!host) return;
    const p = current();
    if (!p) { host.innerHTML = ""; return; }
    const w = netWorth(p);
    host.innerHTML = `
      <div class="bank-top">
        <div>
          <h2>Bank · ${esc(p.name)}</h2>
          <div class="worth">${dollars(w)}</div>
          <p class="cash">Cash ${dollars(p.cash)} · stock ${dollars(w - p.cash)}</p>
        </div>
        <p class="sel-meta">Lot
          ${LOTS.map((n) => `<button type="button" class="btn${n === lotOf() ? " gold" : ""}" data-lot="${n}">${n}</button>`).join(" ")}
        </p>
      </div>
      <div class="hold">
        ${STOCKS.map((st) => {
          const sh = p.hold[st.id] || 0;
          if (!sh) return "";
          return `<div class="row"><div class="ico"><img src="${st.icon}" alt=""></div><div>${esc(st.name)}<br><span class="tk">${sh.toLocaleString()} sh @ ${px(S.price[st.id])}</span></div><b>${dollars(sh * S.price[st.id])}</b></div>`;
        }).join("") || "<p class='sel-meta'>No certificates yet — buy on the board below.</p>"}
      </div>
      <div class="log" id="tickLog">${esc(S.log)}</div>`;
    host.querySelectorAll("[data-lot]").forEach((b) => {
      b.onclick = () => { S.lot = +b.getAttribute("data-lot"); paint(); };
    });
  }

  function paintPlayers() {
    const host = $("players");
    if (!host) return;
    host.innerHTML = S.players.map((x, i) => `
      <article class="pcard${i === S.turn ? " on" : ""}${x.cashed || !x.alive ? " out" : ""}">
        <div class="pc-name">${esc(x.name)}${x.kind === "ai" ? " · AI" : ""}</div>
        <div class="pc-worth">${dollars(x.cashed ? x.worth : netWorth(x))}</div>
        <div class="pc-st">${x.cashed ? "cashed out" : x.alive ? "on the floor" : "broke"}</div>
      </article>`).join("");
  }

  function paint() {
    if (!S) return;
    const p = current();
    $("phasePill").textContent = S.phase.toUpperCase();
    $("resHud").innerHTML = `<span>Turn <b>${S.round}</b></span><span>Desk <b>${p ? esc(p.name) : "—"}</b></span><span>Lot <b>${lotOf()}</b></span><span>Endless</span>`;
    $("dockStatus").textContent = S.phase === "trade" && p && p.kind !== "ai"
      ? "Never-ending floor. Buy or sell, roll the dice, or cash out to post your high score."
      : (S.phase === "over" ? "Floor closed." : "Tape moving…");
    $("btnSpin").disabled = !(S.phase === "trade" && p && p.kind !== "ai" && !spinning);
    $("btnCash").disabled = $("btnSpin").disabled;
    paintMachines(spinning);
    paintBoard();
    paintBank();
    paintPlayers();
  }

  function showOverlay(html, cls) {
    const o = $("overlay");
    o.className = "overlay show " + (cls || "");
    o.innerHTML = html;
  }
  function hideOverlay() { $("overlay").className = "overlay"; $("overlay").innerHTML = ""; }

  function gatherSeats() {
    const seats = [];
    for (let i = 0; i < 4; i++) {
      const kind = ($("sk" + i) || {}).value || (i === 0 ? "human" : "off");
      if (kind === "off") continue;
      let name = (($("sn" + i) || {}).value || "").trim().slice(0, 18) || (kind === "ai" ? "AI Desk " + (i + 1) : "Desk " + (i + 1));
      seats.push(mkPlayer(name, kind));
    }
    if (!seats.length) seats.push(mkPlayer(persistName(), "human"));
    if (!seats.some((p) => p.kind === "human")) seats[0].kind = "human";
    return seats;
  }

  function newMatch() {
    const players = gatherSeats();
    saveName(players[0].name);
    const prices = {};
    const hist = {};
    STOCKS.forEach((st) => { prices[st.id] = PAR; hist[st.id] = [PAR]; });
    const board = $("board");
    const mach = $("machines");
    if (board) board.dataset.built = "";
    if (mach) mach.dataset.built = "";
    S = {
      players, turn: 0, round: 1,
      phase: "trade", price: prices, hist, lot: 500, log: "", lastPulls: [null, null]
    };
    hideOverlay();
    $("boot").classList.add("hidden");
    $("app").classList.remove("hidden");
    log("Eight desks open at par $1.00. Two dice move two tapes each turn.");
    paint();
    if (current().kind === "ai") setTimeout(runAiTurn, 600);
  }

  function showMenu() {
    $("app").classList.add("hidden");
    const n0 = persistName();
    const seat = (i) => {
      const defKind = i === 0 ? "human" : i === 1 ? "ai" : "off";
      const defName = i === 0 ? n0 : i === 1 ? "Tape AI" : "";
      return `<div class="desk-row">
        <label>Desk ${i + 1} name <input id="sn${i}" maxlength="18" value="${esc(defName)}"></label>
        <label>Kind
          <select id="sk${i}">
            <option value="human"${defKind === "human" ? " selected" : ""}>Human</option>
            <option value="ai"${defKind === "ai" ? " selected" : ""}>AI</option>
            <option value="off"${defKind === "off" ? " selected" : ""}>Empty</option>
          </select>
        </label>
      </div>`;
    };
    showOverlay(`
      <div class="title-screen">
        <div class="title-art">
          <img src="./assets/menu.jpg" alt="Stock exchange trading floor">
          <div class="title-art-fade"></div>
        </div>
        <div class="title-panel">
          <p class="kicker">Δ9Φ963 · chatagent.ca</p>
          <h1>STOCK MARKET MASTERS</h1>
          <p class="title-tag">Never-ending quotation board. Ride the tape until you cash out — highest play-money score hits the hall.</p>
          <p>Play-money board game — not a casino and not real markets. No round limit. Timber and Utilities sit beside the classic six desks. Two dice each turn: stock, UP / DOWN / DIV, and 5¢ 10¢ or 20¢. Cash out when you want; that score is your high score.</p>
          ${[0, 1, 2, 3].map(seat).join("")}
          <div class="row">
            <button class="btn gold" id="go">Open the floor</button>
            <a class="btn" href="${LEDGER_PAGE}">TOP Cashout</a>
            <a class="btn ghost" href="/games/">All games</a>
            <button class="btn ghost" id="menuRadio">Play radio</button>
          </div>
          <p class="sel-meta">Par $1.00 · split at $2.00 · bust at $0 · DIV only at/above par · 5 / 10 / 20¢ · jackpot 50¢ · both dice jackpot $1.00/share.</p>
          <p class="sel-meta"><a href="./disclaimer.html">Gambling disclaimer</a> · <a class="paypal-mini" href="https://www.paypal.com/paypalme/ExcavationPro" target="_blank" rel="noopener">PayPal.me/ExcavationPro</a></p>
        </div>
      </div>`, "menu");
    $("go").onclick = newMatch;
    $("menuRadio").onclick = () => { const b = $("radioPlay"); if (b) b.click(); };
  }

  function help() {
    showOverlay(`
      <div class="modal">
        <h2>How the floor works</h2>
        <p>Inspired by 1937 commodity quotation boards — original name, two extra stocks, two dice per turn (cabinet look, still just dice).</p>
        <ul>
          <li>Start with $5,000 play money. Lots of 500 / 1,000 / 2,000 / 5,000 shares.</li>
          <li>On your turn: buy and sell at the tape, then roll <b>both</b> dice. Each die picks a desk, UP / DOWN / DIV, and 5¢ 10¢ or 20¢.</li>
          <li>DIV pays that many cents per share you hold, but only if the desk is at or above par $1.00. Example: 1,000 Oil @ $1.25 and DIV 10¢ → $100.</li>
          <li>At $2.00 the desk splits 2-for-1 and resets to $1.00. At $0 shares are wiped and the desk reopens at $1.00.</li>
          <li>Very rare JACKPOT: 50¢ per share on every par-or-better holding. Both dice jackpot: $1.00 per share.</li>
          <li>Never-ending: there is no round cap. Cash out when you want — that net worth is logged to the TOP Cashout hall (highest first). Going broke takes you off the floor without a score.</li>
          <li>Up to four desks: humans hot-seat, AI optional. <a href="./disclaimer.html">Gambling disclaimer</a>.</li>
        </ul>
        <button class="btn gold" id="okHelp">Back</button>
      </div>`);
    $("okHelp").onclick = () => { hideOverlay(); };
  }

  function bind() {
    $("btnSpin").onclick = spinBoth;
    $("btnCash").onclick = cashOut;
    $("btnHelp").onclick = help;
    $("btnMenu").onclick = () => {
      if (S && S.phase !== "over" && !confirm("Leave the floor?")) return;
      showMenu();
    };
  }

  window.addEventListener("load", () => {
    bind();
    $("boot").classList.add("hidden");
    showMenu();
  });
})();
