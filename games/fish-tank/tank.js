/* Fish Tank — autonomous aquarium. Age is real time. Saves stay in this browser. */
(() => {
  const SAVE = "lygo_fish_tank_v1";
  const HOUR = 3600000;
  const DAY = 24 * HOUR;
  const STAGES = [
    ["baby", 0],
    ["infant", 2 * HOUR],
    ["child", 6 * HOUR],
    ["teen", 12 * HOUR],
    ["adult", DAY],
    ["elder", 4 * DAY]
  ];
  const STAGE_DRAW = { baby: 0.42, infant: 0.55, child: 0.7, teen: 0.84, adult: 1, elder: 0.95 };
  const FACE_RIGHT = { veil: false };
  const LIFE = 7 * DAY;
  const STARVE = 36 * HOUR;
  const FED_FAST = 6 * HOUR;
  const SPECIES = [
    { id: "glimmer", name: "Glimmer", play: "jump", temper: "lively", social: "school", bulk: 1, blurb: "Happy. Schools, and jumps." },
    { id: "azure", name: "Azure", play: "flare", temper: "lively", social: "loner", bulk: 0.92, blurb: "Happy loner. Keeps its own water." },
    { id: "dart", name: "Dart", play: "race", temper: "lively", social: "school", bulk: 0.78, blurb: "Happy. Schools and rarely stops." },
    { id: "puff", name: "Puff", play: "boop", temper: "chill", social: "loner", bulk: 0.88, blurb: "Relaxed loner. A soft bump, then space." },
    { id: "lantern", name: "Lantern", play: "glow", temper: "lively", social: "school", bulk: 0.74, blurb: "Happy. Schools, and glows at dusk." },
    { id: "moss", name: "Moss", play: "clean", temper: "chill", social: "loner", bulk: 0.96, blurb: "Relaxed loner. Stays low." },
    { id: "ruby", name: "Ruby", play: "school", temper: "chill", social: "school", bulk: 1, blurb: "Relaxed. Holds the school together." },
    { id: "veil", name: "Veil", play: "dance", temper: "chill", social: "loner", bulk: 1.05, blurb: "Relaxed loner. Long, slow arcs." },
    { id: "sunscale", name: "Sunscale", play: "lap", temper: "chill", social: "loner", bulk: 1.12, blurb: "Relaxed loner. One slow lap." },
    { id: "pearl", name: "Pearl", play: "flash", temper: "lively", social: "school", bulk: 0.7, blurb: "Happy. Schools and flashes." },
    { id: "claw", name: "LYGO Claw", play: "snap", temper: "chill", social: "loner", bulk: 1.28, blurb: "The lobster. Walks the sand. Gold claws." },
    { id: "crab", name: "Pincer", play: "scuttle", temper: "chill", social: "loner", bulk: 1.05, blurb: "Reef crab. Sideways on the bottom." },
    { id: "octo", name: "Octopus", play: "curl", temper: "lively", social: "loner", bulk: 1.15, blurb: "One in the tank. Jets, and inks when a hunter chases." },
    { id: "mandarin", name: "Mandarin", play: "pulse", temper: "chill", social: "loner", bulk: 0.62, blurb: "Dragonet. Hides on the rockwork and ignores most flakes." },
    { id: "pepper", name: "Peppermint", play: "hover", temper: "chill", social: "loner", bulk: 0.84, blurb: "Deep angel. Stays low and leaves when the water runs hot." },
    { id: "tusk", name: "Tusk", play: "flare", temper: "lively", social: "loner", bulk: 1.18, blurb: "Harlequin tusk. Clears a little algae and shoves smaller fish aside." },
    { id: "dragon", name: "Seadragon", play: "drift", temper: "chill", social: "loner", bulk: 1.22, blurb: "Leafy seadragon. Drifts in the plants. Hard for a hunter to pick out." },
    { id: "mask", name: "Masked angel", play: "school", temper: "chill", social: "school", bulk: 0.9, blurb: "Schools only with its own kind, and gives a tusk room." }
  ];
  const VITALS = {
    glimmer: { hp: 100, regen: 8, hurt: 10, food: 14 },
    azure: { hp: 90, regen: 5, hurt: 12, food: 11 },
    dart: { hp: 70, regen: 9, hurt: 14, food: 8 },
    puff: { hp: 120, regen: 4, hurt: 8, food: 18 },
    lantern: { hp: 65, regen: 10, hurt: 13, food: 9 },
    moss: { hp: 130, regen: 3, hurt: 6, food: 22 },
    ruby: { hp: 140, regen: 5, hurt: 7, food: 20 },
    veil: { hp: 110, regen: 4, hurt: 8, food: 17 },
    sunscale: { hp: 150, regen: 3, hurt: 6, food: 24 },
    pearl: { hp: 60, regen: 11, hurt: 15, food: 7 },
    claw: { hp: 160, regen: 3, hurt: 5, food: 26 },
    crab: { hp: 110, regen: 5, hurt: 7, food: 16 },
    octo: { hp: 130, regen: 5, hurt: 7, food: 18 },
    mandarin: { hp: 72, regen: 4, hurt: 9, food: 20 },
    pepper: { hp: 96, regen: 3, hurt: 8, food: 22 },
    tusk: { hp: 150, regen: 4, hurt: 6, food: 16 },
    dragon: { hp: 110, regen: 2, hurt: 7, food: 28 },
    mask: { hp: 84, regen: 5, hurt: 8, food: 14 }
  };
  const PREDATORS = {
    pike: { id: "pike", name: "Reed", blurb: "Long bill. A boss if the tank is quiet for an hour." },
    cinder: { id: "cinder", name: "Cinder", blurb: "Orange hunter. A lucky bite leaves a baby." },
    gar: { id: "gar", name: "Sable", blurb: "Dark gar. Two misses in a row and it dies." },
    eel: { id: "eel", name: "Volt", blurb: "Electric eel. A boss. The zap stuns whoever is close." },
    shark: { id: "shark", name: "Greymaw", blurb: "Reef shark. Three clean meals in a row and it becomes JAWS." }
  };
  /* Hours to infant, child, teen, adult, elder, then death. One tank hour is one tick. */
  const LIFE_CYCLE = {
    glimmer: [3, 8, 16, 28, 110, 180],
    azure: [4, 10, 20, 36, 140, 220],
    dart: [2, 5, 10, 18, 70, 120],
    puff: [4, 12, 24, 40, 150, 240],
    lantern: [2, 6, 12, 22, 80, 140],
    moss: [5, 14, 28, 48, 170, 280],
    ruby: [4, 12, 22, 36, 140, 230],
    veil: [4, 12, 26, 42, 160, 250],
    sunscale: [6, 16, 32, 56, 200, 320],
    pearl: [2, 5, 9, 16, 60, 100],
    claw: [6, 18, 36, 64, 220, 360],
    crab: [4, 10, 20, 36, 130, 210],
    octo: [5, 14, 30, 52, 180, 300],
    mandarin: [4, 12, 24, 40, 140, 220],
    pepper: [8, 20, 40, 72, 240, 400],
    tusk: [5, 14, 28, 48, 180, 300],
    dragon: [8, 24, 48, 80, 260, 420],
    mask: [5, 14, 28, 46, 170, 280]
  };
  const PRED_STAT = {
    pike: { hp: 90, dmg: 78 },
    cinder: { hp: 80, dmg: 70 },
    gar: { hp: 100, dmg: 84 },
    eel: { hp: 110, dmg: 96 },
    shark: { hp: 120, dmg: 80 },
    jaws: { hp: 200, dmg: 110 }
  };
  /* ---------------------------------------------------------------
     Phase 2 — living water.
     MOTION: how each species moves. DECOR: what it steers around.
     TEMP_BAND: the water each species is built for.
     GOALS: first-time marks that pay points.
     --------------------------------------------------------------- */
  const MOTION = {
    glimmer: { cruise: 0.085, burst: 0.40, turn: 2.4, vision: 0.20, band: [0.24, 0.60], tail: 15, glide: 0.50 },
    azure: { cruise: 0.070, burst: 0.30, turn: 1.9, vision: 0.17, band: [0.26, 0.68], tail: 13, glide: 0.70 },
    dart: { cruise: 0.125, burst: 0.62, turn: 3.4, vision: 0.24, band: [0.16, 0.52], tail: 23, glide: 0.25 },
    puff: { cruise: 0.048, burst: 0.15, turn: 1.4, vision: 0.14, band: [0.32, 0.74], tail: 9, glide: 0.85 },
    lantern: { cruise: 0.078, burst: 0.38, turn: 2.6, vision: 0.22, band: [0.34, 0.68], tail: 17, glide: 0.55, glow: true },
    moss: { cruise: 0.042, burst: 0.13, turn: 1.3, vision: 0.13, band: [0.60, 0.88], tail: 8, glide: 0.90 },
    ruby: { cruise: 0.072, burst: 0.34, turn: 2.2, vision: 0.25, band: [0.24, 0.62], tail: 15, glide: 0.60 },
    veil: { cruise: 0.055, burst: 0.20, turn: 1.6, vision: 0.18, band: [0.22, 0.70], tail: 10, glide: 0.80 },
    sunscale: { cruise: 0.050, burst: 0.26, turn: 1.5, vision: 0.18, band: [0.30, 0.80], tail: 9, glide: 0.85 },
    pearl: { cruise: 0.092, burst: 0.46, turn: 2.9, vision: 0.22, band: [0.14, 0.48], tail: 21, glide: 0.35 },
    claw: { cruise: 0.024, burst: 0.08, turn: 0.95, vision: 0.15, band: [0.82, 0.86], tail: 4, glide: 0.08, walk: true },
    crab: { cruise: 0.046, burst: 0.18, turn: 2.1, vision: 0.16, band: [0.82, 0.86], tail: 9, glide: 0.05, walk: true },
    octo: { cruise: 0.05, burst: 0.36, turn: 1.7, vision: 0.22, band: [0.22, 0.74], tail: 7, glide: 0.72, jet: true },
    mandarin: { cruise: 0.032, burst: 0.12, turn: 1.3, vision: 0.12, band: [0.58, 0.84], tail: 6, glide: 0.82 },
    pepper: { cruise: 0.04, burst: 0.14, turn: 1.2, vision: 0.14, band: [0.64, 0.88], tail: 7, glide: 0.8 },
    tusk: { cruise: 0.062, burst: 0.22, turn: 1.8, vision: 0.18, band: [0.42, 0.78], tail: 10, glide: 0.55 },
    dragon: { cruise: 0.02, burst: 0.06, turn: 0.7, vision: 0.12, band: [0.36, 0.72], tail: 4, glide: 0.95 },
    mask: { cruise: 0.055, burst: 0.18, turn: 1.6, vision: 0.2, band: [0.32, 0.64], tail: 11, glide: 0.62 }
  };
  /* Soft obstacles read off the painted tank, per theme. rx/ry are real
     stretches in screen fractions, so a rock blocks as tall as it is wide.
     kind "weed" is cover: fish swim in and through it, solid rock they round. */
  const DECOR = {
    river: [
      { x: 0.08, y: 0.45, rx: 0.11, ry: 0.36, kind: "weed", shelter: 1 },
      { x: 0.14, y: 0.68, rx: 0.07, ry: 0.10, kind: "weed", shelter: 1 },
      { x: 0.32, y: 0.47, rx: 0.055, ry: 0.13, kind: "solid", egg: 1 },
      { x: 0.50, y: 0.47, rx: 0.06, ry: 0.14, kind: "solid", egg: 1 },
      { x: 0.68, y: 0.45, rx: 0.11, ry: 0.14, kind: "solid" },
      { x: 0.82, y: 0.33, rx: 0.06, ry: 0.09, kind: "solid" },
      { x: 0.92, y: 0.45, rx: 0.10, ry: 0.34, kind: "weed", shelter: 1 },
      { x: 0.88, y: 0.68, rx: 0.08, ry: 0.10, kind: "weed", shelter: 1 },
      { x: 0.13, y: 0.70, rx: 0.10, ry: 0.07, kind: "solid" },
      { x: 0.78, y: 0.71, rx: 0.14, ry: 0.06, kind: "solid" }
    ],
    coral: [
      { x: 0.10, y: 0.26, rx: 0.12, ry: 0.18, kind: "solid" },
      { x: 0.19, y: 0.42, rx: 0.10, ry: 0.10, kind: "solid" },
      { x: 0.09, y: 0.56, rx: 0.10, ry: 0.09, kind: "weed", shelter: 1, egg: 1 },
      { x: 0.44, y: 0.57, rx: 0.11, ry: 0.14, kind: "solid", egg: 1 },
      { x: 0.68, y: 0.46, rx: 0.12, ry: 0.12, kind: "solid" },
      { x: 0.88, y: 0.24, rx: 0.12, ry: 0.18, kind: "solid" },
      { x: 0.94, y: 0.46, rx: 0.08, ry: 0.09, kind: "solid" },
      { x: 0.86, y: 0.64, rx: 0.10, ry: 0.08, kind: "weed", shelter: 1, egg: 1 }
    ],
    bog: [
      { x: 0.08, y: 0.42, rx: 0.10, ry: 0.34, kind: "weed", shelter: 1 },
      { x: 0.18, y: 0.60, rx: 0.07, ry: 0.09, kind: "weed", shelter: 1 },
      { x: 0.31, y: 0.60, rx: 0.055, ry: 0.14, kind: "solid", egg: 1 },
      { x: 0.50, y: 0.60, rx: 0.06, ry: 0.15, kind: "solid", egg: 1 },
      { x: 0.69, y: 0.52, rx: 0.12, ry: 0.13, kind: "solid" },
      { x: 0.82, y: 0.40, rx: 0.07, ry: 0.10, kind: "solid" },
      { x: 0.93, y: 0.45, rx: 0.09, ry: 0.32, kind: "weed", shelter: 1 }
    ]
  };
  const TEMP_BAND = {
    glimmer: [23, 28], azure: [22, 27], dart: [22, 27], puff: [23, 28], lantern: [23, 28],
    moss: [20, 26], ruby: [23, 28], veil: [22, 27], sunscale: [21, 26], pearl: [23, 28],
    claw: [16, 24], crab: [22, 29], octo: [20, 27],
    mandarin: [24, 28], pepper: [22, 25], tusk: [24, 28], dragon: [16, 22], mask: [23, 27]
  };
  const BIOS = {
    glimmer: { niche: "Upper school", text: "An original tank fish. It keeps to the bright middle water, schools with the other lively fish, and jumps when the glass is kind." },
    azure: { niche: "Loner", text: "An original betta-like fish. It keeps its own patch of water, flares when another fish crowds it, and does not join a school." },
    dart: { niche: "Fast school", text: "An original dash fish. It lives high in the water, races the school, and burns hunger faster than the slow fish." },
    puff: { niche: "Soft loner", text: "An original round fish. It drifts, bumps a neighbor, then wants space again. Dirty water bothers it less than a dart." },
    lantern: { niche: "Night light", text: "An original schooling fish. It glows once the tank goes dark and stays with the other small swimmers." },
    moss: { niche: "Low grazer", text: "An original bottom fish. It stays near the sand, picks at the green, and grows on a slow clock." },
    ruby: { niche: "School anchor", text: "An original calm fish. It holds the school together and does not sprint unless the food is close." },
    veil: { niche: "Slow arc", text: "An original long-finned fish. It takes wide slow turns and likes a little room around those fins." },
    sunscale: { niche: "Lap swimmer", text: "An original koi-like fish. It cruises a long lap, lives a long time, and does not school." },
    pearl: { niche: "Flash school", text: "An original small fish. It flashes in the school, eats often, and has the shortest life of the originals." },
    claw: { niche: "Sand walker", text: "LYGO Claw, the lobster. It walks the sand, takes food after it settles, and sidesteps a hunter instead of swimming up. It likes cooler water." },
    crab: { niche: "Sand walker", text: "Pincer, a reef crab. It scuttles the bottom, lifts a little waste, and stays on the sand even when the fish above bolt." },
    octo: { niche: "Jet and ink", text: "One octopus in the glass. It jets through the middle water. When a hunter chases, the ink takes 10% off that bite. It does not share the tank with a second octopus." },
    mandarin: { latin: "Synchiropus splendidus", niche: "Cryptic grazer", text: "A real mandarin dragonet. It picks tiny life off the rockwork, skips most flakes unless it is starving, and keeps away from the open school. The bitter skin makes a hunter 8% less likely to finish the bite." },
    pepper: { latin: "Centropyge boylei", niche: "Deep reef", text: "A real peppermint angelfish, one of the rare deep angels. It stays low, wants cooler water than the goldfish, and backs off when a tusk comes through. It grows slowly and lives a long time." },
    tusk: { latin: "Choerodon fasciatus", niche: "Territory", text: "A real harlequin tusk. It pushes smaller neighbors aside, takes food with confidence, and scrapes a little algae while it patrols. Masked angels, peppermints, and seadragons give it room." },
    dragon: { latin: "Phycodurus eques", niche: "Plant drift", text: "A real leafy seadragon. It barely swims, drifts into the plants, and is poor at chasing flakes. In the weeds a hunter is 12% less likely to land the bite. This tank does not hatch extra dragons from eggs." },
    mask: { latin: "Genicanthus personatus", niche: "Own-kind school", text: "A real masked angelfish from deep Hawaiian water. It schools only with other masked angels and slides away from a tusk. It does not join the glimmer school." }
  };
  const TRAIT_WORDS = {
    bold: ["timid", "wary", "steady", "bold", "fearless"],
    social: ["solitary", "private", "easy", "sociable", "inseparable"],
    appetite: ["picky", "light", "steady", "greedy", "ravenous"],
    vigor: ["frail", "delicate", "sound", "hardy", "vigorous"]
  };
  const GOALS = [
    { id: "adult", text: "One fish grows to adult", pay: 20 },
    { id: "court", text: "A pair courts in good water", pay: 20 },
    { id: "hatch", text: "A fry hatches in the tank", pay: 30 },
    { id: "dodge", text: "A hunter's bite misses", pay: 25 },
    { id: "eight", text: "Eight fish in the glass at once", pay: 25 },
    { id: "crew5", text: "Five cleaners at work", pay: 25 },
    { id: "school", text: "Six of one species at once", pay: 30 },
    { id: "elder", text: "A fish reaches elder", pay: 45 },
    { id: "hundred", text: "A fish lives a hundred hours", pay: 50 },
    { id: "twenty", text: "Twenty fish at once", pay: 40 },
    { id: "clear", text: "Quality 95 with twelve fish", pay: 35 },
    { id: "gen3", text: "A third generation is born here", pay: 60 },
    { id: "thirty", text: "Thirty fish at once", pay: 60 },
    { id: "allten", text: "All eighteen species at once", pay: 70 }
  ];
  const STALK_LEAD = 22000;
  const STRIKE_WINDOW = 40000;
  const HATCH_MS = 20 * 60000;
  const EGG_CAP = 6;

  const FISH_CAP = 50;
  const HUNTER_CAP = 10;
  const KEEPERS = {
    mara: { id: "mara", name: "Mara", tag: "Water", pitch: 1.05, bio: "Mara has kept glass boxes for twenty years. She talks softly and notices the water before anyone else." },
    ellis: { id: "ellis", name: "Ellis", tag: "Mood", pitch: 0.96, bio: "Ellis names every fish and remembers who ate. He thinks a happy tank is a noisy one, in a quiet way." },
    ren: { id: "ren", name: "Ren", tag: "Watch", pitch: 0.9, bio: "Ren likes the long watch. Hunters do not surprise Ren. Ren just says when one is coming." },
    june: { id: "june", name: "June", tag: "Sanctuary", pitch: 1.08, bio: "June keeps a peaceful room. She would rather have more fish and no hunters at all." },
    mateo: { id: "mateo", name: "Mateo", tag: "Meals", pitch: 0.93, bio: "Mateo feeds by hand and hates a wasted flake. Meals last longer when he is on the glass." },
    nia: { id: "nia", name: "Nia", tag: "Mix", pitch: 1.1, bio: "Nia likes a mixed tank. One kind of fish makes her nervous. A crowd of different kinds makes her relax." }
  };
  const PERKS = [
    { id: "clear", name: "Clear glass", text: "Algae grows slower and the water holds its quality." },
    { id: "bright", name: "Bright mood", text: "Fish stay content a little longer when the water is off." },
    { id: "shortwatch", name: "Short watch", text: "A hunter can enter after 30 quiet minutes, not a full hour." },
    { id: "sanctuary", name: "Sanctuary", text: "The tank holds 70 fish. No hunters enter. Short watch does nothing." },
    { id: "meals", name: "Long meals", text: "A feeding lasts about a quarter longer." },
    { id: "pockets", name: "Full pockets", text: "Start with 40 points." },
    { id: "years", name: "Long years", text: "Every fish lives about a fifth longer." },
    { id: "keen", name: "Keen eye", text: "Hunters miss a little more often. Five points off the bite." },
    { id: "crowd", name: "Roomy glass", text: "Crowding starts later, nearer 42 fish than 30." },
    { id: "quickfry", name: "Quick fry", text: "Eggs hatch sooner." }
  ];
  const CREW = [
    { id: "snail", name: "Nerite", cost: 20, blurb: "Scrapes algae off the glass." },
    { id: "otto", name: "Algae eater", cost: 28, blurb: "Lives on the green film." },
    { id: "cory", name: "Cory", cost: 28, blurb: "Bottom feeder. Lifts the waste." },
    { id: "jelly", name: "Moon jelly", cost: 36, blurb: "Pulses in the top and middle water only." },
    { id: "turtle", name: "Pond turtle", cost: 50, blurb: "Stays on the sand. Naps in its shell." }
  ];
  const CREW_LIFE = 30 * DAY;
  const HANDS = { f: new Image(), m: new Image() };
  HANDS.f.src = "./assets/crew/hand-f.png";
  HANDS.m.src = "./assets/crew/hand-m.png";
  const CREW_SPRITES = {};
  const CREW_H = { snail: 0.12, otto: 0.075, cory: 0.1, jelly: 0.2, turtle: 0.16 };
  const SPRITES = {};
  const THEMES = {
    river: { id: "river", name: "River garden", blurb: "Clear water, plants, and a stone arch.", temp: 25, algae: 1, day: "tank-day.jpg", night: "tank-night.jpg" },
    coral: { id: "coral", name: "Coral shelf", blurb: "Warm shallows, corals, and an anemone.", temp: 27, algae: 1.15, day: "coral-day.jpg", night: "coral-night.jpg" },
    bog: { id: "bog", name: "Blackwater", blurb: "Tea-stained water, roots, and leaf litter.", temp: 23, algae: 0.7, day: "bog-day.jpg", night: "bog-night.jpg" }
  };
  const THEME_ART = {};
  Object.keys(THEMES).forEach(function (id) {
    THEME_ART[id] = { day: new Image(), night: new Image() };
    THEME_ART[id].day.src = "./assets/" + THEMES[id].day;
    THEME_ART[id].night.src = "./assets/" + THEMES[id].night;
  });
  CREW.forEach(function (c) {
    const img = new Image();
    img.src = "./assets/crew/" + c.id + ".png";
    CREW_SPRITES[c.id] = img;
  });
  CREW_SPRITES.turtleSleep = new Image();
  CREW_SPRITES.turtleSleep.src = "./assets/crew/turtle-sleep.png";
  STAGES.forEach(function (pair) {
    SPECIES.forEach(function (sp) {
      if (sp.id === "claw" || sp.id === "crab" || sp.id === "octo" || sp.id === "mandarin" || sp.id === "pepper" || sp.id === "tusk" || sp.id === "dragon" || sp.id === "mask") return;
      const img = new Image();
      img.src = "./assets/fish/" + sp.id + "_" + pair[0] + ".png";
      SPRITES[sp.id + "_" + pair[0]] = img;
    });
    ["l", "r"].forEach(function (dir) {
      const img = new Image();
      img.src = "./assets/fish/azure_" + pair[0] + "_" + dir + ".png";
      SPRITES["azure_" + pair[0] + "_" + dir] = img;
    });
  });
  const PRED_SPRITES = {};
  ["pike", "cinder", "gar", "eel", "shark"].forEach(function (id) {
    ["baby", "adult"].forEach(function (age) {
      const img = new Image();
      img.src = "./assets/fish/" + id + "_" + age + ".png";
      PRED_SPRITES[id + "_" + age] = img;
    });
  });
  ["eel_adult_zap", "eel_adult_zap2", "eel_baby_zap", "shark_elder", "shark_elder_stalk"].forEach(function (key) {
    const img = new Image();
    img.src = "./assets/fish/" + key + ".png";
    PRED_SPRITES[key] = img;
  });
  ["octo_r", "octo_r_swim", "ink_1", "ink_2", "ink_3", "mandarin_r", "mandarin_r_swim", "pepper_r", "pepper_r_swim", "tusk_r", "tusk_r_swim", "dragon_r", "dragon_r_swim", "mask_r", "mask_r_swim"].forEach(function (key) {
    const img = new Image();
    img.src = "./assets/fish/" + key + ".png";
    SPRITES[key] = img;
  });
  ["claw", "crab"].forEach(function (id) {
    ["l", "r"].forEach(function (dir) {
      ["", "_walk"].forEach(function (step) {
        const img = new Image();
        img.src = "./assets/fish/" + id + "_" + dir + step + ".png";
        SPRITES[id + "_" + dir + step] = img;
      });
    });
  });
  ["baby", "child", "adult"].forEach(function (stage) {
    ["l", "r"].forEach(function (dir) {
      const img = new Image();
      img.src = "./assets/fish/sunscale_" + stage + "_" + dir + ".png";
      SPRITES["sunscale_" + stage + "_" + dir] = img;
    });
  });

  const canvas = document.getElementById("tank");
  const ctx = canvas.getContext("2d");
  let state = null;
  let selected = null;
  let bubbles = [];
  let flakes = [];
  let inks = [];
  let motes = [];
  let ripples = [];
  let AR = 1.7;
  let hand = null;
  let last = performance.now();

  function specOf(id) { return SPECIES.filter(function (s) { return s.id === id; })[0] || SPECIES[0]; }
  function cycleOf(species) { return LIFE_CYCLE[species] || [2, 6, 12, 24, 96, 168]; }
  function stageName(age, species) {
    const hours = age > 5000 ? age / HOUR : age;
    const marks = cycleOf(species);
    const names = ["baby", "infant", "child", "teen", "adult", "elder"];
    let name = "baby";
    for (let i = 0; i < 5; i += 1) if (hours >= marks[i]) name = names[i + 1];
    return name;
  }
  function moodOf(f, now) {
    if (state && state.quality < (hasPerk("bright") ? 22 : 32)) return "sad";
    if (f && comfort(f) > (hasPerk("bright") ? 2.4 : 1.6)) return "sad";
    if (now - f.lastFed > 8 * HOUR) return "sad";
    if (now - f.lastPlay < 20 * 60000 && (!state || state.quality >= 55)) return "happy";
    return "normal";
  }
  function vitals(f) { return VITALS[f.species] || { hp: 100, regen: 5, hurt: 10, food: 16 }; }
  function foodLeft(f, now) {
    const hours = vitals(f).food * (hasPerk("meals") ? 1.28 : 1);
    return hours * HOUR - (now - (f.lastFed || f.born));
  }
  function lifeOf(f) {
    const base = cycleOf(f.species)[5] * HOUR;
    return base * (hasPerk("years") ? 1.2 : 1) + (f.bonus || 0);
  }
  function keeperInfo() {
    const k = state && state.keeper;
    return k && KEEPERS[k.id] ? k : { id: "mara", name: (state && state.owner) || "Keeper", perks: [] };
  }
  function hasPerk(id) {
    const k = state && state.keeper;
    return !!(k && k.perks && k.perks.indexOf(id) >= 0);
  }
  function fishCap() { return hasPerk("sanctuary") ? 70 : FISH_CAP; }
  function quietNeed() { return hasPerk("shortwatch") && !hasPerk("sanctuary") ? HOUR / 2 : HOUR; }
  function mixScale() {
    const fish = (state && state.fish) || [];
    const n = fish.length;
    if (n < 2) return { temp: 1.2, dirt: 1.12, share: 1, kinds: n };
    const counts = {};
    fish.forEach(function (f) { counts[f.species] = (counts[f.species] || 0) + 1; });
    let max = 0;
    Object.keys(counts).forEach(function (id) { if (counts[id] > max) max = counts[id]; });
    const share = max / n;
    const kinds = Object.keys(counts).length;
    return {
      temp: clamp(0.4 + share * 1.4 - Math.min(kinds, 8) * 0.035, 0.4, 1.9),
      dirt: clamp(0.7 + share * 0.9, 0.7, 1.6),
      share: share,
      kinds: kinds
    };
  }
  function ageOf(f, now) { return Math.max(0, now - f.born); }
  function bodyAge(f) { return f.growth || 0; }
  function accrueGrowth(f, now) {
    if (f.growthHours == null) {
      const elapsed = Math.max(0, (f.growth || 0) > 0 ? f.growth : (now - (f.born || now)));
      f.growthHours = Math.floor(elapsed / HOUR);
    }
    f.growth = f.growthHours * HOUR;
    f.growthAt = now;
  }
  function addGrowthHours(f, n) {
    f.growthHours = Math.max(0, (f.growthHours || 0) + n);
    f.growth = f.growthHours * HOUR;
  }
  function hours(ms) { return Math.round(ms / HOUR * 10) / 10; }
  function price() { return 30 + state.fish.length * 18; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function depthOf(o) {
    if (!o) return 0.7;
    if (o.kind && o.depth != null) return o.depth;
    if (o.z != null) return o.z;
    return 0.86;
  }
  function span3(ax, ay, az, bx, by, bz) {
    return Math.hypot(ax - bx, (ay - by) * AR, (az - bz) * 0.82);
  }
  function apart(a, b) {
    return span3(a.x, a.y, depthOf(a), b.x, b.y, depthOf(b));
  }
  function depthBand(f) {
    const m = motionOf(f);
    if (m.walk) return [0.7, 0.94];
    if (f.species === "dragon" || f.species === "mandarin") return [0.18, 0.52];
    if (f.species === "pepper") return [0.24, 0.58];
    if (m.band && m.band[1] < 0.55) return [0.4, 0.88];
    return [0.16, 0.92];
  }
  function crewOf(id) { return CREW.filter(function (c) { return c.id === id; })[0]; }
  function uid() { return "f" + Math.random().toString(36).slice(2, 8); }
  function log(t) {
    state.log.unshift(t);
    state.log = state.log.slice(0, 30);
  }
  const SFX = {};
  let sfxReady = false;
  function ensureSfx() {
    if (sfxReady) return;
    sfxReady = true;
    ["pump", "death", "chase", "omen", "bite", "battle", "feed"].forEach(function (name) {
      const a = new Audio("./assets/sfx/" + name + ".wav");
      a.preload = "auto";
      if (name === "pump" || name === "omen") a.loop = true;
      SFX[name] = a;
    });
  }
  function sfxOn() { return !!(state && state.opts && state.opts.sound !== false); }
  function sfxVol() {
    const v = state && state.opts ? state.opts.soundVol : null;
    return v == null ? 0.4 : clamp(v, 0, 1);
  }
  function playSfx(name) {
    if (!sfxOn() || sfxVol() < 0.02) return;
    ensureSfx();
    const a = SFX[name];
    if (!a || a.loop) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = sfxVol() * (name === "death" || name === "bite" ? 0.5 : 0.7);
      const go = a.play();
      if (go && go.catch) go.catch(function () {});
    } catch (_) {}
  }
  function tuneLoop(a, on, vol) {
    if (!a) return;
    a.volume = vol;
    if (on) {
      const go = a.play();
      if (go && go.catch) go.catch(function () {});
    } else {
      a.pause();
    }
  }
  function syncLoops() {
    if (!sfxReady && !(playing && sfxOn())) return;
    ensureSfx();
    const on = !!(playing && sfxOn() && sfxVol() >= 0.02);
    const jaws = on && (state.predators || []).some(function (p) { return p.elder; });
    tuneLoop(SFX.pump, on, sfxVol() * 0.36);
    tuneLoop(SFX.omen, jaws, sfxVol() * 0.48);
  }
  function save() {
    try { localStorage.setItem(SAVE, JSON.stringify(state)); } catch (_) {}
  }
  function makeFish(species, name) {
    const now = Date.now();
    const band = (MOTION[species] || MOTION.glimmer).band;
    return {
      id: uid(),
      species: species,
      name: String(name || specOf(species).name).slice(0, 16),
      born: now,
      bonus: 0,
      growth: 0,
      growthAt: now,
      lastFed: now,
      lastPlay: now,
      x: 0.2 + Math.random() * 0.6,
      y: clamp(band[0] + Math.random() * (band[1] - band[0]), 0.12, 0.86),
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.02),
      vy: 0,
      action: "",
      actionT: 0,
      tx: 0,
      ty: 0,
      state: "cruise",
      stateT: 0,
      idleT: 0,
      phase: Math.random() * 6.283,
      heading: Math.random() < 0.5 ? 0 : Math.PI,
      bank: 0,
      pitch: 0,
      z: 0.25 + Math.random() * 0.6,
      zTarget: 0.25 + Math.random() * 0.6,
      sex: Math.random() < 0.5 ? "m" : "f",
      gen: 1,
      parents: [],
      traits: makeTraits(),
      startleT: 0,
      courtT: 0,
      speed: 0,
      wseed: Math.random() * 90
    };
  }
  const STARTER_NAMES = { glimmer: "Sunny", dart: "Stripe", puff: "Coral", azure: "Veilblue", lantern: "Wick", moss: "Pebble", ruby: "Disc", veil: "Ribbon", sunscale: "Koi", pearl: "Fan", claw: "Claw", crab: "Pincer", octo: "Eight", mandarin: "Mandy", pepper: "Mint", tusk: "Tusk", dragon: "Leaf", mask: "Mask" };
  let playing = false;
  let hasSave = false;
  let menuMode = "standard";
  let menuKeeper = "mara";
  let menuPerks = [];
  let menuTheme = "river";
  let menuPicks = ["glimmer", "dart", "puff"];
  let heldOpts = null;
  function themeOf(id) { return THEMES[id] || THEMES.river; }
  function tankAge(now) { return Math.max(0, now - (state.openedAt || now)); }
  function fresh(picks, mode, ownerName, themeId) {
    const ids = (picks && picks.length ? picks : ["glimmer", "dart", "puff"]).slice(0, 3);
    const theme = themeOf(themeId);
    const now = Date.now();
    state = {
      points: 0,
      keeper: menuKeeperPick(ownerName),
      mode: mode || "standard",
      theme: theme.id,
      openedAt: now,
      fish: ids.map(function (id) { return makeFish(id, STARTER_NAMES[id] || specOf(id).name); }),
      cemetery: [],
      log: ["Three fish settle into the " + theme.name + ". Mode: " + (mode || "standard") + "."],
      lastTick: now,
      owner: String(ownerName || "Keeper").slice(0, 18)
    };
    ensureState();
    if (hasPerk("pockets")) state.points = 40;
    if (heldOpts) state.opts = Object.assign(state.opts, heldOpts);
    state.temp = theme.temp;
    state.opts.temp = theme.temp;
    save();
    hasSave = true;
  }
  function ensureState() {
    state.crew = state.crew || [];
    state.predators = state.predators || [];
    state.cemetery = state.cemetery || [];
    state.log = state.log || [];
    state.eggs = state.eggs || [];
    state.goals = state.goals || {};
    state.simV = 2;
    if (state.hatched == null) state.hatched = 0;
    if (state.court == null) state.court = 0;
    if (state.dodge == null) state.dodge = 0;
    if (state.gen == null) state.gen = 1;
    if (state.algae == null) state.algae = 8;
    if (state.quality == null) state.quality = 86;
    if (state.temp == null) state.temp = 25;
    if (!state.waterAt) state.waterAt = Date.now();
    if (!state.theme) state.theme = "river";
    if (!state.keeper) state.keeper = { id: "mara", name: state.owner || "Mara", perks: [] };
    (state.predators || []).forEach(function (p) {
      if (p.pending == null) p.pending = false;
      if (p.victim == null) p.victim = null;
      if (p.heading == null) p.heading = (p.vx || 0) < 0 ? Math.PI : 0;
    });
    (state.fish || []).forEach(function (f) {
      if (f.growth == null) f.growth = Math.max(0, Date.now() - (f.born || Date.now()));
      if (!f.growthAt) f.growthAt = Date.now();
      if (!f.lastFed) f.lastFed = f.born || Date.now();
      const v = vitals(f);
      if (f.hp == null) f.hp = v.hp;
      f.maxHp = v.hp;
      if (!f.hpAt) f.hpAt = Date.now();
      if (!f.traits) f.traits = makeTraits();
      if (!f.sex) f.sex = Math.random() < 0.5 ? "m" : "f";
      if (f.gen == null) f.gen = 1;
      if (!f.parents) f.parents = [];
      if (!f.state) f.state = "cruise";
      if (f.phase == null) f.phase = Math.random() * 6.283;
      if (f.heading == null) f.heading = (f.vx || 0) < 0 ? Math.PI : 0;
      if (f.bank == null) f.bank = 0;
      if (f.pitch == null) f.pitch = 0;
      if (f.z == null) f.z = 0.25 + Math.random() * 0.6;
      if (f.zTarget == null) f.zTarget = f.z;
      if (f.wseed == null) f.wseed = Math.random() * 90;
      if (f.startleT == null) f.startleT = 0;
      if (f.courtT == null) f.courtT = 0;
      const band = (MOTION[f.species] || MOTION.glimmer).band;
      const ymid = (band[0] + band[1]) / 2;
      if (!(f.x >= 0.02 && f.x <= 0.98)) f.x = 0.5;
      if (!(f.y >= 0.1 && f.y <= 0.9)) f.y = ymid;
      f.y = clamp(f.y, 0.1, 0.88);
    });
    if (!state.openedAt) {
      const births = (state.fish || []).map(function (f) { return f.born; }).filter(Boolean);
      state.openedAt = births.length ? Math.min.apply(null, births) : Date.now();
    }
    if (!state.predators.length && !state.clearSince) state.clearSince = state.openedAt || Date.now();
    state.opts = Object.assign({
      names: true, board: true, motion: true, heater: true, temp: 25, clock: "real", sound: true, soundVol: 0.4
    }, state.opts || {});
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE) || "null");
      if (raw && Array.isArray(raw.fish)) {
        state = raw;
        state.cemetery = state.cemetery || [];
        state.log = state.log || [];
        state.points = state.points || 0;
        state.owner = state.owner || "Keeper";
        ensureState();
        if (!state.mode) state.mode = "standard";
        hasSave = true;
        return true;
      }
    } catch (_) {}
    hasSave = false;
    return false;
  }
  function makeCrew(role) {
    const spec = crewOf(role);
    return {
      id: uid(),
      role: role,
      name: spec ? spec.name : role,
      born: Date.now(),
      x: 0.15 + Math.random() * 0.7,
      y: role === "jelly" ? 0.28 : 0.8,
      vx: (Math.random() < 0.5 ? -1 : 1) * 0.02,
      wobble: Math.random() * 6
    };
  }

  function bury(f, now) {
    const age = ageOf(f, now);
    const row = {
      name: f.name,
      species: f.species || f.role || "",
      score: Math.round(age / HOUR),
      tankHours: Math.round(tankAge(now) / HOUR),
      theme: themeOf(state.theme).name,
      stage: f.species ? stageName(bodyAge(f), f.species) : "crew",
      date: new Date(now).toISOString().slice(0, 10)
    };
    state.cemetery.unshift(row);
    state.cemetery = state.cemetery.slice(0, 40);
    log(f.cause === "hunt"
      ? (f.name + " is eaten.")
      : f.cause === "filth"
        ? (f.name + " dies in a dirty tank after " + row.score + " hours.")
        : f.cause === "hunger"
          ? (f.name + " dies unfed after " + row.score + " hours.")
          : (f.name + " rests of old age after " + row.score + " hours."));
    if (window.ArcadeLedger && ArcadeLedger.fish) {
      ArcadeLedger.fish({
        name: row.name,
        score: row.score,
        tankHours: row.tankHours,
        theme: row.theme,
        species: row.species,
        stage: row.stage,
        date: row.date,
        event: "life"
      });
    }
  }
  function predOf(id) { return PREDATORS[id] || PREDATORS.pike; }
  function makePredator(kind, boss) {
    const spec = predOf(kind);
    const now = Date.now();
    return {
      id: uid(),
      kind: kind,
      name: boss ? (spec.name + " boss") : (spec.name + " fry"),
      boss: !!boss,
      adult: !!boss,
      adultAt: boss ? now : now + HOUR,
      nextRoll: now + HOUR,
      fails: 0,
      streak: 0,
      elder: false,
      depth: 0.16,
      away: 0,
      backAt: now + 45000,
      hp: (PRED_STAT[kind] || PRED_STAT.pike).hp,
      maxHp: (PRED_STAT[kind] || PRED_STAT.pike).hp,
      born: now,
      x: 0.15 + Math.random() * 0.7,
      y: 0.28 + Math.random() * 0.3,
      vx: 0.03,
      face: 1
    };
  }
  function tickHealth(f, now) {
    const v = vitals(f);
    if (f.hp == null) f.hp = v.hp;
    const from = f.hpAt || f.born || now;
    const span = Math.min(48, Math.max(0, (now - from) / HOUR));
    f.hpAt = now;
    if (span <= 0) return;
    const unfed = now - (f.lastFed || f.born) > v.food * HOUR;
    const dirty = (state.quality || 100) < 45 || (state.algae || 0) > 68;
    const crowded = state.fish.length >= (hasPerk("crowd") ? 42 : 30);
    let delta = 0;
    if (!unfed && !dirty && !crowded) delta += v.regen * span;
    else if (!unfed && !dirty) delta += v.regen * 0.4 * span;
    if (unfed) delta -= v.hurt * span;
    if (dirty) delta -= (5 + (crowded ? 4 : 0)) * span;
    else if (crowded) delta -= 2 * span;
    const off = comfort(f);
    if (off > 2.5) delta -= (1.1 + (off - 2.5) * 1.5) * span;
    f.hp = clamp((f.hp || 0) + delta, 0, v.hp);
  }
  const AUTO_CAST = ["dart", "ruby", "lantern", "pearl", "glimmer", "moss", "veil", "puff", "sunscale", "azure", "crab", "claw", "octo", "mandarin", "pepper", "tusk", "dragon", "mask"];
  function autoSpecies() {
    let best = AUTO_CAST[0];
    let bestN = 99;
    AUTO_CAST.forEach(function (id) {
      const n = state.fish.filter(function (f) { return f.species === id; }).length;
      if (n < bestN) { bestN = n; best = id; }
    });
    return best;
  }
  function tickAuto(now) {
    if (!state.auto || !playing) return;
    if (state._autoAt && now - state._autoAt < 20000) return;
    state._autoAt = now;
    const soon = state.fish.some(function (f) { return foodLeft(f, now) < 3 * HOUR; });
    if ((soon || !state.fish.length) && !hand && !flakes.length) startHand("flakes");
    if ((state.quality < 60 || state.algae > 45) && state.points >= 10) {
      state.points -= 10;
      state.algae = clamp(state.algae - 28, 0, 100);
      state.quality = clamp(state.quality + 24, 0, 100);
      log("Auto keeper changes some water.");
    }
    const crewN = (state.crew || []).length;
    if (crewN < 2 && state.points >= 20 && state.algae > 25) {
      state.points -= 20;
      state.crew.push(makeCrew("snail"));
      log("Auto keeper adds a nerite.");
    } else if (crewN < 4 && state.points >= 28 && state.quality < 65) {
      state.points -= 28;
      state.crew.push(makeCrew("cory"));
      log("Auto keeper adds a cory.");
    }
    const goal = (state.predators || []).length ? 16 : 12;
    const cost = price();
    if (state.fish.length < goal && state.fish.length < fishCap() && state.quality >= 50 && state.points >= cost) {
      let id = autoSpecies();
      if (id === "octo" && hasOcto()) id = "dart";
      state.points -= cost;
      const fish = makeFish(id, specOf(id).name);
      state.fish.push(fish);
      log("Auto keeper adds " + fish.name + ". Hunters are not touched.");
    }
    const weak = state.fish.slice().sort(function (a, b) { return (a.hp || 0) - (b.hp || 0); })[0];
    if (weak && (weak.hp || 0) < vitals(weak).hp * 0.35 && state.points >= 15 && !hand && !flakes.length) {
      state.points -= 15;
      if (!startHand("pellet")) state.points += 15;
    }
  }
  function huntChance(f, now) {
    const v = vitals(f);
    const hpRatio = clamp((f.hp || 0) / (v.hp || 1), 0, 1);
    const fedRatio = clamp(foodLeft(f, now) / (v.food * HOUR), 0, 1);
    let chance = clamp(0.25 + (1 - hpRatio) * 0.4 + (1 - fedRatio) * 0.3, 0.25, 0.85);
    if (f.species === "octo" && (f.inkUntil || 0) > now) chance = clamp(chance - 0.10, 0.05, 0.85);
    if (f.species === "mandarin") chance = clamp(chance - 0.08, 0.05, 0.85);
    if (f.species === "dragon" && nearWeed(f)) chance = clamp(chance - 0.12, 0.05, 0.85);
    if (hasPerk("keen")) chance = clamp(chance - 0.05, 0.05, 0.85);
    return chance;
  }
  function nearWeed(f) {
    let close = false;
    decorOf().forEach(function (d) {
      if (d.kind === "weed" && Math.hypot(f.x - d.x, f.y - d.y) < 0.16) close = true;
    });
    return close;
  }
  function hasOcto(exceptId) {
    return (state.fish || []).some(function (f) { return f.species === "octo" && f.id !== exceptId; });
  }
  function releaseInk(f, now) {
    f.inkUntil = now + 14000;
    if ((f.inkCd || 0) > now) return;
    f.inkCd = now + 700;
    for (let i = 0; i < 3; i += 1) {
      inks.push({
        x: clamp(f.x - (f.face || 1) * 0.04 + (Math.random() - 0.5) * 0.06, 0.04, 0.96),
        y: clamp(f.y + (Math.random() - 0.5) * 0.05, 0.12, 0.86),
        born: now,
        life: 2200 + Math.random() * 900,
        drift: (Math.random() - 0.5) * 0.03
      });
    }
    if (!f.inkSaid || now - f.inkSaid > 8000) {
      f.inkSaid = now;
      log(f.name + " throws a cloud of black ink.");
    }
  }
  function weakestPrey(now) {
    const prey = state.fish.slice();
    if (!prey.length) return null;
    prey.sort(function (a, b) {
      const ah = (a.hp || 0) / vitals(a).hp;
      const bh = (b.hp || 0) / vitals(b).hp;
      if (ah !== bh) return ah - bh;
      return foodLeft(a, now) - foodLeft(b, now);
    });
    return prey[0];
  }
  function stalkTarget(p) {
    if (!p.victim) return null;
    return state.fish.filter(function (f) { return f.id === p.victim; })[0] || null;
  }
  function predMax(p) { return p && p.elder ? PRED_STAT.jaws.hp : (PRED_STAT[p.kind] || PRED_STAT.pike).hp; }
  function predDmg(p) { return p && p.elder ? PRED_STAT.jaws.dmg : (PRED_STAT[p.kind] || PRED_STAT.pike).dmg; }
  function notePredator(p) {
    if (p.elder == null) p.elder = false;
    if (p.streak == null) p.streak = 0;
    p.maxHp = predMax(p);
    if (p.hp == null) p.hp = p.maxHp;
    p.hp = clamp(p.hp, 0, p.maxHp);
  }
  function becomeJaws(p) {
    p.elder = true;
    p.name = "JAWS";
    p.maxHp = PRED_STAT.jaws.hp;
    p.hp = Math.min(p.maxHp, Math.round((p.hp || PRED_STAT.shark.hp) + p.maxHp * 0.2));
    log("Greymaw becomes JAWS. It is larger, it stalks, and an eat hour can take two fish.");
    playSfx("omen");
  }
  function rollPredator(p, now, reason, allowBaby, countFail) {
    const victim = weakestPrey(now);
    p.pending = false;
    p.victim = null;
    p._stalkSaid = false;
    if (!victim) {
      if (countFail !== false) p.fails = (p.fails || 0) + 1;
      if (p.kind === "shark" && !p.elder) p.streak = 0;
      log(p.name + " finds no fish." + ((p.fails || 0) >= 2 ? " Two empty hours. It dies." : " It has one more hour."));
      p.nextRoll = now + HOUR;
      return false;
    }
    const chance = huntChance(victim, now);
    const roll = 1 + ((Math.random() * 100) | 0);
    const hit = roll <= Math.round(chance * 100);
    if (hit) {
      victim.cause = "hunt";
      bury(victim, now);
      state.fish = state.fish.filter(function (f) { return f !== victim; });
      if (selected === victim.id) selected = null;
      if (countFail !== false) p.fails = 0;
      let born = false;
      if (allowBaby && state.predators.length < HUNTER_CAP) {
        state.predators.push(makePredator(p.kind, false));
        born = true;
      } else if (allowBaby) {
        log("The hunter line is full at " + HUNTER_CAP + ". No baby this hour.");
      }
      if (p.elder) p.hp = Math.min(predMax(p), (p.hp || predMax(p)) + predMax(p) * 0.25);
      if (p.kind === "shark" && !p.elder) {
        p.streak = (p.streak || 0) + 1;
        if (p.streak >= 3) becomeJaws(p);
      }
      log(p.name + " rolls " + roll + " against " + Math.round(chance * 100) + "% and eats " + victim.name +
        (reason === "contact" ? " in the open" : ", the weakest") +
        (victim.species === "octo" && (victim.inkUntil || 0) > now ? " through the ink" : "") +
        (born ? ". A baby hunter is born." : "."));
      if (p.elder) keeperNote(p.name + " just took " + victim.name + ". I am sorry. Stay with the others.");
      else keeperNote(p.name + " took " + victim.name + ". The rest are still here.");
      addRipple(victim.x, victim.y);
      playSfx("bite");
      playSfx("death");
      p.forwardUntil = now + 20000;
      p.nextRoll = now + HOUR;
      return true;
    }
    if (countFail !== false) p.fails = (p.fails || 0) + 1;
    if (p.kind === "shark" && !p.elder) p.streak = 0;
    if (reason === "contact") state.dodge = (state.dodge || 0) + 1;
    log(p.name + " rolls " + roll + " against " + Math.round(chance * 100) + "% and misses " + victim.name +
      (reason === "contact" ? " at the last moment" : reason === "away" ? "" : ", which reached cover") +
      (victim.species === "octo" && (victim.inkUntil || 0) > now ? ". The ink takes 10% off the bite" : "") +
      "." + ((p.fails || 0) >= 2 ? " Two misses in a row. It dies." : " It has one more hour."));
    p.forwardUntil = now + 16000;
    p.nextRoll = now + HOUR;
    return false;
  }
  function predatorBattle(a, b) {
    notePredator(a);
    notePredator(b);
    const until = Date.now() + 22000;
    a.forwardUntil = until;
    b.forwardUntil = until;
    a.goneUntil = 0;
    b.goneUntil = 0;
    playSfx("battle");
    const bits = [a.name + " and " + b.name + " fight."];
    for (let round = 0; round < 2 && a.hp > 0 && b.hp > 0; round += 1) {
      const da = Math.round(predDmg(a) * (0.82 + Math.random() * 0.36));
      const db = Math.round(predDmg(b) * (0.82 + Math.random() * 0.36));
      b.hp = Math.max(0, b.hp - da);
      a.hp = Math.max(0, a.hp - db);
      if (b.hp <= 0 && a.hp > 0) a.hp = Math.max(0, a.hp - Math.round(db * 0.7));
      if (a.hp <= 0 && b.hp > 0) b.hp = Math.max(0, b.hp - Math.round(da * 0.35));
      bits.push(a.name + " deals " + da + ". " + b.name + " deals " + db + ".");
    }
    if (a.hp <= 0) a.fails = 2;
    if (b.hp <= 0) b.fails = 2;
    bits.push(a.name + " " + Math.round(a.hp) + "/" + a.maxHp + " hp. " + b.name + " " + Math.round(b.hp) + "/" + b.maxHp + " hp.");
    log(bits.join(" "));
  }
  function runPredatorHour(now) {
    let spawnLeft = 1;
    const jaws = state.predators.filter(function (p) { return p.elder && p.adult && (p.fails || 0) < 2; })[0];
    const foes = state.predators.filter(function (p) {
      return p.adult && !p.elder && p.kind !== "shark" && (p.fails || 0) < 2;
    });
    let jawsBattled = false;
    if (jaws && foes.length && Math.random() < 0.5) {
      predatorBattle(jaws, foes[(Math.random() * foes.length) | 0]);
      jawsBattled = true;
      log("One predator battle this tank hour.");
    }
    state.predators.slice().forEach(function (p) {
      if (!p.adult || (p.fails || 0) >= 2) return;
      if (p.elder && jawsBattled) {
        log(p.name + " spent the hour fighting. The eat waits.");
        return;
      }
      if (p.elder) {
        let ate = 0;
        for (let i = 0; i < 2; i += 1) {
          const before = state.predators.length;
          if (rollPredator(p, now, "hour", spawnLeft > 0, false)) {
            ate += 1;
            if (state.predators.length > before) spawnLeft = 0;
          }
        }
        if (ate) {
          p.fails = 0;
          log(p.name + " recovers " + (ate * 25) + "% from the meal.");
        } else {
          p.fails = (p.fails || 0) + 1;
          log(p.name + ((p.fails || 0) >= 2 ? " misses two eat hours and dies." : " misses the eat hour. One hour left."));
        }
        return;
      }
      const before = state.predators.length;
      rollPredator(p, now, "hour", spawnLeft > 0, true);
      if (state.predators.length > before) spawnLeft = 0;
    });
  }
  let thanksQueued = false;
  function queueThanks() {
    if (playing) openThanks();
    else thanksQueued = true;
  }
  function openThanks() {
    const el = document.getElementById("thanksLayer");
    if (!el) return;
    thanksQueued = false;
    el.classList.remove("hidden");
  }
  function closeThanks() {
    const el = document.getElementById("thanksLayer");
    if (el) el.classList.add("hidden");
    thanksQueued = false;
  }
  function armStalk(now) {
    const due = (state.hourAt || now) + HOUR;
    if (now < due - STALK_LEAD || now >= due) return;
    if (state._stalkedHour === state.hourAt) return;
    let any = false;
    state.predators.forEach(function (p) {
      if (!p.adult || (p.fails || 0) >= 2) return;
      const victim = weakestPrey(now);
      p.pending = true;
      p.stalkAt = now;
      p.victim = victim ? victim.id : null;
      any = true;
      if (victim && !p._stalkSaid) {
        log(p.name + " turns toward " + victim.name + ", the weakest. The shoal scatters.");
        victim.startleT = 2.5;
        p._stalkSaid = true;
      }
    });
    if (any) {
      state._stalkedHour = state.hourAt;
      playSfx("chase");
    }
  }
  function onTankHour(now) {
    state.fish.forEach(function (f) {
      const fed = now - (f.lastFed || f.born) < FED_FAST;
      addGrowthHours(f, fed ? 2 : 1);
    });
    const living = state.predators.filter(function (p) { return (p.fails || 0) < 2; });
    if (!living.length) {
      if (!state.clearSince) state.clearSince = state.openedAt || now;
      if (hasPerk("sanctuary")) return;
      if (now - state.clearSince >= quietNeed()) {
        const kinds = ["pike", "cinder", "gar", "eel", "shark"];
        const kind = kinds[(Math.random() * kinds.length) | 0];
        if (state.predators.length >= HUNTER_CAP) {
          log("The hunter line is full at " + HUNTER_CAP + ". No new boss this hour.");
          return;
        }
        state.predators.push(makePredator(kind, true));
        state.clearSince = 0;
        log("Boss " + predOf(kind).name + " enters. One hunter a tank hour. A full fish is 25%. Two misses and it dies. You cannot stop it.");
        playSfx("chase");
      }
      return;
    }
    runPredatorHour(now);
  }
  function tickPredators(now) {
    state.predators = state.predators || [];
    state.predators.forEach(function (p) {
      if (p.pending == null) p.pending = false;
      if (p.heading == null) p.heading = p.vx < 0 ? Math.PI : 0;
      notePredator(p);
      if (!p.adult && now >= (p.adultAt || 0)) {
        p.adult = true;
        if (!p.elder) p.name = predOf(p.kind).name;
        p.nextRoll = (p.adultAt || now) + HOUR;
        log(p.name + " is grown. It hunts on the next tank hour.");
      }
    });
    if (!state.hourAt) state.hourAt = now;
    let guard = 0;
    while (now - state.hourAt >= HOUR && guard < 72) {
      state.hourAt += HOUR;
      guard += 1;
      onTankHour(state.hourAt);
    }
    if (guard) queueThanks();
    armStalk(now);
    const before = state.predators.length;
    state.predators = state.predators.filter(function (p) { return (p.fails || 0) < 2; });
    if (state.predators.length > HUNTER_CAP) {
      state.predators.sort(function (a, b) {
        return (b.elder ? 2 : b.adult ? 1 : 0) - (a.elder ? 2 : a.adult ? 1 : 0);
      });
      state.predators = state.predators.slice(0, HUNTER_CAP);
    }
    if (before && !state.predators.length) state.clearSince = now;
    if (!state.predators.length) {
      if (!state.clearSince) state.clearSince = state.openedAt || now;
    } else state.clearSince = 0;
  }
  function predClose(p, now) {
    return !!(p && (p.pending || now < (p.forwardUntil || 0)));
  }
  function stepPredator(p, dt) {
    const now = Date.now();
    if (p.phase == null) p.phase = Math.random() * 6.28;
    if (p.depth == null) p.depth = 0.16;
    if (p.away == null) p.away = 0;
    if (p.backAt == null) p.backAt = now + 30000;
    const close = predClose(p, now);
    if (close) p.goneUntil = 0;
    else if (!(p.goneUntil > now) && now > p.backAt && Math.random() < dt * 0.01) {
      p.goneUntil = now + (120 + Math.random() * 180) * 1000;
      p.leaveX = Math.random() < 0.5 ? -0.28 : 1.28;
    }
    const leaving = !close && (p.goneUntil || 0) > now;
    if (leaving && !p._leftSaid) {
      p._leftSaid = true;
      log(p.name + " slips into the far water.");
    }
    if (!leaving) p._leftSaid = false;
    if (!leaving && p.away < 0.08 && p.goneUntil && now >= p.goneUntil) {
      p.backAt = now + (50 + Math.random() * 80) * 1000;
      p.goneUntil = 0;
    }
    p.depth += ((close ? 1 : 0.16) - p.depth) * Math.min(1, dt * (close ? 1.15 : 0.4));
    p.away += ((leaving ? 1 : 0) - p.away) * Math.min(1, dt * 0.35);
    const prey = p.pending ? stalkTarget(p) : null;
    if (p.pending && !prey) { p.pending = false; p.victim = null; }
    let sp = p.adult ? 0.13 : 0.07;
    let dx = 0, dy = 0;
    const leavingNow = !predClose(p, now) && (p.goneUntil || 0) > now;
    if (prey && !leavingNow) {
      const to = unitDir(p, prey.x, prey.y);
      dx = to.x * 2.2;
      dy = to.y * 2.2;
      sp = 0.58 * (p.adult ? 1 : 0.6);
      if (to.d < 0.3) sp *= 1.25;
      p.lunge = to.d < 0.16 ? 1 : 0;
      if (to.d < (p.elder ? 0.16 : (p.adult ? 0.11 : 0.05))) p.lunge = 1;
    } else if (leavingNow) {
      dx = (p.leaveX || 1.2) - p.x;
      dy = (0.42 - p.y) * 0.4;
      sp = 0.16;
    } else if ((p.away || 0) > 0.2) {
      dx = 0.5 - p.x;
      dy = 0.4 - p.y;
      sp = 0.1;
    } else if (Math.random() < dt * 0.4) {
      p.wanderA = (p.wanderA || 0) + (Math.random() - 0.5) * 1.6;
      dx = Math.cos(p.wanderA);
      dy = Math.sin(p.wanderA) * 0.5;
    } else {
      dx = Math.cos(p.wanderA == null ? 0 : p.wanderA);
      dy = Math.sin(p.wanderA == null ? 0 : p.wanderA) * 0.5;
    }
    const out = { x: dx, y: dy };
    if (!leavingNow && (p.away || 0) < 0.35) {
      decorSteer(p, out);
      wallSteer(p, out);
    }
    const mag = Math.hypot(out.x, out.y) || 1;
    const vx = out.x / mag * sp, vy = out.y / mag * sp * AR;
    const step = (sp * 3 + 0.05) * dt;
    p.vx += clamp(vx - p.vx, -step, step);
    p.vy += clamp(vy - (p.vy || 0), -step, step);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if ((p.away || 0) < 0.45) {
    if (p.x < 0.05) { p.x = 0.05; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x > 0.95) { p.x = 0.95; p.vx = -Math.abs(p.vx) * 0.4; }
    } else {
      p.x = clamp(p.x, -0.35, 1.35);
    }
    if (p.y < 0.1) { p.y = 0.1; p.vy = Math.abs(p.vy) * 0.4; }
    if (p.y > 0.86) { p.y = 0.86; p.vy = -Math.abs(p.vy) * 0.4; }
    const want = Math.atan2(p.vy / AR, p.vx);
    let diff = want - p.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.heading += clamp(diff, -1.6 * dt, 1.6 * dt);
    p.face = Math.cos(p.heading) >= 0 ? 1 : -1;
    p.bank = (p.bank || 0) + (clamp(clamp(diff, -1.6 * dt, 1.6 * dt) / Math.max(dt, 0.01) * 0.16, -0.3, 0.3) - (p.bank || 0)) * Math.min(1, dt * 4);
    p.phase += dt * (2.2 + Math.hypot(p.vx, p.vy / AR) * 22);
    if (p.kind === "eel") {
      if (!p.pending) p.zapSaid = false;
      p.zapT = Math.max(0, (p.zapT || 0) - dt);
      p.zapCd = (p.zapCd == null ? 0.6 : p.zapCd) - dt;
      if (p.zapCd <= 0) {
        p.zapT = p.pending ? 0.55 : 0.32;
        p.zapCd = p.pending ? 1.15 : (p.adult ? 3.1 : 4.6);
        if (p.adult) shockFish(p);
      }
    }
  }
  function shockFish(p) {
    const reach = p.pending ? 0.3 : 0.18;
    let hit = 0;
    state.fish.forEach(function (f) {
      const d = span3(f.x, f.y, depthOf(f), p.x, p.y, depthOf(p));
      if (d > reach) return;
      f.startleT = Math.max(f.startleT || 0, 1.6);
      f.hp = Math.max(1, (f.hp || 1) - (p.pending ? 5 : 2));
      const push = (f.x - p.x) || (Math.random() - 0.5);
      f.vx += push * 1.1;
      f.vy += (f.y - p.y) * 0.35;
      hit += 1;
    });
    if (hit && p.pending && !p.zapSaid) {
      p.zapSaid = true;
      log(p.name + " cracks the water. " + hit + (hit > 1 ? " fish jolt." : " fish jolts."));
    }
  }
  function drawPredator(p, w, h, now) {
    const age = p.adult ? "adult" : "baby";
    let key = p.kind + "_" + age;
    if (p.kind === "shark" && p.elder) {
      const stalking = p.pending && ((Math.floor(now / 280) % 2) === 1);
      key = stalking ? "shark_elder_stalk" : "shark_elder";
    } else if (p.kind === "eel" && (p.zapT || 0) > 0) {
      const alt = p.adult && ((Math.floor(now / 140) % 2) === 1);
      key = alt ? "eel_adult_zap2" : (key + "_zap");
    }
    const img = PRED_SPRITES[key] || PRED_SPRITES[p.kind + "_" + age];
    if ((p.away || 0) > 0.97) return;
    const depth = p.depth == null ? 0.2 : p.depth;
    const far = 0.36 + depth * 0.64;
    const sc = (p.elder ? 1.9 : (p.kind === "eel" ? (p.adult ? 0.72 : 0.4) : (p.adult ? 1.35 : 0.55))) * far;
    const bh = Math.min(h * (p.kind === "eel" ? 0.13 : 0.2), p.kind === "eel" ? 86 : 140) * sc;
    let bw = bh * 2.2;
    if (img && img.complete && img.naturalWidth) bw = bh * (img.naturalWidth / img.naturalHeight);
    if (p.kind === "eel") {
      bw = Math.min(w * 0.46, 520) * (p.adult ? 1 : 0.52) * far;
      bh = img && img.complete && img.naturalWidth ? bw * (img.naturalHeight / img.naturalWidth) : bw * 0.22;
    }
    const x = p.x * w;
    const y = (p.y * depth + 0.4 * (1 - depth)) * h;
    const alpha = (0.32 + depth * 0.68) * (1 - (p.away || 0) * 0.9);
    if (depth > 0.62) {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#240608";
    ctx.beginPath();
    ctx.ellipse(x, h * 0.92, bw * 0.3, bh * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    }
    if (p.pending && depth > 0.55) {
      const pulse = state.opts.motion === false ? 0.5 : 0.45 + Math.sin(now / 300) * 0.35;
      const g = ctx.createRadialGradient(x, y, 2, x, y, bh * 1.6);
      g.addColorStop(0, "rgba(251,113,133," + (0.22 * pulse).toFixed(3) + ")");
      g.addColorStop(1, "rgba(251,113,133,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - bh * 1.7, y - bh * 1.7, bh * 3.4, bh * 3.4);
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    if (depth < 0.82) ctx.filter = "saturate(0.62) brightness(0.78)";
    ctx.translate(x, y);
    ctx.scale(p.face === -1 ? -1 : 1, 1);
    const wag = state.opts.motion === false ? 0 : Math.sin(p.phase || 0) * (p.kind === "eel" && p.zapT > 0 ? 0.02 : (p.pending ? 0.09 : 0.045));
    ctx.rotate(wag + (p.bank || 0) * 0.5);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);
    ctx.restore();
    if (p.kind === "eel" && p.zapT > 0 && state.opts.motion !== false) {
      const pulse = 0.45 + Math.sin(now / 80) * 0.35;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, Math.max(24, bw * 0.45));
      glow.addColorStop(0, "rgba(186,240,255," + (0.28 * pulse).toFixed(3) + ")");
      glow.addColorStop(1, "rgba(120,200,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - bw * 0.6, y - bh, bw * 1.2, bh * 2);
      ctx.save();
      ctx.globalAlpha = Math.min(0.9, p.zapT * 2);
      ctx.strokeStyle = "rgba(214,246,255,0.9)";
      ctx.lineWidth = 1.6;
      const face = p.face === -1 ? -1 : 1;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + face * bw * 0.18, y);
        let px = x + face * bw * 0.18;
        let py = y;
        for (let s = 1; s <= 5; s += 1) {
          px += face * bw * 0.07;
          py += Math.sin(now / 45 + s * 1.7 + i) * bh * 0.22;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    if (state.opts.names !== false && depth > 0.62 && (p.away || 0) < 0.35) {
      ctx.fillStyle = "#fb7185";
      ctx.font = "700 13px Syne, sans-serif";
      ctx.textAlign = "center";
      const wait = Math.max(0, (p.nextRoll || now) - now);
      ctx.fillText(p.name + (p.adult ? "" : " · baby"), x, y - bh / 2 - 8);
      ctx.font = "600 11px Source Sans 3, sans-serif";
      const hpLine = p.maxHp ? (Math.round(p.hp || 0) + "/" + p.maxHp + " hp") : "";
      ctx.fillText((p.pending ? "stalking" : (p.adult ? ("hunts in " + hours(wait) + "h") : ("grows " + hours(Math.max(0, (p.adultAt || now) - now)) + "h"))) + (hpLine ? " · " + hpLine : ""), x, y - bh / 2 + 6);
    }
  }
  /* ---------------- generations: courtship, eggs, fry ---------------- */
  function fryName(sp) {
    const base = specOf(sp).name;
    const taken = state.fish.filter(function (f) { return f.name.indexOf(base) === 0; }).length;
    return taken ? base + " " + (taken + 1) : base;
  }
  function eggSpot() {
    const spots = decorOf().filter(function (d) { return d.egg; });
    if (!spots.length) return { x: 0.5, y: 0.8 };
    return spots[(Math.random() * spots.length) | 0];
  }
  function layEggs(a, b, now) {
    const spot = eggSpot();
    const room = EGG_CAP - state.eggs.length;
    if (room <= 0) return;
    const n = Math.min(room, Math.random() < 0.35 ? 3 : 2);
    const fast = (state.quality || 0) >= 82;
    for (let i = 0; i < n; i += 1) {
      state.eggs.push({
        id: uid(),
        species: a.species,
        x: clamp(spot.x + (Math.random() - 0.5) * 0.05, 0.06, 0.94),
        y: clamp(spot.y + (Math.random() - 0.5) * 0.04, 0.1, 0.86),
        laid: now,
        hatchAt: now + (fast ? HATCH_MS * 0.7 : HATCH_MS) * (hasPerk("quickfry") ? 0.65 : 1),
        gen: Math.max(a.gen || 1, b.gen || 1) + 1,
        traits: makeTraits(traits(a), traits(b)),
        parents: [a.name, b.name]
      });
    }
    log(a.name + " and " + b.name + " leave " + n + " " + specOf(a.species).name + " eggs on the rockwork.");
    addRipple(clamp(spot.x, 0.06, 0.94), clamp(spot.y, 0.1, 0.86));
    save();
  }
  function tickEggs(now) {
    state.eggs = state.eggs || [];
    if (!state.eggs.length) return;
    const hatchList = [], lostList = [];
    const foul = (state.quality || 100) < 22;
    state.eggs.forEach(function (e) {
      if (now >= e.hatchAt) hatchList.push(e);
      else if (foul) lostList.push(e);
    });
    if (lostList.length) {
      state.eggs = state.eggs.filter(function (e) { return lostList.indexOf(e) < 0; });
      log(lostList.length + " egg" + (lostList.length > 1 ? "s" : "") + " never hatch. The water is foul.");
      save();
    }
    hatchList.forEach(function (e) {
      state.eggs = state.eggs.filter(function (o) { return o !== e; });
      if (state.fish.length >= fishCap()) { log("An egg hatches but the glass is full."); return; }
      if (e.species === "octo" && hasOcto()) { log("An octopus egg fades. One already keeps this glass."); return; }
      const fry = makeFish(e.species, fryName(e.species));
      fry.traits = e.traits || makeTraits();
      fry.gen = e.gen || 2;
      fry.parents = (e.parents || []).slice();
      fry.x = e.x;
      fry.y = e.y;
      fry.vx = 0.01;
      state.fish.push(fry);
      state.hatched = (state.hatched || 0) + 1;
      state.gen = Math.max(state.gen || 1, fry.gen);
      state.points += 12;
      log("A fry hatches by the rockwork: " + fry.name + ", generation " + fry.gen + ", from " +
        (fry.parents.join(" and ") || "the pair") + ". +12");
      addRipple(e.x, e.y);
      save();
    });
  }
  function breedCheck(now) {
    if (!playing || !state) return;
    state.eggs = state.eggs || [];
    if (state.eggs.length >= EGG_CAP) return;
    if (state.fish.length + state.eggs.length >= 40) return;
    if ((state.quality || 0) < 62 || (state.algae || 0) > 55) return;
    if (now - (state._breedAt || 0) < 12 * 60000) return;
    const ready = state.fish.filter(function (f) {
      const grown = stageName(bodyAge(f), f.species);
      return (grown === "adult" || grown === "elder") && bodyAge(f) <= cycleOf(f.species)[5] * HOUR * 0.9 &&
        (f.hp || 0) >= vitals(f).hp * 0.7 &&
        now - (f.lastFed || f.born) < 3 * HOUR &&
        now - (f.spawnCd || 0) > 45 * 60000 &&
        f.species !== "octo" && f.species !== "dragon";
    });
    if (ready.length < 2) return;
    let pair = null;
    for (let i = 0; i < ready.length && !pair; i += 1) {
      for (let j = i + 1; j < ready.length; j += 1) {
        if (ready[i].species === ready[j].species && ready[i].sex !== ready[j].sex) { pair = [ready[i], ready[j]]; break; }
      }
    }
    if (!pair) return;
    pair.forEach(function (f) {
      f.courtT = 7;
      f.spawnCd = now;
      f.lastPlay = now;
      f.state = "court";
      f.idleT = 7;
      f.actionT = 0;
      f.action = "";
    });
    state._breedAt = now;
    state.court = (state.court || 0) + 1;
    const layer = pair[0].sex === "f" ? pair[0] : pair[1];
    layer.layAt = now + 7000;
    log(pair[0].name + " and " + pair[1].name + " turn slow circles. " + specOf(pair[0].species).name + " eggs are coming.");
  }
  function spawnLayCheck(now) {
    state.fish.forEach(function (f) {
      if (f.layAt && now >= f.layAt) {
        f.layAt = 0;
        const mate = state.fish.filter(function (o) {
          return o !== f && o.species === f.species && now - (o.spawnCd || 0) < 30000;
        })[0];
        if (mate) layEggs(f, mate, now);
      }
    });
  }
  /* ---------------- first-time marks ---------------- */
  function checkGoals(now) {
    state.goals = state.goals || {};
    const counts = {};
    state.fish.forEach(function (f) { counts[f.species] = (counts[f.species] || 0) + 1; });
    const anySpeciesAt = function (n) {
      return Object.keys(counts).some(function (k) { return counts[k] >= n; });
    };
    let oldest = 0;
    state.fish.forEach(function (f) { oldest = Math.max(oldest, bodyAge(f)); });
    const met = {
      adult: state.fish.some(function (f) {
        const s = stageName(bodyAge(f), f.species);
        return s === "adult" || s === "elder";
      }),
      court: (state.court || 0) >= 1,
      hatch: (state.hatched || 0) >= 1,
      dodge: (state.dodge || 0) >= 1,
      eight: state.fish.length >= 8,
      crew5: (state.crew || []).length >= 5,
      school: anySpeciesAt(6),
      elder: state.fish.some(function (f) { return stageName(bodyAge(f), f.species) === "elder"; }),
      hundred: state.fish.some(function (f) { return ageOf(f, now) >= 100 * HOUR; }),
      twenty: state.fish.length >= 20,
      clear: (state.quality || 0) >= 95 && state.fish.length >= 12,
      gen3: (state.gen || 1) >= 3,
      thirty: state.fish.length >= 30,
      allten: SPECIES.every(function (s) { return counts[s.id]; })
    };
    GOALS.forEach(function (g) {
      if (state.goals[g.id] || !met[g.id]) return;
      state.goals[g.id] = now;
      state.points += g.pay;
      log("First time — " + g.text + ". +" + g.pay + " pts.");
      save();
    });
  }
  /* ---------------- ambient water: motes, ripples, air ---------------- */
  function seedMotes() {
    motes = [];
    for (let i = 0; i < 42; i += 1) {
      motes.push({
        x: Math.random(), y: Math.random(), z: 0.12 + Math.random() * 0.88,
        r: 0.6 + Math.random() * 1.7, ph: Math.random() * 6.28
      });
    }
  }
  function addRipple(x, y) {
    if (!state || state.opts.motion === false) return;
    if (ripples.length > 24) return;
    ripples.push({ x: x, y: y, r: 0.008, t: 0 });
  }
  function stepAmbient(dt, now) {
    if (!motes.length) seedMotes();
    if (state.opts.motion === false) return;
    motes.forEach(function (m) {
      m.ph += dt * (0.35 + m.z * 0.7);
      m.x += (0.004 + m.z * 0.01) * dt + Math.sin(m.ph) * 0.0035 * dt;
      m.y -= 0.0035 * dt;
      if (m.x > 1.02) m.x = -0.02;
      if (m.y < -0.02) m.y = 1.02;
    });
    ripples.forEach(function (r) { r.t += dt; r.r += dt * 0.2; });
    if (ripples.length) ripples = ripples.filter(function (r) { return r.t < 2.4; });
  }
  function catchUp(now) {
    const dead = [];
    state.fish.forEach(function (f) {
      accrueGrowth(f, now);
      tickHealth(f, now);
      const unfed = now - (f.lastFed || f.born) > vitals(f).food * HOUR;
      const old = bodyAge(f) >= lifeOf(f);
      if ((f.hp || 0) <= 0 || old) {
        f.cause = old ? "age" : (unfed ? "hunger" : "filth");
        dead.push(f);
      }
    });
    const retired = [];
    (state.crew || []).forEach(function (c) {
      if (now - c.born >= CREW_LIFE) retired.push(c);
    });
    if (retired.length) {
      retired.forEach(function (c) { log(c.name + " finishes a month of work."); });
      state.crew = state.crew.filter(function (c) { return retired.indexOf(c) < 0; });
    }
    tickPredators(now);
    tickEggs(now);
    if (dead.length) {
      playSfx("death");
      dead.forEach(function (f) { bury(f, now); });
      state.fish = state.fish.filter(function (f) { return dead.indexOf(f) < 0; });
      if (selected && dead.some(function (f) { return f.id === selected; })) selected = null;
      if (!state.fish.length) {
        const sp = SPECIES[(Math.random() * SPECIES.length) | 0].id;
        const fry = makeFish(sp, "Fry");
        state.fish.push(fry);
        selected = fry.id;
        log("The glass was empty. A fry drifted in so the tank can go on.");
      }
      save();
    } else if (retired.length) save();
    if (now - (state._lifeAt || 0) > 5000) {
      state._lifeAt = now;
      spawnLayCheck(now);
      breedCheck(now);
      checkGoals(now);
    }
  }
  function award(f, n, why) {
    const mood = moodOf(f, Date.now());
    const gain = Math.max(1, Math.round(n * (mood === "happy" ? 1.25 : mood === "sad" ? 0.5 : 1)));
    state.points += gain;
    f.lastPlay = Date.now();
    log(f.name + " " + why + " +" + gain);
  }
  function nearest(f) {
    let best = null, bd = 1e9;
    state.fish.forEach(function (o) {
      if (o === f) return;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  }
  function startPlay(f) {
    const kind = specOf(f.species).play;
    const other = nearest(f);
    f.action = kind;
    f.actionT = kind === "jump" ? 1.1 : kind === "race" ? 2.4 : 1.8;
    if (kind === "race" && other) {
      other.action = "race";
      other.actionT = 2.4;
      f.tx = 0.9; other.tx = 0.9;
      award(f, 8, "races " + other.name);
    } else if (kind === "boop" && other) {
      f.tx = other.x; f.ty = other.y;
      other.action = "boop";
      other.actionT = 1.2;
      award(f, 6, "play-bumps " + other.name);
    } else if (kind === "jump") {
      f.splashAt = Date.now() + 1150;
      award(f, 7, "jumps the surface");
    } else if (kind === "glow") {
      award(f, phase() === "night" ? 10 : 4, phase() === "night" ? "lights the night tank" : "glimmers");
    } else if (kind === "clean") {
      f.ty = 0.82;
      award(f, 6, "cleans the gravel");
    } else if (kind === "school") {
      award(f, 3 + Math.min(6, state.fish.length), "keeps the school together");
    } else if (kind === "dance") {
      award(f, 6, "dances a slow circle");
    } else if (kind === "lap") {
      award(f, 8, "finishes a long lap");
    } else if (kind === "flare") {
      award(f, 6, "flares");
    } else if (kind === "flash") {
      award(f, 5, "flashes a fan tail");
    } else if (kind === "snap") {
      award(f, 4, "clicks a gold claw");
    } else if (kind === "scuttle") {
      state.algae = clamp((state.algae || 0) - 1.5, 0, 100);
      award(f, 4, "scuttles the sand and lifts a little waste");
    } else {
      award(f, 4, "plays");
    }
  }

  function phase() {
    const mode = state && state.opts && state.opts.clock;
    if (mode === "day") return "day";
    if (mode === "night") return "night";
    const h = new Date().getHours();
    if (h >= 6 && h < 17) return "day";
    if (h >= 17 && h < 20) return "dusk";
    return "night";
  }

  function temperOf(f) { return specOf(f.species).temper === "chill" ? "chill" : "lively"; }
  function socialOf(f) { return specOf(f.species).social === "loner" ? "loner" : "school"; }
  function motionOf(f) { return MOTION[f.species] || MOTION.glimmer; }
  function bandOf(f) { return motionOf(f).band; }
  function traits(f) {
    if (!f.traits) f.traits = { bold: 0.5, social: 0.5, appetite: 0.5, vigor: 0.5 };
    const t = f.traits;
    ["bold", "social", "appetite", "vigor"].forEach(function (k) { if (t[k] == null) t[k] = 0.5; });
    return t;
  }
  function traitWord(k, v) { return TRAIT_WORDS[k][clamp(Math.round(v * 4), 0, 4)]; }
  function makeTraits(pa, pb) {
    const out = {};
    ["bold", "social", "appetite", "vigor"].forEach(function (k) {
      const base = pa ? (pa[k] + (pb ? pb[k] : pa[k])) / 2 : 0.5;
      out[k] = clamp(base + (Math.random() - 0.5) * 0.32, 0.05, 0.95);
    });
    return out;
  }
  function comfort(f) {
    const band = TEMP_BAND[f.species] || [22, 28];
    const t = state.temp || 25;
    let raw = 0;
    if (t < band[0]) raw = band[0] - t;
    else if (t > band[1]) raw = t - band[1];
    return raw * mixScale().temp;
  }
  function tempNote(f) {
    if (comfort(f) <= 1.5) return "";
    const band = TEMP_BAND[f.species] || [22, 28];
    return (state.temp || 25) > band[1] ? "too warm" : "too cold";
  }
  function decorOf() { return DECOR[themeOf(state.theme).id] || DECOR.river; }
  function nearestShelter(x, y, far) {
    let best = null, bd = 1e9;
    decorOf().forEach(function (d) {
      if (!d.shelter) return;
      const dist = Math.hypot((x - d.x) / d.rx, (y - d.y) / d.ry);
      if (dist < bd) { bd = dist; best = d; }
    });
    return best && bd < (far == null ? 1.7 : far) ? best : null;
  }
  function nearestBottomRock(f) {
    let best = null, bd = 1e9;
    decorOf().forEach(function (d) {
      if (d.kind !== "solid" || d.y < 0.4) return;
      const dist = Math.hypot(f.x - d.x, (f.y - d.y) * AR);
      if (dist < bd) { bd = dist; best = d; }
    });
    return best;
  }
  function stageSpeed(stage) {
    return stage === "baby" ? 0.55 : stage === "infant" ? 0.72 : stage === "child" ? 0.86 : stage === "teen" ? 0.96 : 1;
  }
  /* One place that decides how fast a fish may go right now. */
  function speedOf(f, now, mode) {
    const m = motionOf(f);
    const tr = traits(f);
    const stageF = stageSpeed(stageName(bodyAge(f), f.species)) * (1.14 - 0.24 * specOf(f.species).bulk);
    const hunger = clamp((now - (f.lastFed || f.born)) / Math.max(1, vitals(f).food * HOUR), 0, 1.2);
    const vigor = 0.84 + tr.vigor * 0.34;
    if (mode === "burst") return m.burst * stageF * (1 + hunger * 0.25) * vigor;
    if (mode === "panic") {
      const left = clamp(f.stamina == null ? 1 : f.stamina, 0, 1);
      return m.burst * stageF * 0.94 * (0.78 + tr.bold * 0.5) * vigor * (0.55 + 0.45 * left);
    }
    if (mode === "rest") return m.cruise * stageF * 0.28;
    const mood = moodOf(f, now);
    const moodF = mood === "happy" ? 1.18 : mood === "sad" ? 0.62 : 1;
    return m.cruise * stageF * (1 + hunger * 0.3) * moodF * vigor;
  }
  function fishSprint(f) {
    const now = Date.now();
    const starving = STARVE - (now - (f.lastFed || f.born)) < 8 * HOUR;
    return speedOf(f, now, starving ? "burst" : "cruise");
  }
  /* Food choice: distance over the fish's own top speed, tilted toward the
     depth the species feeds at, and off flakes a faster rival will reach first. */
  function nearestFlake(f) {
    if (!flakes.length) return null;
    const now = Date.now();
    const band = bandOf(f);
    const mid = (band[0] + band[1]) / 2;
    const starving = STARVE - (now - (f.lastFed || f.born)) < 8 * HOUR;
    const mine = Math.max(0.02, speedOf(f, now, starving ? "burst" : "cruise") * (1 + traits(f).appetite * 0.3));
    let best = null, bestScore = 1e9;
    flakes.forEach(function (fl) {
      if (fl.gone) return;
      const d = span3(fl.x, fl.y, 0.86, f.x, f.y, depthOf(f));
      let score = d / mine * (1 + Math.abs(fl.y - mid) * 1.5);
      if (band[0] > 0.5 && fl.y < 0.52) score += 0.9;
      if ((f.species === "mandarin" || f.species === "dragon") && !starving) score += 1.35;
      if (f.species === "tusk") score -= 0.2;
      if (band[1] < 0.48 && fl.y > 0.72) score += 0.7;
      if (!starving) {
        state.fish.forEach(function (o) {
          if (o === f) return;
          const od = span3(fl.x, fl.y, 0.86, o.x, o.y, depthOf(o));
          if (od / Math.max(0.02, fishSprint(o)) + 0.05 < d / mine) score += 0.5;
        });
      }
      if (score < bestScore) { bestScore = score; best = fl; }
    });
    return best;
  }
  function unitDir(f, tx, ty) {
    const dx = tx - f.x, dy = (ty - f.y) * AR;
    const d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d, d: d };
  }
  function patrolPoint(f) {
    const band = bandOf(f);
    const t = traits(f);
    return {
      x: clamp(0.12 + Math.random() * 0.76, 0.1, 0.9),
      y: clamp(band[0] + (band[1] - band[0]) * (0.15 + Math.random() * 0.7) - t.bold * 0.05, 0.15, 0.86)
    };
  }
  /* Slow, smooth heading drift: why fish paths curve instead of jitter. */
  function wanderDir(f, now, dt) {
    if (f.wseed == null) f.wseed = Math.random() * 90;
    const w = f.wseed;
    if (f.wanderA == null) f.wanderA = f.vx < 0 ? Math.PI : 0;
    const n = Math.sin(now / 3300 + w) * 0.55 + Math.sin(now / 1100 + w * 1.7) * 0.3 + Math.sin(now / 470 + w * 2.1) * 0.15;
    f.wanderA += n * dt * 0.9;
    return { x: Math.cos(f.wanderA), y: Math.sin(f.wanderA) * 0.5 };
  }
  /* Boids: separation always, alignment and cohesion by how social the fish is.
     A bigger fish shoves a smaller one aside, so the tank grows a pecking order. */
  function shoalSteer(f, out) {
    const m = motionOf(f);
    const tr = traits(f);
    const crowd = state.fish.length >= 30 ? 0.6 : 1;
    const social = (socialOf(f) === "school" ? 0.35 + tr.social * 0.7 : tr.social * 0.22) * crowd;
    const vision = m.vision * (0.8 + tr.social * 0.6);
    const sepR = (f.startleT > 0 ? 0.08 : 0.105) * (1.15 - tr.social * 0.25);
    const mineSize = Math.max(0.2, specOf(f.species).bulk * STAGE_DRAW[stageName(bodyAge(f), f.species)]);
    let ax = 0, ay = 0, cx = 0, cy = 0, vx = 0, vy = 0, n = 0;
    state.fish.forEach(function (o) {
      if (o === f) return;
      const dx = o.x - f.x, dy = (o.y - f.y) * AR;
      const d = apart(f, o);
      if (d > vision || d < 0.0001) return;
      const kin = f.species !== "mask" || o.species === "mask";
      if (kin && (socialOf(o) === "school" || o.species === f.species || d < sepR)) { n += 1; cx += o.x; cy += o.y; vx += o.vx; vy += o.vy / AR; }
      if (d < sepR) {
        const w = (sepR - d) / sepR;
        ax -= dx / d * w;
        ay -= dy / d * w;
      }
      const sizeF = (specOf(o.species).bulk * STAGE_DRAW[stageName(bodyAge(o), o.species)]) / mineSize;
      if (sizeF > 1.12 && d < sepR * 1.8) {
        const w = (sizeF - 1.12) * (1 - d / (sepR * 1.8));
        ax -= dx / d * w * 1.5;
        ay -= dy / d * w * 1.5;
      }
    });
    if (n) {
      cx /= n; cy /= n;
      const coh = unitDir(f, cx, cy);
      ax += coh.x * social * 0.5;
      ay += coh.y * social * 0.5;
      const avx = vx / n, avy = vy / n;
      const av = Math.hypot(avx, avy) || 1;
      ax += avx / av * social * 0.65;
      ay += avy / av * social * 0.65;
      if (socialOf(f) === "school" && f.z != null) {
        let zs = 0, zn = 0;
        state.fish.forEach(function (o) {
          if (o !== f && o.species === f.species && o.z != null && apart(f, o) < vision) { zs += o.z; zn += 1; }
        });
        if (zn) f.z += ((zs / zn) - f.z) * 0.04;
      }
    }
    out.x += ax * 1.5;
    out.y += ay * 1.5;
  }
  function nicheSteer(f, out) {
    const id = f.species;
    state.fish.forEach(function (o) {
      if (o === f) return;
      const dx = o.x - f.x, dy = (o.y - f.y) * AR;
      const d = apart(f, o);
      if (d > 0.32 || d < 0.0001) return;
      if (id === "mandarin" && o.species === "mandarin") {
        out.x += dx / d * 0.35;
        out.y += dy / d * 0.2;
      } else if (id === "mandarin") {
        out.x -= dx / d * 0.45;
      }
      if (id === "mask" && o.species === "tusk") {
        out.x -= dx / d * 0.9;
        out.y -= dy / d * 0.35;
      }
      if ((id === "pepper" || id === "dragon") && o.species === "tusk") {
        out.x -= dx / d * 0.55;
      }
      if (id === "tusk" && o.species !== "tusk" && specOf(o.species).bulk <= fBulk(f)) {
        out.x += dx / d * 0.22;
        o.vx += (o.x - f.x) * 0.15;
      }
    });
    if (id === "dragon" || id === "mandarin" || id === "pepper") {
      let best = null, bd = 1e9;
      decorOf().forEach(function (d) {
        const want = id === "dragon" ? d.kind === "weed" : (d.kind === "solid" || d.shelter);
        if (!want) return;
        const dist = Math.hypot(f.x - d.x, f.y - d.y);
        if (dist < bd) { bd = dist; best = d; }
      });
      if (best) {
        const pull = id === "dragon" ? 0.7 : 0.28;
        out.x += (best.x - f.x) * pull;
        out.y += (best.y - f.y) * pull * 0.45;
      }
    }
  }
  function fBulk(f) {
    return specOf(f.species).bulk * (STAGE_DRAW[stageName(bodyAge(f), f.species)] || 1);
  }
  function decorSteer(f, out) {
    const push = 1.95 + traits(f).bold * 0.7 + (f.startleT > 0 ? 1.2 : 0);
    decorOf().forEach(function (d) {
      if (d.kind === "weed") return;
      const nx = (f.x - d.x) / d.rx, ny = (f.y - d.y) / d.ry;
      const dist = Math.hypot(nx, ny);
      const reach = 1.28;
      if (dist >= reach || dist < 0.0001) return;
      const w = (reach - dist) / reach;
      out.x += nx / dist * w * push;
      out.y += ny / dist * w * push * AR;
    });
  }
  function wallSteer(f, out) {
    const look = 0.05 + Math.hypot(f.vx, f.vy / AR) * 0.35;
    const px = f.x + f.vx * 0.7, py = f.y + f.vy * 0.7;
    if (px < 0.14) out.x += (0.14 - px) * 8;
    if (px > 0.86) out.x -= (px - 0.86) * 8;
    const top = f.action === "jump" ? 0.02 : 0.14;
    if (py < top) out.y += (top - py) * 10;
    if (py > 0.86) out.y -= (py - 0.86) * 10;
    out.x += clamp((0.5 - f.x) * 0.12, -0.1, 0.1);
  }
  function bandSteer(f, out, override) {
    const band = bandOf(f);
    const mid = (band[0] + band[1]) / 2;
    const span = Math.max(0.05, (band[1] - band[0]) / 2);
    const off = (f.y - (override != null ? override : mid)) / span;
    out.y += clamp(-off * 0.9, -1, 1) * 0.4 * (1.2 - traits(f).bold * 0.4);
  }
  /* Danger pressure: a hunter in the water, or a hand reaching over the glass. */
  function huntPressure(f) {
    let flee = null;
    (state.predators || []).forEach(function (p) {
      if (!p.adult) return;
      if ((p.away || 0) > 0.45) return;
      if (!p.pending && (p.depth || 0) < 0.55) return;
      const d = span3(p.x, p.y, depthOf(p), f.x, f.y, depthOf(f));
      const reach = p.pending ? 0.46 : 0.30;
      if (d >= reach) return;
      const w = (1 - d / reach) * (p.pending ? 1.7 : 1);
      if (!flee || w > flee.w) flee = { x: p.x, y: p.y, w: w, stalk: !!p.pending };
    });
    if (hand && hand.dip > 0.2 && f.y < 0.38) {
      const d = Math.hypot(hand.x - f.x, (0.03 - f.y) * AR);
      if (d < 0.3) {
        const w = (1 - d / 0.3) * hand.dip * 0.95;
        if (!flee || w > flee.w) flee = { x: hand.x, y: 0.01, w: w, stalk: false };
      }
    }
    return flee && flee.w > 0.12 ? flee : null;
  }
  /* What the fish is doing, in priority order, for this frame. */
  function fishMind(f, now, dt, mood) {
    const m = motionOf(f);
    const tr = traits(f);
    const band = bandOf(f);
    const night = phase() === "night";
    const starving = STARVE - (now - (f.lastFed || f.born)) < 8 * HOUR;
    const danger = huntPressure(f);
    if (danger && tr.bold < 0.94) {
      if (f.species === "octo") releaseInk(f, now);
      f.state = "flee";
      f.stateT = 2.4;
      f.idleT = 0;
      return { mode: "flee", tx: danger.x, ty: danger.y, w: danger.w, stalk: danger.stalk,
        cap: speedOf(f, now, "panic") * (0.78 + tr.bold * 0.45) };
    }
    const flake = nearestFlake(f);
    if (flake) {
      f.state = "eat";
      f.stateT = 1.6;
      f.idleT = 0;
      return { mode: "eat", tx: flake.x, ty: flake.y, flake: flake,
        cap: speedOf(f, now, starving ? "burst" : "cruise") * (0.7 + tr.appetite * 0.5) };
    }
    if (comfort(f) > 2.5) {
      f.idleT = 0;
      if (m.walk) {
        f.state = "shelter";
        f.stateT = 1.6;
        const rock = nearestBottomRock(f);
        const floor = (band[0] + band[1]) / 2;
        return { mode: "shelter", tx: rock ? rock.x : clamp(f.x, 0.14, 0.86), ty: floor,
          cap: speedOf(f, now, "cruise") * 0.32 };
      }
      f.state = "gasp";
      f.stateT = 1.2;
      return { mode: "gasp", tx: clamp(f.x + Math.sin(now / 2600 + (f.wseed || 0)) * 0.04, 0.12, 0.88), ty: 0.12,
        cap: speedOf(f, now, "cruise") * 0.42 };
    }
    if (f.actionT > 0) {
      f.state = "play";
      f.stateT = f.actionT;
      return { mode: "play", cap: m.burst * (f.action === "race" ? 0.8 : 0.5) * stageSpeed(stageName(bodyAge(f), f.species)) };
    }
    if (f.courtT > 0) {
      f.state = "court";
      f.stateT = f.courtT;
      return { mode: "court", cap: speedOf(f, now, "cruise") * 0.8 };
    }
    if (f.idleT == null || f.idleT <= 0 || !f.state || f.state === "play") scheduleIdle(f, now, night, mood);
    f.idleT -= dt;
    const mid = (band[0] + band[1]) / 2;
    if (f.state === "graze") {
      if (!f.grazeT || f.grazeT <= 0) f.grazeT = 2 + Math.random() * 4;
      return { mode: "graze", tx: clamp(f.x + Math.sin(now / 4000 + (f.wseed || 0)) * 0.1, 0.1, 0.9), ty: clamp(band[1] + 0.04, 0.3, 0.88),
        cap: speedOf(f, now, "cruise") * 0.5 };
    }
    if (f.state === "rest") {
      const restY = clamp(mid + 0.16, 0.2, 0.86);
      return { mode: "rest", tx: f.x + Math.sin(now / 9000 + (f.wseed || 0)) * 0.08, ty: restY, cap: speedOf(f, now, "rest") };
    }
    if (f.state === "shelter") {
      const s = nearestShelter(f.x, f.y, 2.2);
      if (s) return { mode: "shelter", tx: s.x + 0.05, ty: s.y, cap: speedOf(f, now, "cruise") * 0.6 };
      f.state = "cruise";
    }
    if (f.state === "hover") {
      return { mode: "hover", tx: f.x + Math.sin(now / 1500 + (f.wseed || 0)) * 0.03,
        ty: mid + Math.sin(now / 2100 + (f.wseed || 0)) * 0.03, cap: speedOf(f, now, "cruise") * 0.3 };
    }
    if (f.state === "glide") return { mode: "glide", cap: speedOf(f, now, "cruise") * 0.35, glide: true };
    f.state = "cruise";
    if (!f.cruise || unitDir(f, f.cruise.x, f.cruise.y).d < 0.06) f.cruise = patrolPoint(f);
    return { mode: "cruise", tx: f.cruise.x, ty: f.cruise.y, cap: speedOf(f, now, "cruise") };
  }
  function scheduleIdle(f, now, night, mood) {
    if (motionOf(f).walk && Math.random() < 0.28) {
      startPlay(f);
      f.state = "play";
      f.stateT = f.actionT;
      f.idleT = f.actionT;
      return;
    }
    const tr = traits(f);
    const band = bandOf(f);
    const roll = Math.random();
    const grazeT = band[0] > 0.5 ? 0.5 : (f.species === "puff" ? 0.12 : 0.05);
    const restT = (night ? 0.36 : 0.05) + (1 - tr.bold) * (night ? 0.26 : 0.08) + (mood === "sad" ? 0.15 : 0);
    if (roll < grazeT) { f.state = "graze"; f.stateT = 4 + Math.random() * 7; f.grazeT = f.stateT; }
    else if (roll < grazeT + restT) { f.state = "rest"; f.stateT = 6 + Math.random() * 12; }
    else if (roll < grazeT + restT + 0.11) { f.state = "hover"; f.stateT = 3 + Math.random() * 5; }
    else if (roll < grazeT + restT + 0.11 + motionOf(f).glide * 0.22) { f.state = "glide"; f.stateT = 0.7 + Math.random() * 1.6; }
    else { f.state = "cruise"; f.stateT = 4 + Math.random() * 9; f.cruise = patrolPoint(f); }
    f.idleT = f.stateT;
  }
  /* Speed is a force, not a snap: accelerate toward the wish, then integrate. */
  function applyVelocity(f, dt, wx, wy, cap, glide) {
    const mag = Math.hypot(wx, wy);
    let vx = 0, vy = 0;
    if (mag > 0.0001) {
      vx = wx / mag * cap;
      vy = wy / mag * cap * AR;
    }
    if (glide) {
      f.vx *= 1 - Math.min(0.9, dt * 0.9);
      f.vy *= 1 - Math.min(0.9, dt * 0.9);
    } else {
      const step = (cap * 3.6 + 0.06) * dt;
      f.vx += clamp(vx - f.vx, -step, step);
      f.vy += clamp(vy - f.vy, -step, step);
    }
  }
  /* Body: heading chases the velocity, heading drives bank, tail beat tracks effort. */
  function bodyUpdate(f, dt, cap) {
    const m = motionOf(f);
    const tr = traits(f);
    const sp = Math.hypot(f.vx, f.vy / AR);
    let want = f.heading || 0;
    if (sp > 0.002) want = Math.atan2(f.vy / AR, f.vx);
    let diff = want - (f.heading || 0);
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const rate = m.turn * (1 + tr.bold * 0.35) * clamp(1 + 0.45 / (0.3 + sp * 5), 1, 1.7);
    const turn = clamp(diff, -rate * dt, rate * dt);
    f.heading = (f.heading || 0) + turn;
    if (f.heading > Math.PI) f.heading -= Math.PI * 2;
    if (f.heading < -Math.PI) f.heading += Math.PI * 2;
    const turnRate = dt > 0.001 ? turn / dt : 0;
    f.bank = (f.bank || 0) + (clamp(turnRate * 0.22, -0.42, 0.42) - (f.bank || 0)) * Math.min(1, dt * 4);
    f.pitch = (f.pitch || 0) + (clamp((f.vy / AR) * 2.4, -0.5, 0.5) - (f.pitch || 0)) * Math.min(1, dt * 5);
    const strain = clamp(sp / Math.max(0.02, cap), 0, 1.4);
    const beat = f.state === "rest" ? 2.4 : f.state === "hover" ? 6.5 : 4.6 + strain * 11 * (m.tail / 14);
    f.phase = (f.phase || 0) + dt * beat;
    f.face = Math.cos(f.heading || 0) >= 0 ? 1 : -1;
    if (f.zTarget == null) f.zTarget = 0.25 + Math.random() * 0.6;
    if (!f.zUntil || Date.now() > f.zUntil) {
      const band = depthBand(f);
      f.zTarget = band[0] + Math.random() * (band[1] - band[0]);
      f.zUntil = Date.now() + 5000 + Math.random() * 8000;
    }
    f.zTarget = clamp(f.zTarget, 0.08, 0.96);
    f.z = f.z == null ? f.zTarget : f.z + (f.zTarget - f.z) * Math.min(1, dt * 0.35);
    if (m.walk) {
      f.pitch = (f.pitch || 0) * 0.15;
      f.bank = (f.bank || 0) * 0.25;
    }
    f.speed = sp;
  }
  function stepFish(f, dt) {
    const now = Date.now();
    const tr = traits(f);
    if (f.phase == null) f.phase = Math.random() * 6.283;
    if (f.heading == null) f.heading = f.vx < 0 ? Math.PI : 0;
    if (f.state == null) f.state = "cruise";
    if (f.z == null) f.z = 0.25 + Math.random() * 0.6;
    f.startleT = Math.max(0, (f.startleT || 0) - dt);
    if (f.actionT > 0) {
      f.actionT = Math.max(0, f.actionT - dt);
      if (f.actionT === 0) f.action = "";
    }
    if (f.courtT) f.courtT = Math.max(0, f.courtT - dt);
    const spent = f.state === "flee" || f.startleT > 0.2;
    f.stamina = clamp((f.stamina == null ? 1 : f.stamina) + (spent ? -dt * 0.16 : dt * 0.09), 0, 1);
    const mood = moodOf(f, now);
    const mind = fishMind(f, now, dt, mood);
    const cap = Math.max(0.01, mind.cap || 0.05);
    if (mind.mode === "flee") {
      const z = f.z == null ? 0.5 : f.z;
      f.zTarget = clamp(z < 0.5 ? z + 0.42 : z - 0.42, 0.08, 0.95);
      f.zUntil = now + 2200;
    } else if (mind.mode === "eat" && !motionOf(f).walk) {
      f.zTarget = 0.86;
      f.zUntil = now + 1600;
    }
    const out = { x: 0, y: 0 };
    let glide = false;
    if (mind.mode === "flee") {
      const t = unitDir(f, mind.tx, mind.ty);
      if (motionOf(f).walk) {
        const away = f.x < mind.tx ? -1 : 1;
        out.x += away * (2.4 + mind.w * 1.6);
        const rock = nearestBottomRock(f);
        if (rock) out.x += (rock.x >= f.x ? 1 : -1) * 0.7;
      } else {
        out.x -= t.x * (2.6 + mind.w * 2);
        out.y -= t.y * (2.6 + mind.w * 2);
      }
      if (mind.stalk) {
        const s = nearestShelter(f.x, f.y, 1.4);
        if (s) {
          const sv = unitDir(f, s.x, s.y);
          out.x += sv.x * 1.6;
          out.y += sv.y * 1.6;
          f.state = "shelter";
        }
      }
      f.startleT = Math.max(f.startleT, 0.7);
    } else if (mind.mode === "eat") {
      const t = unitDir(f, mind.tx, mind.ty);
      out.x += t.x * 1.7;
      out.y += t.y * 1.7;
      if (temperOf(f) === "lively" || STARVE - (now - (f.lastFed || f.born)) < 8 * HOUR) {
        state.fish.forEach(function (o) {
          if (o === f) return;
          if (apart(f, o) < 0.09 && span3(o.x, o.y, depthOf(o), mind.tx, mind.ty, 0.86) < 0.18) {
            const back = unitDir(o, f.x, f.y);
            out.x += back.x * 1.2;
            out.y += back.y * 1.2;
          }
        });
      }
    } else if (mind.mode === "play") {
      const a = f.action;
      if (a === "race") { out.x += f.tx > f.x ? 1 : -1; out.y += (f.ty || f.y) > f.y ? 0.25 : -0.25; }
      else if (a === "dance") { out.x += Math.cos(f.actionT * 3); out.y += Math.sin(f.actionT * 3) * 0.8; }
      else if (a === "clean") { out.y += Math.max(0, 0.86 - f.y) * 3; out.x += Math.sin(now / 900 + (f.wseed || 0)) * 0.4; }
      else if (a === "jump") { out.x += f.face; out.y -= 0.6; }
      else if (a === "glow") { out.x += Math.cos(now / 3000 + (f.wseed || 0)) * 0.5; out.y += 0.2; }
      else if (a === "flare") { out.x += Math.sin(now / 1200 + (f.wseed || 0)) * 0.2; out.y += 0.1; }
      else if (a === "flash") { const t = unitDir(f, f.tx || f.x + f.face * 0.4, f.ty || f.y); out.x += t.x * 1.6; out.y += t.y * 1.6; }
      else if (a === "snap") { out.x += Math.sin(now / 220 + (f.wseed || 0)) * 0.3; }
      else if (a === "scuttle") { out.x += (f.face || 1) * 1.6; }
      else if (a === "lap") {
        const t = unitDir(f, f.tx, 0.34 + Math.sin(now / 5200 + (f.wseed || 0)) * 0.12);
        out.x += t.x * 1.1; out.y += t.y * 1.1;
      } else if (a === "boop" || a === "school") {
        if (f.tx) { const t = unitDir(f, f.tx, f.ty == null ? f.y : f.ty); out.x += t.x * 1.4; out.y += t.y * 1.4; }
      }
    } else if (mind.mode === "court") {
      const pair = state.fish.filter(function (o) { return o !== f && o.courtT > 0 && o.species === f.species; })[0];
      if (pair) {
        const rel = unitDir(f, pair.x, pair.y);
        const spin = f.id < pair.id ? 1 : -1;
        out.x += rel.x * 0.5 - rel.y * 0.9 * spin;
        out.y += rel.y * 0.5 + rel.x * 0.9 * spin;
      } else out.x += Math.cos(now / 1800 + (f.wseed || 0));
    } else if (mind.mode === "gasp") {
      const t = unitDir(f, mind.tx, mind.ty);
      out.x += t.x * 1.4;
      out.y += t.y * 1.4;
      out.x += Math.sin(now / 700 + (f.wseed || 0)) * 0.3;
    } else if (mind.mode === "graze") {
      const t = unitDir(f, mind.tx, mind.ty);
      out.x += t.x * 0.8;
      out.y += t.y * 1.2;
      out.x += Math.sin(now / 4000 + (f.wseed || 0)) * 0.25;
    } else if (mind.mode === "rest" || mind.mode === "hover") {
      const t = unitDir(f, mind.tx, mind.ty);
      out.x += t.x * 0.6;
      out.y += t.y * 0.6;
    } else if (mind.mode === "glide") {
      glide = true;
    } else if (mind.mode === "shelter") {
      const t = unitDir(f, mind.tx, mind.ty);
      out.x += t.x * 0.9;
      out.y += t.y * 0.9;
    } else {
      const t = unitDir(f, mind.tx, mind.ty);
      const w = wanderDir(f, now, dt);
      out.x += t.x * 1.1 + w.x * 0.5;
      out.y += t.y * 1.1 + w.y * 0.5;
    }
    if (mind.mode !== "glide") {
      shoalSteer(f, out);
      nicheSteer(f, out);
      decorSteer(f, out);
    }
    bandSteer(f, out, mind.mode === "gasp" ? 0.12 : null);
    wallSteer(f, out);
    if (motionOf(f).walk) out.y *= 0.05;
    if (f.state === "rest" || f.state === "hover") { out.x *= 0.4; out.y *= 0.4; }
    applyVelocity(f, dt, out.x, out.y, cap, glide);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const top = mind.mode === "gasp" ? 0.08 : f.action === "jump" ? 0.02 : 0.11;
    if (f.x < 0.05) { f.x = 0.05; f.vx = Math.abs(f.vx) * 0.4; }
    if (f.x > 0.95) { f.x = 0.95; f.vx = -Math.abs(f.vx) * 0.4; }
    if (f.y < top) { f.y = top; f.vy = Math.abs(f.vy) * 0.4; }
    if (f.y > 0.88) { f.y = 0.88; f.vy = -Math.abs(f.vy) * 0.4; }
    if (motionOf(f).jet) {
      f.jetCd = (f.jetCd == null ? 0.4 : f.jetCd) - dt;
      f.jetT = Math.max(0, (f.jetT || 0) - dt);
      if (f.jetCd <= 0) {
        f.jetCd = (f.state === "flee" ? 0.48 : 1.2) + Math.random() * 0.4;
        f.jetT = f.state === "flee" ? 0.5 : 0.38;
        const burst = f.state === "flee" ? 0.26 : 0.11;
        const aim = f.heading == null ? (f.vx < 0 ? Math.PI : 0) : f.heading;
        f.vx += Math.cos(aim) * burst;
        f.vy += Math.sin(aim) * burst * 0.4;
      }
    }
    if (motionOf(f).walk) {
      const floor = (bandOf(f)[0] + bandOf(f)[1]) / 2;
      f.y += (floor - f.y) * Math.min(1, dt * 8);
      f.vy *= 0.12;
    }
    bodyUpdate(f, dt, cap);
    if (f.state === "graze" && Math.random() < dt * 0.5) state.algae = clamp((state.algae || 0) - 0.05, 0, 100);
    if (f.species === "tusk" && Math.random() < dt * 0.4) state.algae = clamp((state.algae || 0) - 0.09, 0, 100);
    if (f.species === "mandarin" && Math.random() < dt * 0.25) state.algae = clamp((state.algae || 0) - 0.03, 0, 100);
  }
  function stepInks(dt, now) {
    inks.forEach(function (k) {
      k.x += (k.drift || 0) * dt;
      k.y -= 0.02 * dt;
    });
    inks = inks.filter(function (k) { return now - k.born < k.life; });
    if (inks.length > 24) inks = inks.slice(inks.length - 24);
  }
  function drawInks(w, h, now) {
    inks.forEach(function (k) {
      const u = clamp((now - k.born) / k.life, 0, 1);
      const frame = u < 0.28 ? "ink_1" : (u < 0.62 ? "ink_2" : "ink_3");
      const img = SPRITES[frame];
      const size = (64 + u * 170) * (Math.min(w, 1100) / 900);
      ctx.save();
      ctx.globalAlpha = (u < 0.12 ? u / 0.12 : 1 - u) * 0.82;
      if (img && img.complete && img.naturalWidth) {
        const ih = size * (img.naturalHeight / img.naturalWidth);
        ctx.drawImage(img, k.x * w - size / 2, k.y * h - ih / 2, size, ih);
      } else {
        ctx.fillStyle = "rgba(6,6,8,0.45)";
        ctx.beginPath();
        ctx.arc(k.x * w, k.y * h, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
  function startHand(kind) {
    if (!state.fish.length) { log("No one is home to feed."); return false; }
    if (hand || flakes.length) { log("The last pinch is still in the water."); return false; }
    const who = Math.random() < 0.5 ? "f" : "m";
    hand = {
      who: who,
      x: 0.12 + Math.random() * 0.76,
      tx: 0.12 + Math.random() * 0.76,
      dip: 0,
      wait: 0.2,
      kind: kind,
      drops: 0,
      max: kind === "pellet" ? 1 : 8,
      leave: false
    };
    log((who === "f" ? "A woman's hand" : "A man's hand") + (kind === "pellet" ? " offers one pellet." : " reaches over the glass."));
    playSfx("feed");
    return true;
  }
  function dropFlake() {
    flakes.push({
      x: Math.max(0.08, Math.min(0.92, hand.x + (Math.random() - 0.5) * 0.12)),
      y: 0.02 + hand.dip * 0.05,
      vy: 0.14 + Math.random() * 0.12,
      age: 0,
      pellet: hand.kind === "pellet"
    });
  }
  function stepHand(dt) {
    if (hand) {
      const dx = hand.tx - hand.x;
      hand.x += Math.max(-0.7, Math.min(0.7, dx * 2.2)) * dt;
      if (hand.leave) {
        if (hand.x < -0.28 || hand.x > 1.28) hand = null;
      } else if (Math.abs(dx) < 0.035) {
        hand.dip = Math.min(1, hand.dip + dt * 3.2);
        hand.wait -= dt;
        if (hand.dip > 0.8 && hand.wait <= 0 && hand.drops < hand.max) {
          dropFlake();
          hand.drops += 1;
          hand.wait = 0.28 + Math.random() * 0.25;
          hand.dip = 0;
          hand.tx = 0.1 + Math.random() * 0.8;
          if (hand.drops >= hand.max) {
            hand.leave = true;
            hand.tx = hand.x < 0.5 ? -0.35 : 1.35;
          }
        }
      } else {
        hand.dip = Math.max(0, hand.dip - dt * 2);
      }
    }
    flakes.forEach(function (fl) {
      fl.age += dt;
      fl.y += fl.vy * dt;
      fl.x += Math.sin(fl.age * 3) * 0.01 * dt;
      if (fl.y > 0.84) { fl.y = 0.84; fl.vy = 0; }
    });
  }
  function resolveBites() {
    const now = Date.now();
    flakes.forEach(function (fl) {
      if (fl.gone) return;
      const near = state.fish.filter(function (f) {
        return span3(f.x, f.y, depthOf(f), fl.x, fl.y, 0.86) < 0.07;
      }).sort(function (a, b) {
        return span3(a.x, a.y, depthOf(a), fl.x, fl.y, 0.86) - span3(b.x, b.y, depthOf(b), fl.x, fl.y, 0.86);
      });
      if (!near.length) {
        if (fl.age > 8) {
          fl.gone = true;
          state.algae = clamp((state.algae || 0) + (fl.pellet ? 1.5 : 0.6), 0, 100);
        }
        return;
      }
      const winner = near[0];
      near.slice(1).forEach(function (loser) {
        const push = (loser.x - winner.x) || (Math.random() - 0.5);
        loser.vx += push * 1.4;
        loser.vy += 0.08;
        loser.face = loser.vx >= 0 ? 1 : -1;
      });
      winner.lastFed = now;
      winner.lastPlay = now;
      accrueGrowth(winner, now);
      if (fl.pellet) {
        addGrowthHours(winner, 2);
        winner.bonus = Math.min(14 * DAY, (winner.bonus || 0) + DAY);
        log(near.length > 1
          ? (winner.name + " wins the pellet and grows. " + near[1].name + " is shoved off.")
          : (winner.name + " takes the pellet, grows faster, and gains a day."));
      } else {
        addGrowthHours(winner, 1);
        winner.bonus = Math.min(14 * DAY, (winner.bonus || 0) + 10 * HOUR);
        if (near.length > 1 && Math.random() < 0.45) log(winner.name + " snatches a flake from " + near[1].name + " and grows.");
      }
      state.points += fl.pellet ? 2 : 1;
      fl.gone = true;
    });
    if (flakes.some(function (fl) { return fl.gone; })) {
      flakes = flakes.filter(function (fl) { return !fl.gone; });
      save();
    }
  }
  function drawHand(w, h) {
    if (!hand) return;
    const img = HANDS[hand.who];
    const bw = Math.min(w * 0.34, 260);
    const bh = img && img.complete && img.naturalWidth ? bw * (img.naturalHeight / img.naturalWidth) : bw * 1.1;
    const x = hand.x * w;
    const y = -bh * 0.08 + hand.dip * h * 0.07;
    ctx.save();
    ctx.translate(x, y);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -bw / 2, 0, bw, bh);
    ctx.restore();
  }
  function drawFlakes(w, h) {
    flakes.forEach(function (fl) {
      ctx.fillStyle = fl.pellet ? "#fbbf24" : "#d97706";
      ctx.beginPath();
      ctx.ellipse(fl.x * w, fl.y * h, fl.pellet ? 7 : 3.5, fl.pellet ? 5 : 2.2, fl.age, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(2, r.width * dpr);
    canvas.height = Math.max(2, r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function stateWord(f) {
    if (f.species === "octo" && (f.inkUntil || 0) > Date.now()) return "inking";
    const s = f.state;
    const walk = motionOf(f).walk;
    if (s === "flee") return walk ? "scuttling clear" : ((f.stamina != null && f.stamina < 0.35) ? "tiring" : "bolting");
    if (s === "shelter") return walk ? "under the rockwork" : "in the weeds";
    if (s === "gasp") return "gasping at the top";
    if (s === "rest") return walk ? "still on the sand" : "resting";
    if (s === "graze") return walk ? "picking the sand" : "grazing";
    if (s === "court") return "courting";
    if (s === "eat") return "feeding";
    if (s === "hover") return "holding still";
    if (s === "glide") return "gliding";
    return "";
  }
  function drawFish(f, w, h, now) {
    const stage = stageName(bodyAge(f), f.species);
    const z = f.z == null ? 0.5 : f.z;
    const sp = f.speed == null ? Math.hypot(f.vx, f.vy / AR) : f.speed;
    const goingRight = (f.face || 1) !== -1;
    let img = SPRITES[f.species + "_" + stage];
    let useTurn = false;
    if (f.species === "octo" || f.species === "mandarin" || f.species === "pepper" || f.species === "tusk" || f.species === "dragon" || f.species === "mask") {
      const moving = f.species === "octo" ? (f.jetT || 0) > 0.05 : Math.abs(f.vx) > 0.01;
      const posed = SPRITES[f.species + "_r" + (moving ? "_swim" : "")] || SPRITES[f.species + "_r"];
      if (posed) img = posed;
    } else if (f.species === "claw" || f.species === "crab") {
      const dir = goingRight ? "r" : "l";
      const stepMs = f.species === "claw" ? 460 : 220;
      const stepping = Math.abs(f.vx) > 0.004 && ((Math.floor(now / stepMs) % 2) === 1);
      const turned = SPRITES[f.species + "_" + dir + (stepping ? "_walk" : "")] || SPRITES[f.species + "_" + dir];
      if (turned) { img = turned; useTurn = true; }
    } else if (f.species === "azure" || f.species === "sunscale") {
      const turnStage = f.species === "sunscale"
        ? (stage === "baby" || stage === "infant" ? "baby" : (stage === "child" || stage === "teen" ? "child" : "adult"))
        : stage;
      const turned = SPRITES[f.species + "_" + turnStage + "_" + (goingRight ? "r" : "l")];
      if (turned) { img = turned; useTurn = true; }
    }
    const flare = f.action === "flare" ? 1.16 : 1;
    const sc = STAGE_DRAW[stage] * specOf(f.species).bulk * (0.5 + z * 0.68) * flare;
    const bh = Math.min(h * 0.22, 150) * sc;
    let bw = bh;
    if (img && img.complete && img.naturalWidth) bw = bh * (img.naturalWidth / img.naturalHeight);
    if ((f.species === "octo" || f.species === "mandarin" || f.species === "pepper" || f.species === "tusk" || f.species === "dragon" || f.species === "mask") && img && img.complete && img.naturalWidth) {
      const wide = f.species === "dragon" ? 0.4 : (f.species === "octo" ? 0.32 : 0.26);
      bw = Math.min(w * wide, f.species === "dragon" ? 420 : 320) * STAGE_DRAW[stage] * (0.5 + z * 0.7);
      bh = bw * (img.naturalHeight / img.naturalWidth);
    }
    const breathe = state.opts.motion === false ? 0 : Math.sin(now / (f.state === "rest" ? 1700 : 900) + f.x * 10) * (f.state === "rest" ? 2.4 : 1.1);
    let y = f.y * h + breathe;
    if (motionOf(f).walk) {
      const bob = state.opts.motion === false || Math.abs(f.vx) < 0.004 ? 0 : Math.sin((f.phase || 0) * 2) * 1.6;
      y = h * 0.91 - bh * 0.46 + bob;
    }
    const x = f.x * w;
    if (f.action === "jump") {
      const u = Math.max(0, f.actionT / 1.1);
      y = h * 0.18 - Math.sin((1 - u) * Math.PI) * h * 0.12;
    }
    if (motionOf(f).glow === true && phase() !== "day") {
      const pulse = state.opts.motion === false ? 0.6 : 0.55 + Math.sin(now / 700 + (f.wseed || 0)) * 0.2;
      const g = ctx.createRadialGradient(x, y, 1, x, y, Math.max(18, bh * 1.8));
      g.addColorStop(0, "rgba(186,238,255," + (0.3 * pulse).toFixed(3) + ")");
      g.addColorStop(1, "rgba(120,200,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - bh * 2, y - bh * 2, bh * 4, bh * 4);
    }
    ctx.save();
    ctx.globalAlpha = 0.08 + z * 0.12;
    ctx.fillStyle = "#04121c";
    ctx.beginPath();
    ctx.ellipse(x, h * 0.9, bw * 0.32, bh * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.38 + z * 0.62;
    if (z < 0.42) ctx.filter = "saturate(0.72) brightness(0.86)";
    ctx.translate(x, y);
    const artRight = FACE_RIGHT[f.species] !== false;
    const face = useTurn ? 1 : ((goingRight === artRight) ? 1 : -1);
    const strain = clamp(sp / Math.max(0.02, speedOf(f, now, "cruise")), 0, 1.5);
    const amp = motionOf(f).walk ? 0 : (temperOf(f) === "chill" ? 0.03 : 0.07) * (0.4 + strain * 0.8);
    const wag = state.opts.motion === false ? 0 : Math.sin(f.phase || 0) * amp * (f.state === "rest" ? 0.35 : 1);
    ctx.scale(face, 1);
    ctx.rotate(wag * (f.action === "flare" ? 2 : 1) + (f.bank || 0) * 0.5 - (f.pitch || 0) * 0.3);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);
    else {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.ellipse(0, 0, bw / 2, bh / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (state.opts.motion !== false && f.startleT > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, f.startleT);
      ctx.strokeStyle = "rgba(255,235,200,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, bh * 0.75 + f.startleT * 10, -0.6, 0.6);
      ctx.stroke();
      ctx.restore();
    }
    if (f.id === selected) {
      ctx.strokeStyle = "#fbbf24";
      ctx.strokeRect(x - bw / 2 - 4, y - bh / 2 - 4, bw + 8, bh + 8);
    }
    if (state.opts.names !== false) {
      ctx.textAlign = "center";
      ctx.font = "600 13px Syne, sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(3,10,18,0.72)";
      const label = f.name + (f.gen > 1 ? " ·" + f.gen : "");
      ctx.strokeText(label, x, y - bh / 2 - 8);
      ctx.fillStyle = moodOf(f, now) === "sad" ? "#fb7185" : "#e8eef5";
      ctx.fillText(label, x, y - bh / 2 - 8);
      const word = stateWord(f);
      if (word) {
        ctx.font = "600 11px Source Sans 3, sans-serif";
        ctx.lineWidth = 2.5;
        ctx.strokeText(word, x, y - bh / 2 + 5);
        ctx.fillStyle = f.stamina != null && f.stamina < 0.35 && f.state === "flee" ? "#fb7185" : "#9fd8e8";
        ctx.fillText(word, x, y - bh / 2 + 5);
      }
    }
  }
  function drawEggs(w, h, now) {
    (state.eggs || []).forEach(function (e) {
      const x = e.x * w, y = e.y * h;
      const left = clamp((e.hatchAt - now) / HATCH_MS, 0, 1);
      const jiggle = state.opts.motion === false ? 0 : Math.sin(now / 900 + x) * 0.6;
      ctx.save();
      ctx.globalAlpha = 0.6 + (1 - left) * 0.35;
      for (let i = 0; i < 4; i += 1) {
        const a = i * 1.57 + x;
        const ex = x + Math.cos(a) * 7, ey = y + Math.sin(a) * 5 + jiggle;
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.ellipse(ex, ey, 3.2, 2.5, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(18,28,38,0.55)";
        ctx.beginPath();
        ctx.arc(ex, ey, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.opts.names !== false) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "#e8eef5";
        ctx.font = "600 10px Source Sans 3, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(specOf(e.species).name + " eggs · " + Math.ceil(left * 20) + "m", x, y - 14);
      }
      ctx.restore();
    });
  }
  function drawMotes(w, h, front) {
    motes.forEach(function (m) {
      if ((m.z >= 0.5) !== !!front) return;
      ctx.save();
      ctx.globalAlpha = (front ? 0.32 : 0.2) * (0.4 + m.z * 0.6);
      ctx.fillStyle = "#dff3ff";
      ctx.beginPath();
      ctx.arc(m.x * w, m.y * h, m.r * (0.6 + m.z * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  function drawGlass(w, h) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.25, w * 0.5, h * 0.45, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(2,8,14,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#dff3ff";
    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.34);
    ctx.lineTo(w * 0.2, h * 0.02);
    ctx.lineTo(w * 0.3, h * 0.02);
    ctx.lineTo(w * 0.09, h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawCrew(c, w, h, now) {
    const t = now / 1000 + c.wobble;
    let x = c.x * w;
    let y = c.y * h;
    const napping = c.role === "turtle" && c.asleep;
    if (state.opts.motion !== false && !napping) {
      if (c.role === "jelly") y += Math.sin(t) * 10;
      else if (c.role === "turtle") y += Math.sin(t * 0.5) * 2;
      else y += Math.sin(t * 1.4) * 3;
    }
    const img = napping ? CREW_SPRITES.turtleSleep : CREW_SPRITES[c.role];
    const bh = h * (CREW_H[c.role] || 0.12);
    let bw = bh;
    if (img && img.complete && img.naturalWidth) bw = bh * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.translate(x, y);
    if (c.role !== "jelly") ctx.scale(c.vx >= 0 ? 1 : -1, 1);
    const wag = state.opts.motion === false || c.role === "jelly" || napping ? 0 : Math.sin(t * 3) * (c.role === "turtle" ? 0.02 : 0.06);
    ctx.rotate(wag);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);
    ctx.restore();
    if (state.opts.names !== false) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 12px Syne, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(c.name, x, y - bh / 2 - 8);
    }
  }
  function stepCrew(c, dt) {
    const now = Date.now();
    if (c.role === "turtle") {
      if (c.asleep == null) c.asleep = false;
      if (!c.until) c.until = now + 14000 + Math.random() * 12000;
      if (now >= c.until) {
        c.asleep = !c.asleep;
        c.until = now + (c.asleep ? 22000 + Math.random() * 28000 : 16000 + Math.random() * 18000);
        c.vx = 0;
      }
      if (c.asleep) c.vx = 0;
      else if (Math.random() < dt * 0.12) c.vx = (Math.random() < 0.5 ? -1 : 1) * 0.01;
      c.x += c.vx * dt;
      c.y = 0.84;
      if (c.x < 0.1) { c.x = 0.1; c.vx = Math.abs(c.vx || 0.01); }
      if (c.x > 0.9) { c.x = 0.9; c.vx = -Math.abs(c.vx || 0.01); }
      return;
    }
    const slow = c.role === "snail" ? 0.35 : c.role === "jelly" ? 0.45 : 1;
    if (Math.random() < dt * 0.2) c.vx = (Math.random() < 0.5 ? -1 : 1) * 0.025 * slow;
    c.x += c.vx * dt;
    if (c.role === "jelly") {
      const wave = Math.sin(Date.now() / 3200 + c.wobble);
      c.y = Math.max(0.17, Math.min(0.5, 0.33 + wave * 0.15));
    }
    else if (c.role === "otto") c.y = 0.34 + Math.sin(Date.now() / 2200 + c.wobble) * 0.18;
    else c.y = 0.8 + Math.sin(Date.now() / 900 + c.wobble) * 0.03;
    if (c.x < 0.08) { c.x = 0.08; c.vx = Math.abs(c.vx); }
    if (c.x > 0.92) { c.x = 0.92; c.vx = -Math.abs(c.vx); }
  }
  function simWater(now) {
    const hour = new Date().getHours();
    const ambient = 23 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 1.5;
    const target = state.opts.heater ? (state.opts.temp || 25) : ambient;
    state.temp += (target - state.temp) * 0.02;
    const prev = state.waterAt || now;
    const span = Math.min(72, Math.max(0, (now - prev) / HOUR));
    if (span < 0.004) return;
    state.waterAt = now;
    const fishN = state.fish.length;
    const grazers = state.crew.filter(function (c) { return c.role === "snail" || c.role === "otto" || c.role === "turtle"; }).length;
    const bottoms = state.crew.filter(function (c) { return c.role === "cory" || c.role === "turtle"; }).length;
    const day = phase() === "night" ? 0.35 : 1;
    const mix = mixScale();
    const clear = hasPerk("clear") ? 0.72 : 1;
    const pace = (state.mode === "calm" ? 0.62 : state.mode === "busy" ? 1.45 : 1) * themeOf(state.theme).algae * mix.dirt * clear;
    state.algae = clamp(state.algae + span * pace * (0.9 * day + fishN * 0.32) - span * grazers * 2.1, 0, 100);
    state.quality = clamp(state.quality + span * (bottoms * 1.5 + grazers * 0.35 - fishN * 0.38 * mix.dirt * clear - state.algae * 0.03), 0, 100);
  }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const now = Date.now();
    const ph = phase();
    const motion = state.opts.motion !== false;
    const art = THEME_ART[themeOf(state.theme).id] || THEME_ART.river;
    const bg = ph === "night" ? art.night : art.day;
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, w, h);
    else {
      ctx.fillStyle = ph === "night" ? "#071525" : "#0c3a48";
      ctx.fillRect(0, 0, w, h);
    }
    if (ph === "dusk") {
      ctx.fillStyle = "rgba(40,16,28,0.28)";
      ctx.fillRect(0, 0, w, h);
    }
    if (motion) {
      const shaftA = ph === "day" ? 0.09 : ph === "dusk" ? 0.12 : 0.04;
      const drift = Math.sin(now / 6200) * w * 0.02;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      [[0.30, 0.09], [0.44, 0.12], [0.66, 0.07], [0.86, 0.10]].forEach(function (s, i) {
        const g = ctx.createLinearGradient(0, 0, 0, h * 0.86);
        g.addColorStop(0, "rgba(222,242,255," + (shaftA * (1 + (i % 2) * 0.35) * (0.7 + Math.sin(now / 5200 + i * 1.4) * 0.3)).toFixed(3) + ")");
        g.addColorStop(1, "rgba(200,230,255,0)");
        ctx.fillStyle = g;
        const top = s[0] * w + drift * (1 + i * 0.25);
        const bw = s[1] * w * (1 + Math.sin(now / 4200 + i) * 0.12);
        ctx.beginPath();
        ctx.moveTo(top - bw * 0.14, 0);
        ctx.lineTo(top + bw * 0.14, 0);
        ctx.lineTo(top + bw, h * 0.9);
        ctx.lineTo(top - bw, h * 0.9);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }
    const fog = ctx.createLinearGradient(0, 0, 0, h);
    fog.addColorStop(0, ph === "night" ? "rgba(6,18,30,0.34)" : "rgba(118,188,208,0.10)");
    fog.addColorStop(0.55, "rgba(4,14,24,0.05)");
    fog.addColorStop(1, "rgba(2,8,16,0.32)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, w, h);
    if (motion) {
      [[0.42, 0.86], [0.6, 0.88]].forEach(function (a) {
        const g = ctx.createLinearGradient(0, a[1] * h, 0, h * 0.1);
        g.addColorStop(0, "rgba(255,255,255,0.10)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect((a[0] - 0.022) * w, h * 0.1, 0.044 * w, (a[1] - 0.1) * h);
      });
    }
    const film = (state.algae || 0) / 100;
    if (film > 0.02) {
      ctx.fillStyle = "rgba(34,92,28," + (0.08 + film * 0.38) + ")";
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillRect(0, h * 0.16, Math.max(4, w * film * 0.08), h * 0.62);
      ctx.fillRect(w - Math.max(4, w * film * 0.08), h * 0.16, Math.max(4, w * film * 0.08), h * 0.62);
    }
    if ((state.quality || 100) < 60) {
      ctx.fillStyle = "rgba(90,60,20," + ((60 - state.quality) / 180) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    drawMotes(w, h, false);
    bubbles.forEach(function (b) {
      const bx = b.x * w, by = b.y * h;
      ctx.beginPath();
      ctx.fillStyle = "rgba(224,244,255,0.14)";
      ctx.arc(bx, by, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.arc(bx - b.r * 0.3, by - b.r * 0.35, Math.max(0.6, b.r * 0.26), 0, Math.PI * 2);
      ctx.fill();
    });
    drawEggs(w, h, now);
    const order = state.fish.slice().sort(function (a, b) {
      const az = a.z == null ? 0.5 : a.z, bz = b.z == null ? 0.5 : b.z;
      if (az !== bz) return az - bz;
      return a.y - b.y;
    });
    (state.predators || []).forEach(function (p) {
      if (!predClose(p, now)) drawPredator(p, w, h, now);
    });
    order.forEach(function (f) { drawFish(f, w, h, now); });
    drawInks(w, h, now);
    (state.crew || []).forEach(function (c) { drawCrew(c, w, h, now); });
    (state.predators || []).forEach(function (p) {
      if (predClose(p, now)) drawPredator(p, w, h, now);
    });
    (state.predators || []).forEach(function (p) {
      if (!p.pending || !p.victim) return;
      const v = state.fish.filter(function (f) { return f.id === p.victim; })[0];
      if (!v) return;
      const pulse = motion ? 0.5 + Math.sin(now / 260) * 0.5 : 0.7;
      ctx.save();
      ctx.globalAlpha = 0.35 + pulse * 0.45;
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(v.x * w, v.y * h, Math.min(h * 0.22, 140) * 0.5 + 10 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    drawFlakes(w, h);
    drawMotes(w, h, true);
    ripples.forEach(function (r) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.4 - r.t * 0.18);
      ctx.strokeStyle = "#e8f6ff";
      ctx.beginPath();
      ctx.ellipse(r.x * w, r.y * h, r.r * w, r.r * w * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    if (motion) {
      const surf = Math.sin(now / 3400);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.14 + surf * 3);
      ctx.bezierCurveTo(w * 0.3, h * 0.12 - surf * 4, w * 0.7, h * 0.16 + surf * 4, w, h * 0.13 - surf * 3);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.17 + surf * 2);
      ctx.bezierCurveTo(w * 0.35, h * 0.15 + surf * 3, w * 0.65, h * 0.19 - surf * 3, w, h * 0.16 + surf * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.14);
      ctx.bezierCurveTo(w * 0.3, h * 0.12, w * 0.7, h * 0.16, w, h * 0.13);
      ctx.stroke();
    }
    drawHand(w, h);
    drawGlass(w, h);
  }
  function renderRail() {
    const now = Date.now();
    const list = document.getElementById("fishList");
    list.innerHTML = state.fish.map(function (f) {
      const mood = moodOf(f, now);
      const tr = traits(f);
      const word = stateWord(f);
      const line = [specOf(f.species).name, stageName(bodyAge(f), f.species),
        Math.round(f.hp || 0) + "/" + vitals(f).hp + " hp",
        (temperOf(f) === "chill" ? "relaxed" : "swims"),
        (socialOf(f) === "loner" ? "loner" : "school"),
        "feed " + hours(Math.max(0, foodLeft(f, now))) + "h"].join(" · ");
      const mine = [traitWord("bold", tr.bold), traitWord("social", tr.social),
        traitWord("appetite", tr.appetite), traitWord("vigor", tr.vigor)].join(", ");
      return "<button type='button' class='fishline" + (f.id === selected ? " on" : "") + "' data-id='" + f.id + "'><b>" +
        esc(f.name) + "</b>" + (f.gen > 1 ? " <span class='gen'>gen " + f.gen + "</span>" : "") +
        " <span class='mood-" + mood + "'>" + mood + "</span><br><span class='lore'>" + esc(line) +
        (word ? " · <b class='act'>" + word + "</b>" : "") + "<br>traits: " + esc(mine) +
        (f.parents && f.parents.length ? " · from " + esc(f.parents.join(" and ")) : "") + "</span></button>";
    }).join("") || "<p class='lore'>The tank is empty. Buy a fish.</p>";
    const graves = document.getElementById("graves");
    graves.innerHTML = state.cemetery.slice(0, 8).map(function (g) {
      return "<div class='grave'><b>" + esc(g.name) + "</b><br><span class='lore'>" + esc(g.species) +
        " · fish " + g.score + "h · tank " + (g.tankHours || 0) + "h · " + esc(g.theme || "") + "</span></div>";
    }).join("") || "<p class='lore'>No stones yet.</p>";
    document.getElementById("log").innerHTML = state.log.slice(0, 10).map(function (t) { return "<div>" + esc(t) + "</div>"; }).join("");
    document.getElementById("points").textContent = state.points + " pts";
    const clock = document.getElementById("clock");
    const d = new Date();
    clock.textContent = themeOf(state.theme).name + " · " + phase() + " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const shop = document.getElementById("shop");
    const cost = price();
    shop.innerHTML = SPECIES.map(function (s) {
      const taken = s.id === "octo" && hasOcto();
      return "<button type='button' class='btn' " + (taken ? "disabled " : "") + "data-buy='" + s.id + "'>" +
        esc(s.name) + (taken ? " · one already" : (" · " + cost)) +
        "<br><span class='lore'>" + esc(s.blurb) + "</span></button>";
    }).join("");
    const f = state.fish.filter(function (x) { return x.id === selected; })[0];
    const name = document.getElementById("fishName");
    if (document.activeElement !== name) name.value = f ? f.name : "";
    paintChar(f, now);
    const ranked = state.fish.slice().sort(function (a, b) { return ageOf(b, now) - ageOf(a, now); });
    const long = ranked.length ? ageOf(ranked[0], now) : 0;
    const hall = state.cemetery.reduce(function (m, g) { return Math.max(m, g.score || 0); }, 0);
    document.getElementById("mLiving").textContent = state.fish.length + "/" + fishCap();
    const huntEl = document.getElementById("mHunters");
    if (huntEl) huntEl.textContent = (state.predators || []).length + "/" + HUNTER_CAP;
    const autoBtn = document.getElementById("btnAuto");
    if (autoBtn) {
      autoBtn.textContent = state.auto ? "Auto on" : "Auto";
      autoBtn.classList.toggle("gold", !!state.auto);
    }
    document.getElementById("mLong").textContent = hours(long) + " h";
    document.getElementById("mTank").textContent = hours(tankAge(now)) + " h";
    document.getElementById("mBest").textContent = hall + " h";
    const mTemp = document.getElementById("mTemp");
    mTemp.textContent = (Math.round(state.temp * 10) / 10) + "°";
    const offs = state.fish.map(function (x) { return comfort(x); });
    const worst = offs.length ? Math.max.apply(null, offs) : 0;
    mTemp.className = worst > 2.5 ? "q-poor" : worst > 1.5 ? "q-fair" : "q-good";
    document.getElementById("mAlgae").textContent = Math.round(state.algae) + "%";
    const qEl = document.getElementById("mQual");
    qEl.textContent = String(Math.round(state.quality));
    qEl.className = state.quality >= 70 ? "q-good" : state.quality >= 40 ? "q-fair" : "q-poor";
    const eg = document.getElementById("mEggs");
    if (eg) {
      eg.textContent = String((state.eggs || []).length);
      eg.className = (state.eggs || []).length ? "q-good" : "";
    }
    const gn = document.getElementById("mGen");
    if (gn) gn.textContent = "gen " + (state.gen || 1);
    document.getElementById("board").classList.toggle("hidden", state.opts.board === false);
    document.getElementById("boardRows").innerHTML = "<div class='rowline head'><span>Name</span><span>Kind</span><span>Age</span><span>Mood</span></div>" +
      ranked.map(function (fish) {
        return "<div class='rowline'><span>" + esc(fish.name) + "</span><span>" + esc(specOf(fish.species).name) +
          "</span><span>" + hours(ageOf(fish, now)) + "h</span><span class='mood-" + moodOf(fish, now) + "'>" + moodOf(fish, now) + "</span></div>";
      }).join("") +
      (state.crew || []).map(function (c) {
        return "<div class='rowline'><span>" + esc(c.name) + "</span><span>cleaner</span><span>" +
          hours(ageOf(c, now)) + "h</span><span>work</span></div>";
      }).join("");
    const crewShop = document.getElementById("crewShop");
    crewShop.innerHTML = CREW.map(function (c) {
      const n = state.crew.filter(function (x) { return x.role === c.id; }).length;
      return "<button type='button' class='btn' data-crew='" + c.id + "'>" + esc(c.name) + " · " + c.cost +
        " <span class='lore'>(" + n + ") " + esc(c.blurb) + "</span></button>";
    }).join("");
    const noteEl = document.getElementById("waterNote");
    if (noteEl) {
      const notes = [];
      let warm = 0, cold = 0, warmWalk = 0;
      state.fish.forEach(function (x) {
        if (tempNote(x) === "too warm") {
          if (motionOf(x).walk) warmWalk += 1;
          else warm += 1;
        } else if (tempNote(x) === "too cold") cold += 1;
      });
      if (warm) notes.push(warm + (warm > 1 ? " fish find" : " fish finds") + " the water too warm — they gulp at the surface.");
      if (warmWalk) notes.push(warmWalk + (warmWalk > 1 ? " on the sand tuck" : " on the sand tucks") + " against the rocks. The water is too warm.");
      if (cold) notes.push(cold + (cold > 1 ? " fish find" : " fish finds") + " it too cold — they hang low and slow.");
      if ((state.quality || 0) < 45) notes.push("The water is foul. Fish are listless and scratch on the rockwork.");
      if ((state.algae || 0) > 68) notes.push("Green film everywhere. The cleaners cannot keep up.");
      if (state.fish.length >= (hasPerk("crowd") ? 42 : 30)) notes.push("Crowded. Everyone heals slower.");
      if ((state.eggs || []).length) notes.push((state.eggs || []).length + " egg" + ((state.eggs || []).length > 1 ? "s" : "") + " on the rockwork.");
      noteEl.textContent = notes.join(" ") || "Water is steady.";
    }
    const goalEl = document.getElementById("goals");
    if (goalEl) {
      goalEl.innerHTML = GOALS.map(function (g) {
        const done = state.goals && state.goals[g.id];
        return "<div class='goal" + (done ? " done" : "") + "'>" + (done ? "✓" : "·") + " " + esc(g.text) +
          (done ? "" : " <span class='lore'>+" + g.pay + "</span>") + "</div>";
      }).join("");
    }
  }
  function portraitSrc(id) {
    if (id === "octo" || id === "mandarin" || id === "pepper" || id === "tusk" || id === "dragon" || id === "mask") return "./assets/fish/" + id + "_r.png";
    if (id === "claw" || id === "crab") return "./assets/fish/" + id + "_r.png";
    return "./assets/fish/" + id + "_adult.png";
  }
  function paintChar(f, now) {
    const title = document.getElementById("charTitle");
    const latin = document.getElementById("charLatin");
    const niche = document.getElementById("charNiche");
    const bio = document.getElementById("charBio");
    const stats = document.getElementById("charStats");
    const pic = document.getElementById("charPic");
    if (!title) return;
    if (!f) {
      title.textContent = "Choose a fish";
      latin.textContent = "";
      niche.textContent = "Character";
      bio.textContent = "Click a fish in the glass or the list. The card shows who they are, how they live, and the numbers on them right now.";
      stats.innerHTML = "";
      pic.removeAttribute("src");
      pic.alt = "";
      return;
    }
    const spec = specOf(f.species);
    const card = BIOS[f.species] || {};
    const cycle = cycleOf(f.species);
    const grown = f.growthHours || 0;
    const lifeH = cycle[5] + Math.round((f.bonus || 0) / HOUR);
    const left = Math.max(0, lifeH - grown);
    title.textContent = f.name;
    latin.textContent = (card.latin ? card.latin + " · " : "") + spec.name;
    niche.textContent = card.niche || "Fish";
    bio.textContent = card.text || spec.blurb;
    pic.src = portraitSrc(f.species);
    pic.alt = spec.name;
    const rows = [
      ["Stage", stageName(bodyAge(f), f.species)],
      ["Age", hours(ageOf(f, now)) + " h"],
      ["Growth", grown + " / " + lifeH + " h"],
      ["Life left", left + " h"],
      ["Health", Math.round(f.hp || 0) + " / " + vitals(f).hp],
      ["Fed for", hours(Math.max(0, foodLeft(f, now))) + " h"],
      ["Mood", moodOf(f, now)],
      ["Doing", stateWord(f) || "cruising"],
      ["Water", tempNote(f) || "comfortable"],
      ["Temper", spec.temper === "chill" ? "Relaxed" : "Swims a lot"],
      ["With others", spec.social === "loner" ? "Loner" : "School"],
      ["Line", "gen " + (f.gen || 1)],
      ["Depth", (f.z == null ? 0.5 : f.z) > 0.66 ? "near the glass" : ((f.z == null ? 0.5 : f.z) < 0.38 ? "far water" : "mid water")]
    ];
    stats.innerHTML = rows.map(function (row) {
      return "<div><dt>" + esc(row[0]) + "</dt><dd>" + esc(row[1]) + "</dd></div>";
    }).join("");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function menuKeeperPick(ownerName) {
    const who = KEEPERS[menuKeeper] || KEEPERS.mara;
    return {
      id: who.id,
      name: String(ownerName || who.name).slice(0, 18),
      perks: menuPerks.slice(0, 3)
    };
  }
  let keeperNext = 0;
  let keeperLast = "";
  let keeperHide = 0;
  const KEEPER_LINES = {
    hot: [
      "Hey. It is getting warm in there for somebody.",
      "The water is a bit hot for the fish that need it cooler.",
      "If this tank is mostly one kind, the heat will bother them more."
    ],
    cold: [
      "It is a little cold for some of them.",
      "A few fish are hanging low. The water is under their range.",
      "Cool water is fine for a mix. One kind feels it more."
    ],
    dirty: [
      "The glass is getting green. A snail would help.",
      "Algae is climbing. Nothing angry about it. Just time for a scrape.",
      "One kind of fish dirties a tank faster. A mix stays cleaner."
    ],
    foul: [
      "The water is turning. A change would be kind.",
      "Quality is low. They will be listless until it clears."
    ],
    variety: [
      "A mixed tank. Temperature matters less when they are different.",
      "I like this. Lots of kinds. The water can wander a little."
    ],
    mono: [
      "Almost one kind in there. Keep the temperature close to what they like.",
      "A single school is beautiful, and fussier about the heat."
    ],
    calm: [
      "They look settled. I will leave them to it.",
      "Quiet hour. That is a good hour.",
      "Nothing to fix. Just watching."
    ],
    feed: [
      "There. Someone will get that flake.",
      "Food is in. Let them sort it out."
    ]
  };
  function keeperLine(key) {
    const list = KEEPER_LINES[key] || KEEPER_LINES.calm;
    return list[(Math.random() * list.length) | 0];
  }
  function paintKeeperBox() {
    const box = document.getElementById("keeperBox");
    if (!box || !state) return;
    const info = keeperInfo();
    const face = KEEPERS[info.id] || KEEPERS.mara;
    const pic = document.getElementById("keeperPic");
    const label = document.getElementById("keeperLabel");
    if (pic) { pic.src = "./assets/keepers/" + face.id + ".png"; pic.alt = face.name; }
    if (label) label.textContent = info.name || face.name;
  }
  function keeperSay(text, force) {
    if (!text) return;
    const now = Date.now();
    if (!force && now < keeperNext) return;
    if (text === keeperLast && now < keeperNext + 20000) return;
    keeperLast = text;
    keeperNext = now + (force ? 32000 : 72000);
    const bubble = document.getElementById("keeperBubble");
    if (bubble) {
      bubble.textContent = text;
      bubble.classList.remove("hidden");
      clearTimeout(keeperHide);
      keeperHide = setTimeout(function () { bubble.classList.add("hidden"); }, 8500);
    }
    if (!sfxOn() || typeof speechSynthesis === "undefined") return;
    try {
      const face = KEEPERS[keeperInfo().id] || KEEPERS.mara;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.94;
      u.pitch = face.pitch || 1;
      u.volume = Math.max(0.2, sfxVol());
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (_) {}
  }
  function keeperNote(text) {
    if (!state) return;
    state._keeperNote = { at: Date.now(), text: text };
  }
  function keeperPulse(now) {
    if (!playing || !state) return;
    const thanks = document.getElementById("thanksLayer");
    if (thanks && !thanks.classList.contains("hidden")) return;
    const note = state._keeperNote;
    if (note && now - note.at < 20000 && note.text !== keeperLast) {
      keeperSay(note.text, true);
      state._keeperNote = null;
      return;
    }
    if (now < keeperNext) return;
    if (now - (state._keeperLook || 0) < 18000) return;
    state._keeperLook = now;
    const mix = mixScale();
    let warm = 0, cold = 0;
    state.fish.forEach(function (f) {
      const noteWord = tempNote(f);
      if (noteWord === "too warm") warm += 1;
      else if (noteWord === "too cold") cold += 1;
    });
    if (warm >= 1 && mix.share > 0.45) { keeperSay(keeperLine("hot"), false); return; }
    if (cold >= 1 && mix.share > 0.45) { keeperSay(keeperLine("cold"), false); return; }
    if ((state.algae || 0) > 55) { keeperSay(keeperLine("dirty"), false); return; }
    if ((state.quality || 100) < 48) { keeperSay(keeperLine("foul"), false); return; }
    if (mix.kinds >= 5 && Math.random() < 0.35) { keeperSay(keeperLine("variety"), false); return; }
    if (mix.kinds === 1 && state.fish.length >= 4 && Math.random() < 0.4) { keeperSay(keeperLine("mono"), false); return; }
    if (Math.random() < 0.25) keeperSay(keeperLine("calm"), false);
  }
  function paintKeeperMenu() {
    const box = document.getElementById("menuKeepers");
    const perks = document.getElementById("menuPerks");
    const sheet = document.getElementById("keeperSheet");
    if (!box || !perks) return;
    box.innerHTML = Object.keys(KEEPERS).map(function (id) {
      const k = KEEPERS[id];
      return "<button type='button' class='keeper-card" + (menuKeeper === id ? " on" : "") + "' data-keeper='" + id + "'><img src='./assets/keepers/" + id + ".png' alt='" + k.name + "'><b>" + k.name + "</b><span>" + k.tag + "</span></button>";
    }).join("");
    perks.innerHTML = PERKS.map(function (p) {
      const on = menuPerks.indexOf(p.id) >= 0;
      return "<button type='button' class='perk-card" + (on ? " on" : "") + "' data-perk='" + p.id + "'><b>" + p.name + "</b><span>" + p.text + "</span></button>";
    }).join("");
    const face = KEEPERS[menuKeeper] || KEEPERS.mara;
    const gifts = menuPerks.map(function (id) {
      const p = PERKS.filter(function (x) { return x.id === id; })[0];
      return p ? "<li><b>" + p.name + "</b> — " + p.text + "</li>" : "";
    }).join("");
    if (sheet) {
      sheet.innerHTML = "<img src='./assets/keepers/" + face.id + ".png' alt='" + face.name + "'>" +
        "<div><p class='rpg-tag'>" + face.tag + "</p><h2>" + face.name + "</h2>" +
        "<p class='char-bio'>" + face.bio + "</p>" +
        "<ul class='rpg-gifts'>" + (gifts || "<li>No gifts yet. Choose three below.</li>") + "</ul></div>";
    }
    const note = document.getElementById("perkNote");
    if (note) note.textContent = menuPerks.length === 3 ? "Three gifts on the card." : ("Choose " + (3 - menuPerks.length) + " more.");
  }
  function loop(t) {
    if (!playing || !state) { syncLoops(); requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const now = Date.now();
    AR = Math.max(0.5, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    catchUp(now);
    simWater(now);
    tickAuto(now);
    stepHand(dt);
    state.fish.forEach(function (f) { stepFish(f, dt); });
    stepInks(dt, now);
    resolveBites();
    (state.crew || []).forEach(function (c) { stepCrew(c, dt); });
    (state.predators || []).forEach(function (p) { stepPredator(p, dt); });
    stepAmbient(dt, now);
    state.fish.forEach(function (f) {
      if (f.splashAt && now >= f.splashAt) {
        f.splashAt = 0;
        addRipple(f.x, 0.08);
      }
    });
    if (!state._pts || now - state._pts > 45000) {
      state._pts = now;
      state.fish.forEach(function (f) {
        const m = moodOf(f, now);
        state.points += m === "happy" ? 1 : m === "normal" ? 1 : 0;
      });
      if (state.fish.length) save();
      if (window.ArcadeLedger && ArcadeLedger.fish && (!state._tankPost || now - state._tankPost > HOUR)) {
        state._tankPost = now;
        const lead = state.fish.slice().sort(function (a, b) { return ageOf(b, now) - ageOf(a, now); })[0];
        ArcadeLedger.fish({
          name: state.owner || "Keeper",
          score: lead ? Math.round(ageOf(lead, now) / HOUR) : 0,
          tankHours: Math.round(tankAge(now) / HOUR),
          theme: themeOf(state.theme).name,
          species: lead ? lead.species : "",
          stage: lead ? stageName(bodyAge(lead), lead.species) : "",
          fish: lead ? lead.name : "",
          date: new Date(now).toISOString().slice(0, 10),
          event: "tank"
        });
      }
    }
    if (state.opts.motion !== false) {
      [0.42, 0.60].forEach(function (ax, i) {
        if (Math.random() < dt * (i ? 1.7 : 1.1)) {
          bubbles.push({ x: ax + (Math.random() - 0.5) * 0.018, y: 0.84, r: 1.5 + Math.random() * 3.2, v: 0.05 + Math.random() * 0.06, wob: Math.random() * 6.28, at: 0 });
        }
      });
      if (Math.random() < dt * 0.5) {
        bubbles.push({ x: 0.15 + Math.random() * 0.7, y: 0.84, r: 2 + Math.random() * 3, v: 0.04 + Math.random() * 0.04, wob: Math.random() * 6.28, at: 0 });
      }
      bubbles.forEach(function (b) {
        b.at = (b.at || 0) + dt;
        b.y -= b.v * dt;
        b.x += Math.sin(b.at * 2.2 + b.wob) * 0.004 * dt;
        b.r += dt * 0.18;
      });
      bubbles = bubbles.filter(function (b) { return b.y > 0.12 && b.x > 0.01 && b.x < 0.99; });
    }
    if (!state._paint || now - state._paint > 400) {
      state._paint = now;
      renderRail();
    }
    resize();
    draw();
    syncLoops();
    keeperPulse(now);
    requestAnimationFrame(loop);
  }
  function pick(id) { selected = id; renderRail(); }
  document.getElementById("fishList").onclick = function (e) {
    const b = e.target.closest("[data-id]");
    if (b) pick(b.getAttribute("data-id"));
  };
  canvas.addEventListener("click", function (e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    let best = null, bd = 0.08;
    state.fish.forEach(function (f) {
      const d = Math.hypot(f.x - x, f.y - y) + (1 - depthOf(f)) * 0.045;
      if (d < bd) { bd = d; best = f; }
    });
    if (best) pick(best.id);
  });
  document.getElementById("fishName").addEventListener("change", function (e) {
    const f = state.fish.filter(function (x) { return x.id === selected; })[0];
    if (!f) return;
    f.name = String(e.target.value || f.name).slice(0, 16);
    save();
    renderRail();
  });
  document.getElementById("feed").onclick = function () {
    if (!startHand("flakes")) return;
    state.algae = clamp((state.algae || 0) + 3, 0, 100);
    renderRail();
  };
  document.getElementById("pellet").onclick = function () {
    if (!state.fish.length) { log("No one is home to feed."); return; }
    if (state.points < 15) { log("A pellet costs 15 points."); return; }
    state.points -= 15;
    if (!startHand("pellet")) { state.points += 15; return; }
    save();
    renderRail();
  };
  document.getElementById("shop").onclick = function (e) {
    const b = e.target.closest("[data-buy]");
    if (!b) return;
    if (state.fish.length >= fishCap()) { log("The tank holds " + fishCap() + " fish. More than that and the water turns."); return; }
    const sp = b.getAttribute("data-buy");
    if (sp === "octo" && hasOcto()) { log("One octopus already keeps this glass."); return; }
    const cost = price();
    if (state.points < cost) { log("Need " + cost + " points."); return; }
    state.points -= cost;
    const fish = makeFish(sp, specOf(sp).name);
    state.fish.push(fish);
    selected = fish.id;
    log(fish.name + " joins. A baby.");
    save();
    renderRail();
  };
  document.getElementById("owner").addEventListener("change", function (e) {
    state.owner = String(e.target.value || "Keeper").slice(0, 18);
    save();
  });
  document.getElementById("change").onclick = function () {
    if (state.points < 10) { log("A water change costs 10 points."); return; }
    state.points -= 10;
    state.algae = clamp(state.algae - 28, 0, 100);
    state.quality = clamp(state.quality + 24, 0, 100);
    log("You change a third of the water. Algae drops. The glass clears.");
    save();
    renderRail();
  };
  document.getElementById("crewShop").onclick = function (e) {
    const b = e.target.closest("[data-crew]");
    if (!b) return;
    if (state.crew.length >= 8) { log("Eight cleaners fill the work."); return; }
    const spec = crewOf(b.getAttribute("data-crew"));
    if (!spec) return;
    if (state.points < spec.cost) { log(spec.name + " costs " + spec.cost + " points."); return; }
    state.points -= spec.cost;
    state.crew.push(makeCrew(spec.id));
    log(spec.name + " starts work.");
    save();
    renderRail();
  };
  function syncOpt() {
    const o = state.opts;
    document.getElementById("optNames").checked = o.names !== false;
    document.getElementById("optBoard").checked = o.board !== false;
    document.getElementById("optMotion").checked = o.motion !== false;
    document.getElementById("optHeater").checked = !!o.heater;
    document.getElementById("optSound").checked = o.sound !== false;
    document.getElementById("optSoundVol").value = String(Math.round((o.soundVol == null ? 0.4 : o.soundVol) * 100));
    document.getElementById("optSoundVal").textContent = Math.round((o.soundVol == null ? 0.4 : o.soundVol) * 100) + "%";
    document.getElementById("optClock").value = o.clock || "real";
    document.getElementById("optTemp").value = String(o.temp || 25);
    document.getElementById("optTempVal").textContent = (o.temp || 25) + "°";
  }
  function readOpt() {
    const o = state.opts;
    o.names = document.getElementById("optNames").checked;
    o.board = document.getElementById("optBoard").checked;
    o.motion = document.getElementById("optMotion").checked;
    o.heater = document.getElementById("optHeater").checked;
    o.sound = document.getElementById("optSound").checked;
    o.soundVol = (Number(document.getElementById("optSoundVol").value) || 0) / 100;
    document.getElementById("optSoundVal").textContent = Math.round(o.soundVol * 100) + "%";
    syncLoops();
    o.clock = document.getElementById("optClock").value || "real";
    o.temp = Number(document.getElementById("optTemp").value) || 25;
    document.getElementById("optTempVal").textContent = o.temp + "°";
    heldOpts = Object.assign({}, o);
    if (hasSave) save();
    if (playing) renderRail();
  }
  function showMenu() {
    playing = false;
    const cont = document.getElementById("menuContinue");
    if (cont) cont.disabled = !hasSave;
    document.getElementById("menu").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    paintCast();
  }
  function enterTank() {
    playing = true;
    last = performance.now();
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    const ownerEl = document.getElementById("owner");
    if (ownerEl) ownerEl.value = state.owner || "Keeper";
    resize();
    renderRail();
    syncLoops();
    paintKeeperBox();
    if (thanksQueued) openThanks();
  }
  function paintCast() {
    const box = document.getElementById("menuCast");
    if (!box) return;
    box.innerHTML = SPECIES.map(function (s) {
      const on = menuPicks.indexOf(s.id) >= 0;
      return "<button type='button' data-pick='" + s.id + "' class='" + (on ? "on" : "") + "'>" + esc(s.name) + "<br><span class='lore'>" + (s.temper === "chill" ? "Relaxed" : "Swims a lot") + " · " + (s.social === "loner" ? "Loner" : "School") + "</span></button>";
    }).join("");
  }
  function showPanel(which) {
    ["panelHome", "panelKeep", "panelTank", "panelHow"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("hidden", id !== which);
    });
    document.querySelectorAll(".menu-tabs .tab").forEach(function (tab) {
      tab.classList.toggle("on", tab.getAttribute("data-tab") === which);
    });
  }
  document.getElementById("menuContinue").onclick = function () {
    if (!hasSave || !state) return;
    enterTank();
  };
  document.getElementById("menuNew").onclick = function () { showPanel("panelKeep"); paintKeeperMenu(); };
  document.querySelectorAll(".menu-tabs .tab").forEach(function (tab) {
    tab.onclick = function () {
      const id = tab.getAttribute("data-tab");
      if (id === "panelKeep") paintKeeperMenu();
      if (id === "panelTank") paintCast();
      showPanel(id);
    };
  });
  const toTank = document.getElementById("menuToTank");
  if (toTank) toTank.onclick = function () {
    if (menuPerks.length !== 3) {
      document.getElementById("perkNote").textContent = "Pick exactly three gifts.";
      return;
    }
    paintCast();
    showPanel("panelTank");
  };
  document.getElementById("menuHow").onclick = function () { showPanel("panelHow"); };
  document.getElementById("menuBack").onclick = function () { showPanel("panelKeep"); paintKeeperMenu(); };
  document.getElementById("howBack").onclick = function () { showPanel("panelHome"); };
  document.getElementById("menuOpt").onclick = function () {
    if (!state) {
      state = { fish: [], crew: [], cemetery: [], log: [], points: 0, owner: "Keeper", opts: heldOpts || {} };
      ensureState();
    }
    syncOpt();
    document.getElementById("optLayer").classList.remove("hidden");
  };
  document.getElementById("menuCast").onclick = function (e) {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    const id = b.getAttribute("data-pick");
    const ix = menuPicks.indexOf(id);
    if (ix >= 0) menuPicks.splice(ix, 1);
    else if (menuPicks.length < 3) menuPicks.push(id);
    paintCast();
    document.getElementById("menuNote").textContent = menuPicks.length === 3 ? "Three chosen." : ("Choose " + (3 - menuPicks.length) + " more.");
  };
  document.querySelectorAll("[data-theme]").forEach(function (btn) {
    btn.onclick = function () {
      menuTheme = btn.getAttribute("data-theme") || "river";
      document.querySelectorAll("[data-theme]").forEach(function (el) { el.classList.toggle("on", el === btn); });
    };
  });
  document.querySelectorAll("[data-mode]").forEach(function (btn) {
    btn.onclick = function () {
      menuMode = btn.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(function (el) { el.classList.toggle("on", el === btn); });
    };
  });
  document.getElementById("menuAuto").onclick = function () {
    const ownerName = document.getElementById("menuOwner") ? document.getElementById("menuOwner").value : "Keeper";
    if (menuPerks.length !== 3) menuPerks = ["clear", "bright", "meals"];
    fresh(["dart", "ruby", "azure"], "standard", ownerName || "Keeper", menuTheme || "river");
    state.auto = true;
    save();
    enterTank();
    log("Automatic keeper is on. It will stock, feed, and clean. It cannot stop a hunter.");
  };
  document.getElementById("btnAuto").onclick = function () {
    if (!state) return;
    state.auto = !state.auto;
    log(state.auto ? "Automatic keeper is on. Hunters still hunt." : "Automatic keeper is off.");
    save();
    renderRail();
  };
  document.getElementById("menuKeepers").onclick = function (e) {
    const b = e.target.closest("[data-keeper]");
    if (!b) return;
    menuKeeper = b.getAttribute("data-keeper");
    paintKeeperMenu();
  };
  document.getElementById("menuPerks").onclick = function (e) {
    const b = e.target.closest("[data-perk]");
    if (!b) return;
    const id = b.getAttribute("data-perk");
    const ix = menuPerks.indexOf(id);
    if (ix >= 0) menuPerks.splice(ix, 1);
    else if (menuPerks.length < 3) menuPerks.push(id);
    paintKeeperMenu();
  };
  document.getElementById("menuOpen").onclick = function () {
    if (menuPicks.length !== 3) {
      document.getElementById("menuNote").textContent = "Pick exactly three fish.";
      return;
    }
    if (menuPerks.length !== 3) {
      document.getElementById("perkNote").textContent = "Pick exactly three gifts.";
      return;
    }
    const ownerName = document.getElementById("menuOwner").value || (KEEPERS[menuKeeper] || KEEPERS.mara).name;
    fresh(menuPicks.slice(), menuMode, ownerName, menuTheme);
    enterTank();
    keeperSay("I am here. We will take this slow.", true);
  };
  document.getElementById("btnMenu").onclick = function () {
    if (state) save();
    showMenu();
  };
  document.getElementById("btnOpt").onclick = function () {
    syncOpt();
    document.getElementById("optLayer").classList.remove("hidden");
  };
  document.getElementById("thanksClose").onclick = function () { closeThanks(); };
  document.getElementById("thanksLayer").onclick = function (e) {
    if (e.target.id === "thanksLayer") closeThanks();
  };
  document.getElementById("optClose").onclick = function () {
    readOpt();
    document.getElementById("optLayer").classList.add("hidden");
  };
  ["optNames", "optBoard", "optMotion", "optHeater", "optClock", "optSound", "optSoundVol"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", readOpt);
  });
  document.getElementById("optTemp").addEventListener("input", readOpt);
  document.getElementById("optSoundVol").addEventListener("input", readOpt);
  document.getElementById("optReset").onclick = function () {
    if (!window.confirm("Clear this tank, the cleaners, and the cemetery in this browser?")) return;
    fresh();
    const ownerEl = document.getElementById("owner");
    if (ownerEl) ownerEl.value = state.owner || "Keeper";
    document.getElementById("optLayer").classList.add("hidden");
    renderRail();
  };

  /* Read-only view: for the curious, and for the tools. Nothing here writes. */
  window.FishTank = {
    get: function () { return state; },
    debug: function () {
      const counts = {};
      (state && state.fish ? state.fish : []).forEach(function (f) { counts[f.state || "?"] = (counts[f.state || "?"] || 0) + 1; });
      const offs = (state && state.fish ? state.fish : []).map(function (f) { return comfort(f); });
      return {
        fish: state ? state.fish.length : 0,
        states: counts,
        crew: state ? (state.crew || []).length : 0,
        hunters: state ? (state.predators || []).length : 0,
        stalking: state ? (state.predators || []).filter(function (p) { return p.pending; }).length : 0,
        eggs: state ? (state.eggs || []).length : 0,
        gen: state ? (state.gen || 1) : 1,
        worstTempOff: offs.length ? Math.round(Math.max.apply(null, offs) * 10) / 10 : 0,
        temp: state ? Math.round((state.temp || 0) * 10) / 10 : 0,
        quality: state ? Math.round(state.quality || 0) : 0,
        algae: state ? Math.round(state.algae || 0) : 0,
        goals: state ? Object.keys(state.goals || {}).length : 0,
        motes: motes.length,
        aspect: Math.round(AR * 100) / 100,
        points: state ? state.points : 0
      };
    }
  };
  load();
  showMenu();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);
})();
