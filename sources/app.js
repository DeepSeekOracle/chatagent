/* LYGO TV — pick a list, click a channel, watch. */
(function () {
  "use strict";
  const G = window.LYGO_SRC_GUARD;
  const HLS_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js";
  const MAX_PLAYLIST = 2500;
  const MAX_BYTES = 8000000;
  const SKIP_MAX = 4;
  const CAT_VER = "1.6.0";

  const TABS = [
    { id: "watch", label: "Watch" },
    { id: "lists", label: "Lists" },
    { id: "topics", label: "Topics" },
    { id: "places", label: "Places" },
    { id: "langs", label: "Languages" }
  ];
  const LIST_IDS = { worldtv: 1, freetv: 1, all: 1, fanming: 1, brazil_fta: 1 };
  const TOPIC_IDS = {
    culture: 1, documentary: 1, public: 1, legislative: 1, education: 1,
    outdoor: 1, religious: 1, classic: 1, relax: 1, general: 1, science: 1,
    music: 1, sports: 1, weather: 1, animation: 1, comedy: 1, series: 1,
    cooking: 1, travel: 1, lifestyle: 1, family: 1, business: 1, auto: 1, news: 1
  };
  const LANG_IDS = {
    ara: 1, fas: 1, kur: 1, rus: 1, ukr: 1, zho: 1, spa: 1, por: 1,
    tur: 1, hin: 1, urd: 1, ben: 1, tam: 1, swa: 1, amh: 1, heb: 1
  };

  const $ = function (id) { return document.getElementById(id); };
  const st = {
    catalog: null,
    tab: "watch",
    bouquet: "",
    channels: [],
    i: -1,
    filter: "",
    hls: null,
    hlsReady: false,
    skip: 0
  };

  function esc(s) { return G ? G.esc(s) : String(s || ""); }

  function groupOf(id) {
    if (id === "live") return "watch";
    if (LIST_IDS[id]) return "lists";
    if (TOPIC_IDS[id]) return "topics";
    if (LANG_IDS[id]) return "langs";
    return "places";
  }

  function setStatus(msg, kind) {
    const el = $("status");
    el.textContent = msg || "";
    el.style.color = kind === "ok" ? "#34d399" : kind === "bad" ? "#fb923c" : "#8b9bb4";
  }

  function setIdle(on) {
    const el = $("idle");
    if (el) el.hidden = !on;
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
    if (st.skip >= SKIP_MAX) {
      setStatus(why + " Click another channel.", "bad");
      setIdle(true);
      return;
    }
    st.skip += 1;
    window.setTimeout(function () { next(1, true); }, 350);
  }

  function playHls(url) {
    const v = $("vid");
    v.hidden = false;
    setIdle(false);
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = url;
      tryPlay(v);
      setStatus("Playing.", "ok");
      return;
    }
    loadHls(function (err) {
      if (err || !window.Hls || !window.Hls.isSupported()) {
        skipOrStop("This browser cannot play this stream.");
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
        setIdle(false);
        setStatus("Playing.", "ok");
        tryPlay(v);
      });
      st.hls.on(window.Hls.Events.ERROR, function (_e, data) {
        if (data && data.fatal) skipOrStop("This channel is blocked here — next…");
      });
      st.hls.loadSource(url);
      st.hls.attachMedia(v);
    });
  }

  function playAt(i, fromSkip) {
    if (!fromSkip) st.skip = 0;
    const list = visible();
    if (!list.length) {
      setStatus("No playable channels in this list. Try another list.");
      setIdle(true);
      return;
    }
    if (i < 0) i = list.length - 1;
    if (i >= list.length) i = 0;
    const ch = list[i];
    st.i = st.channels.indexOf(ch);
    $("now").textContent = ch.title;
    paintList();
    stopMedia();
    setIdle(false);
    if (ch.kind === "youtube" || ch.kind === "rumble") {
      $("vid").hidden = true;
      $("yt").src = ch.url;
      $("yt").hidden = false;
      setStatus("Playing.", "ok");
      return;
    }
    if (!ch.https) {
      skipOrStop("HTTP stream skipped (this page is HTTPS).");
      return;
    }
    if (ch.kind === "audio") {
      $("aud").hidden = false;
      $("aud").src = ch.url;
      tryPlay($("aud"));
      setStatus("Playing.", "ok");
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

  function paintTabs() {
    const box = $("tabs");
    box.innerHTML = "";
    TABS.forEach(function (t) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "tab" + (st.tab === t.id ? " on" : "");
      el.textContent = t.label;
      el.setAttribute("aria-pressed", st.tab === t.id ? "true" : "false");
      el.addEventListener("click", function () {
        st.tab = t.id;
        paintTabs();
        paintChips();
      });
      box.appendChild(el);
    });
  }

  function paintChips() {
    const box = $("chips");
    box.innerHTML = "";
    if (st.tab === "watch") {
      if ((st.catalog.live || []).length) {
        const live = document.createElement("button");
        live.type = "button";
        live.className = "chip" + (st.bouquet === "live" ? " on" : "");
        live.textContent = "Excavationpro";
        live.addEventListener("click", function () { loadLive(); });
        box.appendChild(live);
      }
      return;
    }
    (st.catalog.bouquets || []).forEach(function (b) {
      if (groupOf(b.id) !== st.tab) return;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "chip" + (st.bouquet === b.id ? " on" : "");
      el.textContent = b.title;
      el.addEventListener("click", function () { loadBouquet(b, false); });
      box.appendChild(el);
    });
  }

  function paintList() {
    const ul = $("channels");
    ul.innerHTML = "";
    const list = visible();
    $("count").textContent = list.length + (list.length === 1 ? " channel" : " channels");
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
    st.tab = "watch";
    st.channels = (st.catalog.live || []).map(function (x) {
      return { title: x.title, url: x.url, https: true, kind: x.kind || kindOfUrl(x.url) };
    });
    st.i = -1;
    paintTabs();
    paintChips();
    paintList();
    setStatus("Excavationpro LIVE — playing.");
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

  async function loadBouquet(b, autoplay) {
    if (!G.allowFetch(b.url)) { setStatus("That list URL is blocked.", "bad"); return; }
    st.bouquet = b.id;
    st.tab = groupOf(b.id);
    paintTabs();
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
      if (!vis.length) {
        setStatus(b.title + " — no HTTPS channels. Try another list.", "bad");
        setIdle(true);
        return;
      }
      setStatus(b.title + " — click a channel.");
      setIdle(true);
      if (autoplay) playAt(0, false);
    } catch (e) {
      setStatus("Could not load that list. Try another.", "bad");
      setIdle(true);
    } finally {
      window.clearTimeout(t);
    }
  }

  function toggleFs() {
    const box = document.querySelector(".player-box");
    if (!box) return;
    if (!document.fullscreenElement) {
      const req = box.requestFullscreen || box.webkitRequestFullscreen;
      if (req) req.call(box).catch(function () {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
  }

  $("prev").addEventListener("click", function () { next(-1, false); });
  $("next").addEventListener("click", function () { next(1, false); });
  $("fs").addEventListener("click", function () { toggleFs(); });
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
  $("custom").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("add").click();
  });
  document.addEventListener("keydown", function (e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") { e.preventDefault(); next(-1, false); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(1, false); }
    if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFs(); }
    if (e.key === "/") { e.preventDefault(); $("q").focus(); }
  });

  fetch("catalog.json?v=" + CAT_VER, { credentials: "omit", cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      st.catalog = j;
      paintTabs();
      paintChips();
      const id = j.default_bouquet || "live";
      if (id === "live" && (j.live || []).length) {
        loadLive();
        return;
      }
      const b = (j.bouquets || []).filter(function (x) { return x.id === id; })[0] || (j.bouquets || [])[0];
      if (b) loadBouquet(b, false);
      else if ((j.live || []).length) loadLive();
      else setStatus("No lists in catalog.", "bad");
    })
    .catch(function () { setStatus("Could not load the channel catalog.", "bad"); });
})();
