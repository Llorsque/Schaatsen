# Schaatseb — Head to Head (PDF → H2H) — FIXED PARSER

Deze versie bevat een **robuustere parser**:
- pdf.js leest pagina-tekst met `normalizeWhitespace: true` en voegt **spaties** toe i.p.v. harde enters.
- Regex die `wt` en `rd` entries herkent, zelfs als de PDF de regels anders afbreekt.
- **Fallback pairing**: 1e `wt` met 1e `rd` => rit 1, etc. (ritnummers lineair als ze niet expliciet te vinden zijn).
- Debug-paneel (uitklapbaar) om foutmeldingen te tonen.

Alle overige features zijn gelijk aan de vorige versie.
