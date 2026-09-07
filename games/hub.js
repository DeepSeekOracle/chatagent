(function () {
  "use strict";
  var CATALOG = "/games/catalog.json";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function sorted(games) {
    return games.slice().sort(function (a, b) {
      return (a.order || 99) - (b.order || 99);
    });
  }

  function live(games) {
    return sorted(games).filter(function (g) { return g.status === "live"; });
  }

  function coverHtml(g) {
    if (g.cover) {
      return '<img class="gcard-cover" src="' + esc(g.cover) + '" alt="' + esc(g.coverAlt || g.title) + '" width="640" height="336" loading="lazy">';
    }
    return '<div class="gcard-cover gcard-cover-empty" aria-hidden="true"></div>';
  }

  function linksHtml(g) {
    var coming = g.status !== "live" || !g.href;
    var bits = [];
    if (coming) bits.push('<span class="gcard-soon">Coming next</span>');
    else bits.push('<a class="btn primary" href="' + esc(g.href) + '">Play</a>');
    (g.links || []).forEach(function (l) {
      bits.push('<a class="btn" href="' + esc(l.href) + '">' + esc(l.label) + "</a>");
    });
    return bits.join("");
  }

  function cardHtml(g) {
    var coming = g.status !== "live";
    var genre = (g.genre || []).join(" · ");
    return (
      '<article class="gcard' + (coming ? " is-coming" : "") + '" data-id="' + esc(g.id) + '" data-genre="' + esc((g.genre || []).join(" ")) + '">' +
        '<div class="gmod-stage">' + coverHtml(g) + "</div>" +
        '<div class="gcard-body">' +
          '<p class="gcard-kicker">' + esc(genre || (coming ? "upcoming" : "game")) + "</p>" +
          "<h2>" + esc(g.title) + "</h2>" +
          "<p>" + esc(g.blurb || g.tagline || "") + "</p>" +
          '<div class="cta-row">' + linksHtml(g) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function miniHtml(g) {
    return (
      '<div class="mini"><h3><a href="' + esc(g.href) + '">' + esc(g.title) + "</a></h3>" +
      "<p>" + esc(g.tagline || g.blurb || "") + "</p></div>"
    );
  }

  function jsonLd(data) {
    var items = live(data.games).map(function (g, i) {
      return {
        "@type": "ListItem",
        position: i + 1,
        url: (location.origin || "") + g.href,
        name: g.title
      };
    });
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Games",
      numberOfItems: items.length,
      itemListElement: items
    };
  }

  function applyFilter(root, key) {
    root.querySelectorAll(".gcard").forEach(function (card) {
      if (key === "all") {
        card.hidden = false;
        return;
      }
      if (key === "coming") {
        card.hidden = !card.classList.contains("is-coming");
        return;
      }
      var genre = (card.getAttribute("data-genre") || "").toLowerCase();
      card.hidden = genre.indexOf(key) === -1;
    });
  }

  function renderArcade(root, data) {
    var games = sorted(data.games || []);
    var nLive = live(games).length;
    var count = root.querySelector("[data-games-count]");
    if (count) count.textContent = String(nLive);
    var grid = root.querySelector("[data-games-grid]");
    if (!grid) return;
    grid.innerHTML = games.map(cardHtml).join("");
    var filters = root.querySelector("[data-games-filters]");
    if (filters) {
      filters.addEventListener("click", function (ev) {
        var btn = ev.target.closest("button[data-filter]");
        if (!btn) return;
        filters.querySelectorAll("button").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        applyFilter(grid, btn.getAttribute("data-filter"));
      });
    }
    var ld = document.getElementById("games-jsonld");
    if (!ld) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.id = "games-jsonld";
      document.head.appendChild(ld);
      ld.textContent = JSON.stringify(jsonLd(data));
    }
  }

  function renderFeatured(root, data) {
    var games = live(data.games || []).filter(function (g) {
      return g.featured !== false;
    });
    var extras = root.getAttribute("data-games-extra") !== "off";
    var html = games.map(miniHtml).join("");
    if (extras) {
      html += '<div class="mini"><h3><a href="/games/">All games</a></h3><p>' +
        games.length + " live titles. New games appear in the arcade first.</p></div>";
    }
    root.innerHTML = html;
  }

  function bestJson(urls, pick) {
    return Promise.all(urls.map(function (url) {
      return fetch(url, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    })).then(function (all) {
      var best = null, n = -1;
      all.forEach(function (j) {
        var rows = pick(j);
        if (rows.length > n) {
          n = rows.length;
          best = j;
        }
      });
      return best;
    });
  }

  function lsJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }

  function fmtMs(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    var s = ms / 1000, m = Math.floor(s / 60), r = s - m * 60;
    return m + ":" + r.toFixed(3).padStart(6, "0");
  }

  function vsPar(n) {
    if (n == null || n === 0) return "E";
    return n > 0 ? "+" + n : String(n);
  }

  function dollars(c) {
    var n = Number(c);
    if (!isFinite(n)) return "—";
    return (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function paintHall(id, meta, rows) {
    var root = document.querySelector('[data-hall="' + id + '"]');
    if (!root) return;
    var metaEl = root.querySelector(".hall-meta");
    var list = root.querySelector(".hall-rows");
    if (metaEl) metaEl.textContent = meta;
    if (!list) return;
    if (!rows || !rows.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = rows.map(function (r) {
      return "<li><b>" + esc(r.score) + "</b><span>" + esc(r.name) + "</span><em>" + esc(r.meta || "") + "</em></li>";
    }).join("");
  }

  function renderHalls() {
    bestJson([
      "https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins/resolve/main/ledger.json",
      "https://deepseekoracle-lattice-marines-ledger.hf.space/ledger.json",
      "/games/lattice-marines/ledger.json"
    ], function (j) { return (j && j.wins) || []; }).then(function (data) {
      var wins = (data && data.wins) || [];
      var q = lsJson("lygo_lattice_marines_ledger_q") || [];
      var seen = {};
      var mix = wins.concat(q).filter(function (w) {
        var k = (w.name || "") + "|" + (w.score || "") + "|" + (w.date || "") + "|" + (w.seed || "");
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      });
      paintHall(
        "marines",
        mix.length ? (mix.length + " AI wins · public book") : "No inscribed AI wins yet.",
        mix.slice(0, 12).map(function (w) {
          return {
            name: w.name || "Commander",
            score: w.score != null ? String(w.score) : "—",
            meta: [w.diff, w.mapN ? w.mapN + "×" + w.mapN : "", w.date || ""].filter(Boolean).join(" · ")
          };
        })
      );
    });

    bestJson([
      "/games/stock-market-masters/ledger.json",
      "https://huggingface.co/datasets/DeepSeekOracle/stock-market-masters-cashouts/resolve/main/ledger.json",
      "https://deepseekoracle-lattice-marines-ledger.hf.space/smm/ledger.json"
    ], function (j) { return (j && (j.cashouts || j.wins)) || []; }).then(function (data) {
      var rows = ((data && (data.cashouts || data.wins)) || []).slice();
      var q = lsJson("smm-queue") || [];
      var seen = {};
      rows.concat(q).forEach(function (x) {
        var k = (x.name || "") + "|" + (x.worth || 0) + "|" + (x.date || "");
        seen[k] = x;
      });
      var list = Object.keys(seen).map(function (k) { return seen[k]; })
        .sort(function (a, b) { return (b.worth || 0) - (a.worth || 0); });
      paintHall(
        "smm",
        list.length ? (list.length + " cashouts · public book") : "No cashouts yet.",
        list.slice(0, 12).map(function (x) {
          return {
            name: x.name || "Desk",
            score: dollars(x.worth),
            meta: [x.rounds != null ? x.rounds + " rounds" : "", x.date || ""].filter(Boolean).join(" · ")
          };
        })
      );
    });

    bestJson([
      "https://deepseekoracle-lattice-marines-ledger.hf.space/rally/ledger.json",
      "https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins/resolve/main/haven-rally.json",
      "/games/haven-rally/ledger.json"
    ], function (j) { return (j && j.rows) || []; }).then(function (data) {
      var rows = ((data && data.rows) || []).slice();
      var q = lsJson("lygo-haven-rally-ledger-q") || [];
      var local = lsJson("lygo-haven-rally-v1") || {};
      rows = rows.concat(q).concat(local.rounds || []).concat((local.arcade && local.arcade.runs) || []);
      var seen = {};
      rows = rows.filter(function (r) {
        var k = (r.name || "") + "|" + (r.event || "") + "|" + (r.score || 0) + "|" + (r.ms || 0) + "|" + (r.track || "");
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      });
      var arcade = rows.filter(function (r) { return r.event === "arcade" || r.score; })
        .sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      var heats = rows.filter(function (r) { return r.event !== "arcade" && !r.score; })
        .sort(function (a, b) { return (a.ms || 1e12) - (b.ms || 1e12); });
      var show = arcade.slice(0, 6).map(function (r) {
        return { name: r.name || "Operator", score: (r.score || 0) + " pts", meta: [r.track, r.craft].filter(Boolean).join(" · ") };
      }).concat(heats.slice(0, 6).map(function (r) {
        return { name: r.name || "Operator", score: fmtMs(r.ms), meta: [r.track, r.craft].filter(Boolean).join(" · ") };
      }));
      paintHall(
        "rally",
        show.length ? (rows.length + " lines · public book") : "No heats yet.",
        show.slice(0, 12)
      );
    });

    bestJson([
      "https://deepseekoracle-lattice-marines-ledger.hf.space/golf/ledger.json",
      "https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins/resolve/main/lattice-golf.json",
      "/games/lattice-golf/ledger.json"
    ], function (j) { return (j && j.rounds) || []; }).then(function (data) {
      var rows = ((data && data.rounds) || []).slice();
      var q = lsJson("lygo-lattice-golf-ledger-q") || [];
      var local = lsJson("lygo-lattice-golf-v1") || {};
      rows = rows.concat(q).concat(local.rounds || []);
      var seen = {};
      rows = rows.filter(function (r) {
        var k = (r.name || "") + "|" + (r.total || "") + "|" + (r.vsPar || "") + "|" + (r.course || "");
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      }).sort(function (a, b) {
        return (a.vsPar == null ? 99 : a.vsPar) - (b.vsPar == null ? 99 : b.vsPar);
      });
      paintHall(
        "golf",
        rows.length ? (rows.length + " rounds · public book") : "No rounds yet.",
        rows.slice(0, 12).map(function (r) {
          return {
            name: r.name || "Operator",
            score: (r.total != null ? r.total : "—") + " · " + vsPar(r.vsPar),
            meta: [r.course || r.mode, r.holes ? r.holes + " holes" : ""].filter(Boolean).join(" · ")
          };
        })
      );
    });

    bestJson([
      "https://deepseekoracle-lattice-marines-ledger.hf.space/swarm/ledger.json",
      "https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins/resolve/main/lattice-swarm.json",
      "/games/lattice-swarm/ledger.json"
    ], function (j) { return (j && j.scores) || []; }).then(function (data) {
      var rows = ((data && data.scores) || []).slice();
      var q = lsJson("lygo-swarm-ledger-q") || [];
      var local = lsJson("lattice-swarm-v1") || {};
      if (local.bestScore) rows.push({ name: "This browser", score: local.bestScore });
      rows = rows.concat(q);
      var seen = {};
      rows = rows.filter(function (r) {
        var k = (r.name || "") + "|" + (r.score || 0);
        if (seen[k] || !(r.score > 0)) return false;
        seen[k] = 1;
        return true;
      }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      paintHall(
        "swarm",
        rows.length ? (rows.length + " scores · public book") : "No scores yet.",
        rows.slice(0, 12).map(function (r) {
          return { name: r.name || "Operator", score: String(r.score), meta: r.date || "" };
        })
      );
    });

    bestJson([
      "https://deepseekoracle-lattice-marines-ledger.hf.space/eternal/ledger.json",
      "https://huggingface.co/datasets/DeepSeekOracle/lattice-marines-wins/resolve/main/eternal-lattice.json",
      "/games/eternal-lattice/ledger.json"
    ], function (j) { return (j && j.ladder) || []; }).then(function (data) {
      var rows = ((data && data.ladder) || []).slice();
      var q = lsJson("lygo-eternal-ledger-q") || [];
      var local = lsJson("lygo-eternal-lattice-v1") || {};
      rows = rows.concat(q).concat(local.leaderboard || []);
      if (local.playerName && local.games) {
        rows.push({ name: local.playerName, rating: local.rating, wins: local.wins, losses: local.losses });
      }
      var seen = {};
      rows = rows.filter(function (r) {
        var k = (r.name || "") + "|" + (r.rating || 0) + "|" + (r.wins || 0);
        if (!r.name || seen[k]) return false;
        seen[k] = 1;
        return true;
      }).sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
      paintHall(
        "eternal",
        rows.length ? (rows.length + " sealed names · public book") : "No sealed names yet.",
        rows.slice(0, 12).map(function (r) {
          return {
            name: r.name,
            score: String(r.rating || 1000) + " rt",
            meta: (r.wins || 0) + "W / " + (r.losses || 0) + "L"
          };
        })
      );
    });
  }

  function bootPortalFx() {
    var c = document.getElementById("portalCanvas");
    if (!c || !c.getContext) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var ctx = c.getContext("2d");
    var pts = [];
    var i, w, h, dpr;
    function resize() {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = c.clientWidth || window.innerWidth;
      h = c.clientHeight || window.innerHeight;
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn() {
      pts = [];
      for (i = 0; i < 48; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          v: 0.15 + Math.random() * 0.45,
          r: 0.6 + Math.random() * 1.8,
          a: 0.12 + Math.random() * 0.28,
          gold: Math.random() < 0.28
        });
      }
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.y -= p.v;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        ctx.beginPath();
        ctx.fillStyle = p.gold ? "rgba(251,191,36," + p.a + ")" : "rgba(94,234,212," + p.a + ")";
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize();
    spawn();
    window.addEventListener("resize", function () { resize(); spawn(); });
    requestAnimationFrame(tick);
  }

  function boot() {
    bootPortalFx();
    fetch(CATALOG, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        document.querySelectorAll("[data-games-catalog]").forEach(function (n) {
          renderArcade(n, data);
        });
        document.querySelectorAll("[data-games-featured]").forEach(function (n) {
          renderFeatured(n, data);
        });
        if (document.querySelector("[data-games-halls]")) renderHalls();
      })
      .catch(function () {
        if (document.querySelector("[data-games-halls]")) renderHalls();
      });
    if (window.ArcadeLedger) ArcadeLedger.boot();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
