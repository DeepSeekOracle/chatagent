(function (w) {
  "use strict";
  var SPACE = "https://deepseekoracle-lattice-marines-ledger.hf.space";

  function qget(k) {
    try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; }
  }
  function qset(k, q) {
    try { localStorage.setItem(k, JSON.stringify(q.slice(-40))); } catch (e) {}
  }
  function recKey(rec) {
    return [
      rec.game, rec.event, rec.name, rec.score, rec.ms, rec.total, rec.vsPar,
      rec.rating, rec.wins, rec.date, rec.trackId || rec.courseId || ""
    ].join("|");
  }
  function enqueue(qk, rec) {
    var q = qget(qk);
    var k = recKey(rec);
    if (q.some(function (x) { return recKey(x) === k; })) return false;
    rec._key = k;
    q.push(rec);
    qset(qk, q);
    return true;
  }
  function flush(qk, url) {
    var q = qget(qk);
    if (!q.length) return Promise.resolve(null);
    return (async function () {
      var left = [];
      var last = null;
      for (var i = 0; i < q.length; i++) {
        var rec = q[i];
        try {
          var r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rec)
          });
          var j = await r.json().catch(function () { return {}; });
          if (r.ok && j && j.ok) last = j;
          else left.push(rec);
        } catch (e) {
          left.push(rec);
        }
      }
      qset(qk, left);
      return last;
    })();
  }
  function post(qk, rec, url) {
    enqueue(qk, rec);
    return flush(qk, url);
  }

  w.ArcadeLedger = {
    SPACE: SPACE,
    enqueue: enqueue,
    flush: flush,
    post: post,
    rally: function (rec) {
      rec.game = "haven-rally";
      return post("lygo-haven-rally-ledger-q", rec, SPACE + "/arcade/submit");
    },
    golf: function (rec) {
      rec.game = "lattice-golf";
      rec.event = rec.event || "round";
      return post("lygo-lattice-golf-ledger-q", rec, SPACE + "/arcade/submit");
    },
    swarm: function (rec) {
      rec.game = "lattice-swarm";
      rec.event = rec.event || "score";
      return post("lygo-swarm-ledger-q", rec, SPACE + "/arcade/submit");
    },
    eternal: function (rec) {
      rec.game = "eternal-lattice";
      rec.event = rec.event || "ladder";
      return post("lygo-eternal-ledger-q", rec, SPACE + "/arcade/submit");
    },
    crypt: function (rec) {
      rec.game = "lattice-crypt";
      rec.event = rec.event || "run";
      return post("lygo-lattice-crypt-ledger-q", rec, SPACE + "/arcade/submit");
    },
    boot: function () {
      var url = SPACE + "/arcade/submit";
      flush("lygo-haven-rally-ledger-q", url);
      flush("lygo-lattice-golf-ledger-q", url);
      flush("lygo-swarm-ledger-q", url);
      flush("lygo-eternal-ledger-q", url);
      flush("lygo-lattice-crypt-ledger-q", url);
    }
  };
})(window);
