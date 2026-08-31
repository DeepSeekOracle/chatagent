/* LYGO Free Sources — plug HTTPS URLs, play what the browser can, copy the rest for VLC. */
(function () {
  "use strict";
  const G = window.LYGO_SRC_GUARD;
  const LS_KEY = "lygo-free-sources-local-v1";
  const HLS_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js";
  const MAX_PLAYLIST = 180;
  const MAX_BYTES = 1500000;
  const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
  const DEMO_MP3 = "https://huggingface.co/datasets/DeepSeekOracle/excavationpro-music-stream/resolve/main/stream/3e448cb8e0e5b8c29987c20499a80cc39508d7f33acd7d0b3bb7605cda782d58.mp3";
  const DEMO_YT = "https://www.youtube.com/embed/live_stream?channel=UCLA_DiR1FfKNvjuUpBHmylQ";

  const $ = function (id) { return document.getElementById(id); };
  const state = { catalog: null, tracks: [], hls: null, hlsReady: false };

  function esc(s) { return G ? G.esc(s) : String(s || ""); }

  function setStatus(msg, kind) {
    const el = $("status");
    el.textContent = msg || "";
    el.style.color = kind === "ok" ? "#34d399" : kind === "bad" ? "#fb923c" : "#8b9bb4";
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocal(arr) {
    localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 80)));
  }

  function kindOfUrl(url) {
    const u = String(url || "").toLowerCase().split("?")[0];
    if (/\.(mp3|ogg|wav|m4a|aac)(\s|$)/.test(u)) return "audio";
    if (/\.(mp4|webm|ogv)(\s|$)/.test(u)) return "video";
    if (/\.(m3u8?|m3u)(\s|$)/.test(u) || u.indexOf(".m3u") !== -1) return "playlist";
    if (/\.(json)(\s|$)/.test(u)) return "json";
    if (u.indexOf("youtube.com") !== -1 || u.indexOf("youtube-nocookie.com") !== -1) return "youtube";
    return "unknown";
  }

  function parseM3U(text, baseHref) {
    const lines = String(text || "").split(/\r?\n/);
    const out = [];
    let title = "";
    let base = "";
    try { base = new URL(baseHref).href; } catch (e) { base = ""; }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf("#EXTINF") === 0) {
        const comma = line.lastIndexOf(",");
        title = comma >= 0 ? line.slice(comma + 1).trim() : "channel";
        continue;
      }
      if (line.charAt(0) === "#") continue;
      const abs = G.parseHttps(line, base);
      if (!abs) continue;
      out.push({ title: title || abs.pathname.split("/").pop() || abs.href, url: abs.href, kind: kindOfUrl(abs.href) });
      title = "";
      if (out.length >= MAX_PLAYLIST) break;
    }
    return out;
  }

  function loadHls(cb) {
    if (state.hlsReady || window.Hls) { state.hlsReady = true; cb(); return; }
    const s = document.createElement("script");
    s.src = HLS_SRC;
    s.onload = function () { state.hlsReady = true; cb(); };
    s.onerror = function () { cb(new Error("hls.js failed to load")); };
    document.head.appendChild(s);
  }

  function stopMedia() {
    const v = $("vid");
    const a = $("aud");
    const yt = $("yt");
    if (state.hls) { try { state.hls.destroy(); } catch (e) {} state.hls = null; }
    v.pause(); a.pause();
    v.removeAttribute("src"); a.removeAttribute("src");
    v.load(); a.load();
    v.hidden = true; a.hidden = true;
    if (yt) { yt.hidden = true; yt.removeAttribute("src"); }
  }

  function tryPlay(el) {
    const p = el.play();
    if (p && p.catch) {
      p.catch(function () {
        el.muted = true;
        el.play().catch(function () { setStatus("Press play on the player.", "bad"); });
      });
    }
  }

  function playHls(url) {
    const v = $("vid");
    v.hidden = false;
    $("aud").hidden = true;
    if ($("yt")) $("yt").hidden = true;
    v.muted = false;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = url;
      tryPlay(v);
      setStatus("Native HLS (Safari/iOS) — playing in this page.", "ok");
      return;
    }
    loadHls(function (err) {
      if (err || !window.Hls || !window.Hls.isSupported()) {
        setStatus("No HLS in this browser. Copy URL into VLC.", "bad");
        return;
      }
      if (state.hls) { try { state.hls.destroy(); } catch (e2) {} }
      state.hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: function (xhr) { xhr.withCredentials = false; }
      });
      state.hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
        setStatus("Playing in this page (hls.js).", "ok");
        tryPlay(v);
      });
      state.hls.on(window.Hls.Events.ERROR, function (_e, data) {
        if (data && data.fatal) {
          setStatus("CDN blocked the browser (no CORS on segments). Copy into VLC.", "bad");
        }
      });
      state.hls.loadSource(url);
      state.hls.attachMedia(v);
    });
  }

  function playYoutube(url) {
    const yt = $("yt");
    if (!yt) { window.open(url, "_blank", "noopener"); return; }
    const href = G.safeHref(url);
    if (!href || href.indexOf("youtube") === -1) {
      setStatus("Not a YouTube embed URL.", "bad");
      return;
    }
    yt.src = href.indexOf("embed") !== -1 ? href : href;
    yt.hidden = false;
    setStatus("YouTube live in this page.", "ok");
  }

  function playUrl(item) {
    const href = G.safeHref(item.url);
    if (!href) { setStatus("Blocked: HTTPS public hosts only.", "bad"); return; }
    $("now").textContent = item.title || href;
    $("open-vlc").dataset.url = href;
    $("copy-url").dataset.url = href;
    stopMedia();
    const kind = item.kind || kindOfUrl(href);
    if (kind === "youtube") {
      playYoutube(href);
      return;
    }
    if (kind === "audio") {
      const a = $("aud");
      a.hidden = false;
      a.src = href;
      tryPlay(a);
      setStatus("Playing audio in this page.", "ok");
      return;
    }
    if (kind === "video" || kind === "hls" || /\.m3u8(\?|$)/i.test(href)) {
      playHls(href);
      return;
    }
    if (kind === "page" || kind === "json") {
      setStatus("Not a media stream — opening as a page/data URL.", "ok");
      window.open(href, "_blank", "noopener");
      return;
    }
    if (kind === "playlist") {
      ingestPlaylist(href);
      return;
    }
    playHls(href);
  }

  async function ingestPlaylist(url) {
    if (!G.allowFetch(url)) { setStatus("Blocked URL.", "bad"); return; }
    setStatus("Fetching playlist…");
    const ctrl = new AbortController();
    const t = setTimeout(function () { ctrl.abort(); }, 16000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: "omit", redirect: "follow" });
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) throw new Error("playlist too large");
      const text = new TextDecoder("utf-8").decode(buf);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const tracks = parseM3U(text, url);
      if (!tracks.length) {
        if (/\.m3u8/i.test(url)) { playHls(url); return; }
        throw new Error("no HTTPS entries (CORS empty or not M3U)");
      }
      state.tracks = tracks;
      renderTracks();
      setStatus("Loaded " + tracks.length + " public HTTPS entries (capped at " + MAX_PLAYLIST + ").", "ok");
    } catch (e) {
      setStatus("Browser could not fetch playlist (" + (e.message || e) + "). Copy into VLC.", "bad");
    } finally {
      clearTimeout(t);
    }
  }

  function renderTracks() {
    const ul = $("tracks");
    ul.innerHTML = "";
    state.tracks.forEach(function (tr, i) {
      const li = document.createElement("li");
      li.innerHTML = "<span class=\"tag\">" + esc(tr.kind || "") + "</span> " + esc(tr.title);
      li.addEventListener("click", function () { playUrl(tr); });
      ul.appendChild(li);
      if (i === 0 && /\.m3u8/i.test(tr.url)) { /* list only */ }
    });
  }

  function renderCatalog() {
    const box = $("catalog");
    box.innerHTML = "";
    const cat = state.catalog;
    if (!cat || !cat.groups) return;
    cat.groups.forEach(function (g) {
      const div = document.createElement("div");
      div.className = "group";
      div.innerHTML = "<h3>" + esc(g.title) + "</h3><p class=\"note\">" + esc(g.note || "") + "</p>";
      const ul = document.createElement("ul");
      ul.className = "list";
      (g.items || []).forEach(function (it) {
        const li = document.createElement("li");
        const cls = (it.class || "RESOURCE").toLowerCase();
        li.innerHTML = "<span class=\"tag " + esc(cls) + "\">" + esc(it.class || "RESOURCE") + "</span> " + esc(it.title);
        li.title = it.url;
        li.addEventListener("click", function () {
          if (it.kind === "playlist") ingestPlaylist(it.url);
          else if (it.kind === "youtube") playUrl(it);
          else playUrl(it);
        });
        ul.appendChild(li);
      });
      div.appendChild(ul);
      box.appendChild(div);
    });
    renderMine();
  }

  function renderMine() {
    const mine = loadLocal();
    const ul = $("mine");
    ul.innerHTML = "";
    mine.forEach(function (it, idx) {
      const li = document.createElement("li");
      li.innerHTML = esc(it.title || it.url);
      li.addEventListener("click", function () { playUrl(it); });
      ul.appendChild(li);
    });
    if (!mine.length) {
      const li = document.createElement("li");
      li.textContent = "(none yet — paste a URL and Save local)";
      li.style.cursor = "default";
      ul.appendChild(li);
    }
  }

  function plugFromForm(save) {
    const raw = $("url").value;
    const title = $("title").value || raw;
    const href = G.safeHref(raw);
    if (!href) { setStatus("Need a public https:// URL (no localhost / private IP).", "bad"); return; }
    const item = { title: title, url: href, kind: kindOfUrl(href), class: "RESOURCE" };
    if (save) {
      const mine = loadLocal().filter(function (x) { return x.url !== href; });
      mine.unshift(item);
      saveLocal(mine);
      renderMine();
    }
    if (item.kind === "playlist" || /\.m3u8?(\?|$)/i.test(href)) ingestPlaylist(href);
    else playUrl(item);
  }

  $("demo-hls").addEventListener("click", function () {
    playUrl({ title: "Mux HLS demo (in-browser)", url: DEMO_HLS, kind: "hls" });
  });
  $("demo-audio").addEventListener("click", function () {
    playUrl({ title: "LYGO HF mp3", url: DEMO_MP3, kind: "audio" });
  });
  $("demo-yt").addEventListener("click", function () {
    playUrl({ title: "NASA YouTube live", url: DEMO_YT, kind: "youtube" });
  });
  $("go").addEventListener("click", function () { plugFromForm(false); });
  $("save").addEventListener("click", function () { plugFromForm(true); });
  $("clear").addEventListener("click", function () { saveLocal([]); renderMine(); setStatus("Local list cleared."); });
  $("copy-url").addEventListener("click", function () {
    const u = $("copy-url").dataset.url || "";
    if (!u) return;
    navigator.clipboard.writeText(u).then(function () { setStatus("Copied for VLC: Media → Open Network Stream.", "ok"); });
  });
  $("open-vlc").addEventListener("click", function () {
    const u = $("open-vlc").dataset.url || "";
    if (!u) return;
    navigator.clipboard.writeText(u);
    setStatus("URL copied. In VLC: Media → Open Network Stream → paste.", "ok");
  });

  fetch("catalog.json", { credentials: "omit" })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      state.catalog = j;
      $("sig").textContent = j.signature || "";
      renderCatalog();
    })
    .catch(function () { setStatus("catalog.json miss — named shadow.", "bad"); });
})();
