/* LYGO Arena — banter.
   What the bodies say to each other while they fight, and what the caster says about it.

   Two jobs, one file:

   1. FIGHTERS. The engine emits a structured event ("wolf just killed shade"), not a
      sentence. This file turns that into words, in that kit's voice. A kit with its own
      lines always sounds like itself; the rest draw from the common pool. Everything is
      short — a bubble on the sand has room for about nine words, and the TTS has to say it
      before the fight moves on.

   2. THE CASTER. A medieval sportscaster calling the match from the side of the sand. He
      is never random: every line is written to a template and fired by one real event —
      a kill, a first blood, a body on the edge, a mender saving a life, a wipe, a map, a
      series. He names the bodies, because that is what makes it a broadcast.

   Tokens: {me} the speaker, {foe} the other body, {n} a count, and for the caster
   {killer} {victim} {mender} {team} {score} {mode} {ring} {t} {youN} {foeN} {move}.
   Nothing here talks to the DOM. arena.js draws the bubbles; arena-ui.js speaks them. */
(function (w) {
  "use strict";

  /* ------------------------------------------------------------ the fighters --- */
  var P = {
    open: [
      "You brought {n} bodies? I brought a sentence.",
      "Say your name before I take it off you.",
      "I have read your file, {foe}. It is short.",
      "Walking in here like the sand owes you something.",
      "First one to blink takes the rest of it.",
      "I do not lose on this floor.",
      "My name is {me}. Learn it now, save us both time.",
      "They put {foe} across from me. Fine.",
      "I hope you stretched, {foe}.",
      "One of us leaves upright. Guess which.",
      "Come on then. The sand is warm.",
      "You fight the way the file says. I checked.",
      "Bigger names than you have lain down here.",
      "I am not here to be fair. I am here to be first.",
      "Keep your distance, {foe}. Everyone says that. Nobody does.",
      "The book already has your name. In the loss column."
    ],
    taunt: [
      "That all? My file says you had more.",
      "Try the other arm. The first one is bored.",
      "You are counting my hits. I can hear you.",
      "Step in. I will not move until you do.",
      "Nine seconds in and you are looking for the gate.",
      "I have been hit harder by weather.",
      "You telegraph like a town crier.",
      "Is this the part where you surprise me?",
      "Come on. Do the thing from the file.",
      "Somebody paid for your seat, {foe}.",
      "You call that a rush? I call that a jog.",
      "Breathe. I want you awake for this.",
      "You fight for the crowd. I fight for the number.",
      "Your footwork is honest. Your hands are not.",
      "Any time now, {foe}.",
      "That was the plan? In full?",
      "I have seen slower stones roll uphill.",
      "Keep talking. It helps me aim.",
      "I do not need to win the exchange. Just the last one.",
      "You are doing fine. For a name I will forget.",
      "Hit me again, I am still counting.",
      "Nobody is coming to help you. They are busy losing.",
      "The crowd has gone quiet. They know.",
      "You are the warm-up. Smile for it.",
      "Two more of you and I have a set."
    ],
    kill: [
      "Stay down. I will not say it twice.",
      "That is one. Who is next in the file?",
      "You were the hard one? Hm.",
      "Tell them what happened.",
      "{foe} is done. Next.",
      "I said learn the name. You learned the floor.",
      "Somebody collect that.",
      "That is how the file ends.",
      "Good. Now the real one.",
      "You had a plan. I had a moment.",
      "Do not get up. I am not done being right.",
      "Another name struck out.",
      "You came a long way to lie down here.",
      "That is for everyone who said I would not.",
      "Now the crowd knows my name.",
      "Down. Stay. Good.",
      "One exchange. That was all it ever was.",
      "Who taught you to fight? Nobody, then.",
      "The sand takes everyone. Some faster.",
      "Say something clever. No? Then sleep.",
      "I am not even breathing hard.",
      "You blinked.",
      "That is the sound a plan makes when it dies.",
      "Next body. Same result."
    ],
    die: [
      "Not like this. Not in the first—",
      "I had them. I had them.",
      "Tell the others I went forward.",
      "So that is what the file meant.",
      "You will not be so lucky with the rest.",
      "Nobody wins this floor twice.",
      "I am not done. I am just—",
      "Go on then. Finish the sentence.",
      "One mistake. One. That is all it takes.",
      "The line holds without me. It has to.",
      "Say my name when you tell it.",
      "It was a good plan. I executed it badly.",
      "Somebody take them. Please.",
      "Ugh. Fine. FINE.",
      "I was going to be somebody here.",
      "You cut the wrong way. I would have—",
      "Do not look at me. Look at them.",
      "It went dark before the plan did."
    ],
    hurt: [
      "Still here. Still here.",
      "Is that all your kit does?",
      "One more. I need one more.",
      "You missed the important part.",
      "I can take another. Watch.",
      "Not yet. Not yet, not yet—",
      "Somebody close this out!",
      "I am bleeding numbers.",
      "It is fine. It is fine. It is fine.",
      "Back. Get back, all of you.",
      "The mender is coming. Hold.",
      "Every body has a floor. Mine is lower.",
      "I am not the one who should be worried."
    ],
    cc: [
      "Stay. Right there.",
      "Where are you going? Nowhere.",
      "Hold that thought.",
      "You wanted the gap closed. There it is.",
      "Feel that? That is the ground, holding you.",
      "Nailed down. Stay down.",
      "Not so quick on the footwork now, is it?",
      "You will wait for me.",
      "That is what a charge is worth on this sand.",
      "Rooted. Eat it.",
      "Try walking that off.",
      "I do not need to outrun you. I need you late."
    ],
    saved: [
      "Up. You are not done.",
      "Breathe. I have you.",
      "Back on your feet. Move.",
      "That is twice, {foe}. Do not make it three.",
      "Mended. Go finish it.",
      "I am keeping this line up. Stay in it.",
      "You would be dead without me. Remember that.",
      "Hold on. I have the thread.",
      "Not on my line. Not while I breathe.",
      "Get up and be worth it.",
      "You are welcome. Now hurt somebody."
    ],
    win: [
      "Say it louder. They did not hear.",
      "That is the arena. It answers to me now.",
      "Name the next one. I will take them too.",
      "One exchange is a fight. Three is a lesson.",
      "The file is complete. I wrote the ending.",
      "Bring them all. I have all day.",
      "Somebody tell my line I said thank you.",
      "Undefeated on this sand. Check the book.",
      "That is how it is done. Watch the record."
    ],
    lose: [
      "Run it again. It goes differently.",
      "You got lucky with the sand.",
      "Fine. You have the book. Not the floor.",
      "I will be back for the next one.",
      "Next time I take your line apart first."
    ],
    ace: [
      "It is just me now. That is enough.",
      "They are all down. So I am the line.",
      "Alone. Fine. Fewer to worry about.",
      "I will take the rest of them myself."
    ],
    /* said once, right before the bell, by one body a side */
    ready: [
      "Bell rings, {me} goes. That is all the speech you get.",
      "{me} is ready. Ask the ones who have stood here before.",
      "No speech. {me} came to end something.",
      "{me} does not warm up. {me} arrives.",
      "Say it quietly: {me} is about to do this to {foe}.",
      "Fifteen seconds of listening. Then it is {me}'s turn to talk.",
      "{me} brought one plan and no patience for {foe}.",
      "They have rung for {me} before. It did not go well for {foe}."
    ]
  };

  /* Kits with a mouth of their own. {foe} is whatever the line is aimed at. */
  var BY = {
    wolf: {
      open: ["The pack is already circling, {foe}."],
      kill: ["The pack is fast. You were slow.", "Run next time. It is more fun."],
      taunt: ["Run. That is the good part.", "I can smell the fear from here."],
      die: ["The pack will tear you apart for this."]
    },
    shade: {
      open: ["You will not see the second one."],
      kill: ["You never saw the second one.", "I was behind you the whole time."],
      taunt: ["I am already gone.", "Look left. Wrong."],
      die: ["How did you—"]
    },
    drain: {
      open: ["I will take the sentence you were about to say."],
      kill: ["Your name is unwritten.", "Struck out. Cleanly."],
      taunt: ["Say your name. Watch it leave."],
      die: ["I am... being edited."]
    },
    imp: {
      open: ["Little me! Big you! Watch this."],
      kill: ["Ha! Little me!", "Cheap trick. Works every time."],
      taunt: ["Catch me, catch me!", "Too slow, too slow!"],
      die: ["Ow ow ow it was one job—"]
    },
    thief: {
      open: ["Nice coin. Mine now."],
      kill: ["Thanks for the coin.", "You will not need the other hand."],
      taunt: ["I already have your better hand.", "Empty pockets, {foe}?"],
      die: ["That was my coin—"]
    },
    wraith: {
      open: ["Come into the fog, {foe}. It is warm in here."],
      kill: ["Come then. The fog is patient.", "I do not stop. I drift."],
      taunt: ["You cannot hit what is thin."],
      die: ["Cold. It is so cold—"]
    },
    kairos: {
      open: ["I have seen this fight twice. You lose."],
      kill: ["I had this moment twice.", "Second time is a formality."],
      taunt: ["You are a second behind. Always."],
      die: ["Wrong time. Wrong time—"]
    },
    lock: {
      open: ["Count your ribs while you still can."],
      kill: ["Count the ribs.", "The first one was measured."],
      taunt: ["The next one is the lung."],
      die: ["Not the fourth one. Not the—"]
    },
    srath: {
      open: ["Blade work. Not luck."],
      kill: ["That is craft, not luck.", "Sharp things solve arguments."],
      taunt: ["Hold still. I am working."],
      die: ["Bad angle. Bad, bad angle."]
    },
    gate: {
      open: ["I am the door. Try it again."],
      kill: ["You ran at the wall.", "Nothing gets through me."],
      taunt: ["Come on then. Doors do not get tired."],
      die: ["The door... gave."]
    },
    vale: {
      open: ["Nothing gets past this shield."],
      kill: ["Nothing gets past me."],
      taunt: ["Hit the shield. It is what it is for."],
      die: ["Cover the line. Somebody cover—"]
    },
    sancora: {
      open: ["You should have brought a mender."],
      kill: ["You should have brought a mender.", "I put them back. That is the job."],
      saved: ["Mended. Now go be useful.", "Up you get. Wounds are my trade."],
      die: ["Who mends the mender..."]
    },
    heartboss: {
      open: ["Nothing leaves the crypt."],
      kill: ["Nothing leaves the crypt.", "Back to the dark with you."],
      taunt: ["Beat. Beat. That is the sound of you leaving."],
      die: ["The heart... stops for a moment."]
    },
    lightfather: {
      open: ["Raise the standard. Hold the line."],
      kill: ["Raise the standard.", "The line holds. You do not."],
      saved: ["Standard raised. Fight on.", "Nothing dies on my watch."],
      die: ["The standard... take the standard—"]
    },
    d9ra: {
      open: ["Rage is the whole trick."],
      kill: ["Rage. That is the whole trick."],
      taunt: ["Louder! Make me angry!"],
      die: ["Rage out. Nothing left—"]
    },
    lion: {
      open: ["The lion remembers every name on this sand."],
      kill: ["The lion remembers.", "Your name joins the wall."],
      die: ["The pride will avenge this."]
    },
    unnamer: {
      open: ["No name. No body. No matter."],
      kill: ["No name. No body. No matter."],
      taunt: ["What were you called again?"],
      die: ["I forget... my own—"]
    },
    justicae: {
      open: ["Sentence carried out. Yours is written."],
      kill: ["Sentence carried out.", "The verdict was never in doubt."],
      die: ["Appeal... denied."]
    },
    tithe: {
      open: ["Your tithe is due."],
      kill: ["Your tithe is paid.", "Payment collected in full."],
      taunt: ["Pay up. Then lie down."],
      die: ["Nothing... left to take."]
    },
    nia: {
      open: ["You are already in my line, {foe}."],
      kill: ["Range is a strategy.", "Distance is a weapon."],
      taunt: ["You are in my line. That is your mistake."],
      die: ["They closed the distance..."]
    },
    brute: {
      open: ["Small ones first, then you."],
      kill: ["Pound. Simple.", "Heavier wins. Always has."],
      taunt: ["Stand still. Easier for both of us."],
      die: ["The floor came up at me."]
    },
    bear: {
      open: ["This is my ground, {foe}."],
      kill: ["Go back to sleep.", "Mauled. That is the word."],
      taunt: ["Come into the reach. I dare you."],
      die: ["Bears do not fall. They settle."]
    },
    wraithlike: {}
  };

  /* Speakers who should sound like themselves even without personal lines. */
  var VOICE = {
    heartboss: { pitch: 0.62, rate: 0.86 },
    brute: { pitch: 0.6, rate: 0.88 },
    bear: { pitch: 0.58, rate: 0.9 },
    gate: { pitch: 0.66, rate: 0.9 },
    elephant: { pitch: 0.64, rate: 0.88 },
    imp: { pitch: 1.5, rate: 1.12 },
    thief: { pitch: 1.32, rate: 1.1 },
    wraith: { pitch: 0.82, rate: 0.94 },
    shade: { pitch: 0.86, rate: 1.02 },
    wolf: { pitch: 0.9, rate: 1.06 },
    lion: { pitch: 0.7, rate: 0.92 },
    sancora: { pitch: 1.16, rate: 0.98 },
    lightfather: { pitch: 0.74, rate: 0.9 },
    kairos: { pitch: 0.8, rate: 0.96 },
    nia: { pitch: 1.18, rate: 1.0 }
  };

  /* ------------------------------------------------------------- the caster --- */
  /* {killer} {victim} {mender} {team} {score} {mode} {ring} {t} {youN} {foeN} {n} */
  var CAST = {
    open: [
      "Welcome to the {ring}, {youN} against {foeN}! The sand is swept, the book is open — {mode}.",
      "And we are live in the {ring}! {youN} on one side, {foeN} on the other, and no cover to hide behind.",
      "{mode} in the {ring}! I have called a thousand of these and I have never seen a floor this bare.",
      "Here we go — the {ring} is calling. {youN} against {foeN}, and somebody is getting a recap.",
      "Names in the ledger, sand under the feet. It is {mode} in the {ring}!",
      "The gates are open on the {ring}. {youN} against {foeN} — let us find out who brought a mender!"
    ],
    firstBlood: [
      "FIRST BLOOD! {killer} opens the ledger and {victim} is the entry!",
      "And {killer} strikes first — {victim} never got a read on it!",
      "First blood to {killer}! That is {t} into the map and the crowd is up!",
      "Oh, first blood! {killer} takes it, and look at the faces on that line!",
      "It is {killer} who draws first! {victim} becomes the first line in the recap!"
    ],
    kill: [
      "{killer} puts {victim} down! {t} on the clock!",
      "Oh, that is a statement — {victim} is out and {killer} never even slowed down!",
      "{victim} is done! {killer} takes the body count to {n}!",
      "Down goes {victim}! {killer} is hunting names tonight!",
      "That is {killer} again — {victim} simply had no answer for it!",
      "{killer} with the kill! Somebody tell {victim} it is over!",
      "A clean finish from {killer}! {victim} will watch the rest of this from the sand!",
      "{victim} drops! And {killer} does not even look back — that is cold!",
      "Another one! {killer} takes {victim} apart and the books are filling up!",
      "{killer} ends {victim}! That is how you take a line apart — one name at a time!",
      "{victim} is down and OUT! {killer} is making this look routine!",
      "The kill goes to {killer}! {victim} gave everything and it was not enough!"
    ],
    edge: [
      "{victim} is on the edge! One clean hit and we are reading the recap!",
      "Look at {victim} — that health bar is a rumour!",
      "{victim} is nearly done! Somebody get that body off the sand!",
      "{victim} is hurt, hurt badly, and the line is not coming!",
      "One more exchange and {victim} is a paragraph in the recap!"
    ],
    save: [
      "{mender} keeps {victim} alive! That is why the menders get paid!",
      "A save from {mender}! {victim} was a dead body and now they are standing!",
      "{mender} with the mending! This fight is not over, I promise you that!",
      "Textbook from {mender} — {victim} back from the brink!",
      "{mender} refuses to lose the body! Somebody remember that!",
      "The line holds because {mender} says it holds!"
    ],
    hold: [
      "{me} nails them to the sand — that charge is dead before it started!",
      "They cannot move! {me} has this whole exchange tied off!",
      "Look at that — {me} takes the legs out of the rush!",
      "{me} answers the charge! That is what the folk with the crowd control are for!",
      "Held! {me} says stay, and on the bare sand there is nowhere to argue!"
    ],
    wipe: [
      "WIPED! The whole line down — {team} takes the map!",
      "That is a wipe! {team} are the only ones breathing!",
      "Every last one of them! {team} takes the map and the momentum!",
      "Wiped clean! {team} did not leave a single body standing!"
    ],
    mapEnd: [
      "And that is the map — {team}! The score reads {score}!",
      "Map done! {team} take it, and the score is {score}!",
      "{team} closes the map in {t}! Score: {score}!",
      "That is one in the book for {team}. The match reads {score}!"
    ],
    matchEnd: [
      "It is OVER! {team} take the match {score}!",
      "The match is done, and {team} take it {score}! What a fight!",
      "That is the series! {team} win it {score} and the arena belongs to them!",
      "Final! {team} take the match {score}! Somebody write that one down!"
    ],
    ace: [
      "{me} is the last one standing! Can they close it out?",
      "It is {me} against all of them — and {me} is smiling!",
      "One body left on that side: {me}. And that body is not backing up!"
    ],
    draw: [
      "Both sides down! We have called this map a draw — and nobody is happy!",
      "A double wipe! We do this map again, and the sand does not care!"
    ],
    /* the intro programme: the countdown to the bell is the booth's time and nobody else's */
    /* Short on purpose: a fifteen second program with a beat between lines leaves room for
       roughly three of them, and a line that overruns its slot is a line that steps on the bell. */
    introRing: [
      "Fifteen seconds to the bell in the {ring}.",
      "The {ring} is open. Fifteen seconds.",
      "Welcome to the {ring}. Fifteen seconds.",
      "Fifteen seconds. The {ring} takes no side."
    ],
    introTeam: [
      "For {side}: {names}.",
      "{side}, then: {names}.",
      "In the corner for {side}: {names}.",
      "{side}: {names}."
    ],
    introScore: [
      "Map {n}. {score}.",
      "To map {n}, at {score}.",
      "Map {n}, {score}. No more introductions."
    ],
    ready: [
      "The ring is closed.",
      "Bell in three, two —",
      "Nobody leaves until one side is down.",
      "Corner rules. Wait for the bell."
    ],
    bell: [
      "FIGHT! Who's gonna win this one?",
      "There is the bell! Who is going to win?",
      "Fight! So — who's gonna win?",
      "There it is, {n} bodies! Who's gonna win?",
      "Fight! Anybody's guess. Who's gonna win?"
    ]
  };

  /* ------------------------------------------------------------ utilities --- */
  function hash(s) { var h = 2166136261, i; s = String(s || ""); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h >>> 0; }

  function pick(list, rnd) {
    if (!list || !list.length) return "";
    var r = (typeof rnd === "function" ? rnd() : Math.random()) * list.length;
    return list[Math.floor(r) % list.length];
  }

  function fill(text, vars) {
    return String(text).replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] != null ? vars[k] : m;
    });
  }

  /* One fighter line. `who` and `foe` are built kits ({id, name, style}). */
  function line(kind, who, foe, rnd) {
    var me = (who && (who.name || who.id)) || "somebody";
    var other = (foe && (foe.name || foe.id)) || "you";
    var key = who && (who.id || who);
    var mine = BY[key] && BY[key][kind];
    /* a kit with something to say usually says its own thing */
    if (mine && mine.length && (typeof rnd === "function" ? rnd() : Math.random()) < 0.62) {
      return fill(pick(mine, rnd), { me: me, foe: other, n: (foe && foe.n) || "" });
    }
    var pool = P[kind] || P.taunt;
    return fill(pick(pool, rnd), { me: me, foe: other, n: (foe && foe.n) || "" });
  }

  /* One caster line, already naming whoever did it. */
  function cast(kind, vars, rnd) {
    var pool = CAST[kind] || CAST.kill;
    return fill(pick(pool, rnd), vars || {});
  }

  /* Each body keeps one voice for the whole match: same pitch, same rate, every line. */
  function voiceFor(kit) {
    var id = (kit && (kit.id || kit)) || "x";
    var v = VOICE[id];
    if (v) return { pitch: v.pitch, rate: v.rate, slot: hash(id) % 6 };
    var h = hash(id);
    return {
      pitch: Math.round((0.82 + (h % 50) / 100) * 100) / 100,
      rate: Math.round((0.92 + ((h >> 8) % 18) / 100) * 100) / 100,
      slot: h % 6
    };
  }

  var count = 0;
  Object.keys(P).forEach(function (k) { count += P[k].length; });
  Object.keys(BY).forEach(function (k) { Object.keys(BY[k]).forEach(function (c) { count += BY[k][c].length; }); });
  var castCount = 0;
  Object.keys(CAST).forEach(function (k) { castCount += CAST[k].length; });

  w.LYGO_BANTER = {
    line: line, cast: cast, voiceFor: voiceFor, fill: fill, hash: hash,
    POOLS: P, BY: BY, CAST: CAST,
    stats: { fighterLines: count, casterLines: castCount, kinds: Object.keys(P).length },
    sayers: Object.keys(BY).filter(function (k) { return Object.keys(BY[k]).length; })
  };
})(typeof window !== "undefined" ? window : this);
