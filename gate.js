/* gate.js — sitewide free-use gate for middlenamesgenerator.com
   3 free tool uses, then a free account. Email must be VERIFIED by
   clicking a link, so bots cannot get onto the list. Cloudflare
   Turnstile blocks headless browsers before submission.
   Tester bypass: ?gatekey=mng-open-sesame | reset: ?gatereset=mng-open-sesame */
(function () {
  "use strict";
  var FREE_USES = 3;
  var K_USES = "mng_uses", K_UNLOCK = "mng_unlocked", K_EMAIL = "mng_email", K_PEND = "mng_pending";
  var TESTER_KEY = "mng-open-sesame";
  var TS_SITE_KEY = window.MNG_TURNSTILE_KEY || ""; /* set by page if configured */

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var qs = new URLSearchParams(location.search);
  if (qs.get("gatekey") === TESTER_KEY) ls(K_UNLOCK, "1");
  if (qs.get("gatereset") === TESTER_KEY) { try { localStorage.removeItem(K_UNLOCK); localStorage.removeItem(K_USES); localStorage.removeItem(K_PEND); } catch (e) {} }

  function unlocked() { return ls(K_UNLOCK) === "1"; }
  function uses() { return parseInt(ls(K_USES) || "0", 10) || 0; }

  var gateEl = null, pollTimer = null, tsWidget = null;

  function sha256(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      });
    }
    return Promise.resolve("nojs-crypto");
  }
  function ping(ev) { try { fetch("subscribe.php?event=" + ev).catch(function () {}); } catch (e) {} }

  function loadTurnstile(cb) {
    if (!TS_SITE_KEY) { cb(); return; }
    if (window.turnstile) { cb(); return; }
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.defer = true; s.onload = cb; s.onerror = cb;
    document.head.appendChild(s);
  }

  function buildGate(card) {
    if (gateEl) { gateEl.style.display = "block"; return; }
    var t = Math.floor(Date.now() / 1000);
    gateEl = document.createElement("div");
    gateEl.className = "gate-card";
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
      '<p class="gate-consent">We\u2019ll email you a one-click confirmation link (this keeps our list human). By continuing you agree to receive occasional name inspiration and offers by email (unsubscribe anytime) and to the <a href="privacy-policy.html">privacy policy</a>. No payment details needed.</p>' +
      '<p class="gate-err" role="alert" style="display:none"></p>';
    card.appendChild(gateEl);
    ping("shown");

    loadTurnstile(function () {
      if (TS_SITE_KEY && window.turnstile) {
        try { tsWidget = turnstile.render("#mngTs", { sitekey: TS_SITE_KEY, theme: "light", size: "flexible" }); } catch (e) {}
      }
    });

    gateEl.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, email = f.email.value.trim(), errEl = gateEl.querySelector(".gate-err");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { errEl.textContent = "Enter a valid email address."; errEl.style.display = "block"; return; }
      errEl.style.display = "none";
      var btn = f.querySelector("button"); btn.disabled = true;
      btn.innerHTML = '<span class="gate-spin"></span> Sending\u2026';

      var cf = "";
      try { if (TS_SITE_KEY && window.turnstile) cf = turnstile.getResponse(tsWidget) || ""; } catch (e) {}
      if (TS_SITE_KEY && !cf) {
        errEl.textContent = "Please complete the human check just above, then try again.";
        errEl.style.display = "block"; btn.disabled = false; btn.textContent = "Unlock free"; return;
      }

      sha256(t + "|mng-gate-2026").then(function (h) {
        return fetch("subscribe.php", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, website: f.website.value, t: t, tok: h.slice(0, 12), cf: cf, source: location.pathname })
        });
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok && d.unlock) { finish(email); return; }
        if (d.ok && d.sent) { awaitVerification(email); return; }
        errEl.textContent = d.msg || "Please try a different email.";
        errEl.style.display = "block"; btn.disabled = false; btn.textContent = "Unlock free";
        try { if (TS_SITE_KEY && window.turnstile) turnstile.reset(tsWidget); } catch (e) {}
      }).catch(function () {
        errEl.textContent = "Network problem. Please check your connection and try again.";
        errEl.style.display = "block"; btn.disabled = false; btn.textContent = "Unlock free";
      });
    });
  }

  /* Waiting-for-click state: polls until the link in the inbox is clicked */
  function awaitVerification(email) {
    ls(K_PEND, email);
    gateEl.innerHTML =
      '<div class="gate-sent">' +
      '<div class="gate-crest">📩</div>' +
      '<p class="gate-kicker">One click left</p>' +
      '<h3>Check your inbox</h3>' +
      '<p class="gate-sub">We\u2019ve sent a confirmation link to <strong>' + email.replace(/[<>&"]/g, "") + '</strong>. Click it and every tool unlocks instantly, here and on this device.</p>' +
      '<p class="gate-consent" style="margin-bottom:14px">No email after a minute? Check spam, or <button type="button" class="btn ghost small" id="mngResend">send it again</button></p>' +
      '<p class="gate-consent"><span class="gate-spin" style="border-color:rgba(93,78,140,.25);border-top-color:#5D4E8C"></span> Waiting for you to click the link\u2026</p>' +
      '</div>';
    var resend = document.getElementById("mngResend");
    if (resend) resend.addEventListener("click", function () { location.reload(); });

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
    try { localStorage.removeItem(K_PEND); } catch (e) {}
    if (pollTimer) clearInterval(pollTimer);
    if (gateEl) {
      gateEl.innerHTML =
        '<div class="gate-crest">✓</div>' +
        '<p class="gate-kicker">Confirmed</p>' +
        '<h3>Unlocked. Happy naming.</h3>' +
        '<p class="gate-sub">Every tool on this site is now yours, unlimited and free.</p>';
      setTimeout(function () { if (gateEl) gateEl.style.display = "none"; }, 2600);
    }
  }

  /* If they verified in another tab, unlock this one on return */
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
      gateEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      ls(K_USES, String(n + 1));
    }
  }, true);
})();
