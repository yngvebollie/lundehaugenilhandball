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
- Fulgt opp-status med obligatorisk kort notat i spillerens trenerlogg.
  Delt trenerstatus, tidspunkt/aktor fra server, feil/retry og duplikatvern.
  Nytt kildegrunnlag kan gi et nytt forslag; gamle notater beholdes.
- Gjenapne en feilmarkert oppfolging fra Fulgt opp. Originalnotatet beholdes;
  ny hendelse viser trener og tidspunkt. Ny oppfolging kan loggfores igjen.
  Stale faner og gjentatte klikk kan ikke overskrive nyere oppfolging.
  Testet begge roller, to trenere, feil/retry og mobilbredde.
- Mobilstabilitet: bevar apne skjemaer ved midlertidig bakgrunnsfeil,
  tilkoblingsstatus/retry og oppdatering nar appen blir synlig igjen.
  Tilgangsfeil rydder fortsatt arbeidsflaten. Se mobile-reliability.md.

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

M1. Mobil - fysisk akseptansetest (gjenstar).
   Kodedelen og automatisert feil/gjenopptak er levert. Test pa ekte iPhone
   og Android: hjemskjermikon, innlogging/utlop, tilbakeknapp, video og
   registrering etter pauser. Krever tilgang til de fysiske telefonene.
   Ferdig nar begge roller bestar sjekklisten i mobile-reliability.md.

M2. Ekte e-postinvitasjon (delvis verifisert, levering gjenstar).
   Leveringslogg per mottaker er implementert og automatisk testet 18.11:
   vedvarende meldings-ID, status fra Resend, konkrete feilkategorier og retry.
   Se invitation-delivery.md for serveroppsett og testavgrensning.
   18.11 kl. 13.24: brukeren opprettet en utøverinvitasjon til testaliaset.
   Personlig lenke testet direkte i produksjon ved 390 x 844 mobilvisning:
   riktig registreringsskjema, valgfritt e-postfelt og ingen horisontal overflow.
   Registrering fullfort kl. 13.28 uten e-postbekreftelse; videresendt til
   /athlete. Database bekrefter rollen athlete og laget Lundehaugen IL.
   Testkontoen Invitasjonstest November er beholdt uten draktnummer.
   Innboksen, inkludert spam, hadde ingen matchende e-post ved kontroll.
   Avsender, faktisk levering og klikk fra mottatt e-post er IKKE verifisert.
   Lenken ble hentet fra invitasjonsraden, ikke fra en mottatt melding.
   Brukeren bekrefter at UI viste godtatt for sending. Koden bruker bare
   HTTP-suksess fra Resend som kvittering, ikke en leveringshendelse.
   Ingen melding funnet ved ny kontroll i innboksen, inkludert spam.
   Neste kontroll er mottaker, avsender og hendelsesstatus i Resend Emails;
   nettleserstyringen er fortsatt blokkert av en aktiv foresporsel i helperen.
   Trener-UI og fysisk mobil gjenstar.

M3. Sikkerhetsherding (gjenstar).
   Vurder eksponert beta_edit_fixture-definer og lekkede passord-innstilling.
   Behold trenernes kampredigering, test at utovere/andre lag avvises.
   Ferdig nar endringene er verifisert og relevante advisor-varsler er lost
   eller dokumentert med konkret begrunnelse. Se coach-suggestions.md.

M4. Avstemming av eldre produktkrav (gjenstar).
   Revider tidligere onsker mot kode og produksjon: registrering/invitasjon,
   spillerkoblinger/draktnummer, lag/sesong, rapporter/statistikk, merker/stemmer,
   ovelsebank/filmer, kalender/belastning, meldinger og admin-utovervisning.
   Lag en restliste med bestatt/mangler/ikke testet, og prioriter faktiske avvik.
   Dette er en akseptansegjennomgang, ikke et lofte om ny funksjonalitet i dag.

Dette er status for de siste avtalte milepaelene, ikke en paastand om at
samtlige historiske onsker i chatten er implementert eller retestet.
