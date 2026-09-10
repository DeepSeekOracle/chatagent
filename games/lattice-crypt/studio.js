/* Lattice Crypt studio kernel — EventBus, pools, juice, synth SFX, FPS. */
(function (root) {
  "use strict";
  const SAVE_AUDIO = "lygo_lattice_crypt_audio";
  const bus = Object.create(null);
  const timers = [];
  let rafId = 0;
  let restarts = 0;
  let reduced = false;
  let muted = false;
  let musicOn = true;
  try {
    const a = JSON.parse(localStorage.getItem(SAVE_AUDIO) || "{}");
    muted = !!a.muted;
    reduced = !!a.reduced;
    if (a.music === false) musicOn = false;
  } catch (_) {}

  function on(ev, fn) {
    (bus[ev] || (bus[ev] = [])).push(fn);
    return function off() {
      bus[ev] = (bus[ev] || []).filter(function (f) { return f !== fn; });
    };
  }
  function emit(ev, payload) {
    const list = bus[ev];
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      try { list[i](payload); } catch (_) {}
    }
  }
  function clearBus() {
    Object.keys(bus).forEach(function (k) { bus[k] = []; });
  }

  function makePool(reset, n) {
    const free = [];
    let live = 0, born = 0;
    function alloc() {
      live++;
      if (free.length) {
        const o = free.pop();
        reset(o);
        o.isActive = true;
        return o;
      }
      born++;
      const o = {};
      reset(o);
      o.isActive = true;
      return o;
    }
    function freeOne(o) {
      if (!o || !o.isActive) return;
      o.isActive = false;
      live = Math.max(0, live - 1);
      if (free.length < n) free.push(o);
    }
    function drain() {
      free.length = 0;
      live = 0;
    }
    return { alloc: alloc, free: freeOne, drain: drain, live: function () { return live; }, born: function () { return born; } };
  }

  function resetShot(s) {
    s.x = s.y = s.px = s.py = s.vx = s.vy = 0;
    s.dmg = 0; s.life = 0; s.maxLife = 0; s.grace = 0;
    s.owner = null; s.hero = ""; s.wep = "shard"; s.foe = false;
    s.bounced = false; s.pierce = 0; s.lob = false; s.flame = 0; s.echo = false;
    s.air = false; s.seek = false; s.chain = false; s.nova = false;
    s._chained = false;
    s.trail = [];
  }
  function resetPart(p) {
    p.x = p.y = p.vx = p.vy = 0;
    p.life = 0; p.max = 0.3; p.r = 2; p.col = "#fbbf24";
  }
  function resetFloat(p) {
    p.x = p.y = 0; p.life = 0; p.max = 0.7; p.text = ""; p.col = "#fff";
  }

  const pool = {
    shot: makePool(resetShot, 256),
    particle: makePool(resetPart, 400),
    floater: makePool(resetFloat, 80)
  };
  const particles = [];
  const floaters = [];

  const juice = {
    hitstop: 0,
    sx: 0, sy: 0, sMag: 0,
    flash: 0
  };

  function shake(mag) {
    if (reduced) return;
    juice.sMag = Math.min(12, Math.max(juice.sMag, mag || 3));
  }
  function hitstop(ms) {
    if (reduced) return;
    juice.hitstop = Math.max(juice.hitstop, (ms || 40) / 1000);
  }
  function burst(x, y, col, n) {
    if (reduced) n = Math.min(n || 8, 4);
    const count = Math.min(n || 8, 400 - particles.length);
    for (let i = 0; i < count; i++) {
      const p = pool.particle.alloc();
      const a = Math.random() * 6.28;
      const sp = 1.2 + Math.random() * 3.4;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.life = 0.18 + Math.random() * 0.28; p.max = p.life;
      p.r = 1.4 + Math.random() * 2.2;
      p.col = col || "#fde68a";
      particles.push(p);
    }
  }
  function floater(x, y, text, col) {
    const p = pool.floater.alloc();
    p.x = x; p.y = y; p.text = String(text);
    p.col = col || "#fff"; p.life = 0.7; p.max = 0.7;
    floaters.push(p);
  }
  function juiceTick(dt) {
    if (juice.hitstop > 0) juice.hitstop = Math.max(0, juice.hitstop - dt);
    if (juice.sMag > 0.05) {
      juice.sMag *= Math.pow(0.002, dt);
      juice.sx = (Math.random() - 0.5) * 2 * juice.sMag;
      juice.sy = (Math.random() - 0.5) * 2 * juice.sMag;
    } else { juice.sMag = 0; juice.sx = 0; juice.sy = 0; }
    juice.flash = Math.max(0, juice.flash - dt * 4);
    if (fps.value < 48 && particles.length > 90) {
      while (particles.length > 90) pool.particle.free(particles.pop());
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt; p.x += p.vx * dt * 18; p.y += p.vy * dt * 18;
      p.vy += dt * 8;
      if (p.life <= 0) { pool.particle.free(p); particles.splice(i, 1); }
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const p = floaters[i];
      p.life -= dt; p.y -= dt * 1.4;
      if (p.life <= 0) { pool.floater.free(p); floaters.splice(i, 1); }
    }
  }
  function juiceDraw(ctx, cam, TILE, w, h) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const px = Math.round(p.x * TILE - cam.x), py = Math.round(p.y * TILE - cam.y);
      if (px < -8 || py < -8 || px > w + 8 || py > h + 8) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.fillRect(px, py, p.r, p.r);
    }
    ctx.font = "700 11px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < floaters.length; i++) {
      const p = floaters[i];
      const px = Math.round(p.x * TILE - cam.x), py = Math.round(p.y * TILE - cam.y);
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.fillText(p.text, px, py);
    }
    ctx.globalAlpha = 1;
    if (juice.flash > 0) {
      ctx.fillStyle = "rgba(255,80,80," + (juice.flash * 0.22) + ")";
      ctx.fillRect(0, 0, w, h);
    }
  }

  let actx = null;
  function resumeAudio() {
    try {
      if (!actx) actx = new (root.AudioContext || root.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
    } catch (_) {}
  }
  function sfx(kind, pitch) {
    if (muted) return;
    resumeAudio();
    if (!actx) return;
    try {
      const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
      o.connect(f); f.connect(g); g.connect(actx.destination);
      const now = actx.currentTime;
      const table = {
        shot: { f: 620, t: 0.045, type: "square", q: 800 },
        hit: { f: 190, t: 0.06, type: "triangle", q: 400 },
        kill: { f: 140, t: 0.11, type: "sawtooth", q: 220 },
        boss: { f: 80, t: 0.22, type: "sawtooth", q: 120 },
        pick: { f: 880, t: 0.07, type: "sine", q: 1200 },
        hurt: { f: 90, t: 0.14, type: "square", q: 180 },
        vial: { f: 240, t: 0.16, type: "triangle", q: 500 },
        pad: { f: 320, t: 0.08, type: "sine", q: 700 },
        wave: { f: 420, t: 0.2, type: "triangle", q: 600 }
      };
      const m = table[kind] || table.hit;
      const varp = 1 + ((Math.random() - 0.5) * 0.1);
      o.type = m.type;
      o.frequency.setValueAtTime((m.f * varp) * (pitch || 1), now);
      f.type = "lowpass";
      f.frequency.value = m.q;
      g.gain.setValueAtTime(0.045, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + m.t);
      o.start(now); o.stop(now + m.t + 0.02);
    } catch (_) {}
  }

  const fps = { frames: 0, acc: 0, value: 60, ms: 16, show: false, draws: 0 };
  function fpsTick(dt) {
    fps.frames++;
    fps.acc += dt;
    fps.ms = dt * 1000;
    if (fps.acc >= 0.5) {
      fps.value = Math.round(fps.frames / fps.acc);
      fps.frames = 0; fps.acc = 0;
    }
  }
  function fpsDraw(ctx, w) {
    if (!fps.show) return;
    ctx.fillStyle = "rgba(7,8,14,0.72)";
    ctx.fillRect(w - 168, 8, 158, 52);
    ctx.fillStyle = fps.value < 50 ? "#f87171" : "#86efac";
    ctx.font = "700 11px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText("FPS " + fps.value + "  " + fps.ms.toFixed(1) + "ms", w - 160, 24);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("E " + counts().entities + "  P " + particles.length, w - 160, 40);
    ctx.fillText("R " + restarts + "  shots " + (pool.shot.live()), w - 160, 54);
  }

  function counts() {
    return {
      restarts: restarts,
      shotsLive: pool.shot.live(),
      shotsBorn: pool.shot.born(),
      particles: particles.length,
      floaters: floaters.length,
      entities: pool.shot.live() + particles.length + floaters.length
    };
  }

  function cleanup() {
    restarts++;
    juice.hitstop = 0; juice.sMag = 0; juice.sx = 0; juice.sy = 0; juice.flash = 0;
    while (particles.length) pool.particle.free(particles.pop());
    while (floaters.length) pool.floater.free(floaters.pop());
    pool.shot.drain();
    pool.particle.drain();
    pool.floater.drain();
    timers.length = 0;
    emit("cleanup", { restarts: restarts });
  }

  let musicGain = null, musicOsc = null, musicLfo = null;
  function setMusic(on) {
    musicOn = !!on;
    if (!musicOn && musicGain && actx) {
      try { musicGain.gain.setTargetAtTime(0.0001, actx.currentTime, 0.2); } catch (_) {}
    }
    saveAudio();
  }
  function musicTick(intensity) {
    if (muted || !musicOn || reduced) return;
    resumeAudio();
    if (!actx) return;
    try {
      if (!musicOsc) {
        musicOsc = actx.createOscillator();
        musicLfo = actx.createOscillator();
        musicGain = actx.createGain();
        const f = actx.createBiquadFilter();
        f.type = "lowpass"; f.frequency.value = 420;
        musicOsc.type = "triangle"; musicOsc.frequency.value = 110;
        musicLfo.type = "sine"; musicLfo.frequency.value = 0.35;
        const lfoG = actx.createGain(); lfoG.gain.value = 18;
        musicLfo.connect(lfoG); lfoG.connect(musicOsc.frequency);
        musicOsc.connect(f); f.connect(musicGain); musicGain.connect(actx.destination);
        musicGain.gain.value = 0.018;
        musicOsc.start(); musicLfo.start();
      }
      const i = Math.max(0, Math.min(1, intensity || 0));
      musicOsc.frequency.setTargetAtTime(96 + i * 80, actx.currentTime, 0.4);
      musicGain.gain.setTargetAtTime(muted ? 0.0001 : (0.012 + i * 0.02), actx.currentTime, 0.3);
    } catch (_) {}
  }
  function saveAudio() {
    try { localStorage.setItem(SAVE_AUDIO, JSON.stringify({ muted: muted, reduced: reduced, music: musicOn })); } catch (_) {}
  }
  function setMute(v) {
    muted = !!v;
    if (musicGain && actx) {
      try {
        musicGain.gain.setTargetAtTime(muted || !musicOn ? 0.0001 : 0.018, actx.currentTime, 0.15);
      } catch (_) {}
    }
    saveAudio();
  }
  function setReduced(v) {
    reduced = !!v;
    if (musicGain && actx) {
      try {
        musicGain.gain.setTargetAtTime(muted || !musicOn || reduced ? 0.0001 : 0.018, actx.currentTime, 0.15);
      } catch (_) {}
    }
    saveAudio();
  }

  root.CryptStudio = {
    on: on, emit: emit, clearBus: clearBus,
    pool: pool, juice: juice,
    shake: shake, hitstop: hitstop, burst: burst, floater: floater,
    juiceTick: juiceTick, juiceDraw: juiceDraw,
    sfx: sfx, resumeAudio: resumeAudio, setMute: setMute, setReduced: setReduced,
    setMusic: setMusic, musicTick: musicTick,
    get muted() { return muted; },
    get reduced() { return reduced; },
    get music() { return musicOn; },
    fps: fps, fpsTick: fpsTick, fpsDraw: fpsDraw,
    cleanup: cleanup, counts: counts,
    get restarts() { return restarts; }
  };

  root.addEventListener("pointerdown", resumeAudio, { once: true });
  root.addEventListener("keydown", resumeAudio, { once: true });
})(typeof window !== "undefined" ? window : globalThis);
