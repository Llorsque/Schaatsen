# Schaatseb — Head to Head (v3)

**Fixes**
- Parser segmenteerde eerder fout door `[^wrd]+?` (dit brak o.a. op namen als **Woelders**). Nu gebruiken we `([\s\S]*?)` tot de volgende `wt|rd` → werkt op varianten met dezelfde kolommen.
- UI nog groter; alles schaalt binnen het **16:9** frame. Stel `--ui-scale` in `styles.css` bij naar smaak.

**Gebruik**
Bestanden vervangen, hard refresh, PDF uploaden. Als het nog hapert, open het *Debug* blok en deel de tekst daar; dan finetunen we de laatste regex.
