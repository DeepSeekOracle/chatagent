/* LYGO TV — pick a list, click a channel, watch. */
(function () {
  "use strict";
  const G = window.LYGO_SRC_GUARD;
  const HLS_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js";
  const MAX_PLAYLIST = 3500;
  const MAX_BYTES = 8000000;
  const SKIP_MAX = 4;
  const CAT_VER = "1.7.0";
  const FAV_KEY = "lygo_tv_favs";
  const LAST_KEY = "lygo_tv_last";

  const TABS = [
    { id: "watch", label: "Watch" },
    { id: "fast", label: "FAST" },
    { id: "lists", label: "Lists" },
    { id: "topics", label: "Topics" },
    { id: "places", label: "Places" },
    { id: "langs", label: "Languages" },
    { id: "saved", label: "Saved" }
  ];
  const FAST_IDS = {
    mjh_raw: 1, mjh_radio: 1, plex_fast: 1, rw1986: 1,
    ftv_usa: 1, ftv_uk: 1, ftv_news: 1, ftv_docs: 1
  };
  const LIST_IDS = {
    worldtv: 1, freetv: 1, all: 1, fanming: 1, brazil_fta: 1,
    ftv_france: 1, ftv_germany: 1, ftv_italy: 1, ftv_spain: 1
  };
  const TOPIC_IDS = {
    culture: 1, documentary: 1, public: 1, legislative: 1, education: 1,
    outdoor: 1, religious: 1, classic: 1, relax: 1, general: 1, science: 1,
    music: 1, sports: 1, weather: 1, animation: 1, comedy: 1, series: 1,
    cooking: 1, travel: 1, lifestyle: 1, family: 1, business: 1, auto: 1,
    news: 1, kids: 1, movies: 1, entertainment: 1, shop: 1
  };
  const LANG_IDS = {
    ara: 1, fas: 1, kur: 1, rus: 1, ukr: 1, zho: 1, spa: 1, por: 1,
    tur: 1, hin: 1, urd: 1, ben: 1, tam: 1, swa: 1, amh: 1, heb: 1,
    eng: 1, fra: 1, deu: 1, ita: 1, nld: 1, jpn: 1, kor: 1, pol: 1
  };

  const $ = function (id) { return document.getElementById(id); };
  const st = {
    catalog: null,
    tab: "watch",
    bouquet: "",
    channels: [],
    i: -1,
    filter: "",
    group: "",
    sortAz: false,
    hls: null,
    hlsReady: false,
    skip: 0,
    httpSkipped: 0
  };

  function esc(s) { return G ? G.esc(s) : String(s || ""); }

  function groupOf(id) {
    if (id === "live") return "watch";
    if (FAST_IDS[id]) return "fast";
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

  function setSpin(on) {
    const el = $("spin");
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
    let group = "";
    let httpSkipped = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf("#EXTINF") === 0) {
        const comma = line.lastIndexOf(",");
        title = comma >= 0 ? line.slice(comma + 1).trim() : "Channel";
        const lm = line.match(/tvg-logo="([^"]+)"/i);
        logo = lm ? lm[1] : "";
        const gm = line.match(/group-title="([^"]+)"/i);
        group = gm ? gm[1] : "";
        continue;
      }
      if (line.charAt(0) === "#") continue;
      const parsed = G.parseStream(line, baseHref);
      if (!parsed) continue;
      if (parsed.protocol !== "https:") {
        httpSkipped += 1;
        title = "";
        logo = "";
        group = "";
        continue;
      }
      out.push({
        title: title || parsed.hostname,
        url: parsed.href,
        https: true,
        kind: kindOfUrl(parsed.href),
        logo: logo && logo.indexOf("https://") === 0 ? logo : "",
        group: group
      });
      title = "";
      logo = "";
      group = "";
      if (out.length >= MAX_PLAYLIST) break;
    }
    st.httpSkipped = httpSkipped;
    return out;
  }

  function loadFavs() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavs(list) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 200))); } catch (e) {}
  }

  function isFav(url) {
    return loadFavs().some(function (x) { return x.url === url; });
  }

  function toggleFav(ch) {
    if (!ch || !ch.url) return;
    const list = loadFavs();
    const i = list.findIndex(function (x) { return x.url === ch.url; });
    if (i >= 0) list.splice(i, 1);
    else list.unshift({ title: ch.title, url: ch.url, kind: ch.kind, logo: ch.logo || "", group: ch.group || "" });
    saveFavs(list);
    paintList();
    paintFavBtn();
  }

  function remember(bouquet) {
    try { localStorage.setItem(LAST_KEY, JSON.stringify({ tab: st.tab, bouquet: bouquet })); } catch (e) {}
  }

  function hashSet() {
    const h = st.bouquet ? ("#" + st.tab + "/" + encodeURIComponent(st.bouquet)) : ("#" + st.tab);
    if (location.hash !== h) history.replaceState(null, "", h);
  }

  function visible() {
    const q = st.filter.toLowerCase();
    let list = st.channels.filter(function (c) {
      if (!c.https && c.kind !== "youtube" && c.kind !== "rumble") return false;
      if (st.group && (c.group || "") !== st.group) return false;
      if (!q) return true;
      const hay = ((c.title || "") + " " + (c.group || "")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    if (st.sortAz) {
      list = list.slice().sort(function (a, b) {
        return (a.title || "").localeCompare(b.title || "");
      });
    }
    return list;
  }

  function groupsInList() {
    const seen = {};
    const out = [];
    st.channels.forEach(function (c) {
      if (!c.group || seen[c.group]) return;
      seen[c.group] = 1;
      out.push(c.group);
    });
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
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
    setSpin(false);
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
    setSpin(false);
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
    setSpin(true);
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = url;
      tryPlay(v);
      setSpin(false);
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
        setSpin(false);
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
    paintFavBtn();
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

  function retry() {
    if (st.i < 0 || !st.channels[st.i]) return;
    const list = visible();
    const idx = list.indexOf(st.channels[st.i]);
    if (idx >= 0) playAt(idx, false);
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
        if (t.id === "saved") loadSaved();
      });
      box.appendChild(el);
    });
  }

  function paintChips() {
    const box = $("chips");
    box.innerHTML = "";
    if (st.tab === "saved") {
      const n = loadFavs().length;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip on";
      chip.textContent = n ? (n + " saved") : "None saved";
      chip.addEventListener("click", loadSaved);
      box.appendChild(chip);
      return;
    }
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

  function paintGroups() {
    const sel = $("grp");
    if (!sel) return;
    const groups = groupsInList();
    sel.innerHTML = "<option value=\"\">All groups</option>";
    groups.forEach(function (g) {
      const o = document.createElement("option");
      o.value = g;
      o.textContent = g;
      if (g === st.group) o.selected = true;
      sel.appendChild(o);
    });
    sel.hidden = groups.length < 2;
  }

  function paintFavBtn() {
    const btn = $("fav");
    if (!btn) return;
    const ch = st.channels[st.i];
    if (!ch) { btn.textContent = "☆ Save"; return; }
    btn.textContent = isFav(ch.url) ? "★ Saved" : "☆ Save";
  }

  function paintList() {
    const ul = $("channels");
    ul.innerHTML = "";
    const list = visible();
    const extra = st.httpSkipped ? (" · " + st.httpSkipped + " HTTP skipped") : "";
    $("count").textContent = list.length + (list.length === 1 ? " channel" : " channels") + extra;
    list.forEach(function (ch, n) {
      const li = document.createElement("li");
      if (st.channels[st.i] === ch) li.className = "on";
      const logo = ch.logo
        ? "<img class=\"logo\" alt=\"\" loading=\"lazy\" src=\"" + esc(ch.logo) + "\">"
        : "<span class=\"logo blank\"></span>";
      const star = isFav(ch.url) ? " ★" : "";
      const grp = ch.group ? "<span class=\"g\">" + esc(ch.group) + "</span>" : "";
      li.innerHTML = "<span class=\"num\">" + (n + 1) + "</span>" + logo +
        "<span class=\"meta\"><span class=\"t\">" + esc(ch.title) + star + "</span>" + grp + "</span>";
      li.addEventListener("click", function () {
        playAt(list.indexOf(ch), false);
      });
      ul.appendChild(li);
    });
    paintGroups();
  }

  function loadSaved() {
    st.tab = "saved";
    st.bouquet = "saved";
    st.httpSkipped = 0;
    st.group = "";
    st.channels = loadFavs().map(function (x) {
      return {
        title: x.title,
        url: x.url,
        https: true,
        kind: x.kind || kindOfUrl(x.url),
        logo: x.logo || "",
        group: x.group || ""
      };
    });
    st.i = -1;
    paintTabs();
    paintChips();
    paintList();
    hashSet();
    if (!st.channels.length) {
      setStatus("Star a channel to save it on this device.", "bad");
      setIdle(true);
      return;
    }
    setStatus("Saved on this device — click a channel.");
    setIdle(true);
  }

  function loadLive() {
    st.bouquet = "live";
    st.tab = "watch";
    st.httpSkipped = 0;
    st.group = "";
    st.channels = (st.catalog.live || []).map(function (x) {
      return { title: x.title, url: x.url, https: true, kind: x.kind || kindOfUrl(x.url), logo: "", group: "Rumble" };
    });
    st.i = -1;
    paintTabs();
    paintChips();
    paintList();
    remember("live");
    hashSet();
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
    st.group = "";
    paintTabs();
    paintChips();
    setStatus("Loading " + b.title + "…");
    setSpin(true);
    remember(b.id);
    hashSet();
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
        setSpin(false);
        return;
      }
      const skip = st.httpSkipped ? (" " + st.httpSkipped + " HTTP skipped.") : "";
      setStatus(b.title + " — " + vis.length + " HTTPS channels." + skip + " Click a channel.");
      setIdle(true);
      setSpin(false);
      if (autoplay) playAt(0, false);
    } catch (e) {
      setStatus("Could not load that list. Try another.", "bad");
      setIdle(true);
      setSpin(false);
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

  function toggleMute() {
    const v = $("vid");
    const a = $("aud");
    const el = !v.hidden ? v : a;
    el.muted = !el.muted;
    setStatus(el.muted ? "Muted." : "Unmuted.", "ok");
  }

  function togglePip() {
    const v = $("vid");
    if (!document.pictureInPictureEnabled || v.hidden) {
      setStatus("Picture-in-picture not available.", "bad");
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(function () {});
      return;
    }
    v.requestPictureInPicture().catch(function () {
      setStatus("Picture-in-picture failed.", "bad");
    });
  }

  $("prev").addEventListener("click", function () { next(-1, false); });
  $("next").addEventListener("click", function () { next(1, false); });
  $("fs").addEventListener("click", function () { toggleFs(); });
  $("stop").addEventListener("click", function () {
    stopMedia();
    setIdle(true);
    setStatus("Stopped.");
  });
  $("retry").addEventListener("click", function () { retry(); });
  $("mute").addEventListener("click", function () { toggleMute(); });
  $("pip").addEventListener("click", function () { togglePip(); });
  $("fav").addEventListener("click", function () {
    if (st.i >= 0 && st.channels[st.i]) toggleFav(st.channels[st.i]);
  });
  $("sort").addEventListener("click", function () {
    st.sortAz = !st.sortAz;
    $("sort").textContent = st.sortAz ? "A–Z on" : "A–Z";
    paintList();
  });
  $("grp").addEventListener("change", function () {
    st.group = $("grp").value || "";
    paintList();
  });
  $("q").addEventListener("input", function () {
    st.filter = $("q").value || "";
    paintList();
  });
  $("add").addEventListener("click", function () {
    const href = G.safeHref($("custom").value);
    if (!href) { setStatus("Need a public https:// URL.", "bad"); return; }
    st.channels.unshift({ title: $("custom").value.split("/").pop() || href, url: href, https: true, kind: kindOfUrl(href), logo: "", group: "Custom" });
    $("custom").value = "";
    paintList();
    playAt(0, false);
  });
  $("custom").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("add").click();
  });
  document.addEventListener("keydown", function (e) {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") { e.preventDefault(); next(-1, false); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(1, false); }
    if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFs(); }
    if (e.key === "/") { e.preventDefault(); $("q").focus(); }
    if (e.key === " ") { e.preventDefault(); const v = $("vid"); if (!v.hidden) { if (v.paused) v.play(); else v.pause(); } }
    if (e.key === "m" || e.key === "M") { e.preventDefault(); toggleMute(); }
    if (e.key === "r" || e.key === "R") { e.preventDefault(); retry(); }
    if (e.key === "s" || e.key === "S") { e.preventDefault(); stopMedia(); setIdle(true); setStatus("Stopped."); }
    if (e.key === "p" || e.key === "P") { e.preventDefault(); togglePip(); }
  });

  function openFromHash() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return false;
    const parts = raw.split("/");
    const tab = parts[0];
    const bid = parts[1] ? decodeURIComponent(parts[1]) : "";
    if (tab === "saved") { loadSaved(); return true; }
    if (tab === "watch" || bid === "live") { loadLive(); return true; }
    if (!bid) return false;
    const b = (st.catalog.bouquets || []).filter(function (x) { return x.id === bid; })[0];
    if (b) { loadBouquet(b, false); return true; }
    return false;
  }

  fetch("catalog.json?v=" + CAT_VER, { credentials: "omit", cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      st.catalog = j;
      paintTabs();
      paintChips();
      if (openFromHash()) return;
      let last = null;
      try { last = JSON.parse(localStorage.getItem(LAST_KEY) || "null"); } catch (e) {}
      if (last && last.bouquet && last.bouquet !== "live" && last.bouquet !== "saved") {
        const b = (j.bouquets || []).filter(function (x) { return x.id === last.bouquet; })[0];
        if (b) { loadBouquet(b, false); return; }
      }
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
