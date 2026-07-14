/* ==========================================================
   Middle Names Generator — feature engine (nicknames, misread risk)
   Runs entirely in the browser. Nothing stored or sent.
   ========================================================== */

const NTFX = (() => {

  /* ---------- Known nickname map (extend freely) ---------- */
  const NICKMAP = {
    alexander:["alex","xander","lex","sandy"], alexandra:["alex","lexi","sasha","sandy"],
    abigail:["abby","gail"], amelia:["amy","mia","millie"], andrew:["andy","drew"],
    anthony:["tony","ant"], arabella:["bella","ari"], archibald:["archie"],
    benjamin:["ben","benny","benji"], beatrice:["bea","trixie"], bernard:["bernie"],
    catherine:["cat","cathy","kate","katie"], charlotte:["charlie","lottie","char"],
    christopher:["chris","kit","topher"], daniel:["dan","danny"], david:["dave","davy"],
    dorothy:["dot","dottie","thea"], edward:["ed","eddie","ted","ned"],
    eleanor:["ellie","nell","nora","lena"], elizabeth:["liz","lizzie","beth","betty","eliza","libby"],
    emily:["em","emmy"], emmanuel:["manny"], evangeline:["evie","eva","angie"],
    florence:["flo","florrie","flossie"], francesca:["fran","frankie","chessie"],
    frederick:["fred","freddie"], gabriel:["gabe"], gabriella:["gabby","ella","brie"],
    genevieve:["gen","evie","vivi"], george:["georgie"], georgia:["georgie","gia"],
    gregory:["greg"], harrison:["harry"], henrietta:["hettie","etta"], henry:["harry","hank"],
    isabella:["bella","izzy","issy"], isabelle:["izzy","belle"], jacob:["jake","coby"],
    james:["jim","jimmy","jamie"], jennifer:["jen","jenny"], jessica:["jess","jessie"],
    jonathan:["jon","jonny"], joseph:["joe","joey"], joshua:["josh"],
    josephine:["jo","josie","posy"], katherine:["kate","katie","kat","kitty"],
    lawrence:["larry","laurie"], leonard:["leo","lenny"], lillian:["lily","lil"],
    madeleine:["maddie","mads"], margaret:["maggie","meg","peggy","greta","daisy"],
    matilda:["tilly","mattie"], matthew:["matt","matty"], maximilian:["max"],
    michael:["mike","mickey","mick"], nathaniel:["nate","nat","nathan"],
    nicholas:["nick","nicky","cole"], oliver:["ollie","ol"], olivia:["liv","livvy","ollie"],
    patricia:["pat","trish","patsy"], penelope:["penny","nell","poppy"],
    peter:["pete"], philippa:["pippa","pip"], rebecca:["becca","becky"],
    richard:["rich","rick","ricky","dick"], robert:["rob","robbie","bob","bobby","bert"],
    samantha:["sam","sammy"], samuel:["sam","sammy"], sebastian:["seb","bastian"],
    stephanie:["steph","stevie"], theodore:["theo","ted","teddy"],
    thomas:["tom","tommy"], timothy:["tim","timmy"], valentina:["val","tina","lena"],
    victoria:["vicky","tori","vic"], vincent:["vince","vinny"],
    virginia:["ginny","ginger"], william:["will","willy","bill","billy","liam"],
    winifred:["winnie","freddie"], zachary:["zach","zack"]
  };

  function nicknames(name) {
    const n = (name || "").trim().toLowerCase();
    if (!n) return { known: [], generated: [] };
    const known = NICKMAP[n] || [];
    const generated = [];
    if (!known.length && n.length >= 5) {
      // Generic English shortening patterns
      const stem = n.slice(0, 4).replace(/[aeiou]+$/, "");
      const short = n.slice(0, 3).replace(/[aeiou]+$/, n.charAt(2));
      if (short.length >= 2) generated.push(short);
      if (stem.length >= 3 && stem !== short) generated.push(stem + (/[aeiouy]$/.test(stem) ? "" : "ie"));
    }
    const capList = arr => arr.map(x => x.charAt(0).toUpperCase() + x.slice(1));
    return { known: capList(known), generated: capList(generated) };
  }

  /* ---------- Misread / mispronunciation risk ---------- */
  const RISK_PATTERNS = [
    { re: /ky|cy(?![aeiou])/i, why: "\u201Cky/cy\u201D can be read two ways (Kyan famously gets \u201Ccayenne\u201D)" },
    { re: /ough/i, why: "\u201Cough\u201D has at least six pronunciations in English" },
    { re: /ae|ea(?=[^rl]|$)/i, why: "vowel pairs like \u201Cae/ea\u201D split readers between long and short sounds" },
    { re: /eigh/i, why: "\u201Ceigh\u201D reads as \u201Cay\u201D or \u201Cee\u201D depending on the reader" },
    { re: /^x|x(?=[aeiou])/i, why: "a leading or vowel-adjacent \u201Cx\u201D gets read as \u201Cz\u201D, \u201Cks\u201D or \u201Csh\u201D" },
    { re: /si(?=[aeiou])|ci(?=[aeiou])/i, why: "\u201Csi/ci\u201D before a vowel splits into \u201Csh\u201D vs \u201Css\u201D readings" },
    { re: /gh(?!$)/i, why: "internal \u201Cgh\u201D is silent for some readers, hard for others" },
    { re: /([a-z])\1{2,}/i, why: "tripled letters make readers stall and second-guess" },
    { re: /(?:aa|ii|uu)/i, why: "doubled vowels are read with different lengths by different readers" },
    { re: /j(?=[aeiou])/i, why: "\u201Cj\u201D reads as English J, Spanish H or Scandinavian Y depending on the reader", soft: true },
    { re: /ei|ie/i, why: "\u201Cei/ie\u201D order is misheard and misspelled constantly (think Keira/Kiera)", soft: true }
  ];

  function misreadRisk(name) {
    const n = (name || "").trim();
    if (!n) return { level: "none", reasons: [] };
    const reasons = [];
    let hard = 0, soft = 0;
    RISK_PATTERNS.forEach(p => {
      if (p.re.test(n)) { reasons.push(p.why); p.soft ? soft++ : hard++; }
    });
    let level = "low";
    if (hard >= 2 || (hard >= 1 && soft >= 1)) level = "high";
    else if (hard === 1 || soft >= 2) level = "medium";
    return { level, reasons };
  }

  return { nicknames, misreadRisk };
})();
