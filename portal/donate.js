(() => {
  const PAYPAL = "https://www.paypal.com/paypalme/ExcavationPro";
  // The post, not the profile: that page carries the explanation and the current month's code.
  const PATREON = "https://www.patreon.com/Excavationpro/posts/chatagent-ca-api-170485961";
  const EVERY_MS = 15 * 60 * 1000;
  let opened = false;
  let timer = null;

  function el(id) {
    return document.getElementById(id);
  }

  // A supporter code (from the steward's Patreon post, rotated monthly) switches these reminders off in
  // the browser where it was entered. Everything else about the page is the same. supporter.js owns the
  // check; this file only asks it, at every point where a reminder could appear - so unlocking while the
  // card is open closes it, and an unlock that lapses starts the reminders again.
  function allowed() {
    var s = window.LYGO_SUPPORTER;
    return !(s && s.unlocked && s.unlocked());
  }

  function show() {
    const layer = el("donateLayer");
    if (!layer) return;
    if (!allowed()) { schedule(); return; }
    // Never push a reminder over the entrance: a visitor still reading the terms has not started yet.
    const intro = el("introLayer");
    if (intro && !intro.hidden) { schedule(); return; }
    opened = false;
    const close = el("donateClose");
    if (close) {
      close.disabled = true;
      close.textContent = "Open a donate page to continue";
    }
    layer.hidden = false;
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
    document.dispatchEvent(new CustomEvent("lygo-donate-shown"));   // supporter.js paints the backdrop
  }

  function hide() {
    const layer = el("donateLayer");
    if (!layer) return;
    layer.hidden = true;
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");
    opened = false;
    document.dispatchEvent(new CustomEvent("lygo-donate-hidden"));
    schedule();
  }

  function markOpened() {
    opened = true;
    const close = el("donateClose");
    if (close) {
      close.disabled = false;
      close.textContent = "Thanks — continue";
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!allowed()) return;                 // a supporter in this browser: nothing is scheduled at all
    timer = setTimeout(show, EVERY_MS);
  }

  function boot() {
    const layer = el("donateLayer");
    if (!layer) return;
    const pay = el("donatePaypal");
    const pat = el("donatePatreon");
    const close = el("donateClose");
    function openLink(url) {
      window.open(url, "_blank", "noopener");
      markOpened();
    }
    if (pay) pay.onclick = function (e) { e.preventDefault(); openLink(PAYPAL); };
    if (pat) pat.onclick = function (e) { e.preventDefault(); openLink(PATREON); };
    if (close) {
      close.onclick = function () {
        if (!opened) return;
        hide();
      };
    }
    layer.addEventListener("click", function (e) {
      if (e.target === layer) e.stopPropagation();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !layer.hidden && !opened) e.preventDefault();
    });
    // supporter.js drives these three: unlocking shuts the card and stops the clock, locking again
    // restarts it, and entering the portal restarts the clock so nobody is interrupted seconds after
    // they walked in.
    document.addEventListener("lygo-supporter", function () {
      if (allowed()) { schedule(); return; }
      if (!layer.hidden) hide();
      else schedule();
    });
    document.addEventListener("lygo-portal-close-donate", function () {
      if (!layer.hidden) hide();
    });
    document.addEventListener("lygo-intro-entered", function () { schedule(); });
    schedule();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
