/* ==========================================================
   Middle Names Generator — analysis engine (no dependencies)
   All processing happens in the browser. Nothing is sent
   or stored anywhere.
   ========================================================== */

const NTF = (() => {

  /* ---------- Syllables (heuristic) ---------- */
  function syllables(word) {
    let w = (word || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
         .replace(/^y/, "");
    const groups = w.match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups ? groups.length : 1);
  }

  const VOWELS = "aeiou";
  const VOWELY = "aeiouy";

  /* Rhyme heuristic: strong (last 3 chars match) or vowel-equivalent
     (last 2 match and both preceding chars are vowels, e.g. rYAN / brIAN) */
  function rhymes(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    if (a.length < 3 || b.length < 3) return false;
    if (a.slice(-3) === b.slice(-3)) return true;
    return a.slice(-2) === b.slice(-2) &&
           VOWELY.includes(a.charAt(a.length - 3)) &&
           VOWELY.includes(b.charAt(b.length - 3));
  }

  const first = s => (s || "").trim().charAt(0).toLowerCase();
  const last  = s => (s || "").trim().slice(-1).toLowerCase();
  const clean = s => (s || "").trim().replace(/\s+/g, " ");
  const cap   = s => clean(s).split(" ").map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");

  /* ---------- Awkward initials dictionary ---------- */
  const BAD3 = ["ass","bum","poo","pee","fat","pig","cow","rat","die","dud","dum","git","gob","yuk","zit","sad","bad","mad","nit","rot","sob","ick","ugh","bog","fib","con","rob","irk","vex","woe","sin","tat","naf","pox","gag","hag","nag","dim","oaf","sap","wtf","fml","omg","std","tit","wee","gas","bin","fug","pus","goo","erm","meh","odd","loo","moo","bug","egg","nob","pot","wig","zoo","boo"];
  const BAD2 = ["bo","vd","bs","fu","px","wc"];

  function initialsOf(firstName, middleName, lastName) {
    return [firstName, middleName, lastName]
      .map(n => first(n))
      .filter(Boolean)
      .join("")
      .toLowerCase();
  }

  function checkInitials(firstName, middleName, lastName) {
    const results = [];
    const seq = initialsOf(firstName, middleName, lastName);      // F M L
    const mono = (first(firstName) + first(lastName) + first(middleName)).toLowerCase(); // monogram F L M
    function verdict(str, label) {
      if (!str || str.length < 2) return null;
      const bad = (str.length >= 3 && BAD3.includes(str)) || (str.length === 2 && BAD2.includes(str));
      return { label, letters: str.toUpperCase().split("").join("."), bad };
    }
    const a = verdict(seq, "Initials (First–Middle–Last)");
    const b = middleName ? verdict(mono, "Monogram order (First–LAST–Middle)") : null;
    if (a) results.push(a);
    if (b && b.letters !== (a && a.letters)) results.push(b);
    return results;
  }

  /* ---------- Flow scoring ---------- */
  function flowScore(firstName, middleName, lastName) {
    const names = [firstName, middleName, lastName].map(clean).filter(Boolean);
    const checks = [];
    let score = 100;

    // 1. Syllable rhythm
    const sylCounts = names.map(syllables);
    const allSame = sylCounts.length >= 2 && sylCounts.every(c => c === sylCounts[0]);
    if (allSame && sylCounts[0] >= 2) {
      score -= 12;
      checks.push({ ok: false, title: "Repetitive rhythm",
        detail: "Every name has " + sylCounts[0] + " syllables. Varying syllable counts (like 3–1–2) usually sounds more natural said aloud." });
    } else if (allSame && sylCounts[0] === 1) {
      score -= 8;
      checks.push({ ok: false, title: "Staccato rhythm",
        detail: "All single-syllable names can sound abrupt together. A longer first or middle name adds balance." });
    } else {
      checks.push({ ok: true, title: "Good rhythm variety",
        detail: "Syllable pattern " + sylCounts.join("–") + " gives the full name a natural cadence." });
    }

    // 2. Sound collisions between adjacent names
    for (let i = 0; i < names.length - 1; i++) {
      const a = names[i], b = names[i + 1];
      const endA = last(a), startB = first(b);
      if (endA === startB) {
        score -= 10;
        checks.push({ ok: false, title: "Names run together: " + cap(a) + " → " + cap(b),
          detail: "\u201C" + cap(a) + " " + cap(b) + "\u201D shares the sound \u201C" + endA.toUpperCase() + "\u201D where one ends and the next begins, so they can blur into one word when spoken." });
      } else if (VOWELS.includes(endA) && VOWELS.includes(startB)) {
        score -= 5;
        checks.push({ ok: false, title: "Vowel collision: " + cap(a) + " → " + cap(b),
          detail: "Ending on a vowel and starting on a vowel (\u201C" + cap(a) + " " + cap(b) + "\u201D) can slur together. Say it aloud a few times to judge." });
      }
    }
    if (!checks.some(c => !c.ok && c.title.includes("→"))) {
      checks.push({ ok: true, title: "Clean transitions",
        detail: "Each name ends and the next begins with distinct sounds — no blurring." });
    }

    // 3. Rhyme risk (first vs last)
    if (names.length >= 2) {
      const f = names[0].toLowerCase(), l = names[names.length - 1].toLowerCase();
      if (f.length >= 3 && l.length >= 3 && f !== l && rhymes(f, l)) {
        score -= 12;
        checks.push({ ok: false, title: "Rhyme risk",
          detail: "\u201C" + cap(names[0]) + "\u201D and \u201C" + cap(names[names.length-1]) + "\u201D rhyme, which can invite playground teasing." });
      } else {
        checks.push({ ok: true, title: "No rhyme risk",
          detail: "First and last names don't rhyme." });
      }
    }

    // 4. Alliteration (style note, small deduction only if all three)
    const inits = names.map(first);
    if (inits.length === 3 && inits.every(i => i === inits[0])) {
      score -= 4;
      checks.push({ ok: false, title: "Triple alliteration",
        detail: "All three names start with \u201C" + inits[0].toUpperCase() + "\u201D. Some families love this; it does make the name very noticeable." });
    } else if (inits.length >= 2 && inits[0] === inits[inits.length - 1]) {
      checks.push({ ok: true, title: "Matching first/last initials",
        detail: "A gentle alliteration between first and last name often reads as deliberate and stylish." });
    }

    // 5. Initials & monogram
    const initialsResults = checkInitials(names[0], names.length === 3 ? names[1] : "", names[names.length - 1]);
    initialsResults.forEach(r => {
      if (r.bad) {
        score -= 15;
        checks.push({ ok: false, title: r.label + " spell trouble: " + r.letters,
          detail: "These initials spell something your child may be teased about on schoolbags, towels and email addresses." });
      } else {
        checks.push({ ok: true, title: r.label + ": " + r.letters,
          detail: "Nothing awkward here." });
      }
    });

    // 6. Length balance
    const totalLen = names.join("").length;
    if (totalLen > 24) {
      score -= 5;
      checks.push({ ok: false, title: "Long full name",
        detail: totalLen + " letters in total — fine, but expect it to be truncated on forms and boarding passes." });
    }

    return {
      score: Math.max(20, Math.min(100, score)),
      sylCounts,
      names: names.map(cap),
      checks
    };
  }

  /* ---------- Text to speech (accent-aware) ---------- */
  function speak(text, statusEl, lang) {
    try {
      if (!("speechSynthesis" in window)) {
        if (statusEl) statusEl.textContent = "Speech isn't supported in this browser.";
        return;
      }
      lang = lang || window.NTF_LANG || "en-GB";
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const exact = voices.find(v => v.lang === lang);
      const anyEn = voices.find(v => (v.lang || "").startsWith("en"));
      if (exact) u.voice = exact;
      else if (anyEn) {
        u.voice = anyEn;
        if (statusEl && lang !== anyEn.lang) statusEl.textContent = "That accent isn't installed on this device — using its default English voice.";
      }
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
      if (statusEl && (exact || !anyEn)) statusEl.textContent = "";
    } catch (e) {
      if (statusEl) statusEl.textContent = "Speech isn't available right now.";
    }
  }

  /* ---------- Sibling set analysis ---------- */
  function siblingCheck(existing, candidate) {
    const sibs = existing.map(clean).filter(Boolean);
    const cand = clean(candidate);
    const checks = [];
    if (!cand || !sibs.length) return { checks };

    // Shared initials
    const shared = sibs.filter(s => first(s) === first(cand));
    if (shared.length) {
      checks.push({ ok: false, title: "Shared initial with " + shared.map(cap).join(" and "),
        detail: "Same-initial siblings regularly get each other's post, prescriptions and school letters. Not a dealbreaker — just a lifetime of small mix-ups." });
    } else {
      checks.push({ ok: true, title: "Distinct initials", detail: "No initial clashes with the existing set." });
    }

    // Rhyming with a sibling
    const rhymer = sibs.find(s => rhymes(s, cand));
    if (rhymer) {
      checks.push({ ok: false, title: "Rhymes with " + cap(rhymer),
        detail: "\u201C" + cap(rhymer) + " and " + cap(cand) + "\u201D will be said together thousands of times — decide if the sing-song effect is charming or grating." });
    } else {
      checks.push({ ok: true, title: "No sibling rhymes", detail: "The new name doesn't rhyme with any existing sibling." });
    }

    // Ending-style consistency (e.g. all ending in a vowel)
    const vowelEnds = sibs.filter(s => VOWELS.includes(last(s))).length;
    const candVowel = VOWELS.includes(last(cand));
    if (sibs.length >= 2 && (vowelEnds === sibs.length) !== candVowel && vowelEnds === sibs.length) {
      checks.push({ ok: false, title: "Different ending style",
        detail: "Your existing names all end in a vowel sound; " + cap(cand) + " doesn't. Sets don't have to match — but if consistency matters to you, this is the one that will stand out." });
    }

    // Syllable style
    const sibSyl = sibs.map(syllables);
    const candSyl = syllables(cand);
    const avg = sibSyl.reduce((a, b) => a + b, 0) / sibSyl.length;
    if (Math.abs(candSyl - avg) >= 2) {
      checks.push({ ok: false, title: "Length odd-one-out",
        detail: cap(cand) + " (" + candSyl + " syllable" + (candSyl > 1 ? "s" : "") + ") is noticeably " + (candSyl > avg ? "longer" : "shorter") + " than the set's pattern." });
    } else {
      checks.push({ ok: true, title: "Consistent length", detail: "Syllable count fits the existing set." });
    }
    return { checks, sibs: sibs.map(cap), cand: cap(cand) };
  }

  /* ---------- Render helpers ---------- */
  function renderChecks(container, checks) {
    container.innerHTML = "";
    checks.forEach(c => {
      const div = document.createElement("div");
      div.className = "check " + (c.ok ? "pass" : "warn");
      div.innerHTML = '<div class="icon">' + (c.ok ? "✓" : "!") + '</div><div><strong></strong><span></span></div>';
      div.querySelector("strong").textContent = c.title;
      div.querySelector("span").textContent = c.detail;
      container.appendChild(div);
    });
  }

  function renderRhythm(container, names, sylCounts) {
    container.innerHTML = "";
    names.forEach((n, idx) => {
      const w = document.createElement("div");
      w.className = "word";
      const beats = document.createElement("div");
      beats.className = "beats";
      for (let i = 0; i < sylCounts[idx]; i++) {
        const dot = document.createElement("i");
        dot.style.animationDelay = (idx * 0.15 + i * 0.07) + "s";
        beats.appendChild(dot);
      }
      const label = document.createElement("div");
      label.className = "label";
      label.textContent = n;
      w.appendChild(beats); w.appendChild(label);
      container.appendChild(w);
    });
  }

  function animateScore(el, ringEl, target) {
    let cur = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.textContent = target; ringEl.style.setProperty("--pct", target); return; }
    const step = () => {
      cur = Math.min(target, cur + 3);
      el.textContent = cur;
      ringEl.style.setProperty("--pct", cur);
      if (cur < target) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Consent banner (placeholder until certified CMP added) ---------- */
  function initConsent() {
    try {
      if (document.cookie.indexOf("ntf_consent=") !== -1) return;
      const b = document.getElementById("consent-banner");
      if (!b) return;
      b.classList.add("show");
      b.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          try {
            document.cookie = "ntf_consent=" + btn.dataset.choice + ";max-age=15552000;path=/;SameSite=Lax";
          } catch (e) {}
          b.classList.remove("show");
        });
      });
    } catch (e) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initConsent);
  } else { initConsent(); }

  return { syllables, flowScore, checkInitials, speak, siblingCheck, renderChecks, renderRhythm, animateScore, cap };
})();

