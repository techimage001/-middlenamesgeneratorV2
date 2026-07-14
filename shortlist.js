/* Shortlist + share utilities. localStorage wrapped so private browsing degrades gracefully. */
const NTFS = (() => {
  const KEY = "mng_shortlist";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch(e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30))); } catch(e) {} }
  function add(item) {
    const list = load();
    if (!list.some(x => x.full === item.full)) { list.push(item); save(list); }
    return load();
  }
  function remove(full) { save(load().filter(x => x.full !== full)); return load(); }
  function has(full) { return load().some(x => x.full === full); }
  async function copy(text, doneEl) {
    try { await navigator.clipboard.writeText(text); if (doneEl) { const t = doneEl.textContent; doneEl.textContent = "✓"; setTimeout(()=>doneEl.textContent=t, 1200); } }
    catch(e) { window.prompt("Copy the name:", text); }
  }
  function share(text) {
    const payload = { title: "Baby name shortlist", text: text + "\n\nTested on https://middlenamesgenerator.com" };
    if (navigator.share) { navigator.share(payload).catch(()=>{}); }
    else { window.open("https://wa.me/?text=" + encodeURIComponent(payload.text), "_blank", "noopener"); }
  }
  return { load, add, remove, has, copy, share };
})();
