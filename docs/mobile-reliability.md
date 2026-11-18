# Mobilstabilitet - 18.11.2026

## Levert

- En midlertidig feil i bakgrunnshenting av arbeidsflaten fjerner ikke lenger
  monterte skjemaer. Trenernotat og utoverens hurtiglogg beholder inntastingen.
- Tilkoblingsstatus og Prov igjen vises ved lese-/nettfeil, ogsa i utoverens
  egne okt- og utviklingsvisninger. Nettleserens offline-signal er bare et hint,
  ikke en bekreftelse pa om serveren kan nas, og blokkerer ikke handlinger.
- Nye data hentes ved synlig fane, online, fokus og pageshow etter tilbakegang.
  Hendelser innen 150 ms samles. Skjult fane starter ikke periodisk henting.
- Utdaterte svar far ikke omdirigere eller erstatte en nyere arbeidsflate.
- Tilgangsfeil og utlogging fjerner fortsatt den gamle arbeidsflaten.
  Ingen nye rettigheter, databaseendringer eller offline-lagring.
- Forste lasting med nettfeil tilbyr ny henting, ikke en misvisende innlogging.

Begrensning: Dette beskytter skjemaet mot midlertidig bakgrunnsfeil mens siden
er apen. Det lover ikke utkastgjenoppretting etter lukk/reload/telefonrestart.
Automatisk gjenutsending av lagringer er ikke innfort. Serverens eksisterende
tilgangskontroll gjelder fortsatt for hvert kall.

## Verifikasjon

- workspace-refresh.mjs: avgrenser midlertidige feil fra tilgangs-/konfigfeil.
- mobile-recovery.cjs: begge roller, notat/sett, offline-hint, feil/retry,
  visibility/pageshow/online, enkeltlagring, fjernet tilgang og 360/390 px.
- Regresjon: training-journey.cjs, reopen-followup.cjs, coach-experience.cjs,
  home-screen.cjs og produksjonsbygg med typekontroll.
- Nettlesertester bruker isolerte demodata og simulerte transportfeil.
  Dette er ikke fysisk iPhone/Android, ekte auth-utlop eller reell e-postlevering.

## Gjenstaende fysisk akseptansetest (M1)

Begge telefoner, en trener og en testutover:
1. Installer klubbikonet fra /installer. Apne, logg inn og kontroller riktig lag.
2. Apne et trenerutkast eller hurtiglogg med to sett. Bytt app og kom tilbake.
3. Slatt flymodus pa/av mens siden er apen. Kontroller status og bevart tekst.
4. Lagre etter gjenopprettet forbindelse. Kontroller noyaktig en registrering.
5. Folg en ovelsesfilm og bruk tilbakeknappen. Kontroller riktig side/lag.
6. Logg ut; apne fra hjemskjermen igjen. Ingen private data skal vises for ny bruker.
7. La innloggingen utlope og apne appen igjen. Kontroller ny innlogging og tilgang.

Dokumentasjon brukt:
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange

Neste prioriteringer finnes i backlog-status.md. Fysisk test lukkes ikke pa
grunnlag av nettleseremulering.
