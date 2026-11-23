# Backlogg: Analyse av motstandere

**Status 23.11.2026:** Register og kampanalyse er implementert under **Kamper → Motstandere**. Synk i produksjon må kontrolleres med en innlogget trenerøkt.

## Flyt

1. Velg **Legg til motstander**. Lim inn lagets lenke fra terminlisten på handball.no eller tallet etter `lagid=`. Valgfritt kan treneren velge sesong og avgrense med turneringslenker eller ID-er etter `turnid=`, på samme måte som ved tilkobling av egne NHF-lag.
2. Vis lagnavn, sesong og turneringer før lagring. Marker et lag som allerede er registrert for samme sesong, og åpne det eksisterende oppsettet.
3. Hent kamper, resultater og offentlige hendelser på lagnivå. Vis antall hentet, tidspunkt for siste synk og hvilke kamper som mangler pause- eller hendelsesdata. Gjenta synk uten å opprette duplikater.
4. Åpne motstanderprofilen fra registeret eller fra et kommende oppgjør. Filtrer på sesong, turnering, hjemme/borte og siste 5, 10 eller alle spilte kamper. Vis oppgjørene bak tallene med lenker til kilden eller den eksisterende kampsiden.

## Analyse

| Visning | Hva treneren får |
| --- | --- |
| Form og resultat | Seier, uavgjort og tap, mål for og imot og trend over tid. Egne innbyrdes oppgjør kan velges som eget utvalg. |
| Pause og fulltid | Hvor ofte motstanderen vinner etter ledelse, lik stilling eller underlege til pause. Se overganger mellom pause og fulltid og hvilke oppgjør de kommer fra. |
| Kampfaser og måltempo | Mål for og imot per fem spilleminutter, start etter pause og lengste måltørke. Sammenlign eventuelt med eget lag over samme sesong og med synlig antall kamper. |
| Målrekker og respons | Hvor ofte motstanderen scorer eller slipper inn 3, 4 og 5+ på rad, hvordan kampene ender og hvor raskt laget scorer igjen. |
| Kampforberedelse | Tre konkrete, etterprøvbare observasjoner med kildekamper. Eksempel: «Motstanderen slapp inn flest mål de første fem minuttene etter pause i dette utvalget. Se de tre kampene før vi velger åpningsgrep.» |

Vis antall kamper bak hver beregning. Ved manglende hendelser vises resultatene som finnes. Måltempo sier hvor ofte det scores. Angrepstempo, sjansekvalitet og årsaker vurderes først når skudd, angrep, video eller andre relevante data finnes.

## Implementering og akseptanse

1. Lagre motstanderregistreringer per aktiv treningsgruppe, sesong og NHF-lag-ID. Bruk eksisterende ID-validering, sesongvalg og mønster for synk. Sørg for at hver treningsgruppe bare ser sitt eget register.
2. Gjenbruk NHF-importen med egne koblinger for motstanderkamper. Dedupliser oppgjør på NHF-kamp-ID og behold perspektivet til motstanderen, også når laget er bortelag. Hvis et oppgjør allerede finnes blant egne kamper, lenk til det og behold den manuelle loggen som foretrukket kilde der den finnes.
3. Gjenbruk beregningene for pause, femminuttersintervaller og målrekker. Test særlig bortelag, kamper mellom to registrerte motstandere, ufullstendige logger og samme kamp i flere turneringsutvalg.
4. Lever register og formsammendrag først. Legg deretter til kampfaser, målrekker og kampforberedelse når hendelsesdekningen er synlig. Verifiser at to synk gir samme antall oppgjør, at kampgrunnlaget stemmer med grafene og at motstanderregistreringer ikke påvirker egne sesongtall.

## Videre oppfølging

- Kontroller to synk av samme motstander i en isolert trenerøkt mot NHFs levende feed. Databasetesten dekker unik registrering, og en egen test dekker deduplisering i terminlisten.
- Sammenligning side om side med eget lag er en mulig utvidelse. Dagens visning har filter for innbyrdes kamper og egne kampanalyser i nabofanen.
