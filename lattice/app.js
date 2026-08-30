/* LYGO Lattice Kernel v1.0.0 — autonomous pulse, self-audit, future slots. */
(function () {
  "use strict";
  const SIG = "Delta9Phi963-LATTICE-KERNEL-v1.0.0";
  const STALE_DAYS = 10;
  const canvas = document.getElementById("core");
  const ctx = canvas.getContext("2d");
  const state = {
    tick: 0, slots: [], results: {}, pick: null,
    yield: "…", live: 0, miss: 0, future: 0, claims: [], extras: {}
  };

  function size() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(320, r.width) * dpr;
    canvas.height = Math.max(320, r.height) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c];
    });
  }

  async function getAny(url) {
    const ctrl = new AbortController();
    const t = setTimeout(function () { ctrl.abort(); }, 14000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { json = null; }
      return { ok: res.ok, status: res.status, json: json, text: text.slice(0, 400), bytes: text.length };
    } finally { clearTimeout(t); }
  }

  function ringOf(s) {
    if (s.class === "FUTURE" || s.era === "future") return "future";
    if (s.class === "RESOURCE") return "resource";
    return "canon";
  }

  function draw() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.48, R = Math.min(w, h) * 0.42;
    state.tick++;
    const g = ctx.createRadialGradient(cx, cy, 16, cx, cy, R * 1.2);
    g.addColorStop(0, "#1a3a4a");
    g.addColorStop(0.4, "#0c1c2e");
    g.addColorStop(1, "#05070d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    [[0.28, "#fbbf2488"], [0.55, "#f59e0b66"], [0.82, "#67e8f966"]].forEach(function (ring) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * ring[0], 0, Math.PI * 2);
      ctx.strokeStyle = ring[1];
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
    const scan = (state.tick * 0.02) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * 0.82, scan, scan + 0.32);
    ctx.closePath();
    ctx.fillStyle = "rgba(125,211,252,0.07)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = state.yield === "SHADOW" ? "#a78bfa" : (state.yield === "DRIFT" ? "#fb923c" : "#fde68a");
    ctx.fill();
    ctx.fillStyle = "#0b1220";
    ctx.font = "9px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("Δ9", cx, cy + 3);
    const groups = { canon: [], resource: [], future: [] };
    state.slots.forEach(function (s) { groups[ringOf(s)].push(s); });
    const ringR = { canon: R * 0.28, resource: R * 0.55, future: R * 0.82 };
    const colors = { canon: "#fbbf24", resource: "#f59e0b", future: "#67e8f9" };
    Object.keys(groups).forEach(function (ring) {
      groups[ring].forEach(function (s, i) {
        const a = (i / Math.max(1, groups[ring].length)) * Math.PI * 2 + state.tick * 0.001;
        const p = { x: cx + Math.cos(a) * ringR[ring], y: cy + Math.sin(a) * ringR[ring] };
        s._x = p.x; s._y = p.y;
        const r = state.results[s.id];
        ctx.beginPath();
        ctx.arc(p.x, p.y, ring === "canon" ? 5 : 4, 0, Math.PI * 2);
        if (ring === "future") {
          ctx.strokeStyle = colors.future;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          if (r && r.live) {
            ctx.fillStyle = colors.future;
            ctx.fill();
          }
        } else if (r && r.live) {
          ctx.fillStyle = colors[ring];
          ctx.fill();
        } else if (r && r.live === false) {
          ctx.strokeStyle = "#a78bfa";
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = "#334155";
          ctx.fill();
        }
      });
    });
    if (state.pick && state.pick._x) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.pick._x, state.pick._y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "#86efac";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("LATTICE KERNEL · audit · future slots wait for proof", cx, cy + R * 0.98);
    requestAnimationFrame(draw);
  }

  function nearest(mx, my) {
    let best = null, bestD = 20 * 20;
    state.slots.forEach(function (s) {
      if (s._x == null) return;
      const d = (s._x - mx) * (s._x - mx) + (s._y - my) * (s._y - my);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  function brief(s) {
    state.pick = s;
    const el = document.getElementById("brief");
    if (!el || !s) return;
    const r = state.results[s.id] || {};
    const ring = ringOf(s);
    const tag = ring === "future" ? "FUTURE" : (r.live ? (ring === "canon" ? "CANON" : "RESOURCE") : "SHADOW");
    const cls = tag === "FUTURE" ? "future" : (tag === "SHADOW" ? "shadow" : (tag === "RESOURCE" ? "ref" : "canon"));
    el.classList.remove("empty");
    el.innerHTML = "<p class=\"kicker\">Slot</p><h2><span class=\"tag " + cls + "\">" + tag + "</span> " + esc(s.title) + "</h2>" +
      "<p>" + esc(s.why || r.note || (r.live ? "Public GET succeeded." : "Named miss. Payload not invented.")) + "</p>" +
      "<p class=\"legend\">" + esc(s.url) + "</p>" +
      "<div class=\"brief-links\"><a class=\"btn ghost\" href=\"" + esc(s.url) + "\" target=\"_blank\" rel=\"noopener\">Open</a></div>";
  }

  function setYield(y) {
    state.yield = y;
    const chip = document.getElementById("yield-chip");
    if (chip) {
      chip.textContent = "YIELD · " + y;
      chip.className = "chip " + (y === "ALIGNED" ? "ok" : (y === "DRIFT" ? "drift" : "shadow"));
    }
    document.getElementById("n-yield").textContent = y;
  }

  function checkChain(entries) {
    if (!entries || !entries.length) return { ok: false, errors: ["empty"] };
    const errs = [];
    for (let i = 0; i < entries.length - 1; i++) {
      if ((entries[i].prev_hash || "") !== (entries[i + 1].entry_hash || "")) {
        errs.push("break_at_seq_" + entries[i].seq);
        break;
      }
    }
    return { ok: errs.length === 0, errors: errs };
  }

  function daysSince(iso) {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (!t) return null;
    return (Date.now() - t) / 86400000;
  }

  function receipt() {
    return {
      signature: SIG,
      utc: new Date().toISOString(),
      yield: state.yield,
      live: state.live,
      miss: state.miss,
      future: state.future,
      claims: state.claims,
      extras: state.extras,
      slots: state.slots.map(function (s) {
        const r = state.results[s.id] || {};
        return { id: s.id, class: s.class, era: s.era, live: !!r.live, note: r.note || null, url: s.url };
      }),
      autonomous: true,
      live_star_chart_ingest: false
    };
  }

  function render() {
    const ul = document.getElementById("feed");
    ul.innerHTML = state.slots.map(function (s) {
      const r = state.results[s.id] || {};
      const ring = ringOf(s);
      const tag = ring === "future" ? "FUTURE" : (r.live ? "LIVE" : (r.live === false ? "NAMED" : "…"));
      const cls = tag === "FUTURE" ? "future" : (tag === "NAMED" ? "shadow" : "ok");
      return "<li data-id=\"" + esc(s.id) + "\"><span class=\"tag " + cls + "\">" + tag + "</span>" + esc(s.title) + "</li>";
    }).join("");
    ul.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("click", function () {
        const s = state.slots.filter(function (x) { return x.id === li.getAttribute("data-id"); })[0];
        if (s) brief(s);
      });
    });
    document.getElementById("n-live").textContent = String(state.live);
    document.getElementById("n-miss").textContent = String(state.miss);
    document.getElementById("n-fut").textContent = String(state.future);
    const out = document.getElementById("out");
    if (out) out.textContent = JSON.stringify(receipt(), null, 2);
  }

  async function audit() {
    const board = [];
    state.results = {};
    state.claims = [];
    state.extras = {};
    let star = null, agora = null, overview = null;
    for (let i = 0; i < state.slots.length; i++) {
      const s = state.slots[i];
      const future = ringOf(s) === "future";
      try {
        const got = await getAny(s.url);
        let live = !!got.ok;
        let note = "HTTP " + got.status;
        if (s.expect === "json" && live && !got.json) {
          live = false;
          note = "expected JSON";
        }
        if (s.expect_sig && got.json && live) {
          const sig = String(got.json.signature || got.json.name || "");
          if (sig.indexOf(s.expect_sig) === -1 && JSON.stringify(got.json).indexOf(s.expect_sig) === -1) {
            note = "signature miss";
          }
        }
        if (s.id === "star_feed" && got.json) {
          star = got.json;
          const chk = checkChain(got.json.entries || []);
          state.extras.star = {
            chain_valid_published: got.json.chain_valid,
            chain_valid_checked: chk.ok,
            chain_root: got.json.chain_root,
            seq: (got.json.entries && got.json.entries[0] && got.json.entries[0].seq) || null
          };
          if (!chk.ok || got.json.chain_valid === false) {
            live = false;
            note = "chain break";
          }
          state.claims.push({ claim: "star_chain_valid", pass: !!(chk.ok && got.json.chain_valid) });
        }
        if (s.id === "agora" && got.json) {
          agora = got.json;
          state.extras.agora = { feed_root: got.json.feed_root, chart_sha: got.json.chart_sha, nodes: got.json.chart_nodes };
        }
        if (s.id === "overview" && got.json) {
          overview = got.json;
          const age = daysSince(got.json.generated_utc);
          state.extras.overview_age_days = age == null ? null : Math.round(age * 10) / 10;
          if (age != null && age > STALE_DAYS) note = "stale " + Math.round(age) + "d";
        }
        state.results[s.id] = { live: live, note: note, future: future };
        const tag = future ? "future" : (live ? "ok" : "shadow");
        board.push("<div class=\"row\"><span>" + esc(s.title) + "</span><span class=\"tag " + tag + "\">" +
          (future ? "future" : (live ? "live" : "named")) + "</span></div>");
      } catch (e) {
        state.results[s.id] = { live: false, note: String(e).slice(0, 80), future: future };
        board.push("<div class=\"row\"><span>" + esc(s.title) + "</span><span class=\"tag shadow\">named</span></div>");
      }
    }
    const canon = state.slots.filter(function (s) { return ringOf(s) === "canon"; });
    const canonLive = canon.filter(function (s) { return state.results[s.id] && state.results[s.id].live; }).length;
    const canonMiss = canon.length - canonLive;
    state.live = state.slots.filter(function (s) { return ringOf(s) !== "future" && state.results[s.id] && state.results[s.id].live; }).length;
    state.miss = state.slots.filter(function (s) { return ringOf(s) !== "future" && (!state.results[s.id] || !state.results[s.id].live); }).length;
    state.future = state.slots.filter(function (s) { return ringOf(s) === "future"; }).length;
    const chainOk = !!(state.extras.star && state.extras.star.chain_valid_checked && state.extras.star.chain_valid_published);
    const rootsMatch = !!(star && agora && star.chain_root && agora.feed_root && star.chain_root === agora.feed_root);
    if (star && agora) {
      state.claims.push({ claim: "agora_feed_root_matches_star_chain_root", pass: rootsMatch });
    }
    const stale = state.extras.overview_age_days != null && state.extras.overview_age_days > STALE_DAYS;
    if (overview) state.claims.push({ claim: "overview_fresh_10d", pass: !stale });
    state.claims.push({ claim: "canon_slots_live", pass: canonMiss === 0, live: canonLive, total: canon.length });
    let y = "ALIGNED";
    if (stale || !rootsMatch || canonMiss >= 1) y = "DRIFT";
    if (!chainOk || canonLive < Math.ceil(canon.length / 2)) y = "SHADOW";
    if (canonMiss === 0 && chainOk && rootsMatch && !stale) y = "ALIGNED";
    setYield(y);
    document.getElementById("board").innerHTML = board.join("");
    render();
    try { localStorage.setItem("lygo-lattice-audit", JSON.stringify(receipt())); } catch (e) {}
    const el = document.getElementById("brief");
    if (el && el.classList.contains("empty")) {
      el.classList.remove("empty");
      el.innerHTML = "<p class=\"kicker\">Yield</p><h2>" + y + "</h2><p>Live " + state.live + " · named " + state.miss +
        " · future " + state.future + ". Re-audits every 90s. Human remains publisher.</p>";
    }
  }

  canvas.addEventListener("click", function (e) {
    const rect = canvas.getBoundingClientRect();
    const n = nearest(e.clientX - rect.left, e.clientY - rect.top);
    if (n) brief(n);
  });
  document.getElementById("btn-audit").addEventListener("click", function () { audit(); });

  function clock() {
    const el = document.getElementById("utc");
    if (el) el.textContent = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  }

  async function boot() {
    document.getElementById("sig").textContent = SIG;
    try {
      const spec = await getAny("/lattice/slots.json");
      state.slots = (spec.json && spec.json.slots) || [];
    } catch (e) {
      state.slots = [];
    }
    size();
    clock();
    setInterval(clock, 1000);
    draw();
    await audit();
    setInterval(audit, 90000);
  }
  window.addEventListener("resize", size);
  boot();
})();
