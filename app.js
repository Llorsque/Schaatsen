/**
 * Schaatseb — Head to Head (v2)
 * - cdnjs pdf.js (global pdfjsLib)
 * - Algemeen robuuste parser voor 'hetzelfde stramien', incl. komma-of-punt seconden
 * - 16:9 frame + grotere UI
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
  if (!window['pdfjsLib']) {
    setStatus("pdf.js kon niet geladen worden. Controleer je internet of CDN.");
    return;
  }
  try{
    setStatus("PDF laden…");
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: buf}).promise;

    let raw = "";
    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      raw += " " + tc.items.map(t => (t.str||"")).join(" ");
    }
    setStatus("PDF gelezen. Parser draaien…");
    parseText(raw);
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
 * Parser die tolerant is voor:
 * - extra/minder spaties, harde of zachte returns
 * - optioneel rugnummer (bib)
 * - categorie varianten (letters+cijfers, lengte 1-6)
 * - decimaal met punt of komma
 * - 1–3 tijden (PR, ST, Tijd)
 * Werkwijze: vind alle segmenten die starten met 'wt' of 'rd', parse ze 'van rechts naar links'.
 */
function parseText(text){
  let norm = text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g," ")
    .replace(/\s{2,}/g," ")
    .trim();

  // metadata (losjes)
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

  // Zoek alle wt/rd starts en pak de 'regel' erna tot de volgende wt/rd
  const segRx = /\b(wt|rd)\b([^wrd]+?)(?=\b(?:wt|rd)\b|$)/gi;
  const segments = [];
  let m;
  while((m = segRx.exec(norm))){
    segments.push({ lane: m[1].toLowerCase(), text: tidy(m[2]) });
  }

  function parseSkaterLoose(s){
    // Tokenize
    const parts = s.trim().split(/\s+/);
    // Vind tijden (mm:ss.xx of mm:ss,xx)
    const timeRx = /^\d{1,2}:\d{2}[.,]\d{2}$/;
    const times = [];
    for(let i=parts.length-1;i>=0;i--){
      if(timeRx.test(parts[i])){
        times.unshift(parts[i].replace(',', '.'));
      } else {
        // stop zodra we over tijd-lijn heen zijn
        if(times.length>0) break;
      }
    }
    const timeCount = times.length;
    const nationIdx = parts.length - timeCount - 1;
    const nation = nationIdx >= 0 ? parts[nationIdx] : "";
    const catIdx = nationIdx - 1;
    const cat = catIdx >= 0 ? parts[catIdx] : "";
    // bib optioneel als eerste token numeriek
    let nameStart = 0;
    let bib = "";
    if(/^\d+$/.test(parts[0])){
      bib = parts[0];
      nameStart = 1;
    }
    const name = parts.slice(nameStart, catIdx >= nameStart ? catIdx : parts.length - timeCount - 1).join(" ");
    const [pr="", st="", raceTime=""] = [times[0]||"", times[1]||"", times[2]||""];
    return { bib, name: tidy(name), cat, nation, pr, st, time: raceTime };
  }

  // Parse alle segmenten en pair wt/rd
  const wtQ = [];
  const rdQ = [];
  for(const seg of segments){
    const rec = parseSkaterLoose(seg.text);
    if(seg.lane === "wt") wtQ.push(rec);
    else rdQ.push(rec);
  }
  const heats = [];
  const n = Math.min(wtQ.length, rdQ.length);
  for(let i=0;i<n;i++){
    heats.push({ no: i+1, wt: wtQ[i], rd: rdQ[i] });
  }
  state.heats = heats;
}

function tidy(s){ return s.replace(/\s+/g," ").trim(); }

function render(){
  els.eventTitle.textContent = state.meta.event || "—";
  els.distance.textContent = state.meta.distance || "—";
  els.extras.textContent = state.meta.extras || "";

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
