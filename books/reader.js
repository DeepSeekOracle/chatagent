(function () {
  var book = null;
  var index = 0;
  var paras = [];
  var followRanges = [];
  var havenVoice = null;
  var arming = false;
  var sky = document.getElementById("sky");
  var skyb = document.getElementById("skyb");
  var sheet = document.getElementById("sheet");
  var rail = document.getElementById("rail");
  var readBtn = document.getElementById("read");
  var readcol = document.getElementById("readcol");
  var hairbar = document.getElementById("hairbar");
  var door = document.getElementById("door");
  var chapters = document.getElementById("chapters");
  var chaptersBtn = document.getElementById("chapters-btn");
  var titleEl = document.getElementById("title");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wideQuery = window.matchMedia("(min-width: 861px)");

  function voiceName(v) {
    return String(v && v.name || "").toLowerCase();
  }

  function isMaleVoice(n) {
    if (/\bfemale\b/.test(n)) return false;
    if (/\bmale\b/.test(n)) return true;
    return /\bdavid\b|\bmark\b|\bguy\b|\bandrew\b|\bchristopher\b|\bsteffan\b|\beric\b|\btony\b|\bdaniel\b|\balex\b|\bjames\b|\bthomas\b|\bbrian\b|\barthur\b|\bryan\b|\broger\b|\bgeorge\b|\bravi\b/.test(n);
  }

  function isFemaleVoice(n) {
    if (isMaleVoice(n)) return false;
    if (/\bfemale\b/.test(n)) return true;
    return /samantha|\baria\b|\bjenny\b|\bzira\b|\bserena\b|\bkaren\b|\bvictoria\b|\bsonia\b|\bsusan\b|\bhazel\b|\bcatherine\b|\bmichelle\b|\bana\b|\blibby\b|\bmaisie\b|\bnatasha\b|\bsara\b|\bemma\b|\bava\b|\bnova\b|\bfiona\b|\bmoira\b|\btessa\b|\bveena\b|\bkate\b|\ballison\b|\bashley\b|\bbridget\b|\beva\b/.test(n);
  }

  function scoreFemaleVoice(v) {
    var n = voiceName(v);
    var l = String(v && v.lang || "").toLowerCase().replace("_", "-");
    if (l.indexOf("en") !== 0 || !isFemaleVoice(n)) return -1000;
    var s = 6;
    if (l.indexOf("en-us") === 0) s += 4;
    if (/natural|neural|online/.test(n)) s += 45;
    if (v.localService === false) s += 12;
    if (/espeak|compact|hazel desktop/.test(n)) s -= 35;
    if (/desktop/.test(n)) s -= 20;
    if (/samantha|\baria\b|\bjenny\b|\bzira\b|\bserena\b|\bkaren\b|\bvictoria\b|\bsonia\b|\bsusan\b|\bmichelle\b|\bana\b|\blibby\b|\beva\b/.test(n)) s += 32;
    if (/\bfemale\b/.test(n)) s += 18;
    if (/google/.test(n) && /female/.test(n)) s += 10;
    if (/\baria\b|\bjenny\b/.test(n)) s += 6;
    return s;
  }

  function considerVoices() {
    if (!window.speechSynthesis) return;
    var list = speechSynthesis.getVoices() || [];
    var best = havenVoice;
    var bestScore = best ? scoreFemaleVoice(best) : -1000;
    for (var i = 0; i < list.length; i++) {
      var sc = scoreFemaleVoice(list[i]);
      if (sc > bestScore) {
        bestScore = sc;
        best = list[i];
      }
    }
    if (best && bestScore > -1000) {
      havenVoice = best;
      readBtn.setAttribute("data-voice", best.name);
      readBtn.title = "Read aloud · " + best.name;
    }
  }

  function whenVoice(cb) {
    considerVoices();
    if (havenVoice) { cb(); return; }
    var waited = 0;
    var timer = setInterval(function () {
      considerVoices();
      waited += 80;
      if (havenVoice || waited > 1600) {
        clearInterval(timer);
        cb();
      }
    }, 80);
  }

  function clearSpeaking() {
    var nodes = sheet.querySelectorAll(".speaking");
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove("speaking");
  }

  function stopVoice() {
    arming = false;
    if (window.speechSynthesis) speechSynthesis.cancel();
    clearSpeaking();
    readBtn.classList.remove("on");
    readBtn.textContent = "Read aloud";
  }

  function closeChapters() {
    chapters.setAttribute("hidden", "");
    chaptersBtn.setAttribute("aria-expanded", "false");
  }

  function scrollToStart() {
    readcol.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function paintProgress() {
    var el = wideQuery.matches ? readcol : document.documentElement;
    var view = wideQuery.matches ? readcol.clientHeight : window.innerHeight;
    var max = el.scrollHeight - view;
    var top = wideQuery.matches ? readcol.scrollTop : window.scrollY;
    var ratio = max > 8 ? Math.min(1, Math.max(0, top / max)) : 0;
    hairbar.style.width = (ratio * 100) + "%";
  }

  function show(i, push) {
    stopVoice();
    closeChapters();
    index = (i + book.chapters.length) % book.chapters.length;
    var ch = book.chapters[index];
    if (reduce) {
      sky.style.backgroundImage = "url('" + ch.scene + "')";
      skyb.style.opacity = "0";
    } else {
      skyb.style.backgroundImage = sky.style.backgroundImage;
      skyb.style.opacity = "1";
      sky.style.backgroundImage = "url('" + ch.scene + "')";
      requestAnimationFrame(function () { skyb.style.opacity = "0"; });
    }
    document.getElementById("part").textContent = ch.part || book.series || "The Eternal Haven";
    titleEl.textContent = ch.title;
    document.getElementById("label").textContent = ch.label + " · " + (book.author || "Justin Helmer");
    sheet.innerHTML = "";
    paras = [];
    ch.paragraphs.forEach(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      sheet.appendChild(p);
      paras.push(p);
    });
    var next = book.chapters[(index + 1) % book.chapters.length];
    door.style.backgroundImage = "url('" + next.scene + "')";
    door.querySelector(".door-title").textContent = next.title;
    Array.prototype.forEach.call(rail.children, function (btn, n) {
      btn.classList.toggle("on", n === index);
    });
    scrollToStart();
    paintProgress();
    if (push) {
      history.replaceState(null, "", "#" + ch.id);
      titleEl.focus({ preventScroll: true });
    }
    document.title = ch.title + " — " + book.title;
  }

  function markAt(charIndex) {
    var hit = null;
    for (var i = 0; i < followRanges.length; i++) {
      if (charIndex >= followRanges[i].start && charIndex < followRanges[i].end) hit = followRanges[i];
    }
    if (!hit || hit.el.classList.contains("speaking")) return;
    clearSpeaking();
    hit.el.classList.add("speaking");
    hit.el.scrollIntoView({ block: "center", inline: "nearest" });
  }

  function speak() {
    if (!window.speechSynthesis || !book) return;
    if (speechSynthesis.speaking || speechSynthesis.pending || arming) {
      stopVoice();
      return;
    }
    arming = true;
    readBtn.classList.add("on");
    readBtn.textContent = "Stop voice";
    whenVoice(function () {
      if (!arming || !book) return;
      arming = false;
      var parts = [];
      followRanges = [];
      var cursor = 0;
      paras.forEach(function (el, n) {
        var text = el.textContent;
        if (n) {
          parts.push("\n\n");
          cursor += 2;
        }
        var start = cursor;
        parts.push(text);
        cursor += text.length;
        followRanges.push({ start: start, end: cursor + 1, el: el });
      });
      var utter = new SpeechSynthesisUtterance(parts.join(""));
      utter.rate = 0.92;
      utter.pitch = 1;
      if (havenVoice) {
        utter.voice = havenVoice;
        if (havenVoice.lang) utter.lang = havenVoice.lang;
      }
      utter.onboundary = function (ev) { markAt(ev.charIndex || 0); };
      utter.onend = function () {
        clearSpeaking();
        readBtn.classList.remove("on");
        readBtn.textContent = "Read aloud";
      };
      markAt(0);
      speechSynthesis.speak(utter);
    });
  }

  function motes() {
    var c = document.getElementById("motes");
    if (reduce) return;
    var ctx = c.getContext("2d");
    var dots = [];
    function size() {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    }
    size();
    window.addEventListener("resize", size);
    for (var i = 0; i < 48; i++) {
      dots.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4, s: Math.random() * 0.15 + 0.04 });
    }
    function frame() {
      ctx.clearRect(0, 0, c.width, c.height);
      dots.forEach(function (d) {
        d.y -= d.s / 100;
        if (d.y < 0) d.y = 1;
        ctx.fillStyle = "rgba(224,179,106,.55)";
        ctx.beginPath();
        ctx.arc(d.x * c.width, d.y * c.height, d.r, 0, 6.28);
        ctx.fill();
      });
      requestAnimationFrame(frame);
    }
    frame();
  }

  fetch("story.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      book = data;
      book.chapters.forEach(function (ch, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = ch.label.replace("Chapter ", "");
        btn.addEventListener("click", function () { show(i, true); });
        rail.appendChild(btn);
      });
      var start = 0;
      var hash = location.hash.replace("#", "");
      book.chapters.forEach(function (ch, i) { if (ch.id === hash) start = i; });
      show(start, false);
      motes();
    });

  document.getElementById("prev").addEventListener("click", function () { show(index - 1, true); });
  document.getElementById("next").addEventListener("click", function () { show(index + 1, true); });
  door.addEventListener("click", function () { show(index + 1, true); });
  readBtn.addEventListener("click", speak);
  chaptersBtn.addEventListener("click", function () {
    var open = chapters.hasAttribute("hidden");
    if (open) chapters.removeAttribute("hidden");
    else chapters.setAttribute("hidden", "");
    chaptersBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  readcol.addEventListener("scroll", paintProgress, { passive: true });
  window.addEventListener("scroll", paintProgress, { passive: true });
  window.addEventListener("resize", paintProgress);
  window.addEventListener("pagehide", stopVoice);
  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "Escape") closeChapters();
    if (e.key === "ArrowRight") show(index + 1, true);
    if (e.key === "ArrowLeft") show(index - 1, true);
  });

  if (window.speechSynthesis) {
    speechSynthesis.addEventListener("voiceschanged", considerVoices);
    speechSynthesis.getVoices();
    considerVoices();
  }
})();
