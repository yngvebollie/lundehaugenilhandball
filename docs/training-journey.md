# Trening fra plan til oppfolging

## Milepael 18.11.2026

1. [x] Reproduser faktisk brukerflyt med separate trener- og utoverfaner.
2. [x] Rett manglende registrering fra selve den publiserte handballokten.
3. [x] Vis faktisk registrering, planminutter og intensitet hos trener.
4. [x] Test korreksjon, ikke deltatt, angring, retry og tilgangsgrenser.
5. [x] Bygg og regresjonstest kalender, oversikt og spillerfeed.

## Feil som ble funnet og rettet

- Utover kunne lese og vurdere oktens ovelser, men ikke registrere faktisk
  gjennomforing derfra. Samme registreringskomponent brukes na i okten
  og kalenderen, med samme hendelses-ID. Fremtidige datoer kan ikke fores.
- Trenerens oppfolging ignorerte faktisk belastning fra handballokter.
  Siste sju dager viser spiller, okt, planlagte og faktiske minutter,
  intensitet og direkte lenke til valgt spillers belastningsoversikt.
- Korrigert faktisk intensitet prioriteres foran eldre generell vurdering
  av samme aktivitet. Manglende datakilde vises ikke som null.
- Lenke til individuell belastning valgte tidligere hele laget. Spiller
  fra URL valideres na mot trenerens aktive lag.

## Dokumentert ende-til-ende-test

training-journey.cjs oppretter en okt gjennom UI, ikke ved a skrive en
ferdig plan direkte inn i lagringen:

- 90 min plan, navn og dato, privat trenernotat.
- Utkast er utilgjengelig for utover; forhondsvisning lekker ikke notat.
- Publiser kun til Liv; melding i appen aapner riktig okt.
- Ekstern videolenke, ovelsesdetaljer og personlig 4/5-vurdering.
- 75 min / Hard registreres, beholdes etter reload og vises hos trener.
- Plan 90/360 og faktisk 75/300 i riktig spillers belastningsoversikt.
- Endre til 60 min / Moderat uten dublett; fjernes fra Tung trening.
- Ikke deltatt, Angre og Gjennomfort som planlagt oppdaterer samme rad.
- Lesefeil gir retry, ikke en falsk tom registrering.
- Ida kan ikke aapne eller registrere Livs valgte okt.
- Ingen side-overflyt ved 360 px; tabell har egen rulling.

SQL-testen court-sessions.mjs tester de faktiske migreringsfunksjonene i
PGlite: eier/lag, mottakerutvalg, avvisning av trenerregistrering pa vegne
av utover, ugyldige verdier, fremtidig registrering, korreksjon uten dublett,
ikke deltatt, angring og bevart registrering etter avpublisering.

Andre bestatte tester: coach-overview.mjs, activity-load.mjs,
coach-experience.cjs, unified-calendar.cjs, player-feed.cjs og pnpm build.

Nettlesertestene bruker lokalt produksjonsbygg og isolerte demodata.
Ingen ekte spillerkontoer, e-post eller push-varsling pa telefon er brukt.
Ingen ny databasemigrering kreves. Publisering kontrolleres via Git/Vercel
og ved a sjekke levert JavaScript pa app.lundehaugenil.no.
