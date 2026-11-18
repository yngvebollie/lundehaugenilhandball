# Oppfolgingsforslag - 18.11.2026

## Omfang

Trenerens Oversikt og spillerprofil viser samme forslag, avgrenset til
aktivt lag og valgt spiller. Filtre: Alle, Mal, Vurderinger, Aktivitet.
Eksisterende rosa/morke stil viderefores. Ingen nye tabeller eller migreringer.

Forslagene er regelbaserte, ikke en AI-vurdering av spilleren:
- Avtalte aktive mal som venter pa vurdering, har nadd vurderingsdato,
  eller har registrert avtalt antall ovinger. Antall bekrefter ikke mestring.
- Ovelsesvurderinger pa 1-2 av 5 siste 30 dager. Nyeste versjon brukes;
  hvis ovelsen har samme ID som i et aktivt mal, vises sammenhengen.
  Tekstlikhet brukes ikke til a gjette koblingen.
- Eksplisitt registrert ikke-deltakelse eller hard/svaert hard intensitet
  siste sju dager. Ingen registrering tolkes ikke som fravaer.

Hvert forslag har konkret kildegrunnlag og lenke til maldetaljer,
spillerens vurderinger, plan/gjennomforing eller belastning.
Utviklingslenker stotter na goal-parametret, men bare mal som eksisterende
tilgangskontroll returnerer kan apnes. Ingen planer, meldinger eller merker
endres ved a lese eller apne et forslag.

## Tilgang og feil

Komponenten monterer ikke datalesingen for utoverrollen. Rene beregninger
avviser ogsa utoverrollen og andre lags spillere. Eksisterende API/RPC-er
med brukerens tilgang gjenbrukes; ingen service-nokkel eller ny tilgang.
Utviklingsplaner hentes med maksimalt tre samtidige foresporsler.
Delvis feil navngir den manglende kilden og tilbyr ny innlasting. En feil
vises aldri som at ingen oppfolging er nodvendig. Fokus og oppdater-knapp
henter nye vurderinger/mal. Ingen utholdenhets- eller helsedose anbefales.

## Testet

- pnpm build: produksjonsbygg og typer.
- coach-suggestions.mjs: rolle/lag/spiller, tidsvinduer, korreksjoner,
  deduplisering, mallivssyklus, framtidige og tilbaketrukne ovinger.
- coach-suggestions.cjs: Oversikt/profil, filtre, kildegrunnlag, mal- og
  vurderingslenker, ingen utilsiktede skriv, feil/retry, korrigert vurdering,
  360/390 px og utoverens isolerte visning.
- training-journey.cjs: planlegg/publiser/registrer/folg opp.
- shared-history.cjs og coach-experience.cjs: feed og trenernavigasjon.
- development.mjs: mallivssyklus og lokal SQL-test av tilgang, privat innhold,
  atomiske endringer og idempotente belonninger.

Nettlesertestene bruker isolerte demodata, ikke ekte utoverskriv i produksjon.
Skjermbildet er kontrollert pa mobilbredde. Fysisk telefon og faktisk
epostlevering er egne gjenstaende tester.
