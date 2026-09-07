/* Haven Rally 2.5D — Three.js. Gameplay stays in game.js. */
(function (global) {
  "use strict";
  if (global.Rally3D) return;
  var T = null;
  var renderer, scene, camera, clock;
  var sun, hemi, canvasEl, running = false;
  var trackRoot = null;
  var carMesh, ghostMesh, aiMesh, sparkGroup, treeLights;
  var carKind = "", carPaint = null;
  var trafficPool = [];
  var tracerPool = [];
  var skidMesh = null, skidDummy = null, skidIdx = 0, skidLast = { x: 1e9, z: 1e9 };
  var lastBurnout = false;
  var cam = { x: 0, y: 18, z: 28 };
  var look = { x: 0, y: 1, z: 0 };
  var camTune = { dist: 1, height: 1, view: 0, lag: 0.0004, fov: 52 };
  var lastView = -1;
  var envMap = null;
  var lastSpeed = 0;

  function ok() { return !!(renderer && scene && camera); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function noiseTex(w, h, fn) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var g = c.getContext("2d");
    var img = g.createImageData(w, h);
    for (var i = 0; i < w * h; i++) {
      var x = i % w, y = (i / w) | 0;
      var col = fn(x, y, x / w, y / h);
      var o = i * 4;
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }

  function densify(path, step, closed) {
    var out = [];
    var nSeg = closed ? path.length : Math.max(0, path.length - 1);
    var i, a, b, len, n, k, t;
    for (i = 0; i < nSeg; i++) {
      a = path[i];
      b = path[(i + 1) % path.length];
      len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      n = Math.max(1, Math.ceil(len / step));
      for (k = 0; k < n; k++) {
        t = k / n;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    if (!closed && path.length) out.push(path[path.length - 1]);
    return out;
  }

  function unitPerps(pts, closed) {
    var out = [], i, prev, next, tx, tz, len, px, pz, lx = 0, lz = 1;
    for (i = 0; i < pts.length; i++) {
      prev = pts[(i - 1 + pts.length) % pts.length];
      next = pts[(i + 1) % pts.length];
      if (!closed && i === 0) prev = pts[0];
      if (!closed && i === pts.length - 1) next = pts[i];
      tx = next.x - prev.x;
      tz = next.y - prev.y;
      len = Math.hypot(tx, tz) || 1;
      px = -tz / len;
      pz = tx / len;
      if (i > 0 && px * lx + pz * lz < 0) {
        px = -px;
        pz = -pz;
      }
      lx = px;
      lz = pz;
      out.push({ x: px, y: pz });
    }
    return out;
  }

  function miterOff(perp, prev, maxS) {
    if (!prev) return perp;
    var mx = perp.x + prev.x, mz = perp.y + prev.y;
    var ml = Math.hypot(mx, mz);
    if (ml < 1e-5) return perp;
    mx /= ml;
    mz /= ml;
    var s = 1 / Math.max(perp.x * mx + perp.y * mz, 0.42);
    if (s > maxS) s = maxS;
    return { x: mx * s, y: mz * s };
  }

  function ribbon(path, width, y, closed) {
    var pts = densify(path, closed ? 6 : 8, closed);
    var nrms = unitPerps(pts, closed);
    var pos = [], uv = [], idx = [], acc = 0;
    var i, m, b;
    for (i = 0; i < pts.length; i++) {
      m = miterOff(nrms[i], i ? nrms[i - 1] : null, 1.85);
      if (i > 0) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      pos.push(pts[i].x + m.x * width, y, pts[i].y + m.y * width);
      pos.push(pts[i].x - m.x * width, y, pts[i].y - m.y * width);
      uv.push(0, acc * 0.04, 1, acc * 0.04);
      if (i > 0) {
        b = (i - 1) * 2;
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
    }
    if (closed && pts.length > 2) {
      var last = (pts.length - 1) * 2;
      idx.push(last, 0, last + 1, last + 1, 0, 1);
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function offsetPath(path, lat, closed) {
    var nrms = unitPerps(path, closed);
    var out = [], i, m;
    for (i = 0; i < path.length; i++) {
      m = miterOff(nrms[i], i ? nrms[i - 1] : null, 1.7);
      out.push({ x: path[i].x + m.x * lat, y: path[i].y + m.y * lat });
    }
    return out;
  }

  function themeOf(id) {
    if (id === "coral-coast") return {
      sky: 0xff7a58, fog: 0xffb898, ground: 0x1c5a48, road: 0x3a3c44, dusk: true,
      sun: 0xffc090, hemi: 0xffd4b8, gnd: 0x1a4a40, sea: true, city: true
    };
    if (id === "singularity-ring") return {
      sky: 0x1a1238, fog: 0x3a2468, ground: 0x12101c, road: 0x2a2440, dusk: true,
      sun: 0xff88aa, hemi: 0xc9a0ff, gnd: 0x1a1028, sea: false, city: true
    };
    if (id === "endless") return {
      sky: 0xff8a62, fog: 0xffc4a8, ground: 0x245040, road: 0x3a3c44, dusk: true,
      sun: 0xffb070, hemi: 0xffe0c8, gnd: 0x1c4034, sea: true, city: true
    };
    if (id === "drag-strip") return {
      sky: 0x141028, fog: 0x2a2048, ground: 0x1a2018, road: 0x2c2e32, dusk: true,
      sun: 0xffa0c0, hemi: 0xd8b0ff, gnd: 0x1a1820, sea: false, city: false
    };
    return {
      sky: 0xf4a06a, fog: 0xffc8a0, ground: 0x2a4a30, road: 0x2e3238, dusk: true,
      sun: 0xffc090, hemi: 0xffe8d0, gnd: 0x2a3a28, sea: false, city: false, park: true
    };
  }

  function applyTheme(th) {
    scene.background = new T.Color(th.sky);
    if (scene.fog) scene.fog.color.setHex(th.fog);
    if (hemi) {
      hemi.color.setHex(th.hemi || 0xffd8c0);
      hemi.groundColor.setHex(th.gnd || 0x2a3a28);
      hemi.intensity = 0.78;
    }
    if (sun) {
      sun.color.setHex(th.sun || 0xffb080);
      sun.intensity = th.dusk ? 1.18 : 1.4;
      sun.position.set(-55, 38, 28);
    }
    if (renderer) renderer.toneMappingExposure = 1.24;
  }

  function boardTex(label, bg) {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    var g = c.getContext("2d");
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#0b1220";
    g.fillRect(8, 8, 240, 112);
    g.fillStyle = bg;
    g.fillRect(14, 14, 228, 100);
    g.fillStyle = "#fff8e8";
    g.font = "800 36px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, 128, 64);
    var t = new T.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  function sideAt(p, q, dist) {
    var tx = q.x - p.x, tz = q.y - p.y;
    var len = Math.hypot(tx, tz) || 1;
    return {
      x: p.x + (-tz / len) * dist,
      z: p.y + (tx / len) * dist,
      ang: Math.atan2(tz, tx),
      px: -tz / len,
      pz: tx / len
    };
  }

  function idxAtFrac(pts, closed, frac) {
    var segs = closed ? pts.length : Math.max(0, pts.length - 1);
    var total = 0, i, d, acc = 0, want;
    for (i = 0; i < segs; i++) {
      total += Math.hypot(pts[(i + 1) % pts.length].x - pts[i].x, pts[(i + 1) % pts.length].y - pts[i].y);
    }
    want = clamp(frac, 0, 0.999) * total;
    for (i = 0; i < segs; i++) {
      d = Math.hypot(pts[(i + 1) % pts.length].x - pts[i].x, pts[(i + 1) % pts.length].y - pts[i].y);
      if (acc + d >= want) return i;
      acc += d;
    }
    return Math.max(0, pts.length - 2);
  }

  function addGantry(p, q, width, col) {
    var s = sideAt(p, q, 0);
    var postM = new T.MeshStandardMaterial({ color: 0x111827 });
    var pL = new T.Mesh(new T.BoxGeometry(0.4, 7.4, 0.4), postM);
    var pR = pL.clone();
    pL.position.set(p.x + s.px * (width + 0.75), 3.7, p.y + s.pz * (width + 0.75));
    pR.position.set(p.x - s.px * (width + 0.75), 3.7, p.y - s.pz * (width + 0.75));
    var ban = new T.Mesh(
      new T.BoxGeometry(width * 2.45, 1.2, 0.22),
      new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55 })
    );
    ban.position.set(p.x, 7.35, p.y);
    ban.rotation.y = -s.ang;
    trackRoot.add(pL, pR, ban);
  }

  function paintLanes(track, closed) {
    var n = track.lanes || 4;
    var laneW = track.laneW || (track.width * 2 / n);
    var dash = new T.MeshStandardMaterial({
      color: 0xf1f5f9, roughness: 0.5, emissive: 0x94a3b8, emissiveIntensity: 0.16
    });
    var edge = new T.MeshStandardMaterial({
      color: 0xfbbf24, roughness: 0.42, emissive: 0x996600, emissiveIntensity: 0.28
    });
    var nDiv = n - 1, k, lat;
    for (k = 0; k < nDiv; k++) {
      lat = (k - (nDiv - 1) / 2) * laneW;
      trackRoot.add(new T.Mesh(ribbon(offsetPath(track.pts, lat, closed), 0.075, 0.112, closed), dash));
    }
    trackRoot.add(new T.Mesh(ribbon(offsetPath(track.pts, track.width - 0.14, closed), 0.11, 0.118, closed), edge));
    trackRoot.add(new T.Mesh(ribbon(offsetPath(track.pts, -(track.width - 0.14), closed), 0.11, 0.118, closed), edge));
  }

  function dressCourse(track, closed) {
    var dummy = new T.Object3D();
    var i, p, q, s, side, x, z, step, th;
    th = themeOf(track.theme);
    var nPalm = Math.min(closed ? 64 : 160, Math.max(16, (track.pts.length / 3) | 0));
    var palmT = new T.InstancedMesh(new T.CylinderGeometry(0.12, 0.2, 5.8, 5), new T.MeshStandardMaterial({ color: 0x6b4423 }), nPalm);
    var palmC = new T.InstancedMesh(new T.ConeGeometry(1.9, 1.7, 6), new T.MeshStandardMaterial({ color: 0x1f7a3a, flatShading: true }), nPalm);
    step = Math.max(1, (track.pts.length / nPalm) | 0);
    for (i = 0; i < nPalm; i++) {
      p = track.pts[Math.min(track.pts.length - 2, i * step)];
      q = track.pts[Math.min(track.pts.length - 1, i * step + 1)];
      side = i % 2 ? 1 : -1;
      s = sideAt(p, q, (track.width + 13 + (i % 5)) * side);
      dummy.position.set(s.x, 2.9, s.z);
      dummy.scale.set(1, 1 + (i % 3) * 0.14, 1);
      dummy.updateMatrix();
      palmT.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 5.9;
      dummy.scale.set(1.15, 1, 1.15);
      dummy.updateMatrix();
      palmC.setMatrixAt(i, dummy.matrix);
    }
    palmT.instanceMatrix.needsUpdate = true;
    palmC.instanceMatrix.needsUpdate = true;
    trackRoot.add(palmT);
    trackRoot.add(palmC);

    var nRail = Math.min(closed ? 160 : 280, Math.max(40, track.pts.length));
    var railM = new T.MeshStandardMaterial({ color: 0xc5cdd6, metalness: 0.62, roughness: 0.32 });
    var posts = new T.InstancedMesh(new T.BoxGeometry(0.12, 0.9, 0.12), railM, nRail * 2);
    var rails = new T.InstancedMesh(new T.BoxGeometry(0.08, 0.12, 2.4), railM, nRail * 2);
    step = Math.max(1, (track.pts.length / nRail) | 0);
    var ri, rs;
    for (i = 0; i < nRail; i++) {
      p = track.pts[Math.min(track.pts.length - 2, i * step)];
      q = track.pts[Math.min(track.pts.length - 1, i * step + 1)];
      for (ri = 0; ri < 2; ri++) {
        rs = sideAt(p, q, (track.width + 1.15) * (ri ? 1 : -1));
        dummy.position.set(rs.x, 0.45, rs.z);
        dummy.rotation.set(0, -rs.ang, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(i * 2 + ri, dummy.matrix);
        dummy.position.y = 0.78;
        dummy.scale.set(1, 1, 1.15);
        dummy.updateMatrix();
        rails.setMatrixAt(i * 2 + ri, dummy.matrix);
      }
    }
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    trackRoot.add(posts, rails);

    var nLamp = Math.min(closed ? 36 : 70, Math.max(10, (track.pts.length / 8) | 0));
    var lampPole = new T.InstancedMesh(new T.CylinderGeometry(0.08, 0.1, 8.4, 5), new T.MeshStandardMaterial({ color: 0x334 }), nLamp);
    var lampHead = new T.InstancedMesh(new T.BoxGeometry(0.9, 0.14, 0.35), new T.MeshStandardMaterial({
      color: 0xfff3c4, emissive: 0xffc878, emissiveIntensity: 1.6
    }), nLamp);
    step = Math.max(1, (track.pts.length / nLamp) | 0);
    for (i = 0; i < nLamp; i++) {
      p = track.pts[Math.min(track.pts.length - 2, i * step)];
      q = track.pts[Math.min(track.pts.length - 1, i * step + 1)];
      side = i % 2 ? 1 : -1;
      s = sideAt(p, q, (track.width + 3.2) * side);
      dummy.position.set(s.x, 4.2, s.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lampPole.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x - s.px * 0.55 * side, 8.35, s.z - s.pz * 0.55 * side);
      dummy.updateMatrix();
      lampHead.setMatrixAt(i, dummy.matrix);
    }
    lampPole.instanceMatrix.needsUpdate = true;
    lampHead.instanceMatrix.needsUpdate = true;
    trackRoot.add(lampPole, lampHead);

    var labels = ["HAVEN", "APEX", "LATTICE", "Δ9", "GOLD HOUR", "COAST"];
    var cols = [0xff4d6d, 0xfbbf24, 0x5eead4, 0xff7a3c, 0xc084fc, 0x38bdf8];
    var nb = Math.min(closed ? 14 : 22, Math.max(6, (track.pts.length / 28) | 0));
    var bi, lab, board, pole;
    step = Math.max(4, (track.pts.length / nb) | 0);
    for (bi = 0; bi < nb; bi++) {
      p = track.pts[Math.min(track.pts.length - 2, bi * step + 3)];
      q = track.pts[Math.min(track.pts.length - 1, bi * step + 4)];
      side = bi % 2 ? 1 : -1;
      s = sideAt(p, q, (track.width + 16) * side);
      lab = labels[bi % labels.length];
      board = new T.Mesh(
        new T.PlaneGeometry(10.5, 5.1),
        new T.MeshStandardMaterial({
          map: boardTex(lab, "#" + cols[bi % cols.length].toString(16).padStart(6, "0")),
          roughness: 0.42, emissive: cols[bi % cols.length], emissiveIntensity: 0.18
        })
      );
      board.position.set(s.x, 6.6, s.z);
      board.lookAt(p.x, 6.6, p.y);
      pole = new T.Mesh(new T.CylinderGeometry(0.13, 0.15, 6.6, 5), new T.MeshStandardMaterial({ color: 0x334 }));
      pole.position.set(s.x, 3.3, s.z);
      trackRoot.add(board, pole);
    }

    if (th.sea) {
      var wmat = new T.MeshStandardMaterial({ color: 0x157a9a, metalness: 0.55, roughness: 0.18, envMap: envMap, envMapIntensity: 0.8 });
      var wi, wp, wq, water;
      var wn = closed ? 3 : 6;
      for (wi = 0; wi < wn; wi++) {
        wp = track.pts[Math.min(track.pts.length - 2, ((wi + 0.18) / wn * track.pts.length) | 0)];
        wq = track.pts[Math.min(track.pts.length - 1, (((wi + 0.18) / wn * track.pts.length) | 0) + 1)];
        s = sideAt(wp, wq, 110);
        water = new T.Mesh(new T.CircleGeometry(closed ? 280 : 240, 36), wmat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(s.x, -0.28, s.z);
        trackRoot.add(water);
      }
    }
    if (th.city) {
      var bmat = [
        new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }),
        new T.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, emissive: 0x4c1d95, emissiveIntensity: 0.42 }),
        new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.48, emissive: 0xff4d6d, emissiveIntensity: 0.22 })
      ];
      var bn = Math.min(closed ? 48 : 72, Math.max(16, (track.pts.length / 8) | 0));
      for (bi = 0; bi < bn; bi++) {
        p = track.pts[Math.min(track.pts.length - 2, bi * Math.max(4, (track.pts.length / bn) | 0))];
        q = track.pts[Math.min(track.pts.length - 1, bi * Math.max(4, (track.pts.length / bn) | 0) + 1)];
        side = bi % 2 ? 1 : -1;
        s = sideAt(p, q, (track.width + 26 + (bi % 7)) * side);
        var ht = 10 + (bi % 9) * 3.1;
        var blk = new T.Mesh(new T.BoxGeometry(6 + (bi % 4), ht, 6 + (bi % 3)), bmat[bi % 3]);
        blk.position.set(s.x, ht * 0.5, s.z);
        trackRoot.add(blk);
      }
    }

    addGantry(track.pts[0], track.pts[1], track.width, 0xff4d6d);
    var secs = track.sectors || [0.28, 0.55, 0.82];
    var gCols = [0x5eead4, 0xfbbf24, 0xc084fc];
    var gi, gidx;
    for (gi = 0; gi < secs.length; gi++) {
      gidx = idxAtFrac(track.pts, closed, secs[gi]);
      addGantry(track.pts[gidx], track.pts[Math.min(track.pts.length - 1, gidx + 1)], track.width, gCols[gi % gCols.length]);
    }
  }

  function bulbMesh(T, r, col) {
    var m = new T.Mesh(
      new T.SphereGeometry(r, 12, 10),
      new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.08, roughness: 0.35 })
    );
    m.userData.base = col;
    return m;
  }

  function buildDrag(track) {
    var T = global.THREE;
    var th = themeOf(track.theme);
    applyTheme(th);
    scene.fog.density = 0.0016;
    var total = track.pts[track.pts.length - 1].x;
    var startX = track.startX;
    var finishX = track.finishX;
    var ground = new T.Mesh(
      new T.PlaneGeometry(Math.max(2400, total + 200), 900),
      new T.MeshStandardMaterial({ color: th.ground, roughness: 0.96 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(total * 0.5, -0.4, 0);
    ground.receiveShadow = true;
    trackRoot.add(ground);
    var laneW = track.laneW || 4.4;
    var nL = track.lanes || 4;
    var half = track.width || laneW * nL * 0.5;
    var strip = new T.Mesh(
      new T.BoxGeometry(total + 8, 0.14, half * 2 + 4),
      new T.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.78, metalness: 0.08 })
    );
    strip.position.set(total * 0.5, 0.02, 0);
    strip.receiveShadow = true;
    trackRoot.add(strip);
    var laneMat = new T.MeshStandardMaterial({ color: 0x32343a, roughness: 0.7 });
    var li, laneMesh, halfL = (nL - 1) * 0.5;
    for (li = 0; li < nL; li++) {
      laneMesh = new T.Mesh(new T.BoxGeometry(total + 6, 0.02, laneW - 0.25), laneMat);
      laneMesh.position.set(total * 0.5, 0.1, (li - halfL) * laneW);
      trackRoot.add(laneMesh);
    }
    function stripe(x, w, z, col) {
      var s = new T.Mesh(new T.BoxGeometry(w, 0.04, 0.16), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.2 }));
      s.position.set(x, 0.14, z);
      trackRoot.add(s);
    }
    var d;
    for (d = 8; d < total; d += 8) {
      stripe(d, 2.2, -laneW, 0xf8fafc);
      stripe(d, 2.2, 0, 0xfbbf24);
      stripe(d, 2.2, laneW, 0xf8fafc);
    }
    var startLine = new T.Mesh(
      new T.BoxGeometry(0.45, 0.06, half * 2 + 0.4),
      new T.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x8899aa, emissiveIntensity: 0.25 })
    );
    startLine.position.set(startX, 0.16, 0);
    trackRoot.add(startLine);
    var finishLine = startLine.clone();
    finishLine.position.x = finishX;
    finishLine.material = new T.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x996600, emissiveIntensity: 0.35 });
    trackRoot.add(finishLine);
    [60, 330, 660, 1000, 1320].forEach(function (ft) {
      var x = startX + ft / 3;
      if (x > finishX + 1) return;
      var mk = new T.Mesh(
        new T.BoxGeometry(0.2, 0.04, half * 2 + 1.2),
        new T.MeshStandardMaterial({ color: 0x5eead4, emissive: 0x134e4a })
      );
      mk.position.set(x, 0.15, 0);
      trackRoot.add(mk);
    });
    var wallMat = new T.MeshStandardMaterial({ color: 0xc4c4c4, roughness: 0.55 });
    var wallA = new T.Mesh(new T.BoxGeometry(total + 10, 1.1, 0.35), wallMat);
    wallA.position.set(total * 0.5, 0.55, -(half + 2.8));
    var wallB = wallA.clone();
    wallB.position.z = half + 2.8;
    trackRoot.add(wallA, wallB);
    var i, pole, lamp;
    var nFlood = 0;
    for (i = 0; i < total; i += 52) {
      pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 11, 6), new T.MeshStandardMaterial({ color: 0x334 }));
      pole.position.set(i + 10, 5.5, -(half + 6.5));
      lamp = new T.Mesh(new T.BoxGeometry(1.6, 0.2, 0.6), new T.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe08a, emissiveIntensity: 1.4 }));
      lamp.position.set(i + 10, 11.1, -(half + 5.6));
      trackRoot.add(pole, lamp);
      if (nFlood < 7) {
        var light = new T.PointLight(0xffe8c0, 1.05, 52, 2);
        light.position.set(i + 10, 10.5, -(half + 4));
        trackRoot.add(light);
        nFlood += 1;
      }
    }
    var tower = new T.Mesh(new T.BoxGeometry(4.2, 14, 3.2), new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
    tower.position.set(startX - 18, 7, 14);
    trackRoot.add(tower);
    var booth = new T.Mesh(new T.BoxGeometry(6, 3.2, 4), new T.MeshStandardMaterial({ color: 0x0f172a }));
    booth.position.set(startX - 8, 1.6, 13);
    trackRoot.add(booth);
    var stand = new T.Mesh(new T.BoxGeometry(80, 6, 8), new T.MeshStandardMaterial({ color: 0x334155 }));
    stand.position.set(startX + 40, 3, 18);
    stand.rotation.x = -0.18;
    trackRoot.add(stand);
    var tree = new T.Group();
    tree.position.set(startX - 9, 0, 0);
    var post = new T.Mesh(new T.BoxGeometry(0.35, 8.2, 0.35), new T.MeshStandardMaterial({ color: 0x111827 }));
    post.position.y = 4.1;
    tree.add(post);
    var head = new T.Mesh(new T.BoxGeometry(2.4, 5.6, 0.5), new T.MeshStandardMaterial({ color: 0x0b1220 }));
    head.position.y = 6.4;
    tree.add(head);
    function pair(name, y, r, col) {
      var L = bulbMesh(T, r, col);
      var R = bulbMesh(T, r, col);
      L.position.set(-0.55, y, 0.28);
      R.position.set(0.55, y, 0.28);
      tree.add(L, R);
      treeLights[name + "L"] = L;
      treeLights[name + "R"] = R;
    }
    treeLights = {};
    pair("pre", 8.55, 0.1, 0xfde68a);
    pair("stage", 8.15, 0.1, 0xfbbf24);
    pair("a1", 7.45, 0.16, 0xf59e0b);
    pair("a2", 6.9, 0.16, 0xf59e0b);
    pair("a3", 6.35, 0.16, 0xf59e0b);
    pair("green", 5.7, 0.17, 0x22c55e);
    pair("red", 5.1, 0.17, 0xef4444);
    trackRoot.add(tree);
    var sand = new T.Mesh(
      new T.BoxGeometry(40, 0.2, 18),
      new T.MeshStandardMaterial({ color: 0xc4b58a, roughness: 1 })
    );
    sand.position.set(total - 18, 0.08, 0);
    trackRoot.add(sand);
  }

  function makeCar(color, ghost, body) {
    if (global.HavenCar && HavenCar.build) {
      return HavenCar.build(T, { paint: color, ghost: ghost, envMap: envMap, body: body });
    }
    var g = new T.Group();
    var body = new T.Mesh(
      new T.BoxGeometry(1.7, 0.42, 3.2),
      new T.MeshStandardMaterial({
        color: color, roughness: 0.38, metalness: 0.45,
        transparent: !!ghost, opacity: ghost ? 0.38 : 1
      })
    );
    body.position.y = 0.42;
    g.add(body);
    var headMat = new T.MeshStandardMaterial({
      color: 0xfff4d4, emissive: 0xffe7b0, emissiveIntensity: ghost ? 0.3 : 3.2
    });
    var tailMat = new T.MeshStandardMaterial({
      color: 0x3b0000, emissive: 0xff2211, emissiveIntensity: ghost ? 0.15 : 0.5
    });
    var hL = new T.Mesh(new T.BoxGeometry(0.22, 0.1, 0.08), headMat);
    var hR = hL.clone();
    hL.position.set(-0.55, 0.42, -1.55);
    hR.position.set(0.55, 0.42, -1.55);
    hL.userData.head = hR.userData.head = true;
    var tL = new T.Mesh(new T.BoxGeometry(0.28, 0.1, 0.06), tailMat);
    var tR = tL.clone();
    tL.position.set(-0.55, 0.42, 1.55);
    tR.position.set(0.55, 0.42, 1.55);
    tL.userData.brake = tR.userData.brake = true;
    g.add(hL, hR, tL, tR);
    return g;
  }

  function rebuild(track) {
    if (trackRoot) {
      scene.remove(trackRoot);
      trackRoot.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          var mats = o.material.length ? o.material : [o.material];
          mats.forEach(function (m) {
            if (!m) return;
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    }
    treeLights = null;
    trackRoot = new T.Group();
    scene.add(trackRoot);
    if (track.kind === "drag") {
      buildDrag(track);
      return;
    }
    var closed = track.closed !== false;
    var th = themeOf(track.theme);
    applyTheme(th);
    scene.fog.density = closed ? (th.dusk ? 0.0022 : 0.0016) : 0.00105;
    var minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9, bi;
    for (bi = 0; bi < track.pts.length; bi++) {
      if (track.pts[bi].x < minx) minx = track.pts[bi].x;
      if (track.pts[bi].x > maxx) maxx = track.pts[bi].x;
      if (track.pts[bi].y < minz) minz = track.pts[bi].y;
      if (track.pts[bi].y > maxz) maxz = track.pts[bi].y;
    }
    var span = Math.max(900, Math.max(maxx - minx, maxz - minz) + 480);
    var ground = new T.Mesh(
      new T.PlaneGeometry(span, span),
      new T.MeshStandardMaterial({ color: th.ground, roughness: 0.96 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((minx + maxx) * 0.5, -0.4, (minz + maxz) * 0.5);
    ground.receiveShadow = true;
    trackRoot.add(ground);
    var shoulder = new T.Mesh(
      ribbon(track.pts, track.width + 6.2, 0.02, closed),
      new T.MeshStandardMaterial({ color: 0x3a4a32, roughness: 1 })
    );
    shoulder.receiveShadow = true;
    trackRoot.add(shoulder);
    var road = new T.Mesh(
      ribbon(track.pts, track.width, 0.08, closed),
      new T.MeshStandardMaterial({ color: th.road, roughness: 0.68, metalness: 0.1 })
    );
    road.receiveShadow = true;
    trackRoot.add(road);
    paintLanes(track, closed);
    var start = track.pts[0];
    var n1 = track.pts[1];
    var ang = Math.atan2(n1.y - start.y, n1.x - start.x);
    var gate = new T.Mesh(
      new T.BoxGeometry(track.width * 2.1, 0.12, 0.5),
      new T.MeshStandardMaterial({ color: 0x5eead4, emissive: 0x134e4a })
    );
    gate.position.set(start.x, 0.14, start.y);
    gate.rotation.y = -ang;
    trackRoot.add(gate);
    if (!closed && track.pts.length > 3) {
      var end = track.pts[track.pts.length - 1];
      var prev = track.pts[track.pts.length - 2];
      var fang = Math.atan2(end.y - prev.y, end.x - prev.x);
      var fin = new T.Mesh(
        new T.BoxGeometry(track.width * 2.2, 0.14, 0.6),
        new T.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x996600, emissiveIntensity: 0.4 })
      );
      fin.position.set(end.x, 0.16, end.y);
      fin.rotation.y = -fang;
      trackRoot.add(fin);
      var postL = new T.Mesh(new T.BoxGeometry(0.45, 7.2, 0.45), new T.MeshStandardMaterial({ color: 0x111827 }));
      var postR = postL.clone();
      var px = -Math.sin(fang), pz = Math.cos(fang);
      postL.position.set(end.x + px * (track.width + 0.8), 3.6, end.y + pz * (track.width + 0.8));
      postR.position.set(end.x - px * (track.width + 0.8), 3.6, end.y - pz * (track.width + 0.8));
      var banner = new T.Mesh(
        new T.BoxGeometry(track.width * 2.4, 1.1, 0.2),
        new T.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x664400 })
      );
      banner.position.set(end.x, 7.1, end.y);
      banner.rotation.y = -fang;
      trackRoot.add(postL, postR, banner);
    }
    if (track.pts.length > 8) {
      var wantTun = 88;
      var t0 = (track.pts.length * 0.34) | 0;
      var t1 = Math.min(track.pts.length - 2, t0 + 8);
      var bestScore = -1, si, sj, sacc, sturn, a, b, c, h1, h2, dh;
      for (si = Math.max(8, (track.pts.length * 0.18) | 0); si < track.pts.length * 0.78; si++) {
        sacc = 0;
        sturn = 0;
        for (sj = si; sj < track.pts.length - 2 && sacc < wantTun; sj++) {
          a = track.pts[sj];
          b = track.pts[sj + 1];
          c = track.pts[sj + 2];
          sacc += Math.hypot(b.x - a.x, b.y - a.y);
          h1 = Math.atan2(b.y - a.y, b.x - a.x);
          h2 = Math.atan2(c.y - b.y, c.x - b.x);
          dh = h2 - h1;
          if (dh > Math.PI) dh -= Math.PI * 2;
          if (dh < -Math.PI) dh += Math.PI * 2;
          sturn += Math.abs(dh);
        }
        if (sacc < wantTun * 0.7) continue;
        if (sacc / (1 + sturn * 10) > bestScore) {
          bestScore = sacc / (1 + sturn * 10);
          t0 = si;
          t1 = sj;
        }
      }
      var ta = track.pts[t0], tb = track.pts[Math.min(track.pts.length - 1, t1)];
      var tdx = tb.x - ta.x, tdz = tb.y - ta.y;
      var tlen = Math.min(96, Math.hypot(tdx, tdz) || 1);
      var tang = Math.atan2(tdz, tdx);
      var tcx = (ta.x + tb.x) * 0.5, tcz = (ta.y + tb.y) * 0.5;
      var tpx = -tdz / (Math.hypot(tdx, tdz) || 1), tpz = tdx / (Math.hypot(tdx, tdz) || 1);
      var tunMat = new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
      var wL = new T.Mesh(new T.BoxGeometry(tlen, 5.2, 0.7), tunMat);
      var wR = wL.clone();
      wL.position.set(tcx + tpx * (track.width + 0.85), 2.6, tcz + tpz * (track.width + 0.85));
      wR.position.set(tcx - tpx * (track.width + 0.85), 2.6, tcz - tpz * (track.width + 0.85));
      wL.rotation.y = -tang;
      wR.rotation.y = -tang;
      var roof = new T.Mesh(new T.BoxGeometry(tlen, 0.45, track.width * 2 + 2.6), tunMat);
      roof.position.set(tcx, 5.3, tcz);
      roof.rotation.y = -tang;
      trackRoot.add(wL, wR, roof);
    }
    var dummy = new T.Object3D();
    var nTree = Math.min(closed ? 140 : 240, Math.max(32, (track.pts.length / 5) | 0));
    var trunk = new T.InstancedMesh(new T.CylinderGeometry(0.18, 0.28, 2.4, 5), new T.MeshStandardMaterial({ color: 0x4a331c }), nTree);
    var crown = new T.InstancedMesh(new T.ConeGeometry(1.4, 3.2, 6), new T.MeshStandardMaterial({ color: 0x1a5c32, flatShading: true }), nTree);
    trunk.castShadow = crown.castShadow = true;
    for (var i = 0; i < nTree; i++) {
      var p = track.pts[Math.min(track.pts.length - 2, i * Math.max(1, (track.pts.length / nTree) | 0))];
      var q = track.pts[Math.min(track.pts.length - 1, i * Math.max(1, (track.pts.length / nTree) | 0) + 1)];
      var tx = q.x - p.x, tz = q.y - p.y;
      var len = Math.hypot(tx, tz) || 1;
      var side = i % 2 ? 1 : -1;
      var x = p.x + (-tz / len) * (track.width + 14 + (i % 5)) * side;
      var z = p.y + (tx / len) * (track.width + 14 + (i % 5)) * side;
      dummy.position.set(x, 1.2, z);
      dummy.scale.set(1, 1 + (i % 4) * 0.08, 1);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 3.4;
      dummy.updateMatrix();
      crown.setMatrixAt(i, dummy.matrix);
    }
    trunk.instanceMatrix.needsUpdate = true;
    crown.instanceMatrix.needsUpdate = true;
    trackRoot.add(trunk);
    trackRoot.add(crown);
    dressCourse(track, closed);
  }

  function disposeObj(o) {
    if (!o) return;
    scene.remove(o);
    o.traverse(function (ch) {
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        var mats = ch.material.length ? ch.material : [ch.material];
        mats.forEach(function (m) { if (m) m.dispose(); });
      }
    });
  }

  function ensureActors(body, paint) {
    body = body || "apex";
    paint = paint != null ? paint : 0x165e66;
    if (carMesh && (carKind !== body || carPaint !== paint)) {
      disposeObj(carMesh);
      carMesh = null;
    }
    if (!carMesh) {
      carMesh = makeCar(paint, false, body);
      carKind = body;
      carPaint = paint;
      scene.add(carMesh);
      if (!ghostMesh) {
        ghostMesh = makeCar(0xc084fc, true, body);
        ghostMesh.visible = false;
        scene.add(ghostMesh);
      }
    }
    if (!aiMesh) {
      aiMesh = makeCar(0xb45309, false);
      aiMesh.visible = false;
      scene.add(aiMesh);
    }
    if (!sparkGroup) {
      sparkGroup = new T.Group();
      var si, sm;
      for (si = 0; si < 28; si++) {
        sm = new T.Mesh(
          new T.BoxGeometry(0.05, 0.05, 0.05),
          new T.MeshBasicMaterial({ color: si % 2 ? 0xfbbf24 : 0x5eead4 })
        );
        sparkGroup.add(sm);
      }
      sparkGroup.visible = false;
      scene.add(sparkGroup);
    }
    attachGuns(carMesh);
    ensureTraffic(64);
    ensureTracers(12);
    ensureSkids();
  }

  function ensureSkids() {
    if (skidMesh) return;
    var geo = new T.PlaneGeometry(0.32, 0.78);
    var mat = new T.MeshBasicMaterial({
      color: 0x0b0b0b, transparent: true, opacity: 0.62, depthWrite: false
    });
    skidMesh = new T.InstancedMesh(geo, mat, 560);
    skidMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    skidMesh.frustumCulled = false;
    skidMesh.renderOrder = 1;
    scene.add(skidMesh);
    skidDummy = new T.Object3D();
    skidDummy.rotation.order = "YXZ";
    var i;
    skidDummy.scale.set(0, 0, 0);
    skidDummy.updateMatrix();
    for (i = 0; i < 560; i++) skidMesh.setMatrixAt(i, skidDummy.matrix);
    skidMesh.instanceMatrix.needsUpdate = true;
    skidIdx = 0;
  }

  function resetSkids() {
    if (!skidMesh || !skidDummy) return;
    var i;
    skidDummy.scale.set(0, 0, 0);
    skidDummy.updateMatrix();
    for (i = 0; i < 560; i++) skidMesh.setMatrixAt(i, skidDummy.matrix);
    skidMesh.instanceMatrix.needsUpdate = true;
    skidIdx = 0;
    skidLast.x = 1e9;
    skidLast.z = 1e9;
  }

  function dropSkid(x, z, h, wide) {
    if (!skidMesh || !skidDummy) return;
    skidDummy.position.set(x, 0.096, z);
    skidDummy.rotation.set(-Math.PI / 2, -h, 0);
    skidDummy.scale.set(wide || 1, 1, 1);
    skidDummy.updateMatrix();
    skidMesh.setMatrixAt(skidIdx % 560, skidDummy.matrix);
    skidIdx += 1;
    skidMesh.instanceMatrix.needsUpdate = true;
  }

  function attachGuns(root) {
    if (!root || root.userData.mg) return;
    var mat = new T.MeshStandardMaterial({ color: 0x1b1f28, metalness: 0.72, roughness: 0.32 });
    function barrel(x) {
      var b = new T.Mesh(new T.CylinderGeometry(0.038, 0.046, 0.92, 8), mat);
      b.rotation.x = Math.PI / 2;
      b.position.set(x, 0.36, -2.12);
      root.add(b);
      var flash = new T.PointLight(0xffe08a, 0, 14, 2);
      flash.position.set(x, 0.38, -2.58);
      root.add(flash);
      return { mesh: b, flash: flash };
    }
    root.userData.mg = [barrel(-0.44), barrel(0.44)];
  }

  function makeTrafficCar(color) {
    var g = new T.Group();
    var body = new T.Mesh(
      new T.BoxGeometry(1.85, 0.52, 3.35),
      new T.MeshStandardMaterial({ color: color, roughness: 0.42, metalness: 0.28, emissive: color, emissiveIntensity: 0.12 })
    );
    body.position.y = 0.46;
    g.add(body);
    var cabin = new T.Mesh(
      new T.BoxGeometry(1.35, 0.3, 1.25),
      new T.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.22, metalness: 0.4 })
    );
    cabin.position.set(0, 0.7, -0.08);
    g.add(cabin);
    var lamp = new T.Mesh(
      new T.BoxGeometry(1.2, 0.08, 0.06),
      new T.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffe08a, emissiveIntensity: 1.4 })
    );
    lamp.position.set(0, 0.38, -1.54);
    g.add(lamp);
    return g;
  }

  function ensureTraffic(n) {
    while (trafficPool.length < n) {
      var cols = [0xb45309, 0x1d4ed8, 0x0f766e, 0x7c3aed, 0xb91c1c, 0x365314];
      var m = makeTrafficCar(cols[trafficPool.length % cols.length]);
      m.visible = false;
      m.frustumCulled = false;
      m.scale.setScalar(1.15);
      scene.add(m);
      trafficPool.push(m);
    }
  }

  function ensureTracers(n) {
    while (tracerPool.length < n) {
      var geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute([0, 0, 0, 0, 0, 1], 3));
      var line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.92 }));
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      tracerPool.push(line);
    }
  }

  function syncTraffic(list) {
    var i, m, t;
    for (i = 0; i < trafficPool.length; i++) {
      m = trafficPool[i];
      t = list && list[i];
      if (!t || (!t.alive && !(t.wreck > 0.02))) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      if (t.color && m.children[0] && m.children[0].material && m.children[0].material.color) {
        m.children[0].material.color.setHex(t.color);
        if (m.children[0].material.emissive) m.children[0].material.emissive.setHex(t.color);
      }
      m.position.set(t.x, t.alive ? 0.02 : 0.02 + (1 - t.wreck) * 0.4, t.y);
      m.rotation.y = -t.h - Math.PI / 2;
      m.rotation.z = t.alive ? 0 : (1 - t.wreck) * 0.8;
      m.scale.setScalar(t.alive ? 1 : 0.55 + t.wreck * 0.45);
    }
  }

  function syncGuns(gun, reduce) {
    var i, line, tr, pos, mg, on;
    on = !!(gun && gun.on);
    if (carMesh && carMesh.userData.mg) {
      mg = carMesh.userData.mg;
      for (i = 0; i < mg.length; i++) {
        if (mg[i].flash) mg[i].flash.intensity = on && !reduce ? (1.6 + Math.random() * 2.2) : 0;
      }
    }
    for (i = 0; i < tracerPool.length; i++) {
      line = tracerPool[i];
      tr = gun && gun.tracers && gun.tracers[i];
      if (!tr || reduce) {
        line.visible = false;
        continue;
      }
      pos = line.geometry.attributes.position.array;
      pos[0] = tr.x; pos[1] = 0.55; pos[2] = tr.y;
      pos[3] = tr.x2; pos[4] = 0.52; pos[5] = tr.y2;
      line.geometry.attributes.position.needsUpdate = true;
      line.visible = true;
    }
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, clock.getDelta());
    var k = 1 - Math.pow(camTune.lag || 0.0004, dt);
    camera.position.x += (cam.x - camera.position.x) * k;
    camera.position.y += (cam.y - camera.position.y) * k;
    camera.position.z += (cam.z - camera.position.z) * k;
    if (Math.abs(camera.fov - camTune.fov) > 0.15) {
      camera.fov += (camTune.fov - camera.fov) * Math.min(1, k * 1.6);
      camera.updateProjectionMatrix();
    }
    camera.lookAt(look.x, look.y, look.z);
    if (carMesh) {
      var spin = Math.abs(lastSpeed) * 0.85;
      carMesh.traverse(function (ch) {
        if (ch.userData.spin) ch.rotation.x += dt * (0.4 + spin) * (lastBurnout ? 7.5 : 1);
      });
    }
    renderer.render(scene, camera);
  }

  function resize() {
    if (!ok() || !canvasEl) return;
    var w = canvasEl.clientWidth || 800, h = canvasEl.clientHeight || 480;
    if (w < 8 || h < 8) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function init(canvas) {
    T = global.THREE;
    if (!T || !canvas) return false;
    canvasEl = canvas;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(1.6, global.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x87a8c4, 0.006);
    camera = new T.PerspectiveCamera(52, 1, 0.35, 32000);
    clock = new T.Clock();
    hemi = new T.HemisphereLight(0xdce8ff, 0x2a3a28, 0.7);
    scene.add(hemi);
    sun = new T.DirectionalLight(0xffe8c8, 1.35);
    sun.position.set(-40, 80, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0008;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.camera.near = 8;
    sun.shadow.camera.far = 280;
    scene.add(sun);
    scene.add(sun.target);
    scene.add(new T.AmbientLight(0x6688aa, 0.25));
    if (global.HavenCar && HavenCar.bakeEnv) envMap = HavenCar.bakeEnv(T, renderer);
    resize();
    running = true;
    loop();
    if (global.addEventListener) global.addEventListener("resize", resize);
    return true;
  }

  global.Rally3D = {
    init: init,
    active: ok,
    resize: resize,
    setTrack: function (track) {
      if (!ok() || !track) return;
      rebuild(track);
      ensureActors();
      resetSkids();
    },
    setCam: function (tune) {
      if (!tune) return;
      if (tune.dist != null) camTune.dist = tune.dist;
      if (tune.height != null) camTune.height = tune.height;
      if (tune.view != null) camTune.view = Math.max(0, Math.min(5, tune.view | 0));
    },
    setTree: function (st) {
      if (!treeLights || !st) return;
      function set(name, on, hot) {
        var m = treeLights[name];
        if (!m || !m.material) return;
        m.material.emissiveIntensity = on ? (hot || 2.8) : 0.08;
      }
      set("preL", st.pre, 2.2); set("preR", st.pre, 2.2);
      set("stageL", st.stage, 2.4); set("stageR", st.stage, 2.4);
      set("a1L", st.a1, 3); set("a1R", st.a1, 3);
      set("a2L", st.a2, 3); set("a2R", st.a2, 3);
      set("a3L", st.a3, 3); set("a3R", st.a3, 3);
      set("greenL", st.green, 3.4); set("greenR", st.green, 3.4);
      set("redL", st.redL, 3.6); set("redR", st.redR, 3.6);
    },
    setState: function (s) {
      if (!ok() || !s || !s.car) return;
      ensureActors(s.body, s.paint);
      var c = s.car;
      carMesh.position.set(c.x, 0.02, c.y);
      carMesh.rotation.y = -c.h - Math.PI / 2;
      carMesh.rotation.z = -(c.steer || 0) * 0.08;
      lastSpeed = c.speed || 0;
      lastBurnout = !!s.burnout;
      carMesh.traverse(function (ch) {
        if (ch.userData.steer) ch.rotation.y = (c.steer || 0) * 0.42;
      });
      if (s.ghost) {
        ghostMesh.visible = true;
        ghostMesh.position.set(s.ghost.x, 0.02, s.ghost.y);
        ghostMesh.rotation.y = -s.ghost.h - Math.PI / 2;
      } else ghostMesh.visible = false;
      if (aiMesh) {
        if (s.ai) {
          aiMesh.visible = true;
          aiMesh.position.set(s.ai.x, 0.02, s.ai.y);
          aiMesh.rotation.y = -s.ai.h - Math.PI / 2;
        } else aiMesh.visible = false;
      }
      carMesh.traverse(function (ch) {
        if (ch.isLight) {
          ch.visible = true;
          return;
        }
        if ((camTune.view | 0) === 4 && ch.isMesh) {
          ch.visible = false;
          return;
        }
        if (ch.userData.fx) ch.visible = !s.reduceFx;
        else if (ch.isMesh) ch.visible = true;
      });
      if (global.HavenCar && HavenCar.setLights) {
        HavenCar.setLights(carMesh, {
          head: true,
          brake: (c.brk || 0) > 0.08,
          boost: !!s.boostOn,
          reduceFx: s.reduceFx
        });
        if (ghostMesh && ghostMesh.visible) {
          HavenCar.setLights(ghostMesh, { head: true, brake: false, ghost: true, reduceFx: true });
        }
        if (aiMesh && aiMesh.visible) {
          HavenCar.setLights(aiMesh, { head: true, brake: false, reduceFx: s.reduceFx });
        }
      }
      if (s.burnout && !s.reduceFx) {
        var bfx = Math.cos(c.h), bfz = Math.sin(c.h);
        var brx = -bfz, brz = bfx;
        var dxs = c.x - skidLast.x, dzs = c.y - skidLast.z;
        if (dxs * dxs + dzs * dzs > 0.11) {
          dropSkid(c.x - bfx * 1.18 + brx * 0.82, c.y - bfz * 1.18 + brz * 0.82, c.h, 0.85 + Math.random() * 0.35);
          dropSkid(c.x - bfx * 1.18 - brx * 0.82, c.y - bfz * 1.18 - brz * 0.82, c.h, 0.85 + Math.random() * 0.35);
          skidLast.x = c.x;
          skidLast.z = c.y;
        }
      }
      if (carMesh) {
        var boosting = !!s.boostOn && !s.reduceFx;
        carMesh.traverse(function (ch) {
          if (!ch.userData.boostFx || !ch.isMesh) return;
          if (boosting) {
            ch.scale.x = 0.75 + Math.random() * 0.55;
            ch.scale.z = 0.85 + Math.random() * 0.7;
          }
        });
      }
      syncTraffic(s.traffic);
      syncGuns(s.gun, s.reduceFx);
      if (sparkGroup) {
        var showFx = !s.reduceFx && (s.sparks || 0) > 0.25;
        sparkGroup.visible = showFx;
        if (showFx) {
          sparkGroup.position.set(c.x, 0.2, c.y);
          sparkGroup.rotation.y = -c.h - Math.PI / 2;
          var i, ch;
          for (i = 0; i < sparkGroup.children.length; i++) {
            ch = sparkGroup.children[i];
            ch.position.set(
              (i % 2 ? -0.7 : 0.7) + (i * 0.017 % 0.2),
              0.08 + (i % 5) * 0.04,
              0.9 + (i % 7) * 0.08
            );
            ch.scale.setScalar(0.4 + (s.sparks || 0) * 0.8);
          }
        }
      }
      if (sun) {
        sun.position.set(c.x - 42, 58, c.y + 24);
        sun.target.position.set(c.x, 0, c.y);
      }
      var fx = Math.cos(c.h), fz = Math.sin(c.h);
      var rx = -fz, rz = fx;
      var spd = c.speed || 0;
      var d = camTune.dist || 1;
      var ht = camTune.height || 1;
      var view = camTune.view | 0;
      var back, side;
      if (view === 1) {
        back = (7.1 + spd * 0.022) * d;
        cam.x = c.x - fx * back;
        cam.z = c.y - fz * back;
        cam.y = (2.85 + spd * 0.008) * ht;
        look.x = c.x + fx * 7;
        look.z = c.y + fz * 7;
        look.y = 0.7;
        camTune.fov = 60;
        camTune.lag = 8e-7;
      } else if (view === 2) {
        cam.x = c.x + fx * 0.55;
        cam.z = c.y + fz * 0.55;
        cam.y = 1.12 * ht;
        look.x = c.x + fx * 28;
        look.z = c.y + fz * 28;
        look.y = 0.55;
        camTune.fov = 72;
        camTune.lag = 1e-12;
      } else if (view === 3) {
        cam.x = c.x - fx * 2.35;
        cam.z = c.y - fz * 2.35;
        cam.y = 0.62 * ht;
        look.x = c.x + fx * 16;
        look.z = c.y + fz * 16;
        look.y = 0.45;
        camTune.fov = 70;
        camTune.lag = 1e-12;
      } else if (view === 4) {
        cam.x = c.x + fx * 0.12 + rx * 0.18;
        cam.z = c.y + fz * 0.12 + rz * 0.18;
        cam.y = 1.02;
        look.x = c.x + fx * 22;
        look.z = c.y + fz * 22;
        look.y = 0.85;
        camTune.fov = 78;
        camTune.lag = 1e-14;
      } else if (view === 5) {
        back = 16 * d;
        side = 11 * d;
        cam.x = c.x - fx * back + rx * side;
        cam.z = c.y - fz * back + rz * side;
        cam.y = 13.5 * ht;
        look.x = c.x + fx * 4;
        look.z = c.y + fz * 4;
        look.y = 0.6;
        camTune.fov = 46;
        camTune.lag = 0.012;
      } else {
        back = (12.4 + spd * 0.04) * d;
        cam.x = c.x - fx * back;
        cam.z = c.y - fz * back;
        cam.y = (5.4 + spd * 0.012) * ht;
        look.x = c.x + fx * 8;
        look.z = c.y + fz * 8;
        look.y = 0.8;
        camTune.fov = 52;
        camTune.lag = 0.0004;
      }
      if (carMesh) carMesh.visible = true;
      if (view !== lastView) {
        lastView = view;
        camera.position.set(cam.x, cam.y, cam.z);
        camera.fov = camTune.fov;
        camera.updateProjectionMatrix();
      }
    }
  };
})(window);
