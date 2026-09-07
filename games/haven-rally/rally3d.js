/* Haven Rally 2.5D — Three.js. Gameplay stays in game.js. */
(function (global) {
  "use strict";
  if (global.Rally3D) return;
  var T = null;
  var renderer, scene, camera, clock;
  var sun, hemi, canvasEl, running = false;
  var trackRoot = null;
  var carMesh, ghostMesh, aiMesh, sparkGroup, treeLights;
  var cam = { x: 0, y: 18, z: 28 };
  var look = { x: 0, y: 1, z: 0 };
  var camTune = { dist: 1, height: 1 };
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

  function densify(path, step) {
    var out = [];
    for (var i = 0; i < path.length; i++) {
      var a = path[i], b = path[(i + 1) % path.length];
      var len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      var n = Math.max(1, Math.ceil(len / step));
      for (var k = 0; k < n; k++) {
        var t = k / n;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return out;
  }

  function ribbon(path, width, y, closed) {
    var pts = densify(path, 6);
    if (!closed && path.length) pts.push(path[path.length - 1]);
    var pos = [], uv = [], idx = [], acc = 0;
    for (var i = 0; i < pts.length; i++) {
      var prev = pts[(i - 1 + pts.length) % pts.length];
      var next = pts[(i + 1) % pts.length];
      if (!closed && i === 0) prev = pts[0];
      if (!closed && i === pts.length - 1) next = pts[i];
      var tx = next.x - prev.x, tz = next.y - prev.y;
      var len = Math.hypot(tx, tz) || 1;
      var px = -tz / len, pz = tx / len;
      if (i > 0) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      pos.push(pts[i].x + px * width, y, pts[i].y + pz * width);
      pos.push(pts[i].x - px * width, y, pts[i].y - pz * width);
      uv.push(0, acc * 0.04, 1, acc * 0.04);
      if (i > 0) {
        var b = (i - 1) * 2;
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
    var out = [], i, prev, next, tx, tz, len, px, pz;
    for (i = 0; i < path.length; i++) {
      prev = path[(i - 1 + path.length) % path.length];
      next = path[(i + 1) % path.length];
      if (!closed && i === 0) prev = path[0];
      if (!closed && i === path.length - 1) next = path[i];
      tx = next.x - prev.x; tz = next.y - prev.y;
      len = Math.hypot(tx, tz) || 1;
      px = -tz / len; pz = tx / len;
      out.push({ x: path[i].x + px * lat, y: path[i].y + pz * lat });
    }
    return out;
  }

  function themeOf(id) {
    if (id === "coral-coast") return { sky: 0x7ec4ee, fog: 0xb8dcee, ground: 0x2a6a4a, road: 0x3a3a42, dusk: false };
    if (id === "singularity-ring") return { sky: 0x140c28, fog: 0x241848, ground: 0x12101c, road: 0x2a2440, dusk: true };
    if (id === "endless") return { sky: 0x4a6080, fog: 0x6a8098, ground: 0x243428, road: 0x33383e, dusk: false };
    if (id === "drag-strip") return { sky: 0x151c28, fog: 0x243044, ground: 0x1a2018, road: 0x2c2e32, dusk: true };
    return { sky: 0x6ea8d0, fog: 0x8eb8d4, ground: 0x1c4a2c, road: 0x2e3238, dusk: false };
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
    scene.background = new T.Color(th.sky);
    scene.fog.color.setHex(th.fog);
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
    var half = track.width || laneW * 1.5;
    var strip = new T.Mesh(
      new T.BoxGeometry(total + 8, 0.14, half * 2 + 4),
      new T.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.78, metalness: 0.08 })
    );
    strip.position.set(total * 0.5, 0.02, 0);
    strip.receiveShadow = true;
    trackRoot.add(strip);
    var laneMat = new T.MeshStandardMaterial({ color: 0x32343a, roughness: 0.7 });
    var li, laneMesh;
    for (li = -1; li <= 1; li++) {
      laneMesh = new T.Mesh(new T.BoxGeometry(total + 6, 0.02, laneW - 0.25), laneMat);
      laneMesh.position.set(total * 0.5, 0.1, li * laneW);
      trackRoot.add(laneMesh);
    }
    function stripe(x, w, z, col) {
      var s = new T.Mesh(new T.BoxGeometry(w, 0.04, 0.16), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.2 }));
      s.position.set(x, 0.14, z);
      trackRoot.add(s);
    }
    var d;
    for (d = 8; d < total; d += 8) {
      stripe(d, 2.2, -laneW * 0.5, 0xf8fafc);
      stripe(d, 2.2, laneW * 0.5, 0xf8fafc);
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
      pole.position.set(i + 10, 5.5, -11);
      lamp = new T.Mesh(new T.BoxGeometry(1.6, 0.2, 0.6), new T.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe08a, emissiveIntensity: 1.4 }));
      lamp.position.set(i + 10, 11.1, -10.2);
      trackRoot.add(pole, lamp);
      if (nFlood < 7) {
        var light = new T.PointLight(0xffe8c0, 1.05, 52, 2);
        light.position.set(i + 10, 10.5, -8);
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

  function makeCar(color, ghost) {
    if (global.HavenCar && HavenCar.build) {
      return HavenCar.build(T, { paint: color, ghost: ghost, envMap: envMap });
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
    return g;
  }

  function rebuild(track) {
    if (trackRoot) {
      scene.remove(trackRoot);
      trackRoot.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    }
    trackRoot = new T.Group();
    scene.add(trackRoot);
    if (track.kind === "drag") {
      buildDrag(track);
      return;
    }
    var th = themeOf(track.theme);
    scene.background = new T.Color(th.sky);
    scene.fog.color.setHex(th.fog);
    scene.fog.density = th.dusk ? 0.0048 : 0.0035;
    var ground = new T.Mesh(
      new T.PlaneGeometry(900, 900),
      new T.MeshStandardMaterial({ color: th.ground, roughness: 0.96 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.4;
    ground.receiveShadow = true;
    trackRoot.add(ground);
    var shoulder = new T.Mesh(
      ribbon(track.pts, track.width + 4.5, 0.02, true),
      new T.MeshStandardMaterial({ color: 0x3a4a32, roughness: 1 })
    );
    shoulder.receiveShadow = true;
    trackRoot.add(shoulder);
    var road = new T.Mesh(
      ribbon(track.pts, track.width, 0.08, true),
      new T.MeshStandardMaterial({ color: th.road, roughness: 0.72, metalness: 0.08 })
    );
    road.receiveShadow = true;
    trackRoot.add(road);
    var laneW = track.laneW || (track.width * 2 / 3);
    var paint = new T.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55, emissive: 0x334155, emissiveIntensity: 0.12 });
    var edge = new T.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.45, emissive: 0x664400, emissiveIntensity: 0.2 });
    trackRoot.add(new T.Mesh(ribbon(offsetPath(track.pts, laneW * 0.5, true), 0.07, 0.11, true), paint));
    trackRoot.add(new T.Mesh(ribbon(offsetPath(track.pts, -laneW * 0.5, true), 0.07, 0.11, true), paint));
    trackRoot.add(new T.Mesh(ribbon(offsetPath(track.pts, track.width - 0.12, true), 0.09, 0.115, true), edge));
    trackRoot.add(new T.Mesh(ribbon(offsetPath(track.pts, -(track.width - 0.12), true), 0.09, 0.115, true), edge));
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
    var dummy = new T.Object3D();
    var nTree = Math.min(90, track.pts.length);
    var trunk = new T.InstancedMesh(new T.CylinderGeometry(0.18, 0.28, 2.4, 5), new T.MeshStandardMaterial({ color: 0x4a331c }), nTree);
    var crown = new T.InstancedMesh(new T.ConeGeometry(1.4, 3.2, 6), new T.MeshStandardMaterial({ color: 0x1a5c32, flatShading: true }), nTree);
    trunk.castShadow = crown.castShadow = true;
    for (var i = 0; i < nTree; i++) {
      var p = track.pts[(i * 3) % track.pts.length];
      var q = track.pts[(i * 3 + 1) % track.pts.length];
      var tx = q.x - p.x, tz = q.y - p.y;
      var len = Math.hypot(tx, tz) || 1;
      var side = i % 2 ? 1 : -1;
      var x = p.x + (-tz / len) * (track.width + 7 + (i % 5)) * side;
      var z = p.y + (tx / len) * (track.width + 7 + (i % 5)) * side;
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
  }

  function ensureActors() {
    if (!carMesh) {
      carMesh = makeCar(0x165e66, false);
      scene.add(carMesh);
      ghostMesh = makeCar(0xc084fc, true);
      ghostMesh.visible = false;
      scene.add(ghostMesh);
    }
    if (!aiMesh) {
      aiMesh = makeCar(0xb45309, false);
      aiMesh.visible = false;
      scene.add(aiMesh);
    }
    if (sparkGroup) return;
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

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, clock.getDelta());
    var k = 1 - Math.pow(0.0004, dt);
    camera.position.x += (cam.x - camera.position.x) * k;
    camera.position.y += (cam.y - camera.position.y) * k;
    camera.position.z += (cam.z - camera.position.z) * k;
    camera.lookAt(look.x, look.y, look.z);
    if (carMesh) {
      var spin = Math.abs(lastSpeed) * 0.85;
      carMesh.traverse(function (ch) {
        if (ch.userData.spin) ch.rotation.x += dt * (0.4 + spin);
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
    camera = new T.PerspectiveCamera(52, 1, 0.8, 2200);
    clock = new T.Clock();
    hemi = new T.HemisphereLight(0xdce8ff, 0x2a3a28, 0.7);
    scene.add(hemi);
    sun = new T.DirectionalLight(0xffe8c8, 1.35);
    sun.position.set(-40, 80, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
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
    },
    setCam: function (tune) {
      if (!tune) return;
      if (tune.dist != null) camTune.dist = tune.dist;
      if (tune.height != null) camTune.height = tune.height;
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
      ensureActors();
      var c = s.car;
      carMesh.position.set(c.x, 0.02, c.y);
      carMesh.rotation.y = -c.h - Math.PI / 2;
      carMesh.rotation.z = -(c.steer || 0) * 0.08;
      lastSpeed = c.speed || 0;
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
        if (ch.userData.fx) ch.visible = !s.reduceFx;
      });
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
      var back = (12.4 + (c.speed || 0) * 0.04) * (camTune.dist || 1);
      cam.x = c.x - Math.cos(c.h) * back;
      cam.z = c.y - Math.sin(c.h) * back;
      cam.y = (5.4 + (c.speed || 0) * 0.012) * (camTune.height || 1);
      look.x = c.x + Math.cos(c.h) * 8;
      look.z = c.y + Math.sin(c.h) * 8;
      look.y = 0.8;
    }
  };
})(window);
