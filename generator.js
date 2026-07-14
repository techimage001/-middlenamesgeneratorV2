/* ==========================================================
   Middle Names Generator — suggestion engine
   Generates middle name candidates and scores each one with
   the NTF flow engine against the user's actual first name
   and surname. Runs entirely in the browser.
   ========================================================== */

const MNG = (() => {

  const POOLS = {
    girlShort: ["Rose","Grace","Mae","Wren","Claire","Pearl","Jane","Quinn","Faye","Belle","Skye","June","Blair","Sage","Beth","Kate","Bree","Tess","Hope","Joy","Fern","Paige","Brooke","Dawn","Maeve","Ruth","Blythe","Eve"],
    girlTwo: ["Harper","Willow","Violet","Hazel","Margot","Daisy","Poppy","Freya","Josie","Winter","Juno","Marnie","Robyn","Greta","Maisie","Luna","Nova","Clara","Flora","Sylvie","Esme","Ivy"],
    girlLong: ["Genevieve","Rosalind","Marguerite","Josephine","Florence","Beatrice","Catherine","Penelope","Seraphina","Elizabeth","Alexandra","Evangeline","Isadora","Rosemary","Gabriella","Victoria"],
    boyShort: ["James","Finn","Gray","Jack","Cole","Blake","Rhys","Kai","Beau","Miles","Seth","Dean","Luke","Max","Cruz","John","Paul","Reid","Scott","Tate","Wade","Hugh","Grant"],
    boyTwo: ["Michael","Thomas","Harris","Robert","Declan","Jasper","Felix","Hugo","Rowan","Callum","Lewis","Brodie","Arthur","Edward","Henry","Oscar","Rory","Angus","Fraser","Elliot"],
    boyLong: ["Theodore","Sebastian","Gabriel","Benjamin","Frederick","Zachary","Montgomery","Nathaniel","Christopher","Alexander","Emmanuel","Solomon","Barnaby","Atticus","Harrison"],
    neutral: ["Jordan","Riley","Avery","Morgan","Taylor","Emerson","Ellis","Marlowe","Remy","Shea"]
  };

  function poolFor(gender) {
    if (gender === "girl") return [].concat(POOLS.girlShort, POOLS.girlTwo, POOLS.girlLong, POOLS.neutral);
    if (gender === "boy")  return [].concat(POOLS.boyShort, POOLS.boyTwo, POOLS.boyLong, POOLS.neutral);
    return [].concat(POOLS.girlShort, POOLS.girlTwo, POOLS.girlLong, POOLS.boyShort, POOLS.boyTwo, POOLS.boyLong, POOLS.neutral);
  }

  function bestReason(res) {
    // Prefer the rhythm note; fall back to transitions.
    const rhythm = res.checks.find(c => c.ok && c.title.toLowerCase().includes("rhythm"));
    if (rhythm) return "Rhythm " + res.sylCounts.join("\u2013") + " \u2014 natural cadence";
    const clean = res.checks.find(c => c.ok && c.title.includes("transitions"));
    if (clean) return "Clean sound transitions throughout";
    return "Flows well with your surname";
  }

  function warningFor(res) {
    const warn = res.checks.find(c => !c.ok);
    return warn ? warn.title : null;
  }

  function generate(firstName, lastName, gender, count) {
    count = count || 12;
    const f = (firstName || "").trim(), l = (lastName || "").trim();
    if (!f || !l) return [];
    const seen = new Set([f.toLowerCase(), l.toLowerCase()]);
    const scored = [];
    poolFor(gender).forEach(cand => {
      const key = cand.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const res = NTF.flowScore(f, cand, l);
      scored.push({
        name: cand,
        score: res.score,
        syl: res.sylCounts.join("\u2013"),
        reason: bestReason(res),
        warning: warningFor(res),
        initials: NTF.checkInitials(f, cand, l).map(r => r.letters).join("  \u00B7  ")
      });
    });
    // Sort by score desc; shuffle within equal scores for variety on regenerate
    scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
    return scored.slice(0, count);
  }

  return { generate, POOLS, poolFor };
})();
