# Ugentlig opgave: mest solgte elbiler i Danmark

Denne fil er instruktionen til den planlagte Claude-opgave, der kører hver søndag morgen.
Ret kriterierne her, hvis listen skal se anderledes ud.

## Kriterier
- Kun **elbiler** (100 % el, ingen hybrider).
- De **10 mest solgte elbilmodeller i Danmark** ud fra de nyeste månedlige registreringstal
  (fx Mobility Denmark / bilimp.dk, Danmarks Statistik eller bilmedier, der citerer dem).
- Kun modeller, hvor en almindelig variant har **dansk listepris på højst 450.000 kr.**
  Er en model for dyr, så spring den over og tag den næste på salgslisten.

## Data pr. bil
Brug den mest solgte eller billigste almindelige variant (ikke performance-udgaver) og skriv variantnavnet i `model_navn`.

| Felt | Indhold |
|---|---|
| `model_navn` | Mærke, model og variant, fx "Skoda Elroq 60" |
| `salgsplacering` | 1 = mest solgte |
| `pris` | Aktuel dansk listepris i kr. (heltal) |
| `wltp_km` | WLTP-rækkevidde i km |
| `ladehastighed_kw` | Max DC-ladeeffekt i kW |
| `bagagerum_liter` | Bagagerum i liter (bagsæder oppe) |
| `traek_kg` | Max anhængertræk med bremse i kg (0 hvis ikke godkendt) |
| `rente` | Skøn over billån-rente i % pr. år. Brug 5.9, hvis intet bedre findes |
| `forsikring` | Skøn over kaskoforsikring i kr. pr. **måned**. Brug ca. 0,2 % af prisen, hvis intet bedre findes |
| `ejerafgift` | Grøn ejerafgift for elbil i kr. pr. **måned** (helårsafgift / 12) |
| `kilde_url` | Link til den side, prisen kommer fra (helst producentens danske side) |

Find tallene med websøgning. Gæt ikke på priser – find dem. Kun `rente`, `forsikring` og `ejerafgift` må være skøn.

## Aflevering
1. Skriv listen som et JSON-array til filen `kandidater.json` (uden for git – den skal ikke committes).
2. Kør `python kandidater_upload.py kandidater.json`. Scriptet tjekker data og erstatter de automatiske rækker i Supabase-tabellen `bil_kandidater`.
3. Fejler scriptet på grund af data, så ret dataene og kør igen.
4. Afslut med en kort opsummering: hvilke 10 biler, hvilken måneds salgstal du brugte, og om noget var usikkert.

Commit eller push ikke noget til repoet.
