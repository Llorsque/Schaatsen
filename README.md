# Schaatseb — Head to Head (PDF → H2H)

Een lichte, **static** webtool (geschikt voor GitHub Pages) om schaatsritten uit een **PDF-loting** te visualiseren als head-to-head: **wit links** en **rood rechts**. Inclusief **Vorige/Volgende** knoppen in het midden en **ritnummer** altijd in beeld.

## Features
- PDF upload → client-side parsing met [pdf.js].
- Titel (wedstrijd) en afstand automatisch uit de PDF.
- Head-to-head kaartjes met: **Naam, Cat, Land, PR, ST, Tijd**.
- Ritnavigatie (knoppen en pijltjestoetsen).
- Selecteer rit via pill-overzicht.
- Werkt volledig in de browser; geen server nodig.

> Parser is afgestemd op de indeling in jouw voorbeeld-PDF (kolommen *Naam, Cat, Land, PR, ST, Tijd*, en per rit: een regel `wt …` en een regel `rd …`), zoals o.a. “World Cup Kwalificatietoernooi” en “Mannen 5000m” voorkomen.  
> Als de brondocumenten in de toekomst licht afwijken, kun je de regex/heuristiek in `parseSkaterLine()` of `parseText()` eenvoudig aanpassen.

## Snel starten (GitHub Pages)
1. Maak een nieuwe repo, bijv. `schaatseb-h2h`.
2. Voeg deze vier bestanden toe: `index.html`, `styles.css`, `app.js`, `README.md`.
3. Zet **GitHub Pages** aan (Settings → Pages → Deploy from branch → `main` / root).
4. Bezoek de Pages-URL, klik **PDF uploaden**, kies je lotings-PDF.

## Handmatig draaien
Open `index.html` in een moderne browser. (Voor lokale `file://` gebruik kan CORS pdf.js hinderen; via een klein local servertje zoals `python -m http.server` werkt het altijd.)

## Structuur
- `index.html` — UI, laadt pdf.js en `app.js`.
- `styles.css` — Minimalistische UI met jouw kleuren (#212945 en #52E8E8).
- `app.js` — PDF lezen, tekst parsen, state + render.

## Bekende aannames
- Elke rit heeft **exact** één `wt`-regel en één `rd`-regel.
- Tijden staan als `mm:ss.xx`. We mappen **eerste** tijd → **PR**, **tweede** → **ST**, **derde** → **Tijd** (indien aanwezig).
- Landcode is **3 letters** (bijv. `NED`) en staat direct vóór de tijden; de **categorie** staat direct vóór de landcode.
- Ritten zijn genummerd met een **los nummer op eigen regel**.

## Aanpassen / uitbreiden
- Extra metadata tonen? Vul `state.meta.extras` in `parseText()` aan (datum/locatie worden al opgepikt als aanwezig).
- Meer velden per rijder? Voeg een `<div class="row">` toe in `index.html` en vul die in `fillCard()`.

## Licentie
MIT
