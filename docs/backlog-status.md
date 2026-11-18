# Backloggstatus 18.11.2026

## Levert i siste milepaeler

- Trenernavigasjon og konkret oppfolging: coach-experience-plan.md.
- Samlet kalender og hjemskjermoppsett: calendar-and-home-screen.md.
- Planlegging, publisering, utoverregistrering og treneroppfolging:
  training-journey.md. Flyten er testet med isolerte demodata og SQL-tester.
- Felles aktivitetshistorikk: trener og utover ser samme registreringer
  for handball, styrke, skolegym og annen aktivitet. Maanedsvalg, lenker,
  faktisk/planlagt tid og korrekt siste fullforte aktivitet siste 30 dager.
- Oppfolgingsforslag pa Oversikt og spillerprofil: avtalte aktive mal,
  ovelsesvurderinger og registrert aktivitet med grunnlag og direkte lenker.
  Se coach-suggestions.md. Dagens stil er beholdt.

## Verifikasjon av felles historikk

Bestatt 18.11.2026:
- recorded-activity.mjs: egne/andres/andre lags data, deduplisering,
  faktisk/planlagt, fremtidige datoer, avpublisert og flyttet okt.
- shared-history.cjs: samme trener-/utovervisning, maanedsbytte, sett,
  kalenderlenke, siste gjennomforing, private utkast, retry og 360 px.
- Regresjon: player-feed.cjs, training-journey.cjs, coach-experience.cjs.

Historikken bruker eksisterende tilgangskontrollerte lesefunksjoner.
Ingen ny database, tabell, migrering eller ekstra registrering opprettes.
Hvis den publiserte kilden er borte eller flyttet, beholdes faktisk tid,
mens plandetaljer vises som ukjent. Private utkast brukes aldri som
utoverens historiske oktbeskrivelse.

## Neste prioriteringer

1. Brukertest pa fysisk iPhone og Android: hjemskjermikon, ny innlogging,
   tilbakeknapp, video og registrering etter pauser i appbruken.
2. Ny ekte e-postinvitasjon og leveringskontroll. Mock-tester bekrefter
   ikke faktisk levering; dette er ikke gjentatt i siste leveranser.
3. Videre oppfolging: vurder behov for en eksplisitt, loggfort trenerhandling
   som markerer en samtale som fulgt opp. Forslagene i dagens leveranse
   forsvinner nar kildegrunnlaget endres, ikke ved at treneren bare apner dem.

Dette er status for de siste avtalte milepaelene, ikke en paastand om at
samtlige historiske onsker i chatten er implementert eller retestet.
