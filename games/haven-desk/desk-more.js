/* Rook Pell's clutter. Fiction from a made-up 1998 desk.
   Add another note with HavenDesk.addFile({ id, name, kind, icon, body, x, y, desk }).
*/
(function () {
  "use strict";
  var H = window.HavenDesk;
  if (!H) return;

  var SCRAP = "marrow glass 1998";

  function textFile(id, name, body, x, y, desk) {
    H.addFile({
      id: id,
      name: name,
      kind: "text",
      icon: "page",
      body: body,
      x: x || 0,
      y: y || 0,
      desk: desk !== false ? true : false
    });
  }

  textFile("diary", "Diary.txt", [
    "ROOK PELL  —  night board, Hearth Line",
    "March 1998. The cat sleeps on the warm keys.",
    "",
    "Mar 3. Lin says I hide things in too many places.",
    "I split a drawer code into three scraps.",
    "If the three scraps sit on one line, the prompt will join them.",
    "",
    "Mar 8. Grocery: oats, dish soap, a blank floppy, tuna for the cat.",
    "The password file is a joke. Do not type the cat.",
    "",
    "Mar 12. Harbor was gray. Boats late. I kept the picture.",
    "The map with the red X is the picnic, not a mystery.",
    "",
    "Mar 19. Threw one scrap in the Bin on purpose.",
    "The other scrap waits in the dark, after the desk goes quiet.",
    "",
    "Mar 27. If you are reading this, the chair is yours.",
    "Sit as long as you want."
  ].join("\n"), 8, 398, true);

  textFile("grocery", "Grocery.txt", [
    "oats",
    "dish soap",
    "tuna (the cat)",
    "blank floppies, 10 pack",
    "postage",
    "one orange",
    "",
    "not a clue. just dinner."
  ].join("\n"), 0, 0, false);

  textFile("bookmarks", "Bookmarks.txt", [
    "hearth://home",
    "hearth://board",
    "hearth://build",
    "hearth://picnic",
    "",
    "Open these in Hearth Browse. The wire does not leave the desk."
  ].join("\n"), 0, 0, false);

  textFile("passwords", "Passwords.txt", [
    "rook",
    "password",
    "the cat",
    "MARROW",
    "",
    "None of these open the cache.",
    "Lin said the prompt joins three scraps.",
    "Stop guessing the cat."
  ].join("\n"), 0, 0, false);

  textFile("bbslog", "Bbs-log.txt", [
    "HEARTH LINE NIGHT BOARD",
    "28800 on a good evening.",
    "",
    "02:14  rook   the cat unplugged the keyboard again",
    "02:16  lin    read your mail",
    "02:41  rook   map X is a picnic. stop asking.",
    "03:02  board  downtime sunday for the dish soap incident",
    "",
    "No real people. No real board. Rook made this up."
  ].join("\n"), 0, 0, false);

  textFile("letter", "Letter-to-lin.txt", [
    "Lin,",
    "",
    "The harbor picture is the one with the boats.",
    "I will not write the year here. You already know where I put scrap three.",
    "If the Bin is empty, I lost my nerve and fished the scrap back out.",
    "",
    "Stew on Sunday if the board stays up.",
    "Rook"
  ].join("\n"), 0, 0, false);

  textFile("recipe", "Night-stew.txt", [
    "Night stew, one pot",
    "onion, carrot, the end of the oats if you are desperate,",
    "a bay leaf from the jar with no label,",
    "salt, pepper, enough water.",
    "Eat at the desk. Do not drip on the floppy."
  ].join("\n"), 0, 0, false);

  textFile("scores", "Ash-scores.txt", [
    "ASH CELLS  —  Rook's field",
    "Rook     84 seconds",
    "Lin     112 seconds",
    "the cat   did not play",
    "",
    "Your own games stay in this browser."
  ].join("\n"), 0, 0, false);

  textFile("playlist", "Night-reel.txt", [
    "Not a real track list. The player uses Excavationpro",
    "when the wire reaches it, and a hearth tone when it does not.",
    "",
    "1. kettle",
    "2. rain on the aerial",
    "3. cat on the number row",
    "4. boats coming in late"
  ].join("\n"), 0, 0, false);

  textFile("homework", "Margin-notes.txt", [
    "History margin, never turned in.",
    "The teal years were loud and square.",
    "People kept whole lives on floppies and called it enough.",
    "I would like a slower modem and a louder kettle."
  ].join("\n"), 0, 0, false);

  textFile("jokes", "Jokes.txt", [
    "How many archivists does it take to label a floppy?",
    "One, but they will write the year under a different picture.",
    "",
    "What does the cat know?",
    "Where the warm keys are. Nothing else."
  ].join("\n"), 0, 0, false);

  textFile("harbor-note", "Harbor.txt", [
    "March 12. The boats were late.",
    "scrap three is 1998.",
    "The map X is only the picnic spot."
  ].join("\n"), 0, 0, false);

  var scrap = {
    id: "scrap-two",
    name: "Scrap-two.txt",
    kind: "text",
    icon: "page",
    startsInBin: true,
    desk: false,
    x: 0,
    y: 0,
    body: [
      "I threw this out on purpose.",
      "Leave the desk. Hit Off.",
      "Watch the dark until a word shows.",
      "That word is scrap two."
    ].join("\n")
  };
  H.addFile(scrap);

  function photo(id, name, src, body, x, y, desk) {
    H.addFile({
      id: id, name: name, kind: "photo", icon: "photo",
      src: src, body: body, x: x, y: y, desk: desk !== false
    });
  }
  photo("shot-desk", "Desk at night.jpg", "assets/shots/desk.jpg", "The chair faces the window. Rook left the kettle on.", 296, 8, true);
  photo("shot-harbor", "Harbor.jpg", "assets/shots/harbor.jpg", "March 12. The boats were late. scrap three is 1998.", 296, 86, true);
  photo("shot-floppy", "Blank floppy.jpg", "assets/shots/floppy.jpg", "The label never stuck. The year is under the harbor picture.", 296, 164, true);
  photo("shot-cat", "Cat on keys.jpg", "assets/shots/cat.jpg", "Not a password. Warm, and in the way.", 392, 8, true);
  photo("shot-map", "Picnic map.jpg", "assets/shots/map.jpg", "Red X is the picnic. Lin already knows.", 392, 86, false);
  photo("shot-discs", "Disc pile.jpg", "assets/shots/discs.jpg", "Nothing written on the discs. The reel is in Night-reel.txt.", 392, 164, false);
  photo("shot-drawer", "Drawer.jpg", "assets/shots/drawer.jpg", "A brass key that opens no file on this desk.", 392, 242, false);
  photo("shot-rain", "Rain window.jpg", "assets/shots/rain.jpg", "The aerial hates this weather. Dial Tone will still pretend.", 392, 320, false);

  [
    ["calc", "Hearth Calc", "calc", 0, 0],
    ["mail", "Leaf Mail", "mail", 104, 86],
    ["chat", "Wire Chat", "chat", 104, 164],
    ["cards", "Hearth Stack", "cards", 104, 242],
    ["photos", "Picture Box", "photo", 104, 320],
    ["bin", "The Bin", "bin", 104, 398],
    ["browse", "Hearth Browse", "browse", 200, 8],
    ["dial", "Dial Tone", "dial", 200, 86],
    ["tidy", "Disk Tidy", "tidy", 0, 0],
    ["find", "Find", "find", 0, 0],
    ["calendar", "Day Page", "about", 0, 0],
    ["cache", "Rook's cache", "key", 0, 0]
  ].forEach(function (row) {
    H.addFile({
      id: row[0], name: row[1], kind: "app", icon: row[2], x: row[3], y: row[4],
      desk: row[3] !== 0
    });
  });

  H.setSaverWord("GLASS");

  H.command("join", function (rest) {
    var n = String(rest || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    if (n === SCRAP) {
      H.open("cache");
      return "The scraps sit together. The cache opens.";
    }
    return "Those scraps do not sit together.\nTry the mail, the Bin, the saver, and the harbor picture.";
  });

  H.register("calc", function (body) {
    var acc = null;
    var op = null;
    var entry = "0";
    var fresh = true;
    var read = document.createElement("div");
    read.className = "calc-read sunken";
    read.textContent = "0";
    var grid = document.createElement("div");
    grid.className = "calc-grid";
    function show() { read.textContent = entry; }
    function apply(next) {
      var a = acc;
      var b = Number(entry);
      if (next === "+") return a + b;
      if (next === "-") return a - b;
      if (next === "*") return a * b;
      if (next === "/") return b === 0 ? "nope" : a / b;
      return b;
    }
    "789/456*123-0.=+C".split("").forEach(function (key) {
      if (key === "." && "789/456*123-0.=+C".indexOf(".") !== "0.=+C".indexOf(".")) {
        /* one dot key from the string below */
      }
    });
    ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+", "C"].forEach(function (key) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "raised";
      b.textContent = key;
      b.addEventListener("click", function () {
        if (key === "C") { acc = null; op = null; entry = "0"; fresh = true; show(); return; }
        if (key >= "0" && key <= "9" || key === ".") {
          if (fresh) { entry = key === "." ? "0." : key; fresh = false; }
          else if (!(key === "." && entry.indexOf(".") !== -1)) entry += key;
          show();
          return;
        }
        if (key === "=") {
          if (op) {
            var val = apply(op);
            entry = String(val);
            acc = null;
            op = null;
            fresh = true;
            show();
          }
          return;
        }
        var n = Number(entry);
        acc = op ? Number(apply(op)) : n;
        if (acc === "nope") { entry = "nope"; acc = null; op = null; fresh = true; show(); return; }
        op = key;
        fresh = true;
      });
      grid.appendChild(b);
    });
    body.appendChild(read);
    body.appendChild(grid);
  });

  var MAIL = [
    {
      from: "Lin Park",
      sub: "the drawer code",
      body: "rook,\n\nscrap one is MARROW.\nscrap two is in the Bin, and it will send you to the saver.\nscrap three is written under the harbor picture.\n\nPut the three scraps on one line in Hearth Prompt:\njoin scrap scrap scrap\n\nDo not use the cat.\n\nlin"
    },
    {
      from: "Night board",
      sub: "dish soap sunday",
      body: "Hearth Line will nap on Sunday.\nSomeone put dish soap in the kettle and called it maintenance.\nYour mail will still be here. The cat will not help."
    },
    {
      from: "Rook",
      sub: "note to self",
      body: "Call about Sunday stew.\nThe password file is a joke.\nThe picnic map is not the trail."
    },
    {
      from: "Unknown",
      sub: "the red X",
      body: "You left the map in the drawer.\nThe X is a picnic, not a secret.\nBring the orange."
    }
  ];

  H.register("mail", function (body) {
    var wrap = document.createElement("div");
    wrap.className = "mail-wrap";
    var list = document.createElement("div");
    list.className = "mail-list sunken";
    var view = document.createElement("pre");
    view.className = "mail-body sunken";
    view.textContent = "Leaf Mail\nFour notes. Nothing is sent anywhere.";
    MAIL.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "track";
      b.textContent = m.from + " — " + m.sub;
      b.addEventListener("click", function () {
        view.textContent = m.from + "\n" + m.sub + "\n\n" + m.body;
      });
      list.appendChild(b);
    });
    wrap.appendChild(list);
    wrap.appendChild(view);
    body.appendChild(wrap);
  });

  H.register("chat", function (body) {
    var log = document.createElement("div");
    log.className = "chat-log sunken";
    var seed = [
      ["lin", "you up? read the mail before you guess."],
      ["rook", "the cat is on the keys again."],
      ["lin", "scrap one is already in the mail. I am not repeating the bin."]
    ];
    function line(who, text) {
      var p = document.createElement("p");
      var b = document.createElement("b");
      b.textContent = who + ": ";
      p.appendChild(b);
      p.appendChild(document.createTextNode(text));
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }
    seed.forEach(function (row) { line(row[0], row[1]); });
    var form = document.createElement("form");
    form.className = "prompt-row";
    var input = document.createElement("input");
    input.setAttribute("aria-label", "Say something");
    input.maxLength = 160;
    var go = document.createElement("button");
    go.className = "raised";
    go.type = "submit";
    go.textContent = "Send";
    form.appendChild(input);
    form.appendChild(go);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      line("you", text);
      var low = text.toLowerCase();
      var reply = "mm. the kettle is loud.";
      if (low.indexOf("cat") !== -1) reply = "the cat is not the password. lin was clear.";
      else if (low.indexOf("marrow") !== -1) reply = "you have scrap one. the bin has the next errand.";
      else if (low.indexOf("bin") !== -1) reply = "open The Bin. rook throws clues out on purpose.";
      else if (low.indexOf("picnic") !== -1 || low.indexOf("map") !== -1) reply = "the red X is sandwiches. wrong trail.";
      else if (low.indexOf("saver") !== -1 || low.indexOf("off") !== -1) reply = "hit Off and watch the dark.";
      line("lin", reply);
    });
    body.appendChild(log);
    body.appendChild(form);
  });

  H.register("photos", function (body) {
    var album = document.createElement("div");
    album.className = "album";
    H.files.forEach(function (f) {
      if (f.kind !== "photo") return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "raised";
      var img = document.createElement("img");
      img.src = f.src;
      img.alt = "";
      var cap = document.createElement("span");
      cap.textContent = f.name;
      b.appendChild(img);
      b.appendChild(cap);
      b.addEventListener("click", function () { H.open(f.id); });
      album.appendChild(b);
    });
    body.appendChild(album);
  });

  H.register("bin", function (body) {
    var list = document.createElement("div");
    list.className = "track-list sunken";
    var note = document.createElement("p");
    note.className = "honest";
    note.textContent = "Things Rook threw out. Restore puts them back on the desk or in the drawer.";
    function paint() {
      list.innerHTML = "";
      var any = false;
      H.files.forEach(function (f) {
        if (!H.inBin(f)) return;
        any = true;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "track";
        b.textContent = f.name;
        b.addEventListener("click", function () {
          H.restore(f.id);
          paint();
          H.alert("The Bin", f.name + " is back.");
        });
        list.appendChild(b);
      });
      if (!any) list.textContent = "The Bin is empty.";
    }
    body.appendChild(note);
    body.appendChild(list);
    paint();
  });

  var PAGES = {
    "hearth://home": {
      title: "Hearth Line",
      build: function (box) {
        addP(box, "Hearth Line night board");
        addP(box, "A made-up page that never left this desk. Rook kept four doors.");
        link(box, "hearth://board");
        link(box, "hearth://build");
        link(box, "hearth://picnic");
      }
    },
    "hearth://board": {
      title: "Night board",
      build: function (box) {
        addP(box, "02:14 rook — cat on the keys");
        addP(box, "02:16 lin — read your mail");
        addP(box, "02:41 rook — the X is a picnic");
      }
    },
    "hearth://build": {
      title: "Under the cloth",
      build: function (box) {
        var s = document.createElement("div");
        s.className = "stripe";
        box.appendChild(s);
        addP(box, "This corner is still under a cloth. Come back after the stew.");
        var s2 = document.createElement("div");
        s2.className = "stripe";
        box.appendChild(s2);
      }
    },
    "hearth://picnic": {
      title: "Picnic",
      build: function (box) {
        addP(box, "Blankets, the orange, and the red X on the paper map.");
        addP(box, "This is not the drawer code. The harbor picture has a year on it.");
      }
    }
  };

  function addP(box, text) {
    var p = document.createElement("p");
    p.textContent = text;
    box.appendChild(p);
  }
  function link(box, href) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "track";
    b.textContent = href;
    b.addEventListener("click", function () { box.dispatchEvent(new CustomEvent("go", { detail: href, bubbles: true })); });
    box.appendChild(b);
  }

  H.register("browse", function (body) {
    var bar = document.createElement("form");
    bar.className = "page-bar";
    var back = document.createElement("button");
    back.type = "button";
    back.className = "raised";
    back.textContent = "Back";
    var input = document.createElement("input");
    input.value = "hearth://home";
    input.setAttribute("aria-label", "Address");
    var go = document.createElement("button");
    go.type = "submit";
    go.className = "raised";
    go.textContent = "Go";
    bar.appendChild(back);
    bar.appendChild(input);
    bar.appendChild(go);
    var view = document.createElement("div");
    view.className = "page-view sunken";
    var hist = [];
    function show(url) {
      view.innerHTML = "";
      var page = PAGES[url];
      if (!page) {
        addP(view, "The wire is busy outside this desk.");
        addP(view, "Try hearth://home");
        return;
      }
      var h = document.createElement("h2");
      h.textContent = page.title;
      view.appendChild(h);
      page.build(view);
      input.value = url;
    }
    view.addEventListener("go", function (e) {
      hist.push(input.value);
      show(e.detail);
    });
    bar.addEventListener("submit", function (e) {
      e.preventDefault();
      hist.push(input.value);
      show(input.value.trim());
    });
    back.addEventListener("click", function () {
      var prev = hist.pop();
      if (prev) show(prev);
    });
    body.appendChild(bar);
    body.appendChild(view);
    show("hearth://home");
  });

  H.register("dial", function (body) {
    var log = document.createElement("pre");
    log.className = "prompt-out sunken";
    log.textContent = "Hearth Line dialer\nThe phone is a story. Press Call.\n";
    var row = document.createElement("div");
    row.className = "row";
    var call = document.createElement("button");
    call.type = "button";
    call.className = "raised";
    call.textContent = "Call";
    var lines = [
      "picking up the handset",
      "dialing the night board",
      "handshake  ----  squeal",
      "carrier heard",
      "connected, more or less, at 28800",
      "Hearth Line says hello. Your mail is local anyway."
    ];
    call.addEventListener("click", function () {
      log.textContent = "";
      var i = 0;
      squawk();
      var t = setInterval(function () {
        log.textContent += lines[i] + "\n";
        i += 1;
        if (i >= lines.length) clearInterval(t);
      }, 450);
    });
    row.appendChild(call);
    body.appendChild(row);
    body.appendChild(log);
  });

  function squawk() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = new AC();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = 420;
      g.gain.value = 0.02;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.frequency.linearRampToValueAtTime(980, ctx.currentTime + 0.4);
      o.stop(ctx.currentTime + 0.55);
    } catch (e) { /* no tone */ }
  }

  H.register("tidy", function (body) {
    var colors = ["#000080", "#008080", "#808000", "#800000", "#008000"];
    var cells = [];
    var grid = document.createElement("div");
    grid.className = "tidy-grid";
    var status = document.createElement("p");
    status.className = "honest";
    status.textContent = "Rook's drive is fine. This animation is for show.";
    for (var i = 0; i < 64; i++) {
      cells.push(colors[i % colors.length]);
      var c = document.createElement("div");
      c.className = "tidy-cell";
      grid.appendChild(c);
    }
    function paint() {
      for (var n = 0; n < cells.length; n++) grid.children[n].style.background = cells[n];
    }
    function shuffle() {
      for (var n = cells.length - 1; n > 0; n--) {
        var j = Math.floor(Math.random() * (n + 1));
        var t = cells[n];
        cells[n] = cells[j];
        cells[j] = t;
      }
    }
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "raised";
    btn.textContent = "Tidy the blocks";
    btn.addEventListener("click", function () {
      shuffle();
      paint();
      var step = 0;
      var timer = setInterval(function () {
        cells.sort();
        paint();
        step += 1;
        if (step > 8) {
          clearInterval(timer);
          status.textContent = "Blocks in a row. The cat is unimpressed.";
        }
      }, 180);
    });
    paint();
    body.appendChild(btn);
    body.appendChild(status);
    body.appendChild(grid);
  });

  H.register("find", function (body) {
    var form = document.createElement("form");
    form.className = "page-bar";
    var input = document.createElement("input");
    input.setAttribute("aria-label", "Find");
    input.placeholder = "mail, harbor, stew";
    var go = document.createElement("button");
    go.type = "submit";
    go.className = "raised";
    go.textContent = "Find";
    form.appendChild(input);
    form.appendChild(go);
    var list = document.createElement("div");
    list.className = "track-list sunken";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim().toLowerCase();
      list.innerHTML = "";
      if (!q) return;
      H.files.forEach(function (f) {
        var hay = (f.name + " " + (f.body || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "track";
        b.textContent = f.name + (H.inBin(f) ? "  (in the Bin)" : "");
        b.addEventListener("click", function () {
          if (H.inBin(f)) H.alert("Find", "That one is in the Bin.");
          else H.open(f.id);
        });
        list.appendChild(b);
      });
      if (!list.children.length) list.textContent = "Nothing on the desk matches.";
    });
    body.appendChild(form);
    body.appendChild(list);
  });

  H.register("calendar", function (body) {
    var now = new Date();
    var label = document.createElement("p");
    label.className = "honest";
    label.textContent = now.toLocaleString(undefined, { month: "long", year: "numeric" }) + "  —  today is a real day. Rook's notes are stuck in March 1998.";
    var grid = document.createElement("div");
    grid.className = "calc-grid";
    var year = now.getFullYear();
    var month = now.getMonth();
    var first = new Date(year, month, 1).getDay();
    var days = new Date(year, month + 1, 0).getDate();
    var i;
    for (i = 0; i < first; i++) grid.appendChild(document.createElement("span"));
    for (i = 1; i <= days; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "raised";
      b.textContent = String(i);
      if (i === now.getDate()) b.style.fontWeight = "700";
      b.addEventListener("click", function () {
        H.alert("Day Page", "Rook wrote nothing on this real-world day. The diary is March 1998.");
      });
      grid.appendChild(b);
    }
    var old = document.createElement("button");
    old.type = "button";
    old.className = "raised";
    old.textContent = "Open March 1998";
    old.addEventListener("click", function () { H.open("diary"); });
    body.appendChild(label);
    body.appendChild(grid);
    body.appendChild(old);
  });

  H.register("cache", function (body) {
    var box = document.createElement("div");
    box.className = "about-copy sunken";
    [
      "Rook's cache",
      "",
      "A blank floppy, a brass key, and a note in the drawer.",
      "You found the desk the way Rook left it in March 1998.",
      "The picnic was real. The cat is not a password.",
      "Sit as long as you want.",
      "",
      "Hearth Line night board"
    ].forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      box.appendChild(p);
    });
    body.appendChild(box);
    H.beep();
  });

  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"];
  var RED = { "\u2665": 1, "\u2666": 1 };

  H.register("cards", function (body) {
    var deck = [];
    SUITS.forEach(function (s) {
      RANKS.forEach(function (r) { deck.push({ r: r, s: s }); });
    });
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    var cols = [[], [], [], [], [], [], []];
    var nCol;
    for (nCol = 0; nCol < 7; nCol++) {
      for (var n = 0; n <= nCol; n++) {
        var card = deck.pop();
        card.up = n === nCol;
        cols[nCol].push(card);
      }
    }
    var stock = deck;
    var waste = [];
    var found = [[], [], [], []];
    var sel = null;
    var top = document.createElement("div");
    top.className = "card-top";
    var stockB = document.createElement("button");
    stockB.type = "button";
    stockB.className = "pile raised";
    var wasteB = document.createElement("button");
    wasteB.type = "button";
    wasteB.className = "pile";
    var foundEls = [];
    var board = document.createElement("div");
    board.className = "cols";
    var status = document.createElement("p");
    status.className = "honest";
    status.textContent = "Hearth Stack. Click the deck, then a column. Kings fill an empty column.";
    function rn(r) { return RANKS.indexOf(r); }
    function label(card) { return card.r + card.s; }
    function takeSel() {
      if (!sel) return null;
      if (sel.where === "waste") return waste.pop();
      var col = cols[sel.col];
      return col.pop();
    }
    function paint() {
      stockB.textContent = stock.length ? "Deck" : "Turn";
      wasteB.innerHTML = "";
      if (waste.length) {
        var w = document.createElement("b");
        w.textContent = label(waste[waste.length - 1]);
        if (RED[waste[waste.length - 1].s]) w.className = "red";
        wasteB.appendChild(w);
      }
      foundEls.forEach(function (el, fi) {
        el.innerHTML = "";
        var pile = found[fi];
        if (!pile.length) return;
        var b = document.createElement("b");
        b.textContent = label(pile[pile.length - 1]);
        if (RED[pile[pile.length - 1].s]) b.className = "red";
        el.appendChild(b);
      });
      board.innerHTML = "";
      cols.forEach(function (col, ci) {
        var hold = document.createElement("div");
        hold.className = "col";
        if (!col.length) {
          var empty = document.createElement("button");
          empty.type = "button";
          empty.className = "raised";
          empty.textContent = "";
          empty.addEventListener("click", function () { dropOn(ci); });
          hold.appendChild(empty);
        }
        col.forEach(function (card, idx) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "raised" + (card.up ? "" : " down") + (card.up && RED[card.s] ? " red" : "");
          if (sel && sel.where === "col" && sel.col === ci && sel.idx === idx) b.classList.add("is-on");
          b.textContent = card.up ? label(card) : "";
          b.addEventListener("click", function () {
            if (!card.up) return;
            if (idx !== col.length - 1) {
              sel = { where: "col", col: ci, idx: idx };
              paint();
              return;
            }
            sel = { where: "col", col: ci, idx: idx };
            paint();
          });
          hold.appendChild(b);
        });
        board.appendChild(hold);
      });
      var done = found.every(function (p) { return p.length === 13; });
      if (done) status.textContent = "The stack is clear. Rook would be unbearable about it.";
    }
    function dropOn(ci) {
      if (!sel) return;
      var moving = [];
      if (sel.where === "waste") {
        if (!waste.length) return;
        moving = [waste[waste.length - 1]];
      } else {
        moving = cols[sel.col].slice(sel.idx);
      }
      var dest = cols[ci];
      var ok = !dest.length ? moving[0].r === "K" : (!!RED[moving[0].s] !== !!RED[dest[dest.length - 1].s] && rn(moving[0].r) + 1 === rn(dest[dest.length - 1].r));
      if (!ok) { status.textContent = "That card will not sit there."; return; }
      if (sel.where === "waste") waste.pop();
      else cols[sel.col] = cols[sel.col].slice(0, sel.idx);
      moving.forEach(function (c) { dest.push(c); });
      var from = sel.where === "col" ? cols[sel.col] : null;
      if (from && from.length) from[from.length - 1].up = true;
      sel = null;
      paint();
    }
    stockB.addEventListener("click", function () {
      if (!stock.length) {
        stock = waste.reverse();
        waste = [];
      } else waste.push(stock.pop());
      sel = null;
      paint();
    });
    wasteB.addEventListener("click", function () {
      if (!waste.length) return;
      sel = { where: "waste" };
      paint();
    });
    for (var f = 0; f < 4; f++) {
      var pile = document.createElement("button");
      pile.type = "button";
      pile.className = "pile";
      (function (fi, el) {
        el.addEventListener("click", function () {
          if (!sel) return;
          var card = sel.where === "waste" ? waste[waste.length - 1] : cols[sel.col][sel.idx];
          if (!card || (sel.where === "col" && sel.idx !== cols[sel.col].length - 1)) return;
          var pileCards = found[fi];
          var ok = !pileCards.length ? card.r === "A" : (pileCards[pileCards.length - 1].s === card.s && rn(card.r) === rn(pileCards[pileCards.length - 1].r) + 1);
          if (!ok) return;
          if (sel.where === "waste") waste.pop();
          else {
            cols[sel.col].pop();
            if (cols[sel.col].length) cols[sel.col][cols[sel.col].length - 1].up = true;
          }
          pileCards.push(card);
          sel = null;
          paint();
        });
      })(f, pile);
      foundEls.push(pile);
      top.appendChild(pile);
    }
    top.insertBefore(wasteB, top.firstChild);
    top.insertBefore(stockB, top.firstChild);
    board.addEventListener("click", function (e) {
      var colEl = e.target.closest ? e.target.closest(".col") : null;
      if (!colEl || !sel) return;
      var ci = Array.prototype.indexOf.call(board.children, colEl);
      if (ci < 0) return;
      if (e.target === colEl || e.target.classList.contains("down")) dropOn(ci);
    });
    cols.forEach(function (_, ci) {
      /* drop targets painted in paint() */
      void ci;
    });
    body.appendChild(top);
    body.appendChild(board);
    body.appendChild(status);
    paint();
    board.addEventListener("dblclick", function () {});
    var hint = document.createElement("p");
    hint.className = "honest";
    hint.textContent = "Select a face-up card, then click a column or a top pile.";
    body.appendChild(hint);
    board.onclick = null;
    Array.prototype.forEach.call;
    body.addEventListener("click", function (e) {
      if (!e.target.classList || !e.target.closest(".col")) return;
    });
  });

  /* column drop: bind after paint by delegating once */
  var cardsBound = false;
  var oldCards = H.files;
  void oldCards;
  void cardsBound;

  H.onRender(function () {
    var desk = document.getElementById("desktop");
    if (!desk) return;
    var notes = [
      { id: "s1", text: "Lin called.\nRead the mail.", x: 500, y: 24, rot: -2 },
      { id: "s2", text: "The cat sat on\nthe keys AGAIN.", x: 620, y: 150, rot: 2 },
      { id: "s3", text: "Off sends you\ninto the dark.", x: 540, y: 300, rot: -1 }
    ];
    notes.forEach(function (note) {
      var saved = H.store.sticks[note.id] || {};
      var el = document.createElement("p");
      el.className = "sticky";
      el.textContent = note.text;
      el.style.left = (saved.x != null ? saved.x : note.x) + "px";
      el.style.top = (saved.y != null ? saved.y : note.y) + "px";
      el.style.transform = "rotate(" + note.rot + "deg)";
      el.addEventListener("pointerdown", function (ev) {
        if (ev.button !== 0) return;
        var sx = ev.clientX;
        var sy = ev.clientY;
        var sl = el.offsetLeft;
        var st = el.offsetTop;
        function move(e) {
          el.style.left = (sl + e.clientX - sx) + "px";
          el.style.top = (st + e.clientY - sy) + "px";
        }
        function up() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          H.store.sticks[note.id] = { x: el.offsetLeft, y: el.offsetTop };
          H.save();
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
      desk.appendChild(el);
    });
  });

  /* Make column drops work: patch cards by re-registering a cleaner game. */
  H.register("cards", mountCards);

  function mountCards(body) {
    var deck = [];
    SUITS.forEach(function (s) {
      RANKS.forEach(function (r) { deck.push({ r: r, s: s, up: false }); });
    });
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    var cols = [[], [], [], [], [], [], []];
    for (var c = 0; c < 7; c++) {
      for (var n = 0; n <= c; n++) {
        var card = deck.pop();
        card.up = n === c;
        cols[c].push(card);
      }
    }
    var stock = deck;
    var waste = [];
    var found = [[], [], [], []];
    var sel = null;
    var top = document.createElement("div");
    top.className = "card-top";
    var stockB = document.createElement("button");
    stockB.type = "button";
    stockB.className = "pile raised";
    var wasteB = document.createElement("button");
    wasteB.type = "button";
    wasteB.className = "pile";
    var foundEls = [];
    var board = document.createElement("div");
    board.className = "cols";
    var status = document.createElement("p");
    status.className = "honest";
    function rn(r) { return RANKS.indexOf(r); }
    function lab(card) { return card.r + card.s; }
    function paint() {
      stockB.textContent = stock.length ? "Deck " + stock.length : "Turn";
      wasteB.innerHTML = "";
      if (waste.length) {
        var mark = document.createElement("b");
        mark.textContent = lab(waste[waste.length - 1]);
        if (RED[waste[waste.length - 1].s]) mark.className = "red";
        if (sel && sel.where === "waste") mark.style.outline = "2px solid #000";
        wasteB.appendChild(mark);
      }
      foundEls.forEach(function (el, fi) {
        el.innerHTML = "";
        if (!found[fi].length) { el.textContent = "A"; return; }
        var mark = document.createElement("b");
        mark.textContent = lab(found[fi][found[fi].length - 1]);
        if (RED[found[fi][found[fi].length - 1].s]) mark.className = "red";
        el.appendChild(mark);
      });
      board.innerHTML = "";
      cols.forEach(function (col, ci) {
        var hold = document.createElement("div");
        hold.className = "col";
        hold.dataset.col = String(ci);
        if (!col.length) {
          var empty = document.createElement("button");
          empty.type = "button";
          empty.className = "raised";
          empty.textContent = " ";
          empty.addEventListener("click", function () { dropOn(ci); });
          hold.appendChild(empty);
        }
        col.forEach(function (card, idx) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "raised" + (card.up ? "" : " down") + (card.up && RED[card.s] ? " red" : "");
          if (sel && sel.where === "col" && sel.col === ci && sel.idx === idx) b.classList.add("is-on");
          b.textContent = card.up ? lab(card) : "";
          b.addEventListener("click", function (ev) {
            ev.stopPropagation();
            if (!card.up) {
              if (idx === col.length - 1) { card.up = true; paint(); }
              return;
            }
            sel = { where: "col", col: ci, idx: idx };
            status.textContent = "Selected " + lab(card) + ". Click a column or a top pile.";
            paint();
          });
          hold.appendChild(b);
        });
        board.appendChild(hold);
      });
      if (found.every(function (p) { return p.length === 13; })) status.textContent = "The stack is clear.";
    }
    function movingCards() {
      if (!sel) return [];
      if (sel.where === "waste") return waste.length ? [waste[waste.length - 1]] : [];
      return cols[sel.col].slice(sel.idx);
    }
    function dropOn(ci) {
      var moving = movingCards();
      if (!moving.length) return;
      var dest = cols[ci];
      var ok = !dest.length ? moving[0].r === "K" : (!!RED[moving[0].s] !== !!RED[dest[dest.length - 1].s] && rn(moving[0].r) + 1 === rn(dest[dest.length - 1].r));
      if (!ok) { status.textContent = "That card will not sit there."; return; }
      if (sel.where === "waste") waste.pop();
      else cols[sel.col] = cols[sel.col].slice(0, sel.idx);
      moving.forEach(function (card) { dest.push(card); });
      if (sel.where === "col" && cols[sel.col].length) cols[sel.col][cols[sel.col].length - 1].up = true;
      sel = null;
      paint();
    }
    stockB.addEventListener("click", function () {
      if (!stock.length) { stock = waste.reverse(); waste = []; }
      else waste.push(stock.pop());
      sel = null;
      paint();
    });
    wasteB.addEventListener("click", function () {
      if (!waste.length) return;
      sel = { where: "waste" };
      status.textContent = "Selected " + lab(waste[waste.length - 1]) + ".";
      paint();
    });
    for (var f = 0; f < 4; f++) {
      (function (fi) {
        var pile = document.createElement("button");
        pile.type = "button";
        pile.className = "pile";
        pile.addEventListener("click", function () {
          var moving = movingCards();
          if (moving.length !== 1) return;
          var card = moving[0];
          var pileCards = found[fi];
          var ok = !pileCards.length ? card.r === "A" : (pileCards[pileCards.length - 1].s === card.s && rn(card.r) === rn(pileCards[pileCards.length - 1].r) + 1);
          if (!ok) { status.textContent = "The top piles take one suit, ace first."; return; }
          if (sel.where === "waste") waste.pop();
          else {
            cols[sel.col] = cols[sel.col].slice(0, sel.idx);
            if (cols[sel.col].length) cols[sel.col][cols[sel.col].length - 1].up = true;
          }
          pileCards.push(card);
          sel = null;
          paint();
        });
        foundEls.push(pile);
        top.appendChild(pile);
      })(f);
    }
    top.insertBefore(wasteB, top.firstChild);
    top.insertBefore(stockB, top.firstChild);
    body.appendChild(status);
    body.appendChild(top);
    body.appendChild(board);
    paint();
    board.addEventListener("click", function (e) {
      var hold = e.target.closest && e.target.closest(".col");
      if (!hold || !sel) return;
      if (e.target.classList && e.target.classList.contains("is-on")) return;
      dropOn(Number(hold.dataset.col));
    });
  }
})();
