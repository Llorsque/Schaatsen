/**
 * Schaatseb — Head to Head (static)
 * - Leest tekst uit geüploade PDF met pdf.js
 * - Parseert heats (rit 1..N) met wt (links) en rd (rechts)
 * - Toont H2H + navigatie + ritnummer
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
      const tc = await page.getTextContent();
      const pageText = tc.items.map(t => t.str).join("\n");
      text += "\n" + pageText;
    }
    setStatus("PDF gelezen. Parser draaien…");
    parseText(text);
    buildHeatList();
    state.idx = 0;
    render();
    setStatus(`Klaar. Gevonden ritten: ${state.heats.length}`);
  }catch(err){
    console.error(err);
    setStatus("Kon PDF niet verwerken. Controleer het bestand en probeer opnieuw.");
  }
}

function setStatus(msg){ els.status.textContent = msg; }

/**
 * Parsing strategy:
 * - Haal metadata (event & afstand) uit globale tekst.
 * - Vind blokken per rit. In je voorbeeld staat elke rit als:
 *   <rit-nummer>\nwt <...>\n\nrd <...>
 * - Parse regels 'wt' en 'rd':
 *   wt|rd <rugnr> <Naam...> <Cat> <Land> <tijd1> <tijd2> <tijd3?>
 *   We mappen tijd1->PR, tijd2->ST, tijd3->Tijd (flexibel: als minder aanwezig, laten we leeg).
 */
function parseText(text){
  // normaliseer whitespace
  let norm = text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g," ")
    .replace(/\n{2,}/g,"\n\n")
    .trim();

  // metadata
  const eventMatch =
    norm.match(/World Cup.*Kwalificatie.*Toernooi|Kwalificatie.*Toernooi|World Cup.*Toernooi/i);
  const distanceMatch =
    norm.match(/(Mannen|Vrouwen)\s+\d{3,5}m/i);

  state.meta.event = eventMatch ? tidy(eventMatch[0]) : "Wedstrijd";
  state.meta.distance = distanceMatch ? tidy(distanceMatch[0]) : "Afstand";

  // optionele extra regels (datum/locatie) als gevonden
  const extraHints = [];
  const thialf = norm.match(/Thialf.*Heerenveen/i);
  const dateTime = norm.match(/Datum:\s*[\d-]{8,}\s+\d{1,2}:\d{2}:\d{2}/i);
  if(dateTime) extraHints.push(tidy(dateTime[0]));
  if(thialf) extraHints.push(tidy(thialf[0]));
  state.meta.extras = extraHints.join(" · ");

  // Heats parse:
  // Zoek een patroon van:
  //   <ritnummer>\nwt ...\n\nrd ...
  const heatBlocks = [];
  // Splits op dubbele newline + ritnummer op eigen regel
  const blocks = norm.split(/\n{2,}(?=\d+\s*\n)/g);

  for(const block of blocks){
    const numMatch = block.match(/^\s*(\d+)\s*$/m);
    const wtMatch = block.match(/^\s*wt\s+(.+)$/mi);
    const rdMatch = block.match(/^\s*rd\s+(.+)$/mi);

    if(numMatch && wtMatch && rdMatch){
      const no = parseInt(numMatch[1],10);
      const wt = parseSkaterLine(wtMatch[1]);
      const rd = parseSkaterLine(rdMatch[1]);
      heatBlocks.push({ no, wt, rd });
    }
  }

  // Sorteren op ritnummer (voor de zekerheid)
  heatBlocks.sort((a,b)=>a.no - b.no);
  state.heats = heatBlocks;
}

function parseSkaterLine(line){
  // Voorbeeldregel:
  // "73 Sil van der Veen HA2 NED 6:35.29 6:35.29"
  // of soms minder tijden: "34 Sjoerd den Hertog HSB NED 6:19.60"
  const parts = line.trim().split(/\s+/);

  // Zoek van rechts naar links voor tijden (mm:ss.xx)
  const times = [];
  for(let i=parts.length-1; i>=0; i--){
    if(/^\d{1,2}:\d{2}\.\d{2}$/.test(parts[i])){
      times.unshift(parts[i]);
    }else{
      break;
    }
  }

  // Land = direct vóór de tijden
  const timeCount = times.length;
  const nationIdx = parts.length - timeCount - 1;
  const nation = nationIdx >= 0 ? parts[nationIdx] : "";

  // Cat = direct vóór Land
  const catIdx = nationIdx - 1;
  const cat = catIdx >= 0 ? parts[catIdx] : "";

  // Rugnummer = allereerste token
  const bib = parts[0];

  // Naam = alles tussen bib en cat
  const name = parts.slice(1, catIdx).join(" ");

  // Map tijden: [PR, ST, Tijd] (vul aan met lege strings als er minder zijn)
  const [pr="", st="", raceTime=""] = [times[0]||"", times[1]||"", times[2]||""];

  return { bib, name: tidy(name), cat, nation, pr, st, time: raceTime };
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
