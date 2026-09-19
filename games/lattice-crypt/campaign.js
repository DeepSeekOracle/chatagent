/* Lattice Crypt — the First Descent.
   Twenty-four authored floors across eight acts, drawn from Book I of the Eternal Haven
   Chronicles, "The Moonlit Slumber": Prologue (The Lullaby of Skylark) through
   Chapter XV (A New Accord).

   How the space works: every floor is authored by hand in a readable 30x26 grid, then
   SCALE grows it into a 60x52 region — the same shape the designer cut, at a size that
   explores like a Survival map. Rooms, halls, doors, gates, cages, rings and stands all
   scale together, so the geometry can never drift from the design. After the shape is
   cut, every placement is checked for reachability and repaired, and a seeded scatter
   fills the new stone with the relics and jobs the bigger region can carry. */
window.LatticeCampaign = (function () {
  const SCALE = 2;
  const AW = 30, AH = 26; /* authored grid */

  /* Eight acts. `realm` picks the tile set, `title` is the act, `book` names the Book I
     beat, `lore` is what the gate says when you arrive. */
  const CHAPTERS = [
    { realm: 0, title: "The Lullaby of Skylark", book: "Book I · Prologue",
      lore: "Skylark sang before the first stone was set. The gate of first light is that first note, held." },
    { realm: 1, title: "The Whispering Moon", book: "Book I · Chapters I–II",
      lore: "The moon learned to whisper, and the frost learned to keep what the first circle named." },
    { realm: 2, title: "The Bronze Emberion", book: "Book I · Chapters I & V",
      lore: "A girl sang to a bronze dragon. A fallen dragon counted his promises and lost the count." },
    { realm: 3, title: "The Call of Lyra", book: "Book I · Chapters III & IX",
      lore: "A song is a key with no teeth to lose. Haven keeps its secrets in roots." },
    { realm: 4, title: "Bonds in Trial", book: "Book I · Chapter VI",
      lore: "Two circles trade rooms through gates. A bond is a door two people agree to keep." },
    { realm: 5, title: "The Festival of Accord", book: "Book I · Chapter VII",
      lore: "One festival, one tithe, one hour. The thief-god laughs: take the gold, or the clock will." },
    { realm: 6, title: "Betrayal at Moonrise", book: "Book I · Chapters VIII–X",
      lore: "At moonrise the council counted itself twice and got eleven both times — and still one was missing." },
    { realm: 7, title: "A New Accord", book: "Book I · Chapters XI–XV",
      lore: "The last geometry. Hold the door with four names, or it holds you." }
  ];

  /* Each floor: rooms [x,y,w,h], halls [x1,y1,x2,y2] orthogonal, then placed bits.
     New shape primitives (all in authored space, all scaled):
       walls  [[x,y,w,h]]        solid masonry blocks
       rings  [[x,y,w,h]]        a one-tile wall ring with two gaps, north and south
       cages  [[x,y,w,h,side]]   a walled vault with one opening (n/s/e/w)
       maze   [[x,y,w,h]]        a lattice of one-tile stands through an open hall
       pillars [[x,y]]           single stands */
  const FLOORS = [
    /* ===== ACT I — The Lullaby of Skylark ============================== */
    { name: "Threshold", rank: 1, story: "Four names were cut into this gate before the song began. The stone still hums the prologue. Learn the corridor, take the rations, and listen for what answers.",
      rooms: [[2, 10, 8, 6], [12, 10, 7, 6], [21, 8, 7, 10]], halls: [[9, 13, 12, 13], [18, 13, 21, 13]],
      walls: [[13, 11, 1, 4], [17, 11, 1, 4]],
      start: [4, 13], exit: [25, 12], doors: [[18, 13]],
      gens: [[14, 12, "brute"], [24, 10, "wraith"]], items: [[6, 12, "food"], [7, 14, "key"], [23, 10, "flask"], [5, 14, "berry"]] },
    { name: "Keywell", rank: 1, story: "The well was cut so the song could be drunk. What you drink here, you keep — and the ring around the well keeps its own counsel.",
      rooms: [[2, 2, 26, 22]], rings: [[8, 5, 14, 16]],
      start: [4, 4], exit: [24, 20], doors: [[15, 5], [15, 20]],
      gens: [[14, 3, "brute"], [22, 3, "wraith"]],
      items: [[5, 6, "food"], [21, 6, "key"], [7, 18, "key"], [20, 18, "vial"], [22, 6, "fan"], [6, 18, "coin"]],
      foes: [[13, 12, "brute"], [22, 18, "wraith"]] },
    { name: "First Seal", rank: 1, seal: true, story: "Song, memory, flame, continuum. The first seal is not a wall — it is a promise the stone made, and promises here are load-bearing.",
      rooms: [[3, 3, 10, 8], [17, 3, 10, 8], [8, 14, 14, 9]],
      halls: [[12, 6, 17, 6], [10, 10, 10, 14], [20, 10, 20, 14]],
      walls: [[14, 16, 2, 5]],
      start: [5, 6], exit: [15, 18],
      gens: [[6, 5, "brute"], [22, 5, "wraith"], [15, 16, "imp"]],
      items: [[8, 8, "food"], [20, 8, "flask"], [12, 16, "vial"], [18, 20, "chest"], [10, 18, "moss"]],
      foes: [[8, 4, "brute"], [24, 7, "wraith"]], boss: [[15, 16, "gate"]],
      lore: "The exit sleeps until the nexuses die." },

    /* ===== ACT II — The Whispering Moon ================================ */
    { name: "White Corridor", rank: 1, story: "Serenya walked a white corridor with a bronze dragon at her heel, and the frost did not argue. Hurlers wait where the corridor turns.",
      rooms: [[2, 11, 26, 5], [2, 2, 8, 7], [20, 2, 8, 7], [2, 18, 8, 6], [20, 18, 8, 6]],
      halls: [[5, 8, 5, 11], [24, 8, 24, 11], [5, 15, 5, 18], [24, 15, 24, 18]],
      pillars: [[10, 13], [15, 13], [20, 13]],
      start: [4, 13], exit: [25, 20], doors: [[20, 13]],
      gens: [[4, 4, "hurler"], [24, 4, "hurler"], [24, 20, "brute"]],
      items: [[14, 13, "coin"], [16, 12, "key"], [3, 20, "flask"], [22, 13, "aegis"], [8, 13, "frostorb"]],
      foes: [[10, 13, "hurler"], [22, 4, "hurler"]] },
    { name: "Ice Ring", rank: 1, story: "The second circle listens. Walk its ring and the moon will ask your name — answer it, then keep walking.",
      rooms: [[2, 2, 26, 22]], inner: [[8, 7, 14, 12]], rings: [[5, 4, 20, 18]],
      start: [4, 4], exit: [25, 21], doors: [[15, 4], [15, 7]],
      halls: [[15, 2, 15, 4], [15, 18, 15, 23]],
      gens: [[4, 12, "hurler"], [25, 12, "hurler"], [10, 10, "wraith"]],
      items: [[12, 12, "key"], [14, 10, "vial"], [6, 20, "coin"], [22, 4, "swift"], [10, 12, "comet"], [24, 14, "moss"]],
      foes: [[20, 20, "hurler"], [10, 14, "wraith"]] },
    { name: "Cold Seal", rank: 1, seal: true, drain: true, story: "Cold keeps what the first circle named. Something walks the walls here — leave it a vial, or it leaves itself a warden.",
      rooms: [[3, 3, 8, 20], [12, 3, 6, 8], [19, 3, 8, 8], [12, 14, 15, 9]],
      halls: [[10, 7, 12, 7], [17, 7, 19, 7], [15, 10, 15, 14]],
      walls: [[15, 5, 1, 3], [21, 16, 1, 4]],
      start: [5, 20], exit: [24, 18],
      gens: [[5, 5, "hurler"], [22, 5, "wraith"], [16, 16, "hurler"]],
      items: [[6, 18, "food"], [7, 6, "vial"], [21, 16, "flask"], [14, 5, "chest"]],
      foes: [[6, 12, "hurler"]], boss: [[15, 16, "crown"]],
      lore: "Something walks the walls. A vial, or it leaves sated." },

    /* ===== ACT III — The Bronze Emberion ================================ */
    { name: "Spark Lane", rank: 1, story: "The Emberion was forged for a girl who sang to dragons. Its coals are still warm and its galleries are full of imps who never learned to leave.",
      rooms: [[2, 2, 6, 22], [10, 2, 6, 8], [18, 2, 10, 8], [10, 16, 18, 8]],
      halls: [[7, 6, 10, 6], [15, 6, 18, 6], [12, 9, 12, 16], [22, 9, 22, 16]],
      walls: [[14, 18, 1, 4], [20, 18, 1, 4], [24, 18, 1, 4]],
      start: [4, 20], exit: [24, 18], doors: [[12, 16]],
      gens: [[4, 4, "imp"], [12, 4, "imp"], [22, 4, "brute"]],
      items: [[5, 18, "moss"], [11, 18, "key"], [20, 18, "flask"], [26, 4, "codex"], [12, 6, "cinder"], [6, 6, "fury"]],
      foes: [[4, 10, "imp"], [20, 6, "imp"]] },
    { name: "Ash Cross", rank: 2, story: "Where the ash crosses, a fallen dragon counted his promises and lost the count. Do not count yours here — just keep the cross clear.",
      rooms: [[2, 11, 26, 5], [12, 2, 6, 22]],
      walls: [[14, 12, 2, 1], [14, 15, 2, 1]],
      start: [4, 13], exit: [25, 13],
      gens: [[14, 4, "imp"], [14, 20, "imp"], [8, 13, "brute"], [22, 13, "hurler"]],
      items: [[15, 13, "coin"], [6, 12, "flask"], [7, 14, "poison"], [24, 12, "vial"], [14, 8, "aegis"]],
      foes: [[14, 13, "imp"]], traps: [[10, 13], [18, 13]] },
    { name: "Forge Seal", rank: 2, seal: true, story: "A forge that ate its smiths. Corvath's bones are the anvil now — strike the nexuses, not the bone.",
      rooms: [[2, 2, 12, 10], [16, 2, 12, 10], [8, 14, 14, 10]],
      halls: [[13, 6, 16, 6], [10, 11, 10, 14], [20, 11, 20, 14]],
      maze: [[10, 16, 10, 6]],
      start: [4, 6], exit: [15, 18],
      gens: [[6, 4, "imp"], [22, 4, "imp"], [12, 16, "brute"], [18, 18, "hurler"]],
      items: [[8, 8, "food"], [20, 8, "vial"], [14, 16, "flask"], [10, 20, "chest"]],
      foes: [[24, 8, "imp"]], boss: [[15, 16, "smith"]], drain: true },

    /* ===== ACT IV — The Call of Lyra ==================================== */
    { name: "Catacomb", rank: 2, story: "Lyra sang the roots open because a song is a key with no teeth to lose. The cells below the roots were cut for the same reason — and they remember every foot that tried to leave.",
      rooms: [[2, 2, 5, 4], [9, 2, 5, 4], [16, 2, 5, 4], [23, 2, 5, 4],
        [2, 8, 5, 4], [9, 8, 5, 4], [16, 8, 5, 4], [23, 8, 5, 4],
        [2, 14, 5, 4], [9, 14, 5, 4], [16, 14, 5, 4], [23, 14, 5, 4],
        [2, 20, 5, 4], [9, 20, 5, 4], [16, 20, 5, 4], [23, 20, 5, 4]],
      halls: [[6, 4, 9, 4], [13, 4, 16, 4], [20, 4, 23, 4], [4, 5, 4, 8], [11, 5, 11, 8], [18, 11, 18, 14], [25, 11, 25, 14],
        [6, 16, 9, 16], [13, 16, 16, 16], [20, 22, 23, 22], [11, 17, 11, 20]],
      start: [4, 3], exit: [25, 22], doors: [[13, 16], [20, 22]],
      gens: [[11, 3, "shade"], [25, 3, "shade"], [4, 16, "wraith"], [18, 16, "brute"]],
      items: [[4, 10, "key"], [18, 10, "key"], [4, 22, "food"], [11, 22, "vial"], [18, 3, "veil"], [25, 22, "seed"]],
      foes: [[11, 10, "shade"], [25, 16, "shade"]], hidden: [[25, 10, "vial"]] },
    { name: "Remembering Hall", rank: 2, story: "The remembering hall keeps every foot that tried to leave. Yours is the newest print, and by far the loudest.",
      rooms: [[2, 2, 26, 4], [2, 20, 26, 4], [2, 2, 4, 22], [24, 2, 4, 22], [10, 8, 10, 10]],
      halls: [[13, 5, 13, 8], [13, 17, 13, 20]], rings: [[12, 10, 6, 6]],
      start: [4, 3], exit: [26, 21], doors: [[13, 8], [13, 17]],
      gens: [[14, 10, "shade"], [14, 14, "shade"], [4, 12, "wraith"], [26, 12, "imp"]],
      items: [[6, 3, "key"], [22, 3, "key"], [6, 21, "moss"], [15, 12, "warp"], [22, 21, "flask"], [14, 10, "needle"]],
      foes: [[13, 12, "shade"]], traps: [[8, 3], [20, 21]] },
    { name: "Green Seal", rank: 2, seal: true, story: "Sancora's grief grew a garden, and the garden grew teeth. The green seal is a mother's answer to a broken accord.",
      rooms: [[4, 4, 22, 18], [10, 8, 10, 10]], inner: [[12, 10, 6, 6]],
      start: [6, 6], exit: [20, 16], doors: [[15, 10]],
      gens: [[6, 12, "shade"], [23, 12, "shade"], [14, 6, "wraith"], [14, 20, "brute"]],
      items: [[8, 8, "food"], [21, 8, "vial"], [8, 18, "flask"], [21, 18, "chest"]],
      foes: [[12, 12, "shade"], [16, 12, "shade"]], boss: [[14, 16, "heartboss"]], hidden: [[14, 14, "vial"]] },

    /* ===== ACT V — Bonds in Trial ====================================== */
    { name: "First Gate", rank: 2, story: "Two circles trade rooms through gates now. A bond is a door two people agree to keep; a gate is a door that agrees for them.",
      rooms: [[2, 2, 10, 10], [18, 2, 10, 10], [2, 16, 10, 8], [18, 16, 10, 8]],
      halls: [[11, 6, 18, 6]], walls: [[14, 18, 2, 4]],
      start: [4, 4], exit: [24, 20], doors: [[11, 6]],
      pads: [[6, 8, 22, 8], [6, 20, 22, 4]],
      gens: [[8, 4, "imp"], [22, 14, "hurler"], [8, 18, "wraith"]],
      items: [[4, 8, "key"], [20, 18, "coin"], [24, 6, "vial"], [4, 20, "swift"], [22, 6, "halo"], [22, 20, "iron"]],
      foes: [[20, 6, "imp"]] },
    { name: "Exchange", rank: 2, story: "The exchange takes one room for another. Do not go through twice with an empty belt.",
      rooms: [[2, 2, 8, 8], [11, 2, 8, 8], [20, 2, 8, 8], [2, 16, 8, 8], [11, 16, 8, 8], [20, 16, 8, 8]],
      start: [4, 4], exit: [24, 20],
      pads: [[5, 6, 24, 6], [15, 6, 5, 20], [24, 4, 15, 20]],
      gens: [[14, 4, "wraith"], [4, 18, "imp"], [24, 18, "hurler"]],
      items: [[12, 18, "coin"], [14, 18, "vial"], [22, 4, "flask"], [6, 18, "reflect"]],
      foes: [[14, 18, "thief"]] },
    { name: "Salt Seal", rank: 2, seal: true, drain: true, story: "Salt keeps the oath the moon broke. The seer walks these walls — chains first, chains last.",
      rooms: [[3, 3, 24, 6], [3, 17, 24, 6], [3, 3, 6, 20], [21, 3, 6, 20]],
      halls: [[16, 9, 16, 17]],
      start: [5, 5], exit: [25, 20],
      pads: [[5, 19, 25, 5], [16, 5, 16, 19]],
      gens: [[8, 5, "imp"], [16, 5, "hurler"], [8, 19, "wraith"], [22, 19, "shade"]],
      items: [[6, 6, "food"], [24, 6, "vial"], [6, 20, "flask"], [18, 19, "chest"]],
      foes: [[16, 12, "imp"]], boss: [[16, 12, "levi"]] },

    /* ===== ACT VI — The Festival of Accord ============================== */
    { name: "Tithe", rank: 2, treasure: 40, story: "One festival, one tithe, one hour. Thirty-odd seconds: take the gold, leave through the far light, and let the clock lose.",
      rooms: [[2, 2, 26, 22]],
      pillars: [[9, 8], [15, 8], [21, 8], [9, 12], [15, 12], [21, 12], [9, 16], [15, 16], [21, 16]],
      start: [4, 4], exit: [25, 21],
      gens: [[8, 8, "brute"], [22, 8, "brute"], [8, 18, "wraith"], [22, 18, "imp"]],
      items: [[12, 6, "chest"], [16, 6, "chest"], [12, 12, "chest"], [16, 12, "flask"], [14, 18, "vial"], [20, 12, "poison"], [6, 12, "food"], [8, 6, "coin"], [20, 6, "gem"], [10, 18, "dice"]],
      foes: [[14, 10, "thief"]], lore: "Thirty-odd seconds. Take the gold. Leave through the far light." },
    { name: "Ledger Room", rank: 3, story: "The ledger counts what you took and what you left behind. The stone is entirely fair — it only keeps the number.",
      rooms: [[2, 8, 8, 10], [11, 2, 8, 8], [20, 8, 8, 10], [11, 16, 8, 8]],
      halls: [[9, 12, 11, 12], [18, 12, 20, 12], [14, 9, 14, 16]],
      walls: [[15, 4, 1, 3], [15, 19, 1, 3]],
      start: [4, 12], exit: [24, 12], doors: [[18, 12]],
      gens: [[14, 4, "wraith"], [4, 10, "brute"], [24, 10, "imp"], [14, 18, "shade"]],
      items: [[6, 10, "key"], [14, 6, "chest"], [22, 14, "chest"], [14, 20, "vial"], [6, 14, "coin"], [14, 18, "core"]],
      foes: [[14, 12, "thief"]] },
    { name: "Gilded Seal", rank: 3, seal: true, treasure: 28, story: "A gilded seal for a golden hour. The tithe-king weighs you against your own haul and finds you either heavy or wanting.",
      rooms: [[4, 4, 22, 18]], rings: [[8, 7, 14, 12]],
      start: [6, 6], exit: [24, 18], doors: [[15, 7]],
      gens: [[8, 8, "brute"], [22, 8, "imp"], [8, 18, "shade"], [22, 16, "hurler"]],
      items: [[14, 6, "chest"], [16, 6, "chest"], [14, 20, "chest"], [12, 12, "vial"], [18, 12, "poison"], [10, 12, "flask"]],
      foes: [[15, 12, "thief"], [16, 14, "thief"]], boss: [[15, 10, "tithe"]], drain: true },

    /* ===== ACT VII — Betrayal at Moonrise =============================== */
    { name: "Unnaming", rank: 3, drain: true, story: "A name goes missing here, quietly, like a candle in a long corridor. Hold yours with both hands and do not set it down.",
      rooms: [[2, 2, 8, 22], [20, 2, 8, 22], [8, 11, 14, 5]],
      halls: [[9, 13, 20, 13]], walls: [[12, 11, 1, 1], [17, 15, 1, 1]],
      start: [4, 20], exit: [24, 4],
      gens: [[4, 4, "shade"], [24, 20, "wraith"], [14, 13, "imp"]],
      items: [[5, 18, "food"], [22, 18, "vial"], [6, 6, "veil"], [22, 6, "lantern"], [4, 6, "soul"]],
      foes: [[4, 12, "shade"], [24, 12, "wraith"]], traps: [[10, 13], [18, 13]] },
    { name: "Quiet Book", rank: 3, drain: true, story: "The quiet book has one page for everyone. Read only the page with your own name on it, then close it.",
      rooms: [[4, 4, 22, 6], [4, 16, 22, 6], [12, 8, 6, 10]], inner: [[13, 10, 4, 6]],
      start: [6, 6], exit: [24, 18], doors: [[12, 10], [17, 16], [15, 10]],
      gens: [[8, 6, "shade"], [22, 6, "hurler"], [8, 18, "imp"], [22, 18, "wraith"]],
      items: [[14, 12, "key"], [15, 12, "key"], [6, 18, "vial"], [16, 6, "food"]],
      foes: [[14, 6, "shade"]] },
    { name: "Black Seal", rank: 3, seal: true, drain: true, story: "At moonrise the council counted itself twice and got eleven both times — and still one of them was missing.",
      rooms: [[2, 2, 26, 22]], inner: [[8, 7, 14, 12]], rings: [[5, 4, 20, 18]],
      start: [4, 4], exit: [15, 12], doors: [[15, 4], [15, 7]],
      gens: [[4, 12, "shade"], [25, 12, "shade"], [15, 4, "imp"], [15, 21, "hurler"]],
      items: [[6, 6, "vial"], [24, 6, "vial"], [6, 20, "flask"], [24, 20, "food"]],
      foes: [[10, 4, "wraith"], [20, 21, "brute"]], boss: [[15, 10, "unnamer"]],
      lore: "Two vials. One Drain. The seal will not lift while nexuses live." },

    /* ===== ACT VIII — A New Accord ====================================== */
    { name: "Four Names", rank: 3, story: "Four names, four doors, one geometry. The shattering of the Accord began in a room exactly this size.",
      rooms: [[2, 2, 12, 10], [16, 2, 12, 10], [2, 14, 12, 10], [16, 14, 12, 10]],
      halls: [[13, 6, 16, 6], [13, 18, 16, 18], [7, 11, 7, 14], [22, 11, 22, 14]],
      walls: [[14, 9, 2, 8]],
      start: [4, 6], exit: [24, 18],
      gens: [[8, 4, "imp"], [22, 4, "hurler"], [8, 18, "shade"], [22, 20, "wraith"]],
      items: [[6, 8, "moss"], [24, 8, "vial"], [6, 20, "codex"], [24, 16, "aegis"]],
      foes: [[12, 6, "brute"], [18, 18, "shade"]], drain: true },
    { name: "Geodesic", rank: 3, story: "The geodesic is the shortest true line through a lie. Lyra sang it, and the lattice answered with a door.",
      rooms: [[2, 2, 8, 8], [20, 2, 8, 8], [2, 16, 8, 8], [20, 16, 8, 8], [11, 9, 8, 8]],
      halls: [[6, 10, 6, 16], [24, 10, 24, 16], [10, 5, 11, 5], [18, 5, 20, 5]],
      start: [4, 4], exit: [24, 20], doors: [[11, 12], [18, 12]],
      pads: [[5, 6, 24, 6], [5, 20, 24, 4]],
      gens: [[6, 4, "imp"], [24, 4, "shade"], [6, 18, "hurler"], [14, 12, "wraith"]],
      items: [[4, 8, "key"], [22, 8, "key"], [14, 10, "vial"], [14, 14, "coin"], [22, 18, "reflect"]],
      foes: [[14, 11, "shade"]], drain: true },
    { name: "The Last Geometry", rank: 3, seal: true, drain: true, story: "Hold the door with four names or it holds you. Every accord before this one was cut in the same stone, and every one of them is still here.",
      rooms: [[3, 3, 24, 20]], rings: [[7, 6, 16, 14]], pillars: [[15, 13], [15, 15]],
      start: [5, 18], exit: [15, 6], doors: [[15, 6], [15, 20]],
      gens: [[6, 6, "imp"], [24, 6, "hurler"], [6, 16, "shade"], [24, 16, "wraith"], [15, 12, "brute"]],
      items: [[8, 18, "vial"], [10, 18, "vial"], [20, 18, "flask"], [22, 18, "food"], [15, 16, "chest"], [12, 8, "codex"], [6, 18, "elixir"], [24, 18, "crown"]],
      foes: [[15, 10, "thief"], [10, 12, "shade"], [20, 12, "imp"]], boss: [[15, 10, "lock"]],
      lore: "Hold the door. The crypt is a lock. You are the last four teeth." }
  ];

  /* Deterministic per-floor rng (mulberry32) so a floor is the same region every run. */
  function floorRng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fill(tiles, x, y, w, h, v) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (tiles[yy] && tiles[yy][xx] !== undefined) tiles[yy][xx] = v;
      }
    }
  }
  function tunnel(tiles, x1, y1, x2, y2, wide) {
    let x = x1, y = y1;
    const carve = (cx, cy) => {
      if (tiles[cy]) tiles[cy][cx] = "floor";
      if (!wide) return;
      if (x1 === x2) {
        if (tiles[cy] && tiles[cy][cx - 1] === "wall") tiles[cy][cx - 1] = "floor";
      } else if (tiles[cy - 1] && tiles[cy - 1][cx] === "wall") tiles[cy - 1][cx] = "floor";
    };
    while (x !== x2) { carve(x, y); x += x < x2 ? 1 : -1; }
    while (y !== y2) { carve(x, y); y += y < y2 ? 1 : -1; }
    carve(x2, y2);
  }
  function onHall(d, h) {
    const x1 = h[0], y1 = h[1], x2 = h[2], y2 = h[3];
    if (x1 === x2) return d[0] === x1 && d[1] >= Math.min(y1, y2) && d[1] <= Math.max(y1, y2);
    if (y1 === y2) return d[1] === y1 && d[0] >= Math.min(x1, x2) && d[0] <= Math.max(x1, x2);
    return false;
  }

  function build(i, makeFoe, rollLoot) {
    const spec = FLOORS[i % FLOORS.length];
    const ch = CHAPTERS[(i / 3) | 0] || CHAPTERS[CHAPTERS.length - 1];
    const S = SCALE;
    const W = AW * S, H = AH * S;
    const R = floorRng(i + 1);
    const roll = rollLoot || function () {
      return ["coin", "key", "moss", "vial", "food", "iron"][(Math.random() * 6) | 0];
    };
    const tiles = Array.from({ length: H }, () => Array(W).fill("wall"));
    const sc = (r) => [r[0] * S, r[1] * S, r[2] * S, r[3] * S];

    (spec.rooms || []).forEach((r) => fill(tiles, ...sc(r), "floor"));
    const doorPts = (spec.doors || []).map((d) => [d[0] * S, d[1] * S]);
    (spec.halls || []).forEach((h) => {
      const hs = [h[0] * S, h[1] * S, h[2] * S, h[3] * S];
      const wide = !doorPts.some((d) => onHall(d, hs));
      tunnel(tiles, hs[0], hs[1], hs[2], hs[3], wide);
    });

    /* --- shape primitives ------------------------------------------------- */
    /* maze: one-tile stands on a lattice, leaving two-tile lanes between them */
    (spec.maze || []).forEach((m) => {
      const [x, y, w, h] = sc(m);
      for (let yy = y + 1; yy < y + h - 1; yy += 3) {
        for (let xx = x + 1; xx < x + w - 1; xx++) {
          if (tiles[yy] && tiles[yy][xx] === "floor") tiles[yy][xx] = "wall";
        }
        for (let k = 0; k < 3; k++) {
          const gap = x + 1 + ((R() * (w - 2)) | 0);
          if (tiles[yy] && tiles[yy][gap] !== undefined) tiles[yy][gap] = "floor";
        }
      }
    });
    /* rings: a walled ring with a north and a south gap, so a ring is always crossable */
    (spec.rings || []).forEach((r) => {
      const [x, y, w, h] = sc(r);
      for (let xx = x; xx < x + w; xx++) {
        if (tiles[y] && tiles[y][xx] === "floor") tiles[y][xx] = "wall";
        if (tiles[y + h - 1] && tiles[y + h - 1][xx] === "floor") tiles[y + h - 1][xx] = "wall";
      }
      for (let yy = y; yy < y + h; yy++) {
        if (!tiles[yy]) continue;
        if (tiles[yy][x] === "floor") tiles[yy][x] = "wall";
        if (tiles[yy][x + w - 1] === "floor") tiles[yy][x + w - 1] = "wall";
      }
      const cx = x + (w >> 1);
      tiles[y][cx] = "floor";
      tiles[y + h - 1][cx] = "floor";
    });
    /* cages: a sealed vault with a single opening on the named side */
    (spec.cages || []).forEach((c) => {
      const [x, y, w, h, side] = [c[0] * S, c[1] * S, c[2] * S, c[3] * S, c[4] || "n"];
      for (let xx = x; xx < x + w; xx++) {
        if (tiles[y]) tiles[y][xx] = "wall";
        if (tiles[y + h - 1]) tiles[y + h - 1][xx] = "wall";
      }
      for (let yy = y; yy < y + h; yy++) {
        if (!tiles[yy]) continue;
        tiles[yy][x] = "wall";
        tiles[yy][x + w - 1] = "wall";
      }
      const mx = x + (w >> 1), my = y + (h >> 1);
      if (side === "n") tiles[y][mx] = "floor";
      else if (side === "s") tiles[y + h - 1][mx] = "floor";
      else if (side === "w") tiles[my][x] = "floor";
      else tiles[my][x + w - 1] = "floor";
    });
    (spec.inner || []).forEach((r) => {
      const [x, y, w, h] = sc(r);
      for (let xx = x; xx < x + w; xx++) {
        if (tiles[y]) tiles[y][xx] = "wall";
        if (tiles[y + h - 1]) tiles[y + h - 1][xx] = "wall";
      }
      for (let yy = y; yy < y + h; yy++) {
        if (!tiles[yy]) continue;
        tiles[yy][x] = "wall";
        tiles[yy][x + w - 1] = "wall";
      }
    });
    /* corner stands keep a big chamber from being a bare box */
    (spec.rooms || []).forEach((r) => {
      if (r[2] < 10 || r[3] < 8) return;
      const inset = 2 * S;
      const spots = [
        [r[0] + inset, r[1] + inset], [r[0] + r[2] - 1 - inset, r[1] + inset],
        [r[0] + inset, r[1] + r[3] - 1 - inset], [r[0] + r[2] - 1 - inset, r[1] + r[3] - 1 - inset]
      ];
      spots.forEach((p) => {
        if (!tiles[p[1]] || tiles[p[1]][p[0]] !== "floor") return;
        const s = spec.start, e = spec.exit;
        if (Math.abs(p[0] - s[0]) + Math.abs(p[1] - s[1]) < 3) return;
        if (Math.abs(p[0] - e[0]) + Math.abs(p[1] - e[1]) < 3) return;
        tiles[p[1]][p[0]] = "wall";
      });
    });
    (spec.walls || []).forEach((w) => fill(tiles, ...sc(w), "wall"));
    (spec.pillars || []).forEach((p) => {
      if (tiles[p[1]]) tiles[p[1]][p[0]] = "wall";
    });
    for (let x = 0; x < W; x++) { tiles[0][x] = "wall"; tiles[H - 1][x] = "wall"; }
    for (let y = 0; y < H; y++) { tiles[y][0] = "wall"; tiles[y][W - 1] = "wall"; }

    /* --- placement -------------------------------------------------------- */
    function isOpen(x, y) {
      const t = tiles[y] && tiles[y][x];
      return t === "floor" || t === "pad" || t === "exit" || t === "exit_lock" || t === "door_open";
    }
    /* Anything a relic, nexus, job or gate is placed on must be plain floor: a gate pad or a
       door tile that already means something must never be buried under loot. */
    function placeable(x, y) {
      const t = tiles[y] && tiles[y][x];
      return t === "floor" || t === "exit" || t === "exit_lock" || t === "door_open";
    }
    /* Reachability first: a floor that cannot be finished is a bug, not a design. */
    function reachFrom(sx, sy) {
      const seen = new Uint8Array(W * H);
      const q = [[sx, sy]];
      if (!isOpen(sx, sy)) return seen;
      seen[sy * W + sx] = 1;
      while (q.length) {
        const [x, y] = q.pop();
        const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        for (let k = 0; k < 4; k++) {
          const nx = nb[k][0], ny = nb[k][1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (seen[ny * W + nx] || !isOpen(nx, ny)) continue;
          seen[ny * W + nx] = 1;
          q.push([nx, ny]);
        }
      }
      return seen;
    }
    function snap(x, y) {
      x = Math.max(1, Math.min(W - 2, x | 0)); y = Math.max(1, Math.min(H - 2, y | 0));
      if (placeable(x, y)) return { x, y };
      for (let r = 1; r < 22; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          if (placeable(nx, ny)) return { x: nx, y: ny };
        }
      }
      return null;
    }
    const clampPt = (x, y) => ({ x: Math.max(1, Math.min(W - 2, x | 0)), y: Math.max(1, Math.min(H - 2, y | 0)) });
    const start = snap(spec.start[0] * S, spec.start[1] * S) || clampPt(spec.start[0] * S, spec.start[1] * S);
    tiles[start.y][start.x] = "floor";
    let exit = snap(spec.exit[0] * S, spec.exit[1] * S) || clampPt(spec.exit[0] * S, spec.exit[1] * S);
    let reach = reachFrom(start.x, start.y);
    if (!reach[exit.y * W + exit.x]) {
      /* carve an L back to the light, then re-measure */
      let x = start.x, y = start.y;
      while (x !== exit.x) { if (tiles[y][x] !== "door") tiles[y][x] = "floor"; x += x < exit.x ? 1 : -1; }
      while (y !== exit.y) { if (tiles[y][x] !== "door") tiles[y][x] = "floor"; y += y < exit.y ? 1 : -1; }
      tiles[exit.y][exit.x] = "floor";
      reach = reachFrom(start.x, start.y);
    }
    /* --- connectivity repair ---------------------------------------------
       Authored wings can end up cut off once the ring, cage and maze passes have drawn
       their stone. No floor ships with a sealed wing: any room whose tiles are all
       unreachable gets the shortest honest corridor cut to its middle. */
    function carveL(from, to) {
      let x = from.x, y = from.y;
      while (x !== to.x) { if (tiles[y][x] === "wall") tiles[y][x] = "floor"; x += x < to.x ? 1 : -1; }
      while (y !== to.y) { if (tiles[y][x] === "wall") tiles[y][x] = "floor"; y += y < to.y ? 1 : -1; }
    }
    const wings = (spec.rooms || []).concat(spec.inner || []).concat(spec.cages || []);
    for (let pass = 0; pass < 14; pass++) {
      reach = reachFrom(start.x, start.y);
      let fixed = false;
      for (let wi = 0; wi < wings.length && !fixed; wi++) {
        const [x, y, w, h] = sc(wings[wi]);
        let lit = false;
        for (let yy = y; yy < y + h && !lit; yy++) for (let xx = x; xx < x + w && !lit; xx++) {
          if (tiles[yy] && reach[yy * W + xx]) lit = true;
        }
        if (lit) continue;
        let best = null, bd = 1e9;
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
          if (!isOpen(xx, yy)) continue;
          const d = Math.abs(xx - start.x) + Math.abs(yy - start.y);
          if (d < bd) { bd = d; best = { x: xx, y: yy }; }
        }
        if (!best) continue;
        let src = start, sd = 1e9;
        for (let yy = 1; yy < H - 1; yy += 1) for (let xx = 1; xx < W - 1; xx += 1) {
          if (!reach[yy * W + xx]) continue;
          const d = Math.abs(xx - best.x) + Math.abs(yy - best.y);
          if (d < sd) { sd = d; src = { x: xx, y: yy }; }
        }
        carveL(src, best);
        carveL(start, best);
        fixed = true;
      }
      if (!fixed) break;
    }
    reach = reachFrom(start.x, start.y);
    function reachable(p) { return !!reach[p.y * W + p.x]; }
    function nearestReachable(x, y) {
      for (let r = 0; r < 40; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          if (reach[ny * W + nx] && placeable(nx, ny)) return { x: nx, y: ny };
        }
      }
      return { x: start.x, y: start.y };
    }
    function place(p) {
      const s = snap(p.x, p.y);
      if (s && reachable(s)) return s;
      const n = nearestReachable(p.x, p.y);
      if (reachable(n)) return n;
      return { x: start.x, y: start.y };
    }
    /* Interior vaults need an opening; put it on the side that faces the warden. */
    const doorList = doorPts.map((d) => [d[0], d[1]]);
    (spec.inner || []).forEach((r) => {
      const [x, y, w, h] = sc(r);
      const hasDoor = doorList.some((d) =>
        d[0] >= x && d[0] < x + w && d[1] >= y && d[1] < y + h &&
        (d[0] === x || d[0] === x + w - 1 || d[1] === y || d[1] === y + h - 1)
      );
      if (hasDoor) return;
      const sx = spec.start[0] * S, sy = spec.start[1] * S;
      const cx = x + (w >> 1), cy = y + (h >> 1);
      const dx = cx - sx, dy = cy - sy;
      let px, py;
      if (Math.abs(dx) > Math.abs(dy)) { px = dx < 0 ? x : x + w - 1; py = cy; }
      else { px = cx; py = dy < 0 ? y : y + h - 1; }
      doorList.push([px, py]);
    });

    const items = [];
    const gens = [];
    const foes = [];
    const doors = [];
    const pads = [];
    const rank = spec.rank || 1;
    doorList.forEach((d) => {
      const s = place({ x: d[0], y: d[1] });
      if (tiles[s.y][s.x] === "exit" || tiles[s.y][s.x] === "exit_lock") return;
      tiles[s.y][s.x] = "door";
      doors.push({ x: s.x, y: s.y });
    });
    (spec.pads || []).forEach((p) => {
      const a = place({ x: p[0] * S, y: p[1] * S });
      const b = place({ x: p[2] * S, y: p[3] * S });
      tiles[a.y][a.x] = "pad"; tiles[b.y][b.x] = "pad";
      pads.push({ x: a.x, y: a.y, tx: b.x + 0.5, ty: b.y + 0.5 });
      pads.push({ x: b.x, y: b.y, tx: a.x + 0.5, ty: a.y + 0.5 });
    });
    (spec.gens || []).forEach((g) => {
      const p = place({ x: g[0] * S, y: g[1] * S });
      gens.push({ x: p.x, y: p.y, kind: g[2], rank, hp: 3 * rank, t: 0.2 });
    });
    (spec.items || []).forEach((it) => {
      const p = place({ x: it[0] * S, y: it[1] * S });
      items.push({ x: p.x, y: p.y, kind: it[2] });
    });
    (spec.hidden || []).forEach((it) => {
      const p = place({ x: it[0] * S, y: it[1] * S });
      items.push({ x: p.x, y: p.y, kind: it[2], hidden: true });
    });
    (spec.traps || []).forEach((t) => {
      const p = place({ x: t[0] * S, y: t[1] * S });
      items.push({ x: p.x, y: p.y, kind: "trap" });
    });
    (spec.foes || []).forEach((f) => {
      const p = place({ x: f[0] * S, y: f[1] * S });
      foes.push(makeFoe(f[2], rank, p.x + 0.5, p.y + 0.5));
    });

    /* --- scatter: fill the grown region ---------------------------------- */
    const taken = {};
    function busy(x, y) { return taken[x + "," + y] === 1; }
    function claim(x, y) { taken[x + "," + y] = 1; }
    claim(start.x, start.y); claim(exit.x, exit.y);
    items.forEach((it) => claim(it.x, it.y));
    gens.forEach((g) => claim(g.x, g.y));
    doors.forEach((d) => claim(d.x, d.y));
    pads.forEach((p) => claim(p.x, p.y));
    foes.forEach((f) => { const fx = Math.floor(f.x), fy = Math.floor(f.y); if (reachable({ x: fx, y: fy })) claim(fx, fy); });
    function freeAt() {
      for (let k = 0; k < 160; k++) {
        const x = 1 + ((R() * (W - 2)) | 0), y = 1 + ((R() * (H - 2)) | 0);
        if (tiles[y][x] === "floor" && reach[y * W + x] && !busy(x, y)) { claim(x, y); return { x, y }; }
      }
      return null;
    }
    const relicN = 10 + Math.round(i * 1.4);
    for (let n = 0; n < relicN; n++) {
      const p = freeAt();
      if (!p) break;
      items.push({ x: p.x, y: p.y, kind: roll() });
    }
    const foeN = 5 + rank * 4 + Math.round(i * 0.5);
    for (let n = 0; n < foeN; n++) {
      const p = freeAt();
      if (!p) break;
      const pool = i >= 12 ? ["wraith", "brute", "imp", "hurler", "shade", "stitch", "echoer", "veilkin", "knot", "choir"] : ["wraith", "brute", "imp", "hurler", "shade"];
      foes.push(makeFoe(pool[(R() * pool.length) | 0], rank, p.x + 0.5, p.y + 0.5));
    }
    /* Every grown floor carries at least one live nexus beyond its authored set, so the
       map always has somewhere the warden has to walk to. */
    {
      const extra = 1 + (i >= 8 ? 1 : 0) + (i >= 16 ? 1 : 0);
      for (let n = 0; n < extra; n++) {
        const p = freeAt();
        if (!p) break;
        const pool = i >= 15 ? ["wraith", "shade", "knot", "veilkin"] : ["wraith", "imp", "hurler"];
        gens.push({ x: p.x, y: p.y, kind: pool[(R() * pool.length) | 0], rank, hp: 3 * rank, t: R() * 0.6 });
      }
    }

    if (spec.boss) {
      spec.boss.forEach((b) => {
        const p = place({ x: b[0] * S, y: b[1] * S });
        foes.push(makeFoe(b[2], rank, p.x + 0.5, p.y + 0.5));
      });
    }
    if (spec.seal) tiles[exit.y][exit.x] = "exit_lock";
    else tiles[exit.y][exit.x] = "exit";
    if (spec.drain) foes.push(makeFoe("drain", 1, exit.x + 0.5, exit.y + 0.5));

    const built = {
      W, H, tiles, start, exit, items, gens, foes, doors, pads,
      realm: {
        id: ["stone", "frost", "ember", "root", "tide", "gold", "void", "lattice"][ch.realm],
        name: ch.title,
        floor: ["floor", "floor2", "floor3", "floor", "floor2", "floor3", "floor2", "floor"][ch.realm],
        wall: ["wall", "wall2", "wall3", "wall", "wall2", "wall3", "wall4", "wall4"][ch.realm]
      },
      layout: spec.name,
      lore: spec.lore || ch.lore,
      story: spec.story || spec.lore || ch.lore,
      chapter: ch.title,
      chapterTitle: ch.title,
      chapterBook: ch.book,
      act: (i / 3) | 0,
      seal: !!spec.seal,
      treasure: spec.treasure || 0,
      quiet: 0,
      campaign: true,
      index: i
    };
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (tiles[y][x] === "wall") continue;
      if (x < x0) x0 = x; if (y < y0) y0 = y;
      if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    built.box = { x0, y0, x1, y1 };
    return built;
  }

  return { CHAPTERS, FLOORS, LEN: FLOORS.length, SCALE, build };
})();
