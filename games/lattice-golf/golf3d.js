/* Lattice Golf 2.5D / 3D course — Three.js renderer. Gameplay stays in game.js. */
(function (global) {
  "use strict";
  if (global.Golf3D) return;

  var T = null;
  var renderer, scene, camera, clock;
  var sun, hemi;
  var holeRoot = null;
  var ballMesh, ballShadow, markerMesh, flagPole, flagCloth;
  var aimLine, carryRing, windPip, trailLine;
  var pickPlane;
  var raycaster, pointer;
  var canvasEl = null;
  var running = false;
  var holeKey = "";
  var courseId = "";
  var cam = { x: 0, y: 55, z: 80, lx: 0, ly: 0, lz: 0 };
  var camGoal = { x: 0, y: 55, z: 80, lx: 0, ly: 0, lz: 0 };
  var tex = {};
  var windAng = 0;
  var windMph = 0;

  function ok() {
    return !!(renderer && scene && camera);
  }

  function noiseTex(w, h, fn) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var g = c.getContext("2d");
    var img = g.createImageData(w, h);
    var d = img.data;
    for (var i = 0; i < w * h; i++) {
      var x = i % w, y = (i / w) | 0;
      var col = fn(x, y, x / w, y / h);
      var o = i * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }

  function makeTextures() {
    tex.grass = noiseTex(256, 256, function (x, y) {
      var n = ((x * 13 + y * 7) % 17) + ((x * 3) ^ (y * 5)) % 11;
      return [28 + n, 78 + n * 1.4, 36 + n * 0.6];
    });
    tex.grass.repeat.set(28, 28);
    tex.fair = noiseTex(256, 256, function (x, y) {
      var n = ((x * 9 + y * 4) % 13);
      return [42 + n, 130 + n, 62 + n * 0.5];
    });
    tex.fair.repeat.set(18, 18);
    tex.green = noiseTex(128, 128, function (x, y) {
      var n = (x + y) % 9;
      return [36 + n, 150 + n, 70];
    });
    tex.sand = noiseTex(128, 128, function (x, y) {
      var n = ((x * 5) ^ y) % 18;
      return [196 + n, 168 + n * 0.6, 108];
    });
    tex.water = noiseTex(256, 256, function (x, y, u, v) {
      var w = 90 + Math.sin(u * 18) * 18 + Math.cos(v * 14) * 12;
      return [20, 70 + w * 0.25, 110 + w * 0.35];
    });
    tex.water.repeat.set(4, 4);
  }

  function densify(path, step) {
    var out = [];
    for (var i = 0; i < path.length - 1; i++) {
      var a = path[i], b = path[i + 1];
      var len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      var n = Math.max(1, Math.ceil(len / step));
      for (var k = 0; k < n; k++) {
        var t = k / n;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    out.push(path[path.length - 1]);
    return out;
  }

  function ribbonGeo(path, width, y) {
    var pts = densify(path, 10);
    var pos = [];
    var uv = [];
    var idx = [];
    var distAcc = 0;
    for (var i = 0; i < pts.length; i++) {
      var prev = pts[Math.max(0, i - 1)];
      var next = pts[Math.min(pts.length - 1, i + 1)];
      var tx = next.x - prev.x, tz = next.y - prev.y;
      var len = Math.hypot(tx, tz) || 1;
      var px = -tz / len, pz = tx / len;
      if (i > 0) distAcc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      pos.push(pts[i].x + px * width, y, pts[i].y + pz * width);
      pos.push(pts[i].x - px * width, y, pts[i].y - pz * width);
      uv.push(0, distAcc * 0.04, 1, distAcc * 0.04);
      if (i > 0) {
        var b = (i - 1) * 2;
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function mat(opts) {
    return new T.MeshStandardMaterial(opts);
  }

  function themeOf(id) {
    if (id === "coral-lattice") {
      return { sky: 0x8ec8e8, fog: 0xb8dcee, grass: 0x3a8a62, fair: 0x55c07a, dusk: false, sun: 0xffe6c4 };
    }
    if (id === "singularity-nine") {
      return { sky: 0x1c1838, fog: 0x2a2458, grass: 0x16382c, fair: 0x2a6b4c, dusk: true, sun: 0xc4b0ff };
    }
    if (id === "endless") {
      return { sky: 0x4a6a88, fog: 0x6a8899, grass: 0x245434, fair: 0x3d8a55, dusk: false, sun: 0xffd9a0 };
    }
    return { sky: 0x6ea8d0, fog: 0x8eb8d4, grass: 0x2c6a3c, fair: 0x3ea05a, dusk: false, sun: 0xffe8c8 };
  }

  function rebuild(hole, cid) {
    if (!ok() || !hole) return;
    courseId = cid || courseId;
    var th = themeOf(courseId);
    scene.background = new T.Color(th.sky);
    scene.fog.color.setHex(th.fog);
    scene.fog.density = th.dusk ? 0.0034 : 0.002;
    if (hemi) hemi.color.setHex(th.dusk ? 0x8899dd : 0xe8f0ff);
    if (sun) sun.color.setHex(th.sun);

    if (holeRoot) {
      scene.remove(holeRoot);
      holeRoot.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
      });
    }
    holeRoot = new T.Group();
    scene.add(holeRoot);

    var span = 900;
    var ground = new T.Mesh(
      new T.PlaneGeometry(span * 2, span * 2, 40, 40),
      mat({ map: tex.grass, color: th.grass, roughness: 0.92, metalness: 0.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    holeRoot.add(ground);

    var rough = new T.Mesh(
      ribbonGeo(hole.path, hole.fairW + 36, 0.02),
      mat({ color: 0x1d4d2e, roughness: 0.95 })
    );
    rough.receiveShadow = true;
    holeRoot.add(rough);

    var fair = new T.Mesh(
      ribbonGeo(hole.path, hole.fairW, 0.08),
      mat({ map: tex.fair, color: th.fair, roughness: 0.82, metalness: 0.02 })
    );
    fair.receiveShadow = true;
    holeRoot.add(fair);

    var green = new T.Mesh(
      new T.CircleGeometry(hole.greenR, 32),
      mat({ map: tex.green, color: 0x4cce72, roughness: 0.7 })
    );
    green.rotation.x = -Math.PI / 2;
    green.position.set(hole.pin.x, 0.12, hole.pin.y);
    green.receiveShadow = true;
    holeRoot.add(green);

    var collar = new T.Mesh(
      new T.RingGeometry(hole.greenR * 0.98, hole.greenR * 1.22, 32),
      mat({ color: 0x2a6b3c, roughness: 0.9 })
    );
    collar.rotation.x = -Math.PI / 2;
    collar.position.set(hole.pin.x, 0.1, hole.pin.y);
    holeRoot.add(collar);

    var tee = new T.Mesh(
      new T.BoxGeometry(8, 0.3, 8),
      mat({ color: 0x3f8f54, roughness: 0.8 })
    );
    tee.position.set(hole.tee.x, 0.2, hole.tee.y);
    tee.castShadow = true;
    holeRoot.add(tee);

    (hole.water || []).forEach(function (w) {
      var m = new T.Mesh(
        new T.PlaneGeometry(w.w, w.h),
        new T.MeshPhysicalMaterial({
          color: 0x1a6a9a,
          metalness: 0.15,
          roughness: 0.18,
          transparent: true,
          opacity: 0.88,
          map: tex.water,
        })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(w.x + w.w / 2, 0.04, w.y + w.h / 2);
      holeRoot.add(m);
    });

    (hole.bunkers || []).forEach(function (b) {
      var m = new T.Mesh(
        new T.CircleGeometry(b.r, 18),
        mat({ map: tex.sand, color: 0xe7d3a1, roughness: 1, metalness: 0 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(b.x, 0.06, b.y);
      m.receiveShadow = true;
      holeRoot.add(m);
      var bowl = new T.Mesh(
        new T.RingGeometry(b.r * 0.82, b.r, 18),
        mat({ color: 0x7a5c28, roughness: 1 })
      );
      bowl.rotation.x = -Math.PI / 2;
      bowl.position.set(b.x, 0.07, b.y);
      holeRoot.add(bowl);
    });

    var trees = hole.trees || [];
    var nTree = Math.min(trees.length, 220);
    if (nTree) {
      var trunkGeo = new T.CylinderGeometry(0.45, 0.7, 4.2, 5);
      var crownGeo = new T.IcosahedronGeometry(2.4, 0);
      var trunkMat = mat({ color: 0x4a331c, roughness: 0.95 });
      var crownMat = mat({ color: 0x166534, roughness: 0.78 });
      var trunks = new T.InstancedMesh(trunkGeo, trunkMat, nTree);
      var crowns = new T.InstancedMesh(crownGeo, crownMat, nTree);
      trunks.castShadow = crowns.castShadow = true;
      var dummy = new T.Object3D();
      var color = new T.Color();
      for (var i = 0; i < nTree; i++) {
        var tr = trees[i];
        var s = Math.max(0.7, (tr.r || 5) / 4.2);
        dummy.position.set(tr.x, 2.1 * s, tr.y);
        dummy.scale.set(s, s * (1.1 + (i % 5) * 0.08), s);
        dummy.rotation.y = i * 0.7;
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        dummy.position.y = 4.6 * s;
        dummy.scale.set(s * 1.6, s * 1.5, s * 1.6);
        dummy.updateMatrix();
        crowns.setMatrixAt(i, dummy.matrix);
        color.setHSL(0.28 + (i % 7) * 0.012, 0.55, 0.28 + (i % 5) * 0.03);
        crowns.setColorAt(i, color);
      }
      trunks.instanceMatrix.needsUpdate = true;
      crowns.instanceMatrix.needsUpdate = true;
      if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
      holeRoot.add(trunks);
      holeRoot.add(crowns);
    }

    (hole.path || []).forEach(function (p, i) {
      if (i === 0 || i === hole.path.length - 1) return;
      var pip = new T.Mesh(new T.SphereGeometry(1.1, 10, 8), mat({ color: 0xfbbf24, emissive: 0x664400, roughness: 0.4 }));
      pip.position.set(p.x, 1.4, p.y);
      holeRoot.add(pip);
    });

    var cup = new T.Mesh(new T.CircleGeometry(1.05, 16), mat({ color: 0x111111, roughness: 1, metalness: 0.2 }));
    cup.rotation.x = -Math.PI / 2;
    cup.position.set(hole.pin.x, 0.14, hole.pin.y);
    holeRoot.add(cup);

    flagPole = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 9, 6), mat({ color: 0xf8fafc, metalness: 0.4, roughness: 0.3 }));
    flagPole.position.set(hole.pin.x, 4.6, hole.pin.y);
    flagPole.castShadow = true;
    holeRoot.add(flagPole);
    flagCloth = new T.Mesh(new T.PlaneGeometry(4.2, 2.2), mat({ color: 0xef4444, side: T.DoubleSide, roughness: 0.55 }));
    flagCloth.position.set(hole.pin.x + 2.1, 8.2, hole.pin.y);
    holeRoot.add(flagCloth);

    pickPlane = new T.Mesh(
      new T.PlaneGeometry(span * 2, span * 2),
      new T.MeshBasicMaterial({ visible: false })
    );
    pickPlane.rotation.x = -Math.PI / 2;
    holeRoot.add(pickPlane);

    fitCamera(hole);
  }

  function fitCamera(hole) {
    var minx = hole.tee.x, maxx = hole.tee.x, minz = hole.tee.y, maxz = hole.tee.y;
    (hole.path || []).forEach(function (p) {
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x);
      minz = Math.min(minz, p.y); maxz = Math.max(maxz, p.y);
    });
    var cx = (minx + maxx) / 2;
    var cz = (minz + maxz) / 2;
    var span = Math.max(maxx - minx, maxz - minz, 80);
    camGoal.x = cx - span * 0.18;
    camGoal.y = Math.min(140, 28 + span * 0.38);
    camGoal.z = cz + span * 0.52;
    camGoal.lx = cx;
    camGoal.ly = 0;
    camGoal.lz = cz;
    cam.x = camGoal.x; cam.y = camGoal.y; cam.z = camGoal.z;
    cam.lx = camGoal.lx; cam.ly = camGoal.ly; cam.lz = camGoal.lz;
  }

  function followShot(ball) {
    if (!ball) return;
    var dx = (camGoal.lx - camGoal.x) || 1;
    var dz = (camGoal.lz - camGoal.z) || 1;
    camGoal.x = ball.x - dx * 0.15 - 18;
    camGoal.y = 22 + (ball.z || 0) * 0.35;
    camGoal.z = ball.y + 34;
    camGoal.lx = ball.x;
    camGoal.ly = (ball.z || 0) * 0.4;
    camGoal.lz = ball.y;
  }

  function ensureActors() {
    if (ballMesh) return;
    ballMesh = new T.Mesh(
      new T.SphereGeometry(0.85, 18, 14),
      mat({ color: 0xf4f7f2, roughness: 0.35, metalness: 0.05 })
    );
    ballMesh.castShadow = true;
    scene.add(ballMesh);
    ballShadow = new T.Mesh(
      new T.CircleGeometry(1.3, 12),
      new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    ballShadow.rotation.x = -Math.PI / 2;
    scene.add(ballShadow);
    markerMesh = new T.Mesh(
      new T.ConeGeometry(1.6, 3.2, 8),
      mat({ color: 0x5eead4, emissive: 0x0b3d38, roughness: 0.4 })
    );
    scene.add(markerMesh);
    windPip = new T.Mesh(
      new T.SphereGeometry(1.15, 12, 10),
      mat({ color: 0xc084fc, emissive: 0x4c1d95, roughness: 0.35 })
    );
    scene.add(windPip);
    var ringGeo = new T.RingGeometry(0.9, 1.05, 48);
    carryRing = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.35, side: T.DoubleSide }));
    carryRing.rotation.x = -Math.PI / 2;
    scene.add(carryRing);
    var lg = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
    aimLine = new T.Line(lg, new T.LineDashedMaterial({ color: 0x5eead4, dashSize: 3, gapSize: 2.2, transparent: true, opacity: 0.8 }));
    scene.add(aimLine);
    var tg = new T.BufferGeometry().setFromPoints(new Array(20).fill(0).map(function () { return new T.Vector3(); }));
    trailLine = new T.Line(tg, new T.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.45 }));
    scene.add(trailLine);
  }

  function updateActors(s) {
    ensureActors();
    var b = s.ball || { x: 0, y: 0 };
    var lift = (b.z || 0) * 0.42;
    ballMesh.position.set(b.x, 0.9 + lift, b.y);
    ballShadow.position.set(b.x, 0.16, b.y);
    ballShadow.scale.setScalar(1 + lift * 0.04);
    ballShadow.material.opacity = Math.max(0.08, 0.28 - lift * 0.006);
    if (s.marker) {
      markerMesh.visible = true;
      markerMesh.position.set(s.marker.x, 2.2, s.marker.y);
      markerMesh.rotation.y += 0.02;
      var pts = [new T.Vector3(b.x, 0.4, b.y), new T.Vector3(s.marker.x, 0.4, s.marker.y)];
      aimLine.geometry.setFromPoints(pts);
      aimLine.computeLineDistances();
      aimLine.visible = true;
    } else {
      markerMesh.visible = false;
      aimLine.visible = false;
    }
    var reach = s.carry || 0;
    carryRing.visible = reach > 2;
    if (reach > 2) {
      carryRing.position.set(b.x, 0.18, b.y);
      carryRing.scale.set(reach, reach, 1);
    }
    if (s.pred && s.pred.dest) {
      windPip.visible = true;
      windPip.position.set(s.pred.dest.x, 1.2, s.pred.dest.y);
      windPip.material.color.setHex(s.pred.blocked ? 0xf87171 : 0xc084fc);
    } else windPip.visible = false;
    var trail = s.trail || [];
    if (trail.length > 1) {
      var tp = trail.map(function (t) {
        return new T.Vector3(t.x, 0.9 + (t.z || 0) * 0.42, t.y);
      });
      trailLine.geometry.setFromPoints(tp);
      trailLine.visible = true;
    } else trailLine.visible = false;
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, clock.getDelta());
    if (tex.water) {
      tex.water.offset.x += dt * 0.03;
      tex.water.offset.y += dt * 0.018;
    }
    if (flagCloth) {
      flagCloth.rotation.y = Math.sin(clock.elapsedTime * 2.2 + windMph) * 0.25 + windAng * 0.15;
      flagCloth.position.x = (flagPole ? flagPole.position.x : 0) + 2.1 * Math.cos(flagCloth.rotation.y * 0.4);
    }
    var k = 1 - Math.pow(0.001, dt);
    cam.x += (camGoal.x - cam.x) * k;
    cam.y += (camGoal.y - cam.y) * k;
    cam.z += (camGoal.z - cam.z) * k;
    cam.lx += (camGoal.lx - cam.lx) * k;
    cam.ly += (camGoal.ly - cam.ly) * k;
    cam.lz += (camGoal.lz - cam.lz) * k;
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(cam.lx, cam.ly, cam.lz);
    renderer.render(scene, camera);
  }

  function resize() {
    if (!ok() || !canvasEl) return;
    var w = canvasEl.clientWidth || 800;
    var h = canvasEl.clientHeight || 480;
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
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (e) {
      return false;
    }
    renderer.setPixelRatio(Math.min(1.75, global.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x87a8c4, 0.0022);
    camera = new T.PerspectiveCamera(44, 1, 0.6, 5000);
    clock = new T.Clock();
    raycaster = new T.Raycaster();
    pointer = new T.Vector2();
    makeTextures();

    hemi = new T.HemisphereLight(0xdce8ff, 0x3a4a28, 0.72);
    scene.add(hemi);
    sun = new T.DirectionalLight(0xffe8c8, 1.35);
    sun.position.set(-80, 140, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 600;
    sun.shadow.camera.left = -220;
    sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220;
    sun.shadow.camera.bottom = -220;
    sun.shadow.bias = -0.00025;
    scene.add(sun);
    scene.add(new T.AmbientLight(0x6688aa, 0.22));

    var sky = new T.Mesh(
      new T.SphereGeometry(1800, 24, 16),
      new T.MeshBasicMaterial({ color: 0x7eb4d8, side: T.BackSide, fog: false })
    );
    scene.add(sky);

    resize();
    running = true;
    loop();
    if (global.addEventListener) global.addEventListener("resize", resize);
    return true;
  }

  global.Golf3D = {
    init: init,
    active: ok,
    resize: resize,
    setHole: function (hole, cid) {
      if (!ok() || !hole) return;
      var key = hole.name + "|" + hole.yards + "|" + hole.tee.x + "|" + hole.pin.x;
      if (key === holeKey && cid === courseId) return;
      holeKey = key;
      rebuild(hole, cid);
    },
    setState: function (s) {
      if (!ok() || !s || !s.hole) return;
      this.setHole(s.hole, s.courseId);
      windAng = (s.wind && s.wind.ang) || 0;
      windMph = (s.wind && s.wind.mph) || 0;
      updateActors(s);
      if (s.flying) followShot(s.ball);
      else if (s.hole) fitCamera(s.hole);
    },
    pick: function (clientX, clientY) {
      if (!ok() || !canvasEl || !pickPlane) return null;
      var r = canvasEl.getBoundingClientRect();
      pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObject(pickPlane, false);
      if (!hits.length) return null;
      return { x: hits[0].point.x, y: hits[0].point.z };
    },
    fit: function (hole) {
      if (hole) fitCamera(hole);
    }
  };
})(window);
