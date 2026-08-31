/* LYGO TV — bouquet → channel list → click to play (music-player flow). */
(function () {
  "use strict";
  const G = window.LYGO_SRC_GUARD;
  const HLS_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js";
  const MAX_PLAYLIST = 2500;
  const MAX_BYTES = 8000000;
  const SKIP_MAX = 10;

  const $ = function (id) { return document.getElementById(id); };
  const st = {
    catalog: null,
    bouquet: "",
    channels: [],
    i: -1,
    filter: "",
    hls: null,
    hlsReady: false,
    skip: 0
  };

  function esc(s) { return G ? G.esc(s) : String(s || ""); }

  function setStatus(msg, kind) {
    const el = $("status");
    el.textContent = msg || "";
    el.style.color = kind === "ok" ? "#34d399" : kind === "bad" ? "#fb923c" : "#8b9bb4";
  }

  function kindOfUrl(url) {
    const u = String(url || "").toLowerCase().split("?")[0];
    if (u.indexOf("youtube.com") !== -1 || u.indexOf("youtube-nocookie.com") !== -1) return "youtube";
    if (u.indexOf("rumble.com") !== -1) return "rumble";
    if (/\.(mp3|ogg|wav|m4a|aac)$/.test(u)) return "audio";
    if (/\.(mp4|webm|ogv)$/.test(u)) return "video";
    if (/\.m3u8?$/.test(u) || u.indexOf(".m3u") !== -1) return "hls";
    return "hls";
  }

  function parseM3U(text, baseHref) {
    const lines = String(text || "").split(/\r?\n/);
    const out = [];
    let title = "";
    let logo = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf("#EXTINF") === 0) {
        const comma = line.lastIndexOf(",");
        title = comma >= 0 ? line.slice(comma + 1).trim() : "Channel";
        const lm = line.match(/tvg-logo="([^"]+)"/i);
        logo = lm ? lm[1] : "";
        continue;
      }
      if (line.charAt(0) === "#") continue;
      const parsed = G.parseStream(line, baseHref);
      if (!parsed) continue;
      out.push({
        title: title || parsed.hostname,
        url: parsed.href,
        https: parsed.protocol === "https:",
        kind: kindOfUrl(parsed.href),
        logo: logo
      });
      title = "";
      logo = "";
      if (out.length >= MAX_PLAYLIST) break;
    }
    return out;
  }

  function visible() {
    const q = st.filter.toLowerCase();
    return st.channels.filter(function (c) {
      if (!c.https && c.kind !== "youtube") return false;
      if (!q) return true;
      return (c.title || "").toLowerCase().indexOf(q) !== -1;
    });
  }

  function loadHls(cb) {
    if (st.hlsReady || window.Hls) { st.hlsReady = true; cb(); return; }
    const s = document.createElement("script");
    s.src = HLS_SRC;
    s.onload = function () { st.hlsReady = true; cb(); };
    s.onerror = function () { cb(new Error("hls.js missing")); };
    document.head.appendChild(s);
  }

  function stopMedia() {
    const v = $("vid");
    const a = $("aud");
    const yt = $("yt");
    if (st.hls) { try { st.hls.destroy(); } catch (e) {} st.hls = null; }
    v.pause(); a.pause();
    v.removeAttribute("src"); a.removeAttribute("src");
    v.crossOrigin = null;
    v.load(); a.load();
    v.hidden = false;
    a.hidden = true;
    yt.hidden = true;
    yt.removeAttribute("src");
  }

  function tryPlay(el) {
    const p = el.play();
    if (p && p.catch) {
      p.catch(function () {
        el.muted = true;
        el.play().catch(function () {});
      });
    }
  }

  function skipOrStop(why) {
    setStatus(why, "bad");
    if (st.skip >= SKIP_MAX) return;
    st.skip += 1;
    window.setTimeout(function () { next(1, true); }, 400);
  }

  function playHls(url) {
    const v = $("vid");
    v.hidden = false;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = url;
      tryPlay(v);
      setStatus("Playing in this page.", "ok");
      return;
    }
    loadHls(function (err) {
      if (err || !window.Hls || !window.Hls.isSupported()) {
        skipOrStop("No HLS in this browser — skipped.");
        return;
      }
      if (st.hls) { try { st.hls.destroy(); } catch (e2) {} }
      st.hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: function (xhr) { xhr.withCredentials = false; }
      });
      st.hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
        st.skip = 0;
        setStatus("Playing in this page.", "ok");
        tryPlay(v);
      });
      st.hls.on(window.Hls.Events.ERROR, function (_e, data) {
        if (data && data.fatal) skipOrStop("Channel blocked in browser — next…");
      });
      st.hls.loadSource(url);
      st.hls.attachMedia(v);
    });
  }

  function playAt(i, fromSkip) {
    if (!fromSkip) st.skip = 0;
    const list = visible();
    if (!list.length) { setStatus("No HTTPS channels in this bouquet."); return; }
    if (i < 0) i = list.length - 1;
    if (i >= list.length) i = 0;
    const ch = list[i];
    st.i = st.channels.indexOf(ch);
    $("now").textContent = ch.title;
    $("copy-url").dataset.url = ch.url;
    paintList();
    stopMedia();
    if (ch.kind === "youtube" || ch.kind === "rumble") {
      $("vid").hidden = true;
      $("yt").src = ch.url;
      $("yt").hidden = false;
      setStatus("Playing in this page.", "ok");
      return;
    }
    if (!ch.https) {
      skipOrStop("HTTP stream — skipped (page is HTTPS).");
      return;
    }
    if (ch.kind === "audio") {
      $("aud").hidden = false;
      $("aud").src = ch.url;
      tryPlay($("aud"));
      setStatus("Playing in this page.", "ok");
      return;
    }
    playHls(ch.url);
  }

  function next(dir, fromSkip) {
    const list = visible();
    if (!list.length) return;
    const cur = st.channels[st.i];
    let idx = list.indexOf(cur);
    if (idx < 0) idx = 0;
    else idx = idx + dir;
    playAt(idx, fromSkip);
  }

  function paintChips() {
    const box = $("chips");
    box.innerHTML = "";
    if ((st.catalog.live || []).length) {
      const live = document.createElement("button");
      live.type = "button";
      live.className = "chip" + (st.bouquet === "live" ? " on" : "");
      live.textContent = "Excavationpro";
      live.addEventListener("click", function () { loadLive(); });
      box.appendChild(live);
    }
    (st.catalog.bouquets || []).forEach(function (b) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "chip" + (st.bouquet === b.id ? " on" : "");
      el.textContent = b.title;
      el.addEventListener("click", function () { loadBouquet(b); });
      box.appendChild(el);
    });
  }

  function paintList() {
    const ul = $("channels");
    ul.innerHTML = "";
    const list = visible();
    $("count").textContent = list.length + " channels";
    list.forEach(function (ch, n) {
      const li = document.createElement("li");
      if (st.channels[st.i] === ch) li.className = "on";
      li.innerHTML = "<span class=\"num\">" + (n + 1) + "</span><span>" + esc(ch.title) + "</span>";
      li.addEventListener("click", function () {
        playAt(list.indexOf(ch), false);
      });
      ul.appendChild(li);
    });
  }

  function loadLive() {
    st.bouquet = "live";
    st.channels = (st.catalog.live || []).map(function (x) {
      return { title: x.title, url: x.url, https: true, kind: x.kind || kindOfUrl(x.url) };
    });
    st.i = -1;
    paintChips();
    paintList();
    setStatus("Excavationpro — Rumble LIVE (monetized).");
    if (st.channels.length) playAt(0, false);
    fetch("/data/rumble-live.json?t=" + Date.now(), { cache: "no-store", credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.embed_url) return;
        const href = G.safeHref(j.embed_url);
        if (!href || !st.channels[0] || st.channels[0].kind !== "rumble") return;
        st.channels[0].url = href;
        if (st.i === 0) playAt(0, false);
        else paintList();
      })
      .catch(function () {});
  }

  async function loadBouquet(b) {
    if (!G.allowFetch(b.url)) { setStatus("Blocked playlist URL.", "bad"); return; }
    st.bouquet = b.id;
    paintChips();
    setStatus("Loading " + b.title + "…");
    const ctrl = new AbortController();
    const t = window.setTimeout(function () { ctrl.abort(); }, 20000);
    try {
      const res = await fetch(b.url, { signal: ctrl.signal, credentials: "omit", redirect: "follow", cache: "no-store" });
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) throw new Error("playlist too large");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = new TextDecoder("utf-8").decode(buf);
      st.channels = parseM3U(text, b.url);
      st.i = -1;
      paintList();
      const vis = visible();
      setStatus(b.title + " — " + vis.length + " HTTPS channels. Click one.");
      if (vis.length) playAt(0, false);
    } catch (e) {
      setStatus("Could not load bouquet (" + (e.message || e) + ").", "bad");
    } finally {
      window.clearTimeout(t);
    }
  }

  $("prev").addEventListener("click", function () { next(-1, false); });
  $("next").addEventListener("click", function () { next(1, false); });
  $("copy-url").addEventListener("click", function () {
    const u = $("copy-url").dataset.url || "";
    if (!u) return;
    navigator.clipboard.writeText(u).then(function () { setStatus("URL copied.", "ok"); });
  });
  $("q").addEventListener("input", function () {
    st.filter = $("q").value || "";
    paintList();
  });
  $("add").addEventListener("click", function () {
    const href = G.safeHref($("custom").value);
    if (!href) { setStatus("Need a public https:// URL.", "bad"); return; }
    st.channels.unshift({ title: $("custom").value.split("/").pop() || href, url: href, https: true, kind: kindOfUrl(href) });
    $("custom").value = "";
    paintList();
    playAt(0, false);
  });

  fetch("catalog.json?v=1.5.0", { credentials: "omit", cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      st.catalog = j;
      paintChips();
      const id = j.default_bouquet || "culture";
      const b = (j.bouquets || []).filter(function (x) { return x.id === id; })[0] || (j.bouquets || [])[0];
      if (b) loadBouquet(b);
      else if ((j.live || []).length) loadLive();
    })
    .catch(function () { setStatus("catalog.json miss.", "bad"); });
})();
