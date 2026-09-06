/* Haven Rally 2.5D — Three.js. Gameplay stays in game.js. */
(function (global) {
  "use strict";
  if (global.Rally3D) return;
  var T = null;
  var renderer, scene, camera, clock;
  var sun, hemi, canvasEl, running = false;
  var trackRoot = null;
  var carMesh, ghostMesh, sparkGroup;
  var cam = { x: 0, y: 18, z: 28 };
  var look = { x: 0, y: 1, z: 0 };

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

  function themeOf(id) {
    if (id === "coral-coast") return { sky: 0x7ec4ee, fog: 0xb8dcee, ground: 0x2a6a4a, road: 0x3a3a42, dusk: false };
    if (id === "singularity-ring") return { sky: 0x140c28, fog: 0x241848, ground: 0x12101c, road: 0x2a2440, dusk: true };
    if (id === "endless") return { sky: 0x4a6080, fog: 0x6a8098, ground: 0x243428, road: 0x33383e, dusk: false };
    return { sky: 0x6ea8d0, fog: 0x8eb8d4, ground: 0x1c4a2c, road: 0x2e3238, dusk: false };
  }

  function makeCar(color, ghost) {
    var g = new T.Group();
    var body = new T.Mesh(
      new T.BoxGeometry(1.7, 0.42, 3.2),
      new T.MeshStandardMaterial({
        color: color, roughness: 0.38, metalness: 0.45,
        transparent: !!ghost, opacity: ghost ? 0.38 : 1
      })
    );
    body.position.y = 0.42;
    body.castShadow = !ghost;
    var cabin = new T.Mesh(
      new T.BoxGeometry(1.35, 0.38, 1.2),
      new T.MeshStandardMaterial({ color: 0x111827, roughness: 0.25, metalness: 0.6, transparent: !!ghost, opacity: ghost ? 0.35 : 1 })
    );
    cabin.position.set(0, 0.72, -0.15);
    var wing = new T.Mesh(
      new T.BoxGeometry(1.9, 0.08, 0.45),
      new T.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 })
    );
    wing.position.set(0, 0.62, 1.35);
    g.add(body, cabin, wing);
    for (var i = 0; i < 4; i++) {
      var w = new T.Mesh(
        new T.CylinderGeometry(0.28, 0.28, 0.22, 10),
        new T.MeshStandardMaterial({ color: 0x111, roughness: 0.8 })
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(i < 2 ? -0.85 : 0.85, 0.28, i % 2 ? 1.05 : -1.05);
      w.userData.wheel = true;
      g.add(w);
    }
    return g;
  }

  function rebuild(track) {
    if (trackRoot) {
      scene.remove(trackRoot);
      trackRoot.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    }
    trackRoot = new T.Group();
    scene.add(trackRoot);
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
    var line = new T.Mesh(
      ribbon(track.pts, 0.18, 0.1, true),
      new T.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x664400, roughness: 0.4 })
    );
    trackRoot.add(line);
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
    if (carMesh) return;
    carMesh = makeCar(0x5eead4, false);
    scene.add(carMesh);
    ghostMesh = makeCar(0xc084fc, true);
    ghostMesh.visible = false;
    scene.add(ghostMesh);
    sparkGroup = new T.Group();
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
      carMesh.children.forEach(function (ch) {
        if (ch.userData.wheel) ch.rotation.x += dt * 14;
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
    setState: function (s) {
      if (!ok() || !s || !s.car) return;
      ensureActors();
      var c = s.car;
      carMesh.position.set(c.x, 0.14, c.y);
      carMesh.rotation.y = -c.h + Math.PI / 2;
      carMesh.rotation.z = (c.steer || 0) * 0.16;
      if (s.ghost) {
        ghostMesh.visible = true;
        ghostMesh.position.set(s.ghost.x, 0.08, s.ghost.y);
        ghostMesh.rotation.y = -s.ghost.h + Math.PI / 2;
      } else ghostMesh.visible = false;
      var back = 11 + (c.speed || 0) * 0.04;
      cam.x = c.x - Math.cos(c.h) * back;
      cam.z = c.y - Math.sin(c.h) * back;
      cam.y = 5.4 + (c.speed || 0) * 0.012;
      look.x = c.x + Math.cos(c.h) * 8;
      look.z = c.y + Math.sin(c.h) * 8;
      look.y = 0.8;
    }
  };
})(window);
