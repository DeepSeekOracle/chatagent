/* LYGOAGENT economic anchor — local registry + Gecko embed (no CORS API) */
(function () {
  const TOKEN = "0x32B513927F15e7A858bE779198440C04D399c09f";
  const ANCHOR_URLS = [
    "haven_star_chart/lygoagent_anchor.json",
    "/starchart/haven_star_chart/lygoagent_anchor.json",
    "https://deepseekoracle.github.io/lygo-protocol-stack/haven_star_chart/lygoagent_anchor.json",
  ];

  const el = (id) => document.getElementById(id);

  async function fetchJson(urls) {
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!r.ok) continue;
        return await r.json();
      } catch (_) { /* next */ }
    }
    return null;
  }

  async function refresh() {
    const status = el("cryptoStatus");
    const local = await fetchJson(ANCHOR_URLS);
    if (local && el("cryptoPairName")) {
      el("cryptoPairName").textContent = local.pool_pair || "LYGOAGENT / VIRTUAL";
    }
    if (el("cryptoUpdated")) {
      el("cryptoUpdated").textContent = "Embed live · " + new Date().toUTCString();
    }
    const box = el("cryptoChart");
    if (box && !box.dataset.note) {
      box.dataset.note = "1";
      box.innerHTML =
        '<p class="crypto-status ok" style="padding:1rem;">GeckoTerminal REST has no CORS for browsers, so candles stay in the live embed under this panel. Contract ' +
        TOKEN.slice(0, 6) +
        "…" +
        TOKEN.slice(-4) +
        "</p>";
    }
    if (status) {
      status.textContent = local
        ? "Anchor registry loaded · live chart = Gecko embed"
        : "Anchor JSON missed · Gecko embed still below";
      status.className = local ? "crypto-status ok" : "crypto-status warn";
    }
  }

  function initCopy() {
    const btn = el("cryptoCopyContract");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const go = () => {
        btn.textContent = "Copied ✓";
        setTimeout(() => { btn.textContent = "Copy contract"; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(TOKEN).then(go).catch(go);
      } else {
        go();
      }
    });
  }

  function start() {
    if (!el("crypto-anchor")) return;
    initCopy();
    refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
