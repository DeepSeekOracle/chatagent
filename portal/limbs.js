/* LYGO portal — local engine limbs.
   One manifest, two renderers: /portal/limbs.html (the AGENT BUILD page) and the LOCAL LIMBS module on
   /portal/. Everything a visitor is told about a limb lives in LIMBS below: the model, why it was picked,
   the official links, the honest size, the exact command, and the brief their agent reads. The page never
   invents a link — if a limb is not in this table it is not offered.

   Status is measured, not claimed: each limb is probed at 127.0.0.1:<port>/health. A limb that is not
   running says so and links to its build card; a limb in stub mode says "stub" out loud, because stub
   output proves the wiring and nothing about the model. */
(function () {
  "use strict";

  var MANIFEST_URL = "limbs/manifest.json";

  var LIMBS = [
    {
      id: "image", name: "Image", port: 8191, out: "image/png",
      model: "Qwen-Image 2.1",
      picked: "picked on downloads and fit: 11.4M pulls for the ComfyUI build, strong text rendering, and a GGUF path that runs on a 12 GB card",
      unlocks: "pictures in the chat and in the Image suite — the same route the agent's image_generate limb calls",
      weights: [
        { label: "Comfy-Org/Qwen-Image-2.1 — ComfyUI files, turbo + int8 text encoders", url: "https://huggingface.co/Comfy-Org/Qwen-Image-2.1" },
        { label: "Qwen/Qwen-Image-2.1 — official diffusers weights, bf16", url: "https://huggingface.co/Qwen/Qwen-Image-2.1" },
        { label: "unsloth/Qwen-Image-2.1-GGUF — Q5_K_M 5.4 GB / Q6_K 6.3 GB for 12 GB cards", url: "https://huggingface.co/unsloth/Qwen-Image-2.1-GGUF" }
      ],
      engine: { label: "ComfyUI", url: "https://github.com/comfyanonymous/ComfyUI" },
      extra: { label: "ComfyUI-GGUF (only for the quantized files)", url: "https://github.com/city96/ComfyUI-GGUF" },
      size: "about 23 GB on the int8 + turbo path (14.2 GB model, 9.35 GB text encoder); the GGUF Q5 path is nearer 16 GB. 12 GB of VRAM is comfortable, 8 GB works with the GGUF files",
      command: "python limb_server.py --limb image --port 8191 --backend comfy --workflow image.json",
      brief: "limbs/skills/image.md"
    },
    {
      id: "sound", name: "Sound", port: 8192, out: "audio/wav",
      model: "ACE-Step 1.5",
      picked: "picked on licence first: MIT weights, a turbo model that finishes a track in seconds on an 8 GB card, and the most-used music model in ComfyUI",
      unlocks: "music, loops and stings the agent can hand you as a file — no upload, no account, no per-minute bill",
      weights: [
        { label: "ACE-Step/Ace-Step1.5 — official turbo + 5 Hz LM, MIT", url: "https://huggingface.co/ACE-Step/Ace-Step1.5" },
        { label: "Comfy-Org/ace_step_1.5_ComfyUI_files — all-in-one checkpoint for ComfyUI", url: "https://huggingface.co/Comfy-Org/ace_step_1.5_ComfyUI_files" }
      ],
      engine: { label: "ComfyUI", url: "https://github.com/comfyanonymous/ComfyUI" },
      size: "10.1 GB official, or the 10.03 GB all-in-one checkpoint. 8 GB of VRAM runs the turbo model; 16 GB lets you batch",
      command: "python limb_server.py --limb sound --port 8192 --backend comfy --workflow sound.json",
      brief: "limbs/skills/sound.md"
    },
    {
      id: "video", name: "Video", port: 8193, out: "video/mp4",
      model: "Wan 2.2 TI2V-5B",
      picked: "picked because it is the one good video model that fits a normal desktop: Apache-2.0, 720p text+image to video, and 3.8 GB at Q5 instead of the 34 GB bf16 repo",
      unlocks: "short clips from a prompt or a still — and the same route your own agent can call when it needs b-roll",
      weights: [
        { label: "QuantStack/Wan2.2-TI2V-5B-GGUF — Q5_K_M 3.8 GB, the desktop path", url: "https://huggingface.co/QuantStack/Wan2.2-TI2V-5B-GGUF" },
        { label: "Wan-AI/Wan2.2-TI2V-5B — official bf16 weights", url: "https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B" },
        { label: "Comfy-Org/Wan_2.2_ComfyUI_Repackaged — every Wan 2.2 variant, ComfyUI layout", url: "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged" }
      ],
      engine: { label: "ComfyUI", url: "https://github.com/comfyanonymous/ComfyUI" },
      extra: { label: "ffmpeg (ComfyUI writes the file)", url: "https://ffmpeg.org/download.html" },
      size: "about 18 GB on the Q5 path: 3.8 GB model, 11.4 GB text encoder, 2.8 GB VAE. 12 GB of VRAM for 720p at 5 s; expect minutes per clip, not seconds",
      command: "python limb_server.py --limb video --port 8193 --backend comfy --workflow video.json",
      brief: "limbs/skills/video.md"
    }
  ];

  function byId(id) { return LIMBS.filter(function (l) { return l.id === id; })[0]; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function base(l) { return "http://127.0.0.1:" + l.port; }

  /* ---------------------------------------------------------------- probing */
  function probe(l) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, 2500);
    return fetch(base(l) + "/health", { signal: ctl.signal, cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) { clearTimeout(t); return j; });
  }

  function probeAll(cb) {
    var out = {};
    var left = LIMBS.length;
    LIMBS.forEach(function (l) {
      probe(l).then(function (j) { out[l.id] = j; if (--left === 0) cb(out); });
    });
  }

  function describe(l, j) {
    if (!j || !j.ok) return { on: false, text: "not running · ready to build" };
    var t = (j.model || l.model) + " · " + (j.backend === "stub" ? "STUB (wiring only)" : j.backend) +
      (j.last_seconds ? " · last " + j.last_seconds + "s" : "");
    return { on: true, stub: j.backend === "stub", text: t };
  }

  /* ------------------------------------------------------- agent brief copy */
  function copyBrief(l, btn) {
    var old = btn.textContent;
    btn.disabled = true; btn.textContent = "copying…";
    fetch(l.brief, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("brief not found"); return r.text(); })
      .then(function (txt) {
        return navigator.clipboard.writeText(txt).then(function () {
          btn.textContent = "copied — paste it into your agent";
        });
      })
      .catch(function () {
        // clipboard can be blocked; open the raw brief so it is still one copy away
        window.open(l.brief, "_blank", "noopener");
        btn.textContent = "opened the brief — copy it from there";
      })
      .then(function () { setTimeout(function () { btn.disabled = false; btn.textContent = old; }, 4000); });
  }

  /* ------------------------------------------------------ the build page --- */
  function renderCards(host) {
    host.innerHTML = "";
    LIMBS.forEach(function (l) {
      var card = document.createElement("article");
      card.className = "limb-card";
      card.id = "limb-" + l.id;
      card.innerHTML =
        '<header class="limb-card-h">' +
          '<span class="limb-glyph">' + (l.id === "image" ? "▣" : l.id === "sound" ? "♪" : "▶") + '</span>' +
          '<div><h3>' + esc(l.name) + '</h3><p class="limb-model">' + esc(l.model) + '</p></div>' +
          '<span class="limb-pill" data-pill="' + l.id + '">checking…</span>' +
        '</header>' +
        '<p class="limb-why">' + esc(l.picked) + '.</p>' +
        '<p class="limb-unlocks"><b>Unlocks:</b> ' + esc(l.unlocks) + '.</p>' +
        '<div class="limb-block"><h4>1 · the engine</h4>' +
          '<p><a href="' + l.engine.url + '" target="_blank" rel="noopener">' + esc(l.engine.label) + '</a>' +
          (l.extra ? ' · <a href="' + l.extra.url + '" target="_blank" rel="noopener">' + esc(l.extra.label) + '</a>' : '') +
          '</p></div>' +
        '<div class="limb-block"><h4>2 · the weights (official, not a mirror)</h4><ul class="limb-links">' +
          l.weights.map(function (w) { return '<li><a href="' + w.url + '" target="_blank" rel="noopener">' + esc(w.label) + '</a></li>'; }).join("") +
        '</ul><p class="limb-size">' + esc(l.size) + '.</p></div>' +
        '<div class="limb-block"><h4>3 · your agent builds it</h4>' +
          '<p class="limb-copyrow"><button type="button" class="btn-gold" data-brief="' + l.id + '">Copy the agent brief</button>' +
          '<a class="limb-raw" href="' + l.brief + '" target="_blank" rel="noopener">read it first</a></p>' +
          '<p class="hint">Paste that into Claude Code, Codex, Grok, or any agent with a shell on your PC. It installs the engine, ' +
          'fetches the weights, builds the workflow, starts the bridge below, and tells you what it measured.</p></div>' +
        '<div class="limb-block"><h4>4 · the bridge (this is what the portal talks to)</h4>' +
          '<pre class="limb-cmd">' + esc(l.command) + '</pre>' +
          '<p class="hint">Health: <code>' + base(l) + '/health</code> · generate: <code>POST ' + base(l) + '/generate</code>. ' +
          'It binds 127.0.0.1 only — the portal can reach it, the internet cannot.</p></div>';
      host.appendChild(card);
      var btn = card.querySelector("[data-brief]");
      btn.addEventListener("click", function () { copyBrief(l, btn); });
    });

    var check = el("limb-recheck");
    if (check) check.addEventListener("click", function () { refreshPills(); });
    refreshPills();
  }

  function refreshPills() {
    probeAll(function (map) {
      LIMBS.forEach(function (l) {
        var d = describe(l, map[l.id]);
        var pill = document.querySelector('[data-pill="' + l.id + '"]');
        if (pill) {
          pill.textContent = d.on ? "● running" : "○ " + d.text;
          pill.className = "limb-pill " + (d.on ? (d.stub ? "is-stub" : "is-on") : "is-off");
          pill.title = d.on ? d.text : "start the bridge on port " + l.port;
        }
      });
      var sum = el("limb-summary");
      if (sum) {
        var on = LIMBS.filter(function (l) { return map[l.id] && map[l.id].ok; });
        sum.textContent = on.length + " of " + LIMBS.length + " limbs answering on this machine" +
          (on.length ? " · " + on.map(function (l) { return l.name.toLowerCase(); }).join(", ") : " — pick one card below and let your agent build it");
      }
    });
  }

  /* ------------------------------------------------- the portal module ----- */
  function renderModule() {
    var host = el("limbs-body");
    if (!host) return;
    host.innerHTML = "";
    LIMBS.forEach(function (l) {
      var row = document.createElement("div");
      row.className = "limb-row";
      row.innerHTML =
        '<div class="limb-row-h"><b>' + esc(l.name) + '</b><span class="limb-model">' + esc(l.model) + '</span>' +
          '<span class="limb-pill" data-mod-pill="' + l.id + '">checking…</span>' +
          '<a class="limb-build" href="limbs.html#limb-' + l.id + '">build this one →</a></div>' +
        '<div class="limb-gen">' +
          '<input type="text" data-prompt="' + l.id + '" placeholder="' +
            (l.id === "image" ? "a lantern in a dark forest, 1024px" : l.id === "sound" ? "warm jazz loop, brushed drums, upright bass" : "slow waves at dusk, 5 seconds") + '">' +
          '<button type="button" data-go="' + l.id + '">Generate</button>' +
          '<span class="hint" data-state="' + l.id + '"></span>' +
        '</div>' +
        '<div class="limb-out" data-out="' + l.id + '"></div>';
      host.appendChild(row);
      row.querySelector("[data-go]").addEventListener("click", function () {
        generate(l, row);
      });
    });
    refreshModule();
    setInterval(refreshModule, 20000);
  }

  function refreshModule() {
    probeAll(function (map) {
      LIMBS.forEach(function (l) {
        var d = describe(l, map[l.id]);
        var pill = document.querySelector('[data-mod-pill="' + l.id + '"]');
        var go = document.querySelector('[data-go="' + l.id + '"]');
        if (pill) {
          pill.textContent = d.on ? (d.stub ? "● stub running" : "● running") : "○ not running";
          pill.className = "limb-pill " + (d.on ? (d.stub ? "is-stub" : "is-on") : "is-off");
          pill.title = d.on ? d.text : "nothing on 127.0.0.1:" + l.port;
        }
        if (go) {
          go.disabled = !d.on;
          go.title = d.on ? "" : "start the " + l.name.toLowerCase() + " limb on port " + l.port + " (limbs.html)";
        }
      });
    });
  }

  function generate(l, row) {
    var input = row.querySelector("[data-prompt]");
    var state = row.querySelector("[data-state]");
    var out = row.querySelector("[data-out]");
    var go = row.querySelector("[data-go]");
    var prompt = (input.value || "").trim() || input.placeholder;
    var started = Date.now();
    go.disabled = true;
    state.textContent = "asking 127.0.0.1:" + l.port + "… 0s";
    out.innerHTML = "";
    var clock = setInterval(function () {
      state.textContent = "the engine is working… " + Math.round((Date.now() - started) / 1000) + "s";
    }, 1000);
    fetch(base(l) + "/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.why || r.status); });
      return r.blob().then(function (b) {
        return { blob: b, model: r.headers.get("X-Limb-Model") || l.model, secs: r.headers.get("X-Limb-Seconds") || "" };
      });
    }).then(function (res) {
      var url = URL.createObjectURL(res.blob);
      if (l.id === "image") {
        var img = document.createElement("img"); img.src = url; img.alt = prompt; out.appendChild(img);
      } else if (l.id === "sound") {
        var au = document.createElement("audio"); au.controls = true; au.preload = "metadata"; au.src = url; out.appendChild(au);
      } else {
        var v = document.createElement("video"); v.controls = true; v.preload = "metadata"; v.src = url; out.appendChild(v);
      }
      var secs = parseFloat(res.secs || "0") || Math.round((Date.now() - started) / 1000);
      var secTxt = secs < 1 ? "under a second" : (secs < 10 ? (Math.round(secs * 10) / 10) + "s" : Math.round(secs) + "s");
      var meta = document.createElement("p");
      meta.className = "hint";
      meta.textContent = res.model + " · " + secTxt + " · made on this machine";
      out.appendChild(meta);
      state.textContent = "done";
    }).catch(function (e) {
      state.textContent = "failed: " + e.message;
    }).then(function () {
      clearInterval(clock);
      fetch(base(l) + "/health").then(function (r) { return r.json(); })
        .then(function () { go.disabled = false; }).catch(function () { go.disabled = true; });
    });
  }

  /* ------------------------------------------------------------- bootstrap */
  function boot() {
    var cards = el("limb-cards");
    if (cards) renderCards(cards);
    renderModule();
  }

  window.LYGO_LIMBS = { list: function () { return LIMBS.slice(); }, probe: probe, manifestUrl: MANIFEST_URL };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
