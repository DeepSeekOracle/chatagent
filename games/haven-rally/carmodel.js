/* Haven Rally — Apex Mk I chassis. Procedural GT, PBR, garage turntable. */
(function (global) {
  "use strict";
  var envCache = null;
  var studio = {
    raf: 0, renderer: null, scene: null, camera: null, canvas: null,
    car: null, clock: null, yaw: 0.72, pitch: 0.16, drag: false, lx: 0, ly: 0
  };

  function mat(T, spec, ghost) {
    var m = new T.MeshPhysicalMaterial(spec);
    if (ghost) {
      m.transparent = true;
      m.opacity = spec.opacity != null ? spec.opacity : 0.3;
      m.depthWrite = false;
      m.emissive = new T.Color(0x4c1d95);
      m.emissiveIntensity = 0.22;
    }
    return m;
  }

  function carbonTex(T) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    var i, x, y;
    for (y = 0; y < 64; y++) {
      for (x = 0; x < 64; x++) {
        i = ((x >> 2) + (y >> 2)) & 1;
        g.fillStyle = i ? "#1a1a1a" : "#0b0b0b";
        g.fillRect(x, y, 1, 1);
      }
    }
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(8, 3);
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }

  function latticeTex(T) {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    g.fillStyle = "#0a0c10";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#4b5563";
    g.lineWidth = 2;
    var k;
    for (k = -128; k < 256; k += 10) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 128, 128); g.stroke();
      g.beginPath(); g.moveTo(k, 128); g.lineTo(k + 128, 0); g.stroke();
    }
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(2, 1.4);
    t.needsUpdate = true;
    return t;
  }

  function bakeEnv(T, renderer) {
    if (envCache) return envCache;
    var sc = new T.Scene();
    sc.background = new T.Color(0x141c28);
    var hemi = new T.HemisphereLight(0xe8f2ff, 0x1a2a28, 1.1);
    sc.add(hemi);
    function panel(col, w, h, x, y, z, rx, ry) {
      var m = new T.Mesh(
        new T.PlaneGeometry(w, h),
        new T.MeshBasicMaterial({ color: col, side: T.DoubleSide })
      );
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      sc.add(m);
    }
    panel(0x5eead4, 18, 10, -12, 6, -4, 0, 0.7);
    panel(0xfbbf24, 12, 8, 14, 5, 2, 0, -0.8);
    panel(0xffffff, 20, 8, 0, 14, 0, 1.2, 0);
    panel(0x334455, 40, 40, 0, 0, 0, -Math.PI / 2, 0);
    var pmrem = new T.PMREMGenerator(renderer);
    envCache = pmrem.fromScene(sc, 0.06).texture;
    pmrem.dispose();
    return envCache;
  }

  function bodyGeometry(T, slices) {
    var pos = [], idx = [], n = 8, i, p, s, ring;
    function ringOf(sl) {
      var w = sl.w, y0 = sl.y0, y1 = sl.y1;
      var yr = sl.yr != null ? sl.yr : y1;
      var wr = sl.wr != null ? sl.wr : w * 0.52;
      var z = sl.z;
      return [
        -w * 0.62, y0, z,
        -w, y0 + 0.07, z,
        -w, y1, z,
        -wr, yr, z,
        wr, yr, z,
        w, y1, z,
        w, y0 + 0.07, z,
        w * 0.62, y0, z
      ];
    }
    for (i = 0; i < slices.length; i++) {
      ring = ringOf(slices[i]);
      for (p = 0; p < ring.length; p++) pos.push(ring[p]);
    }
    for (s = 0; s < slices.length - 1; s++) {
      var a = s * n, b = (s + 1) * n;
      for (i = 0; i < n; i++) {
        var j = (i + 1) % n;
        idx.push(a + i, b + i, a + j);
        idx.push(a + j, b + i, b + j);
      }
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function capGeometry(T, sl, flip) {
    var w = sl.w, y0 = sl.y0, y1 = sl.y1, z = sl.z;
    var yr = sl.yr != null ? sl.yr : y1;
    var wr = sl.wr != null ? sl.wr : w * 0.52;
    var pts = [
      new T.Vector2(-w * 0.62, y0),
      new T.Vector2(-w, y0 + 0.07),
      new T.Vector2(-w, y1),
      new T.Vector2(-wr, yr),
      new T.Vector2(wr, yr),
      new T.Vector2(w, y1),
      new T.Vector2(w, y0 + 0.07),
      new T.Vector2(w * 0.62, y0)
    ];
    var sh = new T.Shape(pts);
    var g = new T.ShapeGeometry(sh);
    g.rotateY(flip ? Math.PI : 0);
    g.translate(0, 0, z);
    g.computeVertexNormals();
    return g;
  }

  function makeWheel(T, mats, y, x, z, steer) {
    var root = new T.Group();
    root.position.set(x, y, z);
    if (steer) root.userData.steer = true;
    var spin = new T.Group();
    spin.userData.spin = true;
    root.add(spin);

    var tire = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.24, 40), mats.rubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);

    var sidewall = new T.Mesh(new T.CylinderGeometry(0.335, 0.28, 0.18, 36), mats.rubberSoft);
    sidewall.rotation.z = Math.PI / 2;
    spin.add(sidewall);

    var lip = new T.Mesh(new T.CylinderGeometry(0.275, 0.275, 0.05, 32), mats.chrome);
    lip.rotation.z = Math.PI / 2;
    lip.position.x = x > 0 ? 0.08 : -0.08;
    spin.add(lip);

    var disc = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.03, 32), mats.disc);
    disc.rotation.z = Math.PI / 2;
    spin.add(disc);

    var hub = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.1, 16), mats.chrome);
    hub.rotation.z = Math.PI / 2;
    spin.add(hub);

    var si;
    for (si = 0; si < 5; si++) {
      var a = (si / 5) * Math.PI * 2;
      var spoke = new T.Mesh(new T.BoxGeometry(0.045, 0.27, 0.05), mats.chrome);
      spoke.rotation.x = a;
      spin.add(spoke);
    }

    var cal = new T.Mesh(new T.BoxGeometry(0.07, 0.1, 0.16), mats.gold);
    cal.position.set(x > 0 ? 0.1 : -0.1, 0.16, 0);
    root.add(cal);
    return root;
  }

  function build(T, opts) {
    opts = opts || {};
    var ghost = !!opts.ghost;
    var paintCol = opts.paint != null ? opts.paint : 0x165e66;
    var envMap = opts.envMap || null;
    var g = new T.Group();

    var carbon = carbonTex(T);
    var lat = latticeTex(T);
    var mats = {
      paint: mat(T, {
        color: paintCol, metalness: 0.78, roughness: 0.18, clearcoat: 1,
        clearcoatRoughness: 0.08, sheen: 0.42, sheenColor: new T.Color(0x7eeae0),
        envMap: envMap, envMapIntensity: 1.25
      }, ghost),
      dark: mat(T, { color: 0x0b0d12, metalness: 0.4, roughness: 0.45, envMap: envMap }, ghost),
      carbon: mat(T, { color: 0x222, metalness: 0.55, roughness: 0.38, map: carbon, envMap: envMap }, ghost),
      glass: mat(T, {
        color: 0x071018, metalness: 0.15, roughness: 0.04, transparent: true,
        opacity: ghost ? 0.18 : 0.52, envMap: envMap, envMapIntensity: 1.6
      }, false),
      chrome: mat(T, { color: 0x9aa3ad, metalness: 1, roughness: 0.12, envMap: envMap }, ghost),
      gold: mat(T, { color: 0xfbbf24, metalness: 0.92, roughness: 0.22, envMap: envMap }, ghost),
      rubber: mat(T, { color: 0x111111, metalness: 0.05, roughness: 0.92 }, ghost),
      rubberSoft: mat(T, { color: 0x1a1a1a, metalness: 0.04, roughness: 0.86 }, ghost),
      disc: mat(T, { color: 0x6b7280, metalness: 0.85, roughness: 0.28, envMap: envMap }, ghost),
      lattice: mat(T, { color: 0x1f2937, metalness: 0.5, roughness: 0.4, map: lat, envMap: envMap }, ghost),
      light: new T.MeshStandardMaterial({
        color: 0xdffcff, emissive: 0x5eead4, emissiveIntensity: ghost ? 0.4 : 3.4,
        roughness: 0.15, metalness: 0.2, transparent: ghost, opacity: ghost ? 0.3 : 1
      }),
      tail: new T.MeshStandardMaterial({
        color: 0x3b0000, emissive: 0xff2a2a, emissiveIntensity: ghost ? 0.2 : 1.6,
        roughness: 0.3, transparent: ghost, opacity: ghost ? 0.3 : 1
      })
    };

    var slices = [
      { z: -2.12, w: 0.16, y0: 0.16, y1: 0.34 },
      { z: -1.98, w: 0.42, y0: 0.12, y1: 0.40 },
      { z: -1.72, w: 0.78, y0: 0.10, y1: 0.46 },
      { z: -1.38, w: 0.90, y0: 0.11, y1: 0.50 },
      { z: -0.92, w: 0.94, y0: 0.12, y1: 0.54 },
      { z: -0.42, w: 0.96, y0: 0.13, y1: 0.58, yr: 0.92, wr: 0.70 },
      { z: 0.08, w: 0.95, y0: 0.13, y1: 0.60, yr: 1.10, wr: 0.68 },
      { z: 0.55, w: 0.94, y0: 0.13, y1: 0.60, yr: 1.08, wr: 0.66 },
      { z: 0.95, w: 0.93, y0: 0.13, y1: 0.56, yr: 0.78, wr: 0.72 },
      { z: 1.32, w: 0.90, y0: 0.14, y1: 0.52, yr: 0.58, wr: 0.78 },
      { z: 1.68, w: 0.84, y0: 0.16, y1: 0.50 },
      { z: 1.92, w: 0.62, y0: 0.20, y1: 0.46 },
      { z: 2.05, w: 0.34, y0: 0.24, y1: 0.42 }
    ];

    var body = new T.Mesh(bodyGeometry(T, slices), mats.paint);
    body.castShadow = !ghost;
    body.receiveShadow = true;
    g.add(body);

    var noseCap = new T.Mesh(capGeometry(T, slices[0], false), mats.paint);
    var tailCap = new T.Mesh(capGeometry(T, slices[slices.length - 1], true), mats.dark);
    g.add(noseCap, tailCap);

    var cabin = new T.Mesh(new T.BoxGeometry(1.22, 0.42, 1.35), mats.glass);
    cabin.position.set(0, 0.88, 0.12);
    cabin.rotation.x = -0.18;
    g.add(cabin);

    var windshield = new T.Mesh(new T.BoxGeometry(1.18, 0.02, 0.95), mats.glass);
    windshield.position.set(0, 0.86, -0.42);
    windshield.rotation.x = 0.72;
    g.add(windshield);

    var splitter = new T.Mesh(new T.BoxGeometry(1.72, 0.04, 0.42), mats.carbon);
    splitter.position.set(0, 0.10, -2.02);
    g.add(splitter);

    var lip = new T.Mesh(new T.BoxGeometry(1.55, 0.12, 0.08), mats.carbon);
    lip.position.set(0, 0.22, -2.16);
    g.add(lip);

    var skirtL = new T.Mesh(new T.BoxGeometry(0.08, 0.1, 2.4), mats.carbon);
    var skirtR = skirtL.clone();
    skirtL.position.set(-0.98, 0.16, 0.05);
    skirtR.position.set(0.98, 0.16, 0.05);
    g.add(skirtL, skirtR);

    var ventL = new T.Mesh(new T.BoxGeometry(0.04, 0.32, 0.7), mats.lattice);
    var ventR = ventL.clone();
    ventL.position.set(-0.97, 0.42, 0.55);
    ventR.position.set(0.97, 0.42, 0.55);
    g.add(ventL, ventR);

    var haunchL = new T.Mesh(new T.BoxGeometry(0.18, 0.28, 0.85), mats.paint);
    var haunchR = haunchL.clone();
    haunchL.position.set(-0.92, 0.48, 1.15);
    haunchR.position.set(0.92, 0.48, 1.15);
    g.add(haunchL, haunchR);

    var stripe = new T.Mesh(new T.BoxGeometry(0.025, 0.02, 3.6), mats.gold);
    stripe.position.set(0.72, 0.61, 0.05);
    var stripe2 = stripe.clone();
    stripe2.position.x = -0.72;
    g.add(stripe, stripe2);

    var wing = new T.Mesh(new T.BoxGeometry(1.85, 0.05, 0.32), mats.gold);
    wing.position.set(0, 1.12, 1.78);
    g.add(wing);
    var endL = new T.Mesh(new T.BoxGeometry(0.05, 0.28, 0.38), mats.gold);
    var endR = endL.clone();
    endL.position.set(-0.92, 1.02, 1.78);
    endR.position.set(0.92, 1.02, 1.78);
    g.add(endL, endR);
    var pylonL = new T.Mesh(new T.BoxGeometry(0.05, 0.55, 0.08), mats.gold);
    var pylonR = pylonL.clone();
    pylonL.position.set(-0.55, 0.82, 1.62);
    pylonL.rotation.x = 0.35;
    pylonR.position.set(0.55, 0.82, 1.62);
    pylonR.rotation.x = 0.35;
    g.add(pylonL, pylonR);

    var diffuser = new T.Mesh(new T.BoxGeometry(1.5, 0.08, 0.4), mats.carbon);
    diffuser.position.set(0, 0.14, 1.92);
    g.add(diffuser);
    var fi;
    for (fi = 0; fi < 5; fi++) {
      var fin = new T.Mesh(new T.BoxGeometry(0.025, 0.16, 0.36), mats.dark);
      fin.position.set(-0.5 + fi * 0.25, 0.18, 1.95);
      g.add(fin);
    }

    function lamp(x, y, z, w, h, d, m) {
      var mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      g.add(mesh);
    }
    lamp(-0.62, 0.40, -1.78, 0.38, 0.06, 0.08, mats.light);
    lamp(0.62, 0.40, -1.78, 0.38, 0.06, 0.08, mats.light);
    lamp(-0.52, 0.36, -1.88, 0.22, 0.045, 0.06, mats.light);
    lamp(0.52, 0.36, -1.88, 0.22, 0.045, 0.06, mats.light);
    lamp(-0.55, 0.48, 1.88, 0.32, 0.06, 0.05, mats.tail);
    lamp(0.55, 0.48, 1.88, 0.32, 0.06, 0.05, mats.tail);

    var grill = new T.Mesh(new T.BoxGeometry(0.7, 0.22, 0.08), mats.lattice);
    grill.position.set(0, 0.28, -2.08);
    g.add(grill);

    var mirrorL = new T.Group();
    var mArm = new T.Mesh(new T.BoxGeometry(0.18, 0.04, 0.04), mats.dark);
    mArm.position.set(-0.72, 0.72, -0.55);
    var mGlass = new T.Mesh(new T.BoxGeometry(0.16, 0.09, 0.03), mats.chrome);
    mGlass.position.set(-0.86, 0.72, -0.55);
    mirrorL.add(mArm, mGlass);
    var mirrorR = mirrorL.clone();
    mirrorR.scale.x = -1;
    g.add(mirrorL, mirrorR);

    var exhaustL = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.12, 12), mats.chrome);
    exhaustL.rotation.x = Math.PI / 2;
    exhaustL.position.set(-0.28, 0.22, 2.08);
    var exhaustR = exhaustL.clone();
    exhaustR.position.x = 0.28;
    g.add(exhaustL, exhaustR);

    var badge = new T.Mesh(new T.CircleGeometry(0.07, 16), mats.gold);
    badge.position.set(0, 0.44, -2.14);
    g.add(badge);

    var wy = 0.34;
    g.add(makeWheel(T, mats, wy, -0.82, -1.18, true));
    g.add(makeWheel(T, mats, wy, 0.82, -1.18, true));
    g.add(makeWheel(T, mats, wy, -0.84, 1.22, false));
    g.add(makeWheel(T, mats, wy, 0.84, 1.22, false));

    g.userData.apex = true;
    return g;
  }

  function closeStudio() {
    if (studio.raf) cancelAnimationFrame(studio.raf);
    studio.raf = 0;
    if (studio.canvas) {
      studio.canvas.onpointerdown = null;
      studio.canvas.onpointerup = null;
      studio.canvas.onpointermove = null;
      studio.canvas.onpointerleave = null;
      studio.canvas.onwheel = null;
    }
    if (studio.renderer) {
      try { studio.renderer.dispose(); } catch (e) { /* */ }
    }
    studio.renderer = studio.scene = studio.camera = studio.car = studio.canvas = null;
  }

  function resizeStudio() {
    if (!studio.renderer || !studio.canvas || !studio.camera) return;
    var w = studio.canvas.clientWidth || 800, h = studio.canvas.clientHeight || 480;
    if (w < 8 || h < 8) return;
    studio.renderer.setSize(w, h, false);
    studio.camera.aspect = w / h;
    studio.camera.updateProjectionMatrix();
  }

  function studioLoop() {
    if (!studio.renderer) return;
    studio.raf = requestAnimationFrame(studioLoop);
    var dt = Math.min(0.05, studio.clock.getDelta());
    if (!studio.drag) studio.yaw += dt * 0.28;
    var r = 6.4;
    var cp = Math.cos(studio.pitch), sp = Math.sin(studio.pitch);
    studio.camera.position.set(
      Math.sin(studio.yaw) * cp * r,
      1.05 + sp * r * 0.85,
      Math.cos(studio.yaw) * cp * r
    );
    studio.camera.lookAt(0, 0.42, 0);
    if (studio.car) {
      studio.car.traverse(function (ch) {
        if (ch.userData.spin) ch.rotation.x += dt * 1.2;
      });
    }
    studio.renderer.render(studio.scene, studio.camera);
  }

  function openStudio(canvas, opts) {
    closeStudio();
    var T = global.THREE;
    if (!T || !canvas) return false;
    opts = opts || {};
    studio.canvas = canvas;
    try {
      studio.renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (e) { return false; }
    studio.renderer.setPixelRatio(Math.min(1.7, global.devicePixelRatio || 1));
    studio.renderer.shadowMap.enabled = true;
    studio.renderer.toneMapping = T.ACESFilmicToneMapping;
    studio.renderer.toneMappingExposure = 1.18;
    studio.renderer.setClearColor(0x07090e, 1);
    var env = bakeEnv(T, studio.renderer);
    studio.scene = new T.Scene();
    studio.scene.background = new T.Color(0x07090e);
    studio.scene.fog = new T.FogExp2(0x07090e, 0.018);
    studio.camera = new T.PerspectiveCamera(38, 1, 0.1, 80);
    studio.clock = new T.Clock();

    studio.scene.add(new T.HemisphereLight(0xdcecff, 0x1a2420, 0.55));
    var key = new T.DirectionalLight(0xfff1dc, 2.1);
    key.position.set(4.5, 8, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    studio.scene.add(key);
    var rim = new T.DirectionalLight(0x5eead4, 1.35);
    rim.position.set(-6, 3, -4);
    studio.scene.add(rim);
    var fill = new T.DirectionalLight(0xfbbf24, 0.45);
    fill.position.set(2, 2, -6);
    studio.scene.add(fill);
    var floor = new T.Mesh(
      new T.CircleGeometry(9, 64),
      new T.MeshPhysicalMaterial({
        color: 0x0c1016, metalness: 0.85, roughness: 0.12,
        envMap: env, envMapIntensity: 0.9
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    studio.scene.add(floor);
    var ring = new T.Mesh(
      new T.RingGeometry(1.6, 2.05, 64),
      new T.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.22, side: T.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    studio.scene.add(ring);

    studio.car = build(T, { paint: opts.paint, envMap: env, ghost: false });
    studio.scene.add(studio.car);
    studio.yaw = 0.72;
    studio.pitch = 0.16;

    canvas.style.touchAction = "none";
    canvas.onpointerdown = function (e) {
      studio.drag = true;
      studio.lx = e.clientX;
      studio.ly = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    };
    canvas.onpointerup = function () { studio.drag = false; };
    canvas.onpointerleave = function () { studio.drag = false; };
    canvas.onpointermove = function (e) {
      if (!studio.drag) return;
      studio.yaw -= (e.clientX - studio.lx) * 0.006;
      studio.pitch = Math.max(-0.12, Math.min(0.55, studio.pitch + (e.clientY - studio.ly) * 0.004));
      studio.lx = e.clientX;
      studio.ly = e.clientY;
    };
    canvas.onwheel = function (e) {
      e.preventDefault();
    };

    resizeStudio();
    studioLoop();
    return true;
  }

  global.HavenCar = {
    bakeEnv: bakeEnv,
    build: build,
    openStudio: openStudio,
    closeStudio: closeStudio,
    resizeStudio: resizeStudio
  };
})(window);
