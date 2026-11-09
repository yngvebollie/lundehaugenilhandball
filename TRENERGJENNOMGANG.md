# Trenerens arbeidsdag: vurdering og neste prioriteringer

Gjennomgått 9. november 2026. Vurderingen gjelder trenerens brukerflyt i betaversjonen, ikke en sikkerhetsrevisjon, en klinisk vurdering eller en gjennomgang av ekte spillerjournaler.

| Prioritet | Observasjon | Forslag og akseptansekriterium |
| --- | --- | --- |
| 1 | En kamp med passert dato uten sluttresultat faller mellom «Spilte» og «Kommende». Den første listen krever fullført kamp, den andre dato fra og med i dag. Se `src/features/beta/kamper.tsx:32`. | Legg til «Avventer resultat» med siste synk og handlingene **Hent på nytt** og **Åpne rapport**. Test i går, i dag, utsatt og ferdig. En uavklart kamp skal aldri forsvinne eller telle som et tap. |
| 2 | «I dag» fungerer godt som startpunkt, men alle treningsrader sender treneren til samme ukeplan. De tar ikke med økt, dato eller deltakere. Se `src/features/beta/coach-agenda.tsx:20`. | Klikk på tirsdagens økt skal åpne akkurat den økten med riktig lag, mottakere og dato. Dersom raden består av flere individuelle tildelinger, vis listen fremfor å velge én vilkårlig utøver. |
| 3 | Belastningsoversikten skiller allerede mellom plan, bekreftet og ukjent. Men for å finne hvem som trenger en samtale må treneren velge én spiller om gangen. Importert terminliste er heller ikke automatisk individuell spilletid. Se `src/features/beta/activity-load.tsx:16`. | Vis én rad per spiller med planlagt, bekreftet, antall ubekreftede aktiviteter og endring fra forrige uke. La treneren åpne kildene, inkludert gym og kamp. Ikke gi en grønn «alt i orden» når data mangler, og ikke beregn skaderisiko fra disse tallene alene. |
| 4 | «Workout builder», «Weekly planner», «Øktplanlegger» og «Øvelsesbank» er fire innganger rundt samme oppgave. Spilleren har dessuten forskjellige bunnmenyer i økt- og utviklingsvisningen. Se `src/features/beta/workspace.tsx:80`. | Behold forskjellen mellom styrke og håndballøkt, men start begge i **Ukeplan → Ny økt**. Samme mottakervalg, forhåndsvisning og publiseringsstatus. Behold valgt lag og uke ved retur. Bruk samme navigasjon for utøveren på alle sider. |
| 5 | Oppfølging ligger i aktivitetsstrøm, meldinger, øvelsesvurderinger og utviklingsmål. En vurdering på 2/5 sier heller ikke alene om øvelsen var vanskelig eller lite nyttig. Se `src/features/beta/activity-feed.tsx:5` og `src/features/beta/coach-ratings.tsx:10`. | Lag en liten **Til oppfølging**-liste: «Ber om vurdering», «Økt opplevdes hard», «Viktig melding ikke lest». Lenke til spiller og hendelse, knapp for fulgt opp. Behold den kronologiske strømmen og skill opplevd belastning fra stjerner. |
| 6 | Det er lett å forveksle ny treningsgruppe med nytt spillelag i en serie. Passordhjelp ligger under «Staff & roster permissions», også når det er en utøver som trenger hjelp. Se `src/features/beta/team-tools.tsx` og `src/features/beta/team-staff.tsx`. | Navngi handlingene **Ny treningsgruppe**, **Legg til spillelag i sesongen** og **Hjelp med innlogging**. Vis alltid målgruppen før publisering. Test at en vanlig trener kan invitere en spiller fra mobil uten å havne i oppsett for ny klubb, serie eller trenerrolle. |

## Det som bør beholdes

- Ukeplanen kan sammenligne uker; treneren kan justere et forslag før det blir trening. Gjenbruk av maler sparer arbeid uten å ta avgjørelsen fra treneren.
- Kamprapporten kan forhåndsvises, korrigeres og eksporteres. Hold rapportert statistikk, trenerens egne registreringer og liveanalysen tydelig adskilt.
- «Min utvikling» skiller mellom antall øvinger og trenerbekreftet mestring. Det gir en bedre spillersamtale enn å sidestille flittig registrering med sportslig fremgang.
- Anonymliste i utfordringer, egne spillerønsker på banen og private trenernotater har ulike målgrupper. Ikke gjør dem til én felles lagfeed.

## Pilot før neste utrulling

1. En ny trener inviterer én utøver, velger riktig spillelag og publiserer en økt til tre utvalgte spillere. Kontroller mottakerne på en spillermobil.
2. Treneren åpner en kamp uten resultat, sammenligner to rapporter og finner spillernes statistikk på J13 bredde og J14 A-serie hver for seg.
3. Etter en uke med skolegym, trening og kamp finner treneren hva som faktisk er registrert, velger én spiller og følger opp. Spør hva treneren måtte lete etter; ikke bare om oppgaven til slutt lot seg gjøre.

## Verifisering

Isolerte nettlesertester med eksempeldata dekket invitasjoner, ukeplan/program, øktpublisering og mottakere, øvelsesvurderinger og belastning, kamprapport med retting og PDF, keeper/liveanalyse, utviklingsmål, merker og utfordringer. Ukeplantesten ble oppdatert til dagens meny, kamptesten fikk fast dato for sin eksempelterminliste og utfordringstesten fikk dagens temafarge. Dette bekrefter ikke historiske lagresultater, ekte e-postlevering eller tilgang til en ekstern NIF-tjeneste.
