/* gate.js — sitewide free-use gate for middlenamesgenerator.com
   3 free tool uses, then a free account. The email must be VERIFIED by
   clicking a link, so bots cannot reach the list. Cloudflare Turnstile
   (optional) blocks automated browsers before submission.
   Config lives ONLY in config.php. Nothing to edit in HTML.
   Tester bypass: ?gatekey=mng-open-sesame | reset: ?gatereset=mng-open-sesame */
(function () {
  "use strict";
  var FREE_USES = 3;
  var K_USES = "mng_uses", K_UNLOCK = "mng_unlocked", K_EMAIL = "mng_email", K_PEND = "mng_pending";
  var TESTER_KEY = "mng-open-sesame";

  var TS_SITE_KEY = "";        // filled from the server
  var configLoaded = false;
  var gateEl = null, pollTimer = null, tsWidget = null, cardEl = null;

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var qs = new URLSearchParams(location.search);
  if (qs.get("gatekey") === TESTER_KEY) ls(K_UNLOCK, "1");
  if (qs.get("gatereset") === TESTER_KEY) { try { localStorage.removeItem(K_UNLOCK); localStorage.removeItem(K_USES); localStorage.removeItem(K_PEND); } catch (e) {} }

  function unlocked() { return ls(K_UNLOCK) === "1"; }
  function uses() { return parseInt(ls(K_USES) || "0", 10) || 0; }

  function sha256(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      });
    }
    return Promise.resolve("nojs-crypto");
  }
  function ping(ev) { try { fetch("subscribe.php?event=" + ev).catch(function () {}); } catch (e) {} }
  function esc(s) { return String(s).replace(/[<>&"]/g, ""); }

  /* Ask the server for the Turnstile site key (set in config.php). Always resolves. */
  function ensureConfig() {
    if (configLoaded) return Promise.resolve();
    return fetch("subscribe.php?config=1")
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.turnstile) TS_SITE_KEY = d.turnstile; configLoaded = true; })
      .catch(function () { configLoaded = true; });
  }
  var tsScriptLoading = null;
  function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve();
    if (tsScriptLoading) return tsScriptLoading;
    tsScriptLoading = new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };   /* blocked or offline: resolve anyway */
      document.head.appendChild(s);
      setTimeout(resolve, 6000);                /* never hang the gate */
    });
    return tsScriptLoading;
  }

  /* Mount the widget into the gate. Safe to call repeatedly. */
  function mountTurnstile() {
    var box = gateEl && gateEl.querySelector("#mngTs");
    if (!TS_SITE_KEY || !box) return;
    loadTurnstileScript().then(function () {
      if (!window.turnstile || !box.isConnected) return;
      try {
        box.innerHTML = "";
        tsWidget = turnstile.render(box, { sitekey: TS_SITE_KEY, theme: "light" });
      } catch (e) { tsWidget = null; }
    });
  }

  /* Read the token from the widget, or from the hidden field Cloudflare injects. */
  function turnstileToken() {
    try {
      if (window.turnstile && tsWidget !== null && tsWidget !== undefined) {
        var r = turnstile.getResponse(tsWidget);
        if (r) return r;
      }
    } catch (e) {}
    var hidden = gateEl && gateEl.querySelector('[name="cf-turnstile-response"]');
    return hidden && hidden.value ? hidden.value : "";
  }

  /* ---------- the signup form ---------- */
  function renderForm() {
    var t = Math.floor(Date.now() / 1000);
    gateEl.innerHTML =
      '<div class="gate-crest">🔓</div>' +
      '<p class="gate-kicker">You\u2019ve used your 3 free tries</p>' +
      '<h3>Keep every tool, free.</h3>' +
      '<p class="gate-sub">One free account unlocks the whole site on this device. No payment, now or ever at signup.</p>' +
      '<ul class="gate-perks">' +
      '<li>Unlimited scored suggestions, no daily cap</li>' +
      '<li>Every themed collection and name list</li>' +
      '<li>The say-it-aloud voice test and shortlists</li>' +
      '<li>Sibling, initials and nickname checkers</li>' +
      '</ul>' +
      '<p class="gate-free">100% FREE right now. No payment, no card details needed. Signing up costs nothing.</p>' +
      '<form class="gate-form" novalidate>' +
      '<input type="email" name="email" placeholder="you@example.com" required autocomplete="email" aria-label="Email address">' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-6000px" aria-hidden="true">' +
      '<button class="btn coral" type="submit">Unlock free</button>' +
      '</form>' +
      '<div class="cf-turnstile" id="mngTs"></div>' +
      '<p class="gate-signin">Already signed up? Enter the same email to unlock this device.</p>' +
      '<p class="gate-consent">We\u2019ll email you a one-click confirmation link (this keeps our list human). By continuing you agree to receive occasional name inspiration and offers by email (unsubscribe anytime) and to the <a href="privacy-policy.html">privacy policy</a>. No payment details needed.</p>' +
      '<p class="gate-err" role="alert" style="display:none"></p>';

    tsWidget = null;
    mountTurnstile();

    gateEl.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, email = f.email.value.trim(), errEl = gateEl.querySelector(".gate-err");
      var btn = f.querySelector("button");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
        errEl.textContent = "Enter a valid email address."; errEl.style.display = "block"; return;
      }
      errEl.style.display = "none";
      btn.disabled = true; btn.innerHTML = '<span class="gate-spin"></span> Sending\u2026';

      var cf = turnstileToken();

      sha256(t + "|mng-gate-2026").then(function (h) {
        return fetch("subscribe.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, website: f.website.value, t: t, tok: h.slice(0, 12), cf: cf, source: location.pathname })
        });
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok && d.unlock) { finish(email); return; }
        if (d.ok && d.sent) { renderPending(email); return; }
        errEl.textContent = d.msg || "Please try a different email address.";
        errEl.style.display = "block";
        btn.disabled = false; btn.textContent = "Unlock free";
        try { if (window.turnstile && tsWidget !== null) turnstile.reset(tsWidget); } catch (e) {}
      }).catch(function () {
        errEl.textContent = "Network problem. Please check your connection and try again.";
        errEl.style.display = "block";
        btn.disabled = false; btn.textContent = "Unlock free";
      });
    });
  }

  /* ---------- waiting for the inbox click ---------- */
  function renderPending(email) {
    ls(K_PEND, email);
    gateEl.innerHTML =
      '<div class="gate-sent">' +
      '<div class="gate-crest">📩</div>' +
      '<p class="gate-kicker">One click left</p>' +
      '<h3>Check your inbox</h3>' +
      '<p class="gate-sub">We\u2019ve sent a confirmation link to <strong>' + esc(email) + '</strong>. Click it and every tool unlocks instantly on this device.</p>' +
      '<p class="gate-consent" style="margin-bottom:14px">No email after a minute? Check your spam folder, or <button type="button" class="btn ghost small" id="mngResend">use a different email</button></p>' +
      '<p class="gate-consent"><span class="gate-spin" style="border-color:rgba(93,78,140,.25);border-top-color:#5D4E8C"></span> Waiting for you to click the link\u2026</p>' +
      '</div>';

    /* Back to the form, in place: no reload, no lost gate */
    var resend = gateEl.querySelector("#mngResend");
    if (resend) resend.addEventListener("click", function () {
      if (pollTimer) clearInterval(pollTimer);
      try { localStorage.removeItem(K_PEND); } catch (e) {}
      renderForm();
      var inp = gateEl.querySelector('input[name="email"]');
      if (inp) { inp.value = email; inp.focus(); inp.select(); }
    });

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      fetch("subscribe.php?status=" + encodeURIComponent(email))
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.verified) { clearInterval(pollTimer); finish(email); } })
        .catch(function () {});
    }, 4000);
  }

  function finish(email) {
    ls(K_UNLOCK, "1"); ls(K_EMAIL, email);
    renderAccount();
    try { localStorage.removeItem(K_PEND); } catch (e) {}
    if (pollTimer) clearInterval(pollTimer);
    if (gateEl) {
      gateEl.innerHTML =
        '<div class="gate-crest">✓</div>' +
        '<p class="gate-kicker">Confirmed</p>' +
        '<h3>Unlocked. Happy naming.</h3>' +
        '<p class="gate-sub">Every tool on this site is now yours, unlimited and free.</p>';
      setTimeout(function () {
        if (gateEl) { gateEl.style.display = "none"; }
        closeGateModal();
      }, 2600);
    }
  }

  function buildGate(card, isModal) {
    if (gateEl && gateEl.isConnected && !isModal) { gateEl.style.display = "block"; return; }
    cardEl = card;
    gateEl = document.createElement("div");
    gateEl.className = "gate-card";
    gateEl.innerHTML = '<div class="gate-crest">\uD83D\uDD13</div><p class="gate-sub">Loading\u2026</p>';
    card.appendChild(gateEl);
    ping("shown");
    ensureConfig().then(function () {
      var pend = ls(K_PEND);
      if (pend) { renderPending(pend); } else { renderForm(); }
      if (!isModal && gateEl.scrollIntoView) {
        try { gateEl.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
      }
    });
  }

  /* Verified in another tab? unlock this one on return */
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    var pend = ls(K_PEND);
    if (!pend || unlocked()) return;
    fetch("subscribe.php?status=" + encodeURIComponent(pend))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.verified) finish(pend); })
      .catch(function () {});
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".tool-card button.btn");
    if (!btn || unlocked()) return;
    if (gateEl && gateEl.contains(btn)) return;
    var card = btn.closest(".tool-card");
    var n = uses();
    if (n >= FREE_USES) {
      e.preventDefault(); e.stopImmediatePropagation();
      buildGate(card);
    } else {
      ls(K_USES, String(n + 1));
    }
  }, true);

  /* ---------- HEADER ACCOUNT CONTROL ----------
     Signed out -> "Sign in" button (also the way back in on a new device).
     Signed in  -> avatar with the email initial -> dropdown -> Sign out.
     Industry standard: state is shown by WHAT is in the corner, not a label. */
  function headerSlot() {
    return document.querySelector(".site-head .wrap") || document.querySelector(".site-head") || null;
  }
  function initial() {
    var e = ls(K_EMAIL) || "";
    return e ? e.charAt(0).toUpperCase() : "\u2713";
  }
  function renderAccount() {
    var head = headerSlot();
    if (!head) return;
    var old = document.getElementById("mngAccount");
    if (old) old.remove();

    var wrap = document.createElement("div");
    wrap.id = "mngAccount";
    wrap.className = "mng-account";

    if (!unlocked()) {
      wrap.innerHTML = '<button type="button" class="mng-signin" aria-label="Sign in">Sign in</button>';
      head.appendChild(wrap);
      wrap.querySelector(".mng-signin").addEventListener("click", function () { openGateModal(); });
      return;
    }

    var email = ls(K_EMAIL) || "";
    wrap.innerHTML =
      '<button type="button" class="mng-avatar" id="mngAvatarBtn" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu">' + initial() + '</button>' +
      '<div class="mng-menu" id="mngMenu" role="menu" hidden>' +
        '<div class="mng-menu-em">' + esc(email || "Signed in") + '</div>' +
        '<div class="mng-menu-note">Every tool unlocked, free.</div>' +
        '<div class="mng-menu-sep"></div>' +
        '<button type="button" class="mng-menu-item" id="mngSignOut" role="menuitem">Sign out</button>' +
      '</div>';
    head.appendChild(wrap);

    var btn = wrap.querySelector("#mngAvatarBtn");
    var menu = wrap.querySelector("#mngMenu");
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    function toggle() {
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    wrap.querySelector("#mngSignOut").addEventListener("click", function () {
      try {
        localStorage.removeItem(K_UNLOCK);
        localStorage.removeItem(K_EMAIL);
        localStorage.removeItem(K_PEND);
      } catch (e) {}
      if (pollTimer) clearInterval(pollTimer);
      if (gateEl) { gateEl.remove(); gateEl = null; }
      closeGateModal();
      renderAccount();
      toast("Signed out. Sign in anytime with your email.");
    });
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "mng-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("go"); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  /* ---------- gate in a modal (used by the header Sign in button) ---------- */
  var modalEl = null;
  function closeGateModal() {
    if (modalEl) { modalEl.remove(); modalEl = null; }
  }
  function openGateModal() {
    if (unlocked()) return;
    closeGateModal();
    modalEl = document.createElement("div");
    modalEl.className = "mng-overlay";
    modalEl.innerHTML = '<div class="mng-overlay-inner"></div>';
    document.body.appendChild(modalEl);
    modalEl.addEventListener("click", function (e) { if (e.target === modalEl) closeGateModal(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { closeGateModal(); document.removeEventListener("keydown", esc); }
    });
    buildGate(modalEl.querySelector(".mng-overlay-inner"), true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAccount);
  } else { renderAccount(); }

  /* Warm the config early so the first gate render already knows the key */
  ensureConfig();
})();
