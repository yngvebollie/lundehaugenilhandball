# Sammenhengende trener- og spilleropplevelse

## Avgrensning

Behold dagens rosa/navy tema, eksisterende data, tilgangsregler og lenker.
Denne leveransen forbedrer de daglige arbeidsflytene. Den erstatter ikke hele
produktet og innforer ingen automatisk publisering eller helsevurdering.

## Leveranser

1. [x] Palitelighet: test registrering, invitasjonskontrakt, spillerkobling og
   statistikk. Rett planlagt/faktisk for hurtigregistrerte sett.
2. [x] Navigasjon: grupper trening, kamper og utvikling; behold Spillere og
   administrasjon. Riktig sidetittel og aktivt menypunkt pa mobil.
3. [x] Treneroversikt: konkrete oppfolgingslenker for soknader, utkast,
   manglende kamprapporter og rapportert tung trening. Enkel kom-i-gang-liste.
   Ingen falsk nullstatus dersom en datakilde ikke kan lastes.
4. [x] Spillerflyt: neste planlagte aktivitet og siste registrering pa profilen,
   med direkte vei til plan, vurderinger og logg. Verifiser mobil og desktop.
5. [x] Publisering: bygg, regresjonstester, Git-commit og produksjonskontroll.

## Akseptansekriterier

- Alle gamle navigasjonsmal finnes fortsatt, uten dupliserte toppnivaer.
- Oppfolging er avgrenset til aktivt lag og peker til relevant handling.
- Utkast og maler blir aldri publisert ved a apne veiledning eller lenker.
- En registrert, fullfort hurtigokt regnes ikke som en forhondsplanlagt okt.
- Manglende varighet vises som ukjent, ikke null minutter.
- Spillerprofilen viser ikke andre spilleres eller andre lags registreringer.
- Mobil har ingen horisontal side-overflyt; tabeller kan rulles separat.
- Tester av e-posttransport med mocks er ikke bevis pa faktisk levering.

## Videre etter denne leveransen

- Automatisert flyttest av planlegging, publisering, registrering og
  oppfolging bestatt 18.11.2026; se training-journey.md.
- Felles aktivitetshistorikk og videre prioriteringer: backlog-status.md.
- Kalender-milepaelen er publisert 18.11.2026. Se calendar-and-home-screen.md.
  Registrerte aktiviteter beholdes som historikk; fremtidige planer kan endres.
- Personlig oppfolging og anbefalinger basert pa verifiserte data, uten a
  likestille mer treningsvolum med bedre prestasjon.

## Verifikasjon

Bestatt lokalt 17.11.2026:
- player-access.mjs: innmelding, riktig lag, e-postkontakt og avgrenset reset.
- beta-access.mjs: publisering, duplikater og isolering mellom lag/brukere.
- invitation-email.cjs: avsender/lenke og mottakeravgrensning, mock-transport.
- club-player-stats.mjs og results.mjs: kamptelling og W/L/D.
- court-sessions.mjs og activity-load.mjs: oktrettigheter, tid og belastning.
- player-wizard.cjs og public-entry.cjs: fem steg, profilendring, posisjoner
  hos trener og valgfri e-post pa mobil/desktop.
- invitation-hub.cjs: trenerinvitasjon og innmelding via riktig Inviter-fane.
- player-feed.cjs: individuelle sett, muskelkart, historikk og merkelenker.
- coach-overview.mjs: oppfolgingsgrenser, datoer og ukjent rapportstatus.
- coach-experience.cjs: alle menylenker, utkast uten utsending,
  planlagt/faktisk hurtiglogg, separate spillere og 360/390 px mobil.
- Produksjonsbygg med typekontroll bestatt.

Faktisk ny e-postlevering er ikke testet i denne leveransen.
Publisert 17.11.2026 pa https://app.lundehaugenil.no/.
Git: 0f3ce8f570715495e8fa1508852112fec45620aa.
Vercel rapporterer success. Offentlig app returnerer HTTP 200 og leverer
ny meny og spilleroppsummering. Siste regresjonsrunde bestatt.
Nettlesertestene er kjort mot lokalt produksjonsbygg med isolerte demodata,
ikke ved a endre virkelige spillerkontoer.
