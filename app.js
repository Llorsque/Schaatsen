/**
 * Schaatseb — Head to Head (robust parser)
 * - Leest tekst uit geüploade PDF met pdf.js
 * - Parser is toleranter voor spaties/enter-variaties en ontbrekende 'rit' kopjes
 * - Pairt 'wt' en 'rd' in volgorde als fallback en nummert ritten 1..N
 */

const els = {
  input: document.getElementById("pdfInput"),
  status: document.getElementById("status"),
  eventTitle: document.getElementById("eventTitle"),
  distance: document.getElementById("distance"),
  extras: document.getElementById("extras"),
  leftCard: document.getElementById("leftCard"),
  rightCard: document.getElementById("rightCard"),
  prev: document.getElementById("prevHeat"),
  next: document.getElementById("nextHeat"),
  heatNo: document.getElementById("heatNumber"),
  heatList: document.getElementById("heatList"),
  debugBox: document.getElementById("debugBox"),
  debugText: document.getElementById("debugText"),
};

let state = {
  heats: [],        // [{no, wt:{...}, rd:{...}}]
  meta: { event:"—", distance:"—", extras: "" },
  idx: 0
};

els.input.addEventListener("change", onFile);
els.prev.addEventListener("click", () => go(-1));
els.next.addEventListener("click", () => go(+1));
window.addEventListener("keydown", e => {
  if(e.key === "ArrowLeft") go(-1);
  if(e.key === "ArrowRight") go(+1);
});

function go(delta){
  if(!state.heats.length) return;
  state.idx = (state.idx + delta + state.heats.length) % state.heats.length;
  render();
}

async function onFile(ev){
  const file = ev.target.files?.[0];
  if(!file){ return; }
  try{
    setStatus("PDF laden…");
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: buf}).promise;

    let text = "";
    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      // Combineer alle items met spaties (betere robuustheid dan harde newlines)
      const pageText = tc.items.map(t => (t.str||"")).join(" ");
      text += " " + pageText;
    }
    setStatus("PDF gelezen. Parser draaien…");
    parseText(text);
    buildHeatList();
    state.idx = 0;
    render();
    setStatus(`Klaar. Gevonden ritten: ${state.heats.length}`);
  }catch(err){
    console.error(err);
    setStatus("Kon PDF niet verwerken. Mogelijk is dit een gescande/afbeelding-PDF (geen tekst).");
    showDebug(String(err));
  }
}

function setStatus(msg){ els.status.textContent = msg; }
function showDebug(s){ els.debugBox.hidden = false; els.debugText.textContent = s; }

/**
 * Parsing strategy (robuust):
 * 1) Metadata: losse regexen op de samengevoegde tekst.
 * 2) Vind alle 'wt <bib> <naam...> <cat> <land> <tijden>' en 'rd ...' met flexibele regex.
 * 3) Pair in volgorde (wt1+rd1 => rit1, etc.). Als een ritnummer gevonden wordt, gebruiken we dat,
 *    anders nummeren we lineair.
 */
function parseText(text){
  // normaliseer whitespace
  let norm = text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g," ")
    .replace(/\s{2,}/g," ")
    .trim();

  // metadata
  const eventMatch =
    norm.match(/World\s*Cup.*?Kwalificatie.*?Toernooi|Kwalificatie.*?Toernooi|World\s*Cup.*?Toernooi/i);
  const distanceMatch =
    norm.match(/(Mannen|Vrouwen)\s*\d{3,5}m/i);

  state.meta.event = eventMatch ? tidy(eventMatch[0]) : "Wedstrijd";
  state.meta.distance = distanceMatch ? tidy(distanceMatch[0]) : "Afstand";

  const extraHints = [];
  const thialf = norm.match(/Thialf.*?Heerenveen/i);
  const dateTime = norm.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}).{0,10}\b\d{1,2}:\d{2}(:\d{2})?/i);
  if(dateTime) extraHints.push(tidy(dateTime[0]));
  if(thialf) extraHints.push(tidy(thialf[0]));
  state.meta.extras = extraHints.join(" · ");

  // Alle wt/rd lijnen (flexibel):
  const rxEntry = /\b(wt|rd)\s+(\d+)\s+(.+?)\s+([A-ZÄÖÜ]{1,5}\d?)\s+([A-Z]{3})\s+((?:\d{1,2}:\d{2}\.\d{2}\s*){1,3})/gi;
  const entries = [];
  let m;
  while((m = rxEntry.exec(norm))){
    const lane = m[1].toLowerCase();
    const bib = m[2];
    const name = tidy(m[3]);
    const cat = m[4];
    const nation = m[5];
    const times = tidy(m[6]).split(/\s+/);
    const [pr="", st="", raceTime=""] = [times[0]||"", times[1]||"", times[2]||""];
    entries.push({ lane, bib, name, cat, nation, pr, st, time: raceTime });
  }

  // Pair wt & rd in volgorde
  const heats = [];
  let wtQ = entries.filter(e=>e.lane==="wt");
  let rdQ = entries.filter(e=>e.lane==="rd");
  const n = Math.min(wtQ.length, rdQ.length);
  for(let i=0;i<n;i++){
    heats.push({ no: i+1, wt: wtQ[i], rd: rdQ[i] });
  }

  state.heats = heats;
}

function tidy(s){ return s.replace(/\s+/g," ").trim(); }

function render(){
  // meta
  els.eventTitle.textContent = state.meta.event || "—";
  els.distance.textContent = state.meta.distance || "—";
  els.extras.textContent = state.meta.extras || "";

  // heat
  if(!state.heats.length){
    els.heatNo.textContent = "—";
    clearCard(els.leftCard);
    clearCard(els.rightCard);
    return;
  }
  const heat = state.heats[state.idx];
  els.heatNo.textContent = String(heat.no);

  fillCard(els.leftCard, heat.wt);
  fillCard(els.rightCard, heat.rd);

  // active pill styling
  [...document.querySelectorAll(".heat-pill")].forEach(p=>{
    p.classList.toggle("active", Number(p.dataset.no) === heat.no);
  });
}

function clearCard(card){
  card.querySelectorAll("[data-field]").forEach(el => el.textContent = "");
}

function fillCard(card, data){
  card.querySelector('[data-field="name"]').textContent = data.name || "";
  card.querySelector('[data-field="cat"]').textContent = data.cat || "";
  card.querySelector('[data-field="nation"]').textContent = data.nation || "";
  card.querySelector('[data-field="pr"]').textContent = data.pr || "";
  card.querySelector('[data-field="st"]').textContent = data.st || "";
  card.querySelector('[data-field="time"]').textContent = data.time || "";
}

function buildHeatList(){
  const wrap = els.heatList;
  wrap.innerHTML = "";
  if(!state.heats.length){ wrap.hidden = true; return; }
  wrap.hidden = false;

  for(const h of state.heats){
    const pill = document.createElement("button");
    pill.className = "heat-pill";
    pill.type = "button";
    pill.dataset.no = String(h.no);
    pill.innerHTML = `<strong>Rit ${h.no}</strong> <span>${h.wt?.name ?? ""} vs ${h.rd?.name ?? ""}</span>`;
    pill.addEventListener("click", ()=>{
      const idx = state.heats.findIndex(x=>x.no===h.no);
      if(idx>-1){ state.idx = idx; render(); }
    });
    wrap.appendChild(pill);
  }
}
