/* LYGO SKYNET v1.0.0 — AETHONΔ9 sentinel. No live Star Chart write. */
(function () {
  "use strict";
  const SIG = "Delta9Phi963-LYGO-SKYNET-v1.0.0";
  const URLS = {
    doctrine: "/skynet/doctrine.json",
    news: "/witness/news-monitor.json",
    shadows: "/witness/shadows.json",
    hf: "https://huggingface.co/datasets/DeepSeekOracle/lygo-public-witness-feed/resolve/main/feed.json",
    anchors: "https://deepseekoracle.github.io/lygo-protocol-stack/network_builder/IMMUTABLE_ANCHORS.json",
    star: "https://deepseekoracle.github.io/lygo-protocol-stack/haven_star_chart/haven_star_chart_feed.json",
    starMon: "https://huggingface.co/datasets/DeepSeekOracle/lygo-public-witness-feed/resolve/main/star-monitor.json",
    starchart: "/starchart/doctrine.json",
    lattice: "/lattice/doctrine.json",
    latticeAudit: "https://huggingface.co/datasets/DeepSeekOracle/lygo-public-witness-feed/resolve/main/lattice-audit.json",
    agora: "https://deepseekoracle.github.io/lygo-protocol-stack/agent-agora/api/pulse.json",
    lattice: "https://deepseekoracle.github.io/lygo-protocol-stack/GIT_LATTICE_OVERVIEW.json",
    usgs: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
    iss: "https://api.wheretheiss.at/v1/satellites/25544"
  };
  const canvas = document.getElementById("net");
  const ctx = canvas.getContext("2d");
  const LIMBS = [
    { id: "PULSE", title: "PULSE", why: "Allowlisted HTTPS GET of lattice + public resources.", url: "/godseye/" },
    { id: "AETHON", title: "AETHONΔ9", why: "Discourse heuristics on public titles. Not identity.", url: "/skynet/" },
    { id: "YIELD", title: "YIELD", why: "ALIGNED / REVIEW / SHADOW. Human remains publisher.", url: "/skynet/" },
    { id: "WIRE", title: "WIRE", why: "God's Eye iris + Witness globe + Agora + Star Chart monitor.", url: "/starchart/" }
  ];
  const state = {
    tick: 0, yield: "ALIGNED", live: 0, miss: 0, queue: [], board: [],
    maxOps: 0, pick: null, lastPulse: null
  };

  function size() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(320, r.width) * dpr;
    canvas.height = Math.max(320, r.height) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function esc(s) {
    return window.LYGO_GUARD ? window.LYGO_GUARD.esc(s) : String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c];
    });
  }

  async function getJson(url) {
    if (window.LYGO_GUARD && !window.LYGO_GUARD.allowFetch(url)) throw new Error("blocked_host");
    const ctrl = new AbortController();
    const t = setTimeout(function () { ctrl.abort(); }, 14000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: "omit", redirect: "follow" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }

  function hex(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function limbPos(i, cx, cy, R) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2 + state.tick * 0.002;
    return { x: cx + Math.cos(a) * R * 0.55, y: cy + Math.sin(a) * R * 0.55 };
  }

  function draw() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.48, R = Math.min(w, h) * 0.4;
    state.tick++;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, R * 1.2);
    g.addColorStop(0, "#14220c");
    g.addColorStop(1, "#05070d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(52,211,153,0.15)";
    for (let r = 0.2; r <= 1; r += 0.2) {
      hex(cx, cy, R * r);
      ctx.stroke();
    }
    LIMBS.forEach(function (L, i) {
      const p = limbPos(i, cx, cy, R);
      L._x = p.x; L._y = p.y;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "rgba(251,191,36,0.35)";
      ctx.stroke();
      hex(p.x, p.y, 28);
      ctx.fillStyle = "#0b1220";
      ctx.fill();
      ctx.strokeStyle = i === 2 && state.yield !== "ALIGNED" ? "#a78bfa" : "#34d399";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(L.title, p.x, p.y + 4);
    });
    hex(cx, cy, 36);
    ctx.fillStyle = "#fde68a";
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("SKYNET", cx, cy + 4);
    ctx.fillStyle = "#86efac";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("AETHONΔ9 · pulse · yield · never steal payload", cx, cy + R * 0.95);
    if (state.pick && state.pick._x) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      hex(state.pick._x, state.pick._y, 34);
      ctx.stroke();
    }
    requestAnimationFrame(draw);
  }

  function setYield(y) {
    state.yield = y;
    const chip = document.getElementById("yield-chip");
    if (!chip) return;
    chip.textContent = "YIELD · " + y;
    chip.className = "chip " + (y === "ALIGNED" ? "ok" : (y === "REVIEW" ? "review" : "shadow"));
  }

  function persist() {
    const pulse = {
      signature: SIG,
      utc: new Date().toISOString(),
      yield: state.yield,
      live: state.live,
      miss: state.miss,
      max_ops: state.maxOps,
      queue: state.queue.slice(0, 12),
      live_star_chart_write: "consent_pending_only"
    };
    try { localStorage.setItem("lygo-skynet-pulse", JSON.stringify(pulse)); } catch (e) {}
    state.lastPulse = pulse;
  }

  function briefLimb(L) {
    state.pick = L;
    const el = document.getElementById("brief");
    if (!el) return;
    el.classList.remove("empty");
    el.innerHTML = "<p class=\"kicker\">Limb</p><h2><span class=\"tag canon\">SKYNET</span> " + esc(L.title) + "</h2><p>" + esc(L.why) + "</p>" +
      (function () {
        const href = window.LYGO_GUARD ? window.LYGO_GUARD.safeHref(L.url) : L.url;
        return href ? "<div class=\"brief-links\"><a class=\"btn ghost\" href=\"" + esc(href) + "\">Open wire</a></div>" : "";
      })();
  }

  function renderQueue() {
    const ul = document.getElementById("queue");
    if (!ul) return;
    ul.innerHTML = (state.queue.length ? state.queue : [{ title: "No REVIEW titles this pulse.", yield: "ALIGNED", ops_score: 0 }]).map(function (q) {
      const cls = q.yield === "SHADOW" ? "shadow" : (q.yield === "REVIEW" ? "ref" : "canon");
      return "<li><span class=\"tag " + cls + "\">" + esc(q.yield) + "</span>" + esc(q.title) +
        "<div class=\"legend\">ops " + q.ops_score + (q.url ? " · public headline" : "") + "</div></li>";
    }).join("");
    document.getElementById("n-rev").textContent = String(state.queue.filter(function (q) { return q.yield === "REVIEW"; }).length);
    document.getElementById("n-sh").textContent = String(state.queue.filter(function (q) { return q.yield === "SHADOW"; }).length);
    document.getElementById("n-ops").textContent = state.maxOps ? String(state.maxOps) : "—";
    document.getElementById("n-pulse").textContent = String(state.live);
  }

  async function pulse() {
    state.live = 0; state.miss = 0; state.queue = []; state.maxOps = 0;
    const rows = [];
    async function one(name, url) {
      try {
        const data = await getJson(url);
        state.live += 1;
        rows.push("<div class=\"row\"><span>" + esc(name) + "</span><span class=\"tag ok\">live</span></div>");
        return data;
      } catch (e) {
        state.miss += 1;
        rows.push("<div class=\"row\"><span>" + esc(name) + "</span><span class=\"tag shadow\">named</span></div>");
        return null;
      }
    }
    const news = await one("news-monitor", URLS.news);
    await one("shadows", URLS.shadows);
    await one("anchors", URLS.anchors);
    await one("star", URLS.star);
    await one("star-monitor", URLS.starMon);
    await one("starchart doctrine", URLS.starchart);
    await one("lattice kernel", URLS.lattice);
    await one("lattice-audit", URLS.latticeAudit);
    await one("agora", URLS.agora);
    await one("lattice", URLS.lattice);
    await one("usgs", URLS.usgs);
    await one("iss", URLS.iss);
    await one("hf overlay", URLS.hf);
    const titles = [];
    if (news) {
      (news.severe || []).concat(news.world || []).forEach(function (r) {
        if (r && r.title) titles.push({ title: r.title, url: r.url });
      });
    }
    const scan = window.AETHON9 && window.AETHON9.scan;
    titles.slice(0, 40).forEach(function (t) {
      if (!scan) return;
      const s = scan(t.title);
      if (s.ops_score > state.maxOps) state.maxOps = s.ops_score;
      if (s.yield !== "ALIGNED") {
        state.queue.push({ title: t.title, url: t.url, yield: s.yield, ops_score: s.ops_score, hits: s.hits });
      }
    });
    let y = "ALIGNED";
    if (state.queue.some(function (q) { return q.yield === "REVIEW"; })) y = "REVIEW";
    if (state.queue.some(function (q) { return q.yield === "SHADOW"; })) y = "SHADOW";
    if (state.miss >= 4 && y === "ALIGNED") y = "REVIEW";
    setYield(y);
    document.getElementById("board").innerHTML = rows.join("");
    renderQueue();
    persist();
    const el = document.getElementById("brief");
    if (el && el.classList.contains("empty")) {
      el.classList.remove("empty");
      el.innerHTML = "<p class=\"kicker\">Yield</p><h2>" + y + "</h2><p>Pulse complete. Live " + state.live + " · named misses " + state.miss + " · max ops " + state.maxOps + ". AETHONΔ9 scored public titles only.</p>";
    }
  }

  canvas.addEventListener("click", function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best = null, bestD = 40 * 40;
    LIMBS.forEach(function (L) {
      if (L._x == null) return;
      const d = (L._x - mx) * (L._x - mx) + (L._y - my) * (L._y - my);
      if (d < bestD) { bestD = d; best = L; }
    });
    if (best) briefLimb(best);
  });
  const btn = document.getElementById("btn-pulse");
  if (btn) btn.addEventListener("click", function () { pulse(); });

  function clock() {
    const el = document.getElementById("utc");
    if (el) el.textContent = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  }
  document.getElementById("sig").textContent = SIG;
  window.addEventListener("resize", size);
  size();
  clock();
  setInterval(clock, 1000);
  draw();
  pulse();
  setInterval(pulse, 90000);
})();
