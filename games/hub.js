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
        coverHtml(g) +
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
    }
    ld.textContent = JSON.stringify(jsonLd(data));
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

  function boot() {
    fetch(CATALOG, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        document.querySelectorAll("[data-games-catalog]").forEach(function (n) {
          renderArcade(n, data);
        });
        document.querySelectorAll("[data-games-featured]").forEach(function (n) {
          renderFeatured(n, data);
        });
      })
      .catch(function () { /* static markup stays */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