/* ==========================================================
   Site-wide UX helpers (mobile nav, universal reset, quick picks)
   ========================================================== */
(function(){
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded",fn); }
  ready(function(){
    /* ---- 1) Mobile hamburger nav ---- */
    var head = document.querySelector(".head-inner");
    var nav = document.querySelector("nav.main-nav");
    if (head && nav && !document.querySelector(".nav-toggle")) {
      var btn = document.createElement("button");
      btn.className = "nav-toggle";
      btn.setAttribute("aria-label","Menu");
      btn.setAttribute("aria-expanded","false");
      btn.innerHTML = "<span></span><span></span><span></span>";
      head.insertBefore(btn, nav);
      btn.addEventListener("click", function(){
        var open = nav.classList.toggle("open");
        btn.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    /* ---- 2) Universal "New search" reset on every tool page ---- */
    var card = document.querySelector(".tool-card");
    var result = document.getElementById("result");
    var actions = card ? card.querySelector(".tool-actions") : null;
    if (card && result && actions && !document.getElementById("resetBtn")) {
      var rb = document.createElement("button");
      rb.id = "resetBtn"; rb.type = "button";
      rb.className = "btn ghost";
      rb.style.display = "none";
      rb.textContent = "\u2715 New search";
      actions.appendChild(rb);
      var mo = new MutationObserver(function(){
        if (result.classList.contains("show")) rb.style.display = "inline-flex";
      });
      mo.observe(result, { attributes: true, attributeFilter: ["class"] });
      rb.addEventListener("click", function(){
        card.querySelectorAll("input[type=text]").forEach(function(i){ i.value = ""; });
        result.classList.remove("show");
        rb.style.display = "none";
        var status = card.querySelector("p[id$='tatus']"); if (status) status.textContent = "";
        window.scrollTo({ top: 0, behavior: "smooth" });
        var first = card.querySelector("input[type=text]"); if (first) first.focus();
      });
    }

    /* ---- 3) Quick picks inside the tool card (mobile-visible suggestions) ---- */
    var mid = document.getElementById("middleName");
    var pills = document.querySelectorAll("main .name-pills .name-pill, .wrap.narrow .name-pills .name-pill");
    if (card && mid && actions && pills.length >= 6 && !card.querySelector(".quick-picks")) {
      var qp = document.createElement("div");
      qp.className = "name-pills quick-picks";
      var label = document.createElement("p");
      label.style.cssText = "width:100%;margin:14px 0 2px;font-size:0.78rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-soft);";
      label.textContent = "Quick picks \u2014 tap to test";
      qp.appendChild(label);
      Array.prototype.slice.call(pills, 0, 10).forEach(function(p){
        var c = document.createElement("button");
        c.className = "name-pill"; c.type = "button";
        c.textContent = p.textContent;
        c.addEventListener("click", function(){
          mid.value = c.textContent;
          var go = document.getElementById("checkBtn");
          var f = document.getElementById("firstName"), l = document.getElementById("lastName");
          if (go && f && l && f.value.trim() && l.value.trim()) go.click();
          else if (f && !f.value.trim()) f.focus();
          else if (l) l.focus();
        });
        qp.appendChild(c);
      });
      actions.after(qp);
    }
  });
})();
