/* LYGO Arena — one attack language per kit.
   The sim still resolves the shared move shapes. What a spectator sees and hears is stamped
   per fighter: a name, a drawn swing, and a sound file. Nothing here changes damage. */
(function (w) {
  "use strict";

  const KITS = {
    kael: {
      atk: { vis: "shard", sfx: "kael_shard" },
      rend: { vis: "slash", sfx: "kael_rend" },
      shieldwall: { vis: "ward", sfx: "kael_wall", name: "Door Teeth", text: "The first tooth of the lock comes up, and every eye turns." },
      charge: { vis: "charge", sfx: "kael_charge", name: "Gallant Charge", text: "He crosses the ring and the strike lands with the last stride." }
    },
    vale: {
      atk: { vis: "cleave", sfx: "vale_cleave" },
      cover: { vis: "ward", sfx: "vale_cover", name: "Aegis Cover", text: "Her shield leaves her arm and sits on the ally who needs it." },
      bulwark: { vis: "ward", sfx: "vale_line", name: "Line Bulwark", text: "The second circle hardens everyone standing in her shadow." },
      shieldwall: { vis: "ward", sfx: "vale_wall", name: "Aegis Wall", text: "She plants the wall and dares the other team to swing at it." }
    },
    orin: {
      atk: { vis: "sigil", sfx: "orin_sigil" },
      unwrite: { vis: "blast", sfx: "orin_unwrite" },
      resonance: { vis: "flask", sfx: "orin_flask", name: "Name Flask", text: "A black-sigil flask breaks and the names inside bite." },
      chorusflask: { vis: "heal", sfx: "orin_drink", name: "Sigil Drink", text: "One careful sip. The glass remembers who is hurt." }
    },
    nia: {
      atk: { vis: "arrow", sfx: "nia_arrow" },
      pinvolley: { vis: "rain", sfx: "nia_pin" },
      dash: { vis: "charge", sfx: "nia_dash", name: "Path Dash", text: "The corridor shortens under her feet." },
      needlerain: { vis: "rain", sfx: "nia_rain", name: "Path Rain", text: "A fan of path-arrows. Each one keeps going." }
    },
    lyra: {
      atk: { vis: "note", sfx: "lyra_note" },
      hymn: { vis: "howl", sfx: "lyra_hymn" },
      chorus: { vis: "heal", sfx: "lyra_chorus" },
      weavebloom: { vis: "bloom", sfx: "lyra_bloom", name: "Spiral Bloom", text: "A verse takes root and the line grows back." }
    },
    arkos: {
      atk: { vis: "thrust", sfx: "arkos_thrust" },
      geodesic: { vis: "stone", sfx: "arkos_geo" },
      trueline: { vis: "beam", sfx: "arkos_line" },
      dash: { vis: "charge", sfx: "arkos_step", name: "Lance Step", text: "The spear leads. The feet agree." }
    },
    d9ra: {
      atk: { vis: "fist", sfx: "d9ra_fist" },
      shockwave: { vis: "quake", sfx: "d9ra_shock" },
      wolffury: { vis: "rage", sfx: "d9ra_fury" },
      charge: { vis: "charge", sfx: "d9ra_rush", name: "Monk Rush", text: "Fists first, across whatever distance is left." }
    },
    srath: {
      atk: { vis: "needle", sfx: "srath_needle" },
      doublespeak: { vis: "veil", sfx: "srath_veil" },
      needlerain: { vis: "rain", sfx: "srath_rain", name: "Shadow Rain", text: "Needles from the angle you were not watching." },
      dash: { vis: "charge", sfx: "srath_step", name: "Needle Step", text: "She is already past the spot you aimed at." }
    },
    kairos: {
      atk: { vis: "hour", sfx: "kairos_hour" },
      righttime: { vis: "clock", sfx: "kairos_time" },
      borrow: { vis: "clock", sfx: "kairos_borrow" },
      seal9: { vis: "seal", sfx: "kairos_seal", name: "Hour Seal", text: "He spends a second as a door and shuts the room." }
    },
    justicae: {
      atk: { vis: "slash", sfx: "just_blade" },
      fairplate: { vis: "ward", sfx: "just_plate" },
      verdict: { vis: "slash", sfx: "just_verdict" },
      bulwark: { vis: "ward", sfx: "just_wall", name: "Accord Wall", text: "Fairness, worn as plate, shared with the line." }
    },
    seidon: {
      atk: { vis: "tide", sfx: "seidon_tide" },
      undertow: { vis: "tide", sfx: "seidon_tow" },
      current: { vis: "tide", sfx: "seidon_current" },
      geodesic: { vis: "tide", sfx: "seidon_lob", name: "Tide Lob", text: "A crest thrown on the shortest line across the ring." }
    },
    sancora: {
      atk: { vis: "flask", sfx: "sancora_vial" },
      chorusflask: { vis: "heal", sfx: "sancora_flask" },
      weavebloom: { vis: "bloom", sfx: "sancora_bloom", name: "Weave Bloom", text: "The flask roots. Four pulses follow." },
      cover: { vis: "ward", sfx: "sancora_cover", name: "Chem Cover", text: "A pane of brew between an ally and the next hit." }
    },
    lightfather: {
      atk: { vis: "seal", sfx: "lf_bolt" },
      seal9: { vis: "seal", sfx: "lf_seal" },
      provenance: { vis: "heart", sfx: "lf_prove" },
      cover: { vis: "ward", sfx: "lf_cover", name: "Remembered Cover", text: "He puts the shield back on the one the crypt already counted out." }
    },
    wraith: {
      atk: { vis: "wisp", sfx: "wraith_bolt" },
      wail: { vis: "howl", sfx: "wraith_wail" },
      draincloud: { vis: "drain", sfx: "wraith_cloud", name: "Wraith Cloud", text: "A scrap of unwriting, thrown because it has no hands." }
    },
    brute: {
      atk: { vis: "cleave", sfx: "brute_sweep" },
      pound: { vis: "quake", sfx: "brute_pound", name: "Brute Pound", text: "Both fists. The floor answers in a straight line." },
      wardfield: { vis: "ward", sfx: "brute_ward", name: "Brute Ward", text: "It hunches, and the crypt's ward sits on its shoulders." }
    },
    imp: {
      atk: { vis: "fire", sfx: "imp_claw", name: "Coal Claw", text: "A hot grab. The coal was never meant to stay in its hand." },
      impfire: { vis: "fire", sfx: "imp_fire" },
      flicker: { vis: "veil", sfx: "imp_flick", name: "Coal Blink", text: "It steps through the heat and comes out beside you." }
    },
    hurler: {
      atk: { vis: "fist", sfx: "hurler_fist", name: "Stone Fist" },
      lobstone: { vis: "stone", sfx: "hurler_lob" },
      pound: { vis: "quake", sfx: "hurler_pound", name: "Hurler Pound", text: "The same arms that throw, brought down on the stone." }
    },
    shade: {
      atk: { vis: "claw", sfx: "shade_claw" },
      flicker: { vis: "veil", sfx: "shade_flick", name: "Veil Step", text: "One of its two places stops being the real one." },
      snatch: { vis: "drain", sfx: "shade_snatch", name: "Shade Snatch", text: "A claw through the rib. It keeps what spills." }
    },
    thief: {
      atk: { vis: "thrust", sfx: "thief_stab" },
      snatch: { vis: "drain", sfx: "thief_snatch", name: "Tithe Snatch", text: "The cut and the coin leave in the same motion." },
      flicker: { vis: "veil", sfx: "thief_flick", name: "Coin Flicker", text: "Gone before the roll finishes." }
    },
    drain: {
      atk: { vis: "drain", sfx: "drain_touch" },
      unmake: { vis: "drain", sfx: "drain_unmake" },
      draincloud: { vis: "drain", sfx: "drain_cloud", name: "Unwriting", text: "The sentence you were in comes apart in the air." }
    },
    gate: {
      atk: { vis: "stomp", sfx: "gate_slam" },
      gateslam: { vis: "quake", sfx: "gate_quake" },
      wardfield: { vis: "ward", sfx: "gate_ward", name: "Gate Ward", text: "The door closes its own ward around itself." },
      callwards: { vis: "summon", sfx: "gate_call" }
    },
    crown: {
      atk: { vis: "fist", sfx: "crown_fist" },
      regalvolley: { vis: "crown", sfx: "crown_volley" },
      lobstone: { vis: "stone", sfx: "crown_stone", name: "Crown Stone", text: "A flagstone off its own shoulders, lobbed on an arc." }
    },
    smith: {
      atk: { vis: "forge", sfx: "smith_bolt" },
      anvil: { vis: "fire", sfx: "smith_anvil" },
      gatecannon: { vis: "beam", sfx: "smith_cannon", name: "Forge Cannon", text: "The workbench speaks in a straight white-hot line." }
    },
    heartboss: {
      atk: { vis: "heart", sfx: "heart_strike" },
      heartbeat: { vis: "heart", sfx: "heart_beat" },
      wardfield: { vis: "ward", sfx: "heart_ward", name: "Crypt Ward", text: "The beat puts a ward on everything that shares its blood." }
    },
    levi: {
      atk: { vis: "deep", sfx: "levi_bolt" },
      tidecrush: { vis: "tide", sfx: "levi_crush" },
      undertow: { vis: "tide", sfx: "levi_tow", name: "Deep Undertow", text: "The depth reaches up and keeps the ankles." }
    },
    tithe: {
      atk: { vis: "claw", sfx: "tithe_claw" },
      tithe: { vis: "drain", sfx: "tithe_tax" },
      snatch: { vis: "drain", sfx: "tithe_snatch", name: "King's Snatch", text: "The toll, taken by hand." }
    },
    unnamer: {
      atk: { vis: "unname", sfx: "unnamer_bolt" },
      nameless: { vis: "seal", sfx: "unnamer_name" },
      unmake: { vis: "drain", sfx: "unnamer_eat", name: "Eat the Name", text: "It is not interested in the body. The name comes off first." }
    },
    lock: {
      atk: { vis: "lock", sfx: "lock_bolt" },
      lockseal: { vis: "seal", sfx: "lock_seal" },
      gatecannon: { vis: "beam", sfx: "lock_cannon", name: "Lock Cannon", text: "The unfinished door fires the line it was built to keep." }
    },
    wolf: {
      atk: { vis: "bite", sfx: "wolf_bite" },
      bite: { vis: "lunge", sfx: "wolf_pack" },
      roar: { vis: "howl", sfx: "wolf_howl", name: "Ash Howl", text: "The pack answers. The nearest line flinches." }
    },
    lion: {
      atk: { vis: "claw", sfx: "lion_claw", name: "Sun Claw" },
      soljump: { vis: "charge", sfx: "lion_leap" },
      roar: { vis: "howl", sfx: "lion_roar", name: "Sun Roar", text: "It picks the wounded one out loud, then leaves the ground." }
    },
    bear: {
      atk: { vis: "cleave", sfx: "bear_swipe", name: "Iron Swipe" },
      maul: { vis: "quake", sfx: "bear_maul" },
      wardfield: { vis: "ward", sfx: "bear_ward", name: "Iron Ward", text: "Ironhide sets its shoulders and becomes the door." }
    },
    elephant: {
      atk: { vis: "tusk", sfx: "elephant_tusk" },
      stomp: { vis: "trample", sfx: "elephant_trample", name: "Trample", text: "Tusks first, then the whole weight. The floor does not get a vote." },
      pound: { vis: "quake", sfx: "elephant_quake", name: "Tusk Quake", text: "Both tusks hit the stone and the ring jumps." }
    },
    scorpion: {
      atk: { vis: "barb", sfx: "scorp_barb" },
      clamp: { vis: "clamp", sfx: "scorp_clamp" },
      flicker: { vis: "veil", sfx: "scorp_flick", name: "Barb Flicker", text: "The tail is already where the body is going." }
    }
  };

  function kit(id) {
    const raw = KITS[id] || {};
    const moves = {};
    Object.keys(raw).forEach((k) => { if (k !== "atk") moves[k] = raw[k]; });
    return { atk: raw.atk || {}, moves: moves };
  }

  function sfxNames() {
    const out = [];
    const seen = {};
    Object.keys(KITS).forEach((id) => {
      Object.keys(KITS[id]).forEach((k) => {
        const s = KITS[id][k].sfx;
        if (s && !seen[s]) { seen[s] = 1; out.push(s); }
      });
    });
    return out;
  }

  function saltOf(id) {
    let h = 2166136261;
    const s = String(id || "");
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function cast(S, e, vis, x2, y2) {
    if (!S.swings) S.swings = [];
    S.swings.push({
      vis: vis || "slash",
      x: e.x, y: e.y - 10,
      x2: x2 == null ? e.x : x2, y2: y2 == null ? e.y : y2,
      a: Math.atan2((y2 == null ? e.y : y2) - e.y, (x2 == null ? e.x : x2) - e.x),
      life: 0.38, max: 0.38,
      col: (e.b && e.b.color) || "#e8eef5",
      salt: saltOf(e.b && e.b.id) % 5
    });
  }

  function pose(e) {
    if (!e.animT || !e.animVis) return null;
    const k = e.animT / (e.animMax || 0.34);
    const a = e.aimA || 0;
    const v = e.animVis;
    const melee = { bite: 1, lunge: 1, charge: 1, tusk: 1, thrust: 1, claw: 1, slash: 1, cleave: 1, fist: 1, barb: 1, clamp: 1, stomp: 1 };
    const hop = melee[v] ? 12 * k : 5 * k;
    const heavy = v === "trample" || v === "stomp" || v === "quake";
    const sy = heavy ? 1 - 0.22 * Math.sin(k * Math.PI) : 1;
    return { dx: Math.cos(a) * hop, dy: Math.sin(a) * hop * 0.72, sx: heavy ? 1.18 : 1, sy: sy };
  }

  const AT_TARGET = { trample: 1, stomp: 1, quake: 1, blast: 1, heal: 1, bloom: 1, rain: 1, crown: 1, stone: 1, flask: 1, fire: 1, heart: 1 };

  function arc(ctx, p, wide) {
    const reach = 18 + p * 16;
    ctx.beginPath();
    ctx.arc(0, 0, reach, -wide, wide);
    ctx.stroke();
  }
  function rings(ctx, p, n) {
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 8 + p * (18 + i * 14), 0, 6.2832);
      ctx.stroke();
    }
  }
  function jaws(ctx, p) {
    const open = 0.5 + Math.sin(p * Math.PI) * 0.55;
    ctx.beginPath();
    ctx.moveTo(4, 0); ctx.lineTo(22, -10 * open); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 0); ctx.lineTo(22, 10 * open); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
  }
  function tusks(ctx, p) {
    const reach = 16 + p * 20;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(2, -4); ctx.quadraticCurveTo(reach * 0.6, -16, reach, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 4); ctx.quadraticCurveTo(reach * 0.6, 16, reach, 2); ctx.stroke();
  }
  function cracks(ctx, p) {
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      ctx.lineTo(Math.cos(a) * (12 + p * 22), Math.sin(a) * (8 + p * 14));
      ctx.stroke();
    }
  }

  function paint(ctx, s) {
    const p = 1 - s.life / s.max;
    const v = s.vis;
    ctx.save();
    if (AT_TARGET[v]) ctx.translate(s.x2, s.y2);
    else { ctx.translate(s.x, s.y); ctx.rotate(s.a || 0); }
    ctx.globalAlpha = Math.max(0.05, (1 - p) * 0.95);
    ctx.strokeStyle = s.col;
    ctx.fillStyle = s.col;
    ctx.lineWidth = 3;
    if (v === "bite" || v === "lunge") jaws(ctx, p);
    else if (v === "tusk") tusks(ctx, p);
    else if (v === "clamp" || v === "barb") {
      const gap = 12 * (1 - Math.sin(p * Math.PI));
      ctx.strokeRect(-4, -14 - gap, 16, 6);
      ctx.strokeRect(-4, 8 + gap, 16, 6);
      if (v === "barb") { ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(34, -3 + p * 6); ctx.stroke(); }
    }
    else if (v === "trample") { rings(ctx, p, 3); cracks(ctx, p); }
    else if (v === "stomp" || v === "quake") { rings(ctx, p, 2); cracks(ctx, p); }
    else if (v === "cleave") arc(ctx, p, 1.35);
    else if (v === "slash" || v === "claw") {
      arc(ctx, p, v === "claw" ? 0.7 : 0.95);
      if (v === "claw") { ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(24, -12); ctx.moveTo(8, 0); ctx.lineTo(26, 0); ctx.moveTo(8, 6); ctx.lineTo(24, 12); ctx.stroke(); }
    }
    else if (v === "thrust" || v === "beam") {
      ctx.lineWidth = v === "beam" ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28 + p * 36, 0); ctx.stroke();
    }
    else if (v === "fist" || v === "rage") { rings(ctx, p, v === "rage" ? 2 : 1); }
    else if (v === "ward" || v === "seal" || v === "howl" || v === "clock") rings(ctx, p, v === "howl" ? 3 : 2);
    else if (v === "heal" || v === "bloom" || v === "heart") {
      rings(ctx, p, 2);
      ctx.globalAlpha *= 0.8;
      ctx.beginPath(); ctx.arc(-6, -4 - p * 10, 3, 0, 6.2832); ctx.arc(7, -8 - p * 8, 2.4, 0, 6.2832); ctx.fill();
    }
    else if (v === "rain" || v === "crown") {
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * 8, -18); ctx.lineTo(i * 8 + 2, 10 + p * 8); ctx.stroke();
      }
    }
    else if (v === "stone") {
      ctx.strokeRect(-7, -18 + p * 20, 14, 14);
    }
    else if (v === "flask" || v === "fire") {
      for (let i = 0; i < 5; i++) {
        const a = i * 1.25 + s.salt;
        ctx.beginPath(); ctx.arc(Math.cos(a) * (8 + p * 16), Math.sin(a) * (6 + p * 12) - p * 8, 3, 0, 6.2832); ctx.fill();
      }
    }
    else if (v === "tide" || v === "deep") {
      ctx.beginPath();
      ctx.moveTo(-20, 4);
      ctx.quadraticCurveTo(-8, -10 - p * 8, 0, 2);
      ctx.quadraticCurveTo(10, 12 + p * 6, 22, 0);
      ctx.stroke();
    }
    else if (v === "drain" || v === "unname") {
      ctx.beginPath(); ctx.arc(0, 0, 16 - p * 10, p * 4, p * 4 + 4); ctx.stroke();
    }
    else if (v === "veil") {
      ctx.globalAlpha *= 0.7;
      ctx.beginPath(); ctx.arc(-10 * p, -6, 10, 0, 6.2832); ctx.stroke();
      ctx.beginPath(); ctx.arc(8 * p, 2, 8, 0, 6.2832); ctx.stroke();
    }
    else if (v === "summon") { rings(ctx, p, 2); }
    else if (v === "note") {
      ctx.beginPath(); ctx.ellipse(10, -4, 5, 4, -0.5, 0, 6.2832); ctx.fill();
      ctx.fillRect(14, -18, 2, 14);
    }
    else if (v === "blast") rings(ctx, p, 2);
    else arc(ctx, p, 0.9);
    ctx.restore();
  }

  function draw(ctx, S) {
    (S.swings || []).forEach((s) => paint(ctx, s));
  }

  function shot(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a || 0);
    ctx.fillStyle = p.col || "#fbbf24";
    ctx.strokeStyle = p.col || "#fbbf24";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.95;
    const v = p.vis || "shard";
    if (v === "arrow" || v === "needle" || v === "rain") {
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-9, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(3, 4); ctx.lineTo(3, -4); ctx.fill();
    } else if (v === "note") {
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, -0.4, 0, 6.2832); ctx.fill();
      ctx.fillRect(5, -12, 2, 12);
    } else if (v === "hour" || v === "clock") {
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.2832); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -5); ctx.lineTo(4, 0); ctx.stroke();
    } else if (v === "tide" || v === "deep") {
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, 6.2832); ctx.fill();
    } else if (v === "flask" || v === "forge" || v === "fire") {
      ctx.fillRect(-3, -5, 6, 8);
      ctx.beginPath(); ctx.arc(0, -6, 3, 0, 6.2832); ctx.fill();
    } else if (v === "seal" || v === "lock" || v === "sigil") {
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
    } else if (v === "wisp" || v === "unname" || v === "drain") {
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.arc(-6, 1, 3, 0, 6.2832); ctx.fill();
    } else if (v === "stone" || v === "crown") {
      ctx.fillRect(-5, -5, 10, 10);
    } else {
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, 5); ctx.lineTo(-2, 0); ctx.lineTo(-5, -5); ctx.fill();
    }
    ctx.restore();
  }

  w.LYGO_ATTACKS = { kit: kit, sfxNames: sfxNames, cast: cast, pose: pose, draw: draw, shot: shot, kits: KITS };
})(window);
