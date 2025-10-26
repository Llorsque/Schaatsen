# Schaatseb — Head to Head (v2)

**Wat is nieuw**
- **Groter UI** in een **16:9 frame** dat automatisch schaalt. Alles is ~22% groter (pas `--ui-scale` aan in `styles.css`).
- **Algemene parser** die:
  - `wt`/`rd` segmenten vindt, ongeacht regelafbrekingen;
  - optioneel **rugnummer** ondersteunt;
  - **categorie** met letters/cijfers herkent (1–6 tekens);
  - **NAT** (3 hoofdletters) oppikt;
  - **1–3 tijden** slikt (met **komma of punt** als decimaal);
  - PR/ST/Tijd mapt in die volgorde;
  - paren maakt op volgorde: 1e wt + 1e rd ⇒ Rit 1, etc.

**Gebruik**
1. Upload je PDF met ritindeling.
2. Navigeer met ◀ ▶ of de rit-pilltjes.

> Tip: wil je nog groter? Zet in `styles.css` `--ui-scale` bijvoorbeeld op `1.35`.
