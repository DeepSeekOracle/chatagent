/* Haven Rally — procedural engine, shifts, tire screech, city bed. No sampled engines. */
(function (global) {
  "use strict";
  var ctx = null, master, engGain, oscA, oscB, oscC, engFilt, exhaust;
  var tireGain, tireFilt, tireSrc;
  var ambGain, ambFilt, ambLfo, ambSrc;
  var noiseBuf = null, started = false, lastGear = 1, lastShiftAt = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function makeNoise(seconds) {
    var n = Math.floor(ctx.sampleRate * seconds);
    var b = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = b.getChannelData(0), i, acc = 0;
    for (i = 0; i < n; i++) {
      acc = acc * 0.96 + (Math.random() * 2 - 1) * 0.04;
      d[i] = acc * 3 + (Math.random() * 2 - 1) * 0.25;
    }
    return b;
  }

  function loopSrc(buf, dest, rate) {
    var s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate || 1;
    s.connect(dest);
    s.start();
    return s;
  }

  function boot() {
    if (started) {
      if (ctx && ctx.state === "suspended") ctx.resume();
      return true;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.42;
    master.connect(ctx.destination);

    noiseBuf = makeNoise(1.6);

    engGain = ctx.createGain();
    engGain.gain.value = 0;
    engFilt = ctx.createBiquadFilter();
    engFilt.type = "lowpass";
    engFilt.frequency.value = 900;
    engFilt.Q.value = 1.1;
    engGain.connect(engFilt);
    engFilt.connect(master);

    oscA = ctx.createOscillator();
    oscA.type = "sawtooth";
    oscA.frequency.value = 40;
    oscB = ctx.createOscillator();
    oscB.type = "sawtooth";
    oscB.frequency.value = 80.4;
    oscC = ctx.createOscillator();
    oscC.type = "square";
    oscC.frequency.value = 20;
    var mixA = ctx.createGain(); mixA.gain.value = 0.22;
    var mixB = ctx.createGain(); mixB.gain.value = 0.12;
    var mixC = ctx.createGain(); mixC.gain.value = 0.06;
    oscA.connect(mixA); mixA.connect(engGain);
    oscB.connect(mixB); mixB.connect(engGain);
    oscC.connect(mixC); mixC.connect(engGain);
    oscA.start(); oscB.start(); oscC.start();

    exhaust = ctx.createGain();
    exhaust.gain.value = 0.04;
    var exFilt = ctx.createBiquadFilter();
    exFilt.type = "lowpass";
    exFilt.frequency.value = 280;
    loopSrc(noiseBuf, exFilt, 0.7);
    exFilt.connect(exhaust);
    exhaust.connect(master);

    tireFilt = ctx.createBiquadFilter();
    tireFilt.type = "bandpass";
    tireFilt.frequency.value = 1400;
    tireFilt.Q.value = 3.2;
    tireGain = ctx.createGain();
    tireGain.gain.value = 0;
    tireSrc = loopSrc(noiseBuf, tireFilt, 1.35);
    tireFilt.connect(tireGain);
    tireGain.connect(master);

    ambFilt = ctx.createBiquadFilter();
    ambFilt.type = "lowpass";
    ambFilt.frequency.value = 420;
    ambGain = ctx.createGain();
    ambGain.gain.value = 0.07;
    ambSrc = loopSrc(noiseBuf, ambFilt, 0.45);
    ambFilt.connect(ambGain);
    ambLfo = ctx.createOscillator();
    ambLfo.frequency.value = 0.07;
    var lfoG = ctx.createGain();
    lfoG.gain.value = 80;
    ambLfo.connect(lfoG);
    lfoG.connect(ambFilt.frequency);
    ambLfo.start();
    ambGain.connect(master);

    started = true;
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  function clunk() {
    if (!ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.07);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.1);
    var n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    var nf = ctx.createBiquadFilter();
    nf.type = "highpass";
    nf.frequency.value = 800;
    n.connect(nf); nf.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.06);
  }

  function tick(s) {
    if (!started || !ctx) return;
    if (ctx.state === "suspended") return;
    s = s || {};
    var now = ctx.currentTime;
    var racing = !!s.racing;
    var rpm = clamp(s.rpm || 900, 700, 9000);
    var thr = clamp(s.thr || 0, 0, 1);
    var gear = s.gear == null ? 1 : s.gear;
    var slip = clamp(s.slip || 0, 0, 1);
    var radio = !!s.radio;
    var reduce = !!s.reduceFx;

    var fund = (rpm / 60) * (gear >= 4 ? 1.5 : 2);
    oscA.frequency.setTargetAtTime(fund, now, 0.04);
    oscB.frequency.setTargetAtTime(fund * 2.02, now, 0.04);
    oscC.frequency.setTargetAtTime(fund * 0.5, now, 0.05);
    engFilt.frequency.setTargetAtTime(380 + rpm * 0.42 + thr * 500, now, 0.05);
    var engVol = racing ? (0.035 + thr * 0.2 + clamp((rpm - 900) / 8000, 0, 1) * 0.08) : 0;
    if (gear === 0) engVol *= 0.45;
    engGain.gain.setTargetAtTime(engVol, now, 0.06);
    exhaust.gain.setTargetAtTime(racing ? (0.03 + thr * 0.07) : 0, now, 0.08);

    if (racing && gear !== lastGear && now - lastShiftAt > 0.08) {
      clunk();
      lastShiftAt = now;
      engGain.gain.setValueAtTime(engVol * 0.25, now);
      engGain.gain.linearRampToValueAtTime(engVol, now + 0.11);
    }
    lastGear = gear;

    var tire = racing ? Math.max(0, slip - 0.12) * (reduce ? 0.25 : 1) : 0;
    tireFilt.frequency.setTargetAtTime(900 + slip * 1600, now, 0.05);
    tireGain.gain.setTargetAtTime(tire * 0.22, now, 0.04);

    ambGain.gain.setTargetAtTime(radio ? 0.012 : (racing ? 0.05 : 0.08), now, 0.25);
  }

  function arm() {
    boot();
  }

  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    global.addEventListener(ev, arm, { once: true, passive: true });
  });

  global.HavenSfx = { boot: boot, tick: tick, arm: arm };
})(window);
