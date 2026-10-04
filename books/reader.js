(function () {
  var book = null;
  var index = 0;
  var sky = document.getElementById("sky");
  var skyb = document.getElementById("skyb");
  var sheet = document.getElementById("sheet");
  var rail = document.getElementById("rail");
  var readBtn = document.getElementById("read");

  function stopVoice() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    readBtn.classList.remove("on");
    readBtn.textContent = "Read aloud";
  }

  function show(i, push) {
    stopVoice();
    index = (i + book.chapters.length) % book.chapters.length;
    var ch = book.chapters[index];
    skyb.style.backgroundImage = sky.style.backgroundImage;
    skyb.style.opacity = "1";
    sky.style.backgroundImage = "url('" + ch.scene + "')";
    requestAnimationFrame(function () { skyb.style.opacity = "0"; });
    document.getElementById("part").textContent = ch.part || book.series || "The Eternal Haven";
    document.getElementById("title").textContent = ch.title;
    document.getElementById("label").textContent = ch.label + " · " + (book.author || "Justin Helmer");
    sheet.innerHTML = "";
    sheet.scrollTop = 0;
    ch.paragraphs.forEach(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      sheet.appendChild(p);
    });
    Array.prototype.forEach.call(rail.children, function (btn, n) {
      btn.classList.toggle("on", n === index);
    });
    if (push) history.replaceState(null, "", "#" + ch.id);
    document.title = ch.title + " — " + book.title;
  }

  function speak() {
    if (!window.speechSynthesis) return;
    if (speechSynthesis.speaking) {
      stopVoice();
      return;
    }
    var ch = book.chapters[index];
    var utter = new SpeechSynthesisUtterance(ch.paragraphs.join("\n\n"));
    utter.rate = 0.92;
    utter.onend = function () {
      readBtn.classList.remove("on");
      readBtn.textContent = "Read aloud";
    };
    readBtn.classList.add("on");
    readBtn.textContent = "Stop voice";
    speechSynthesis.speak(utter);
  }

  function motes() {
    var c = document.getElementById("motes");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
  readBtn.addEventListener("click", speak);
  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowRight") show(index + 1, true);
    if (e.key === "ArrowLeft") show(index - 1, true);
  });
})();
