# Oppfolgingsforslag - 18.11.2026

## Omfang

Trenerens Oversikt og spillerprofil viser samme forslag, avgrenset til
aktivt lag og valgt spiller. Filtre: Alle, Mal, Vurderinger, Aktivitet.
Eksisterende rosa/morke stil viderefores. Oppfolgingsnotater gjenbruker
beta_player_log med felter fra migreringen 20261118113316_coach_followup_log.

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

## Fulgt opp og trenerlogg

Marker som fulgt opp apner et notatvindu, 1-1000 tegn. Avbryt lagrer ingenting.
Status og notat er samme append-only rad i beta_player_log. Serveren bestemmer
aktor og tidspunkt. Trener kan bytte mellom Apne og Fulgt opp og folge lenken
til spillerens trenerlogg. Ingen melding sendes til spilleren.

En kanonisk kildeversjon og unik indeks hindrer dobbel lagring. Samtidige
trenere far den forst lagrede raden; senere tekst overskriver aldri notatet.
UI varsler om konflikt og beholder teksten i vinduet. Ved lagringsfeil beholdes
ogsa teksten, og ingen optimistisk ferdigmarkering vises.

Forslag regnes som fulgt opp nar dagens kildesignaler er dekket av en lagret
oppfolging. At gamle registreringer faller ut av tidsvinduet gjenapner ikke
forslaget. Nye registreringer/vurderinger eller endret malgrunnlag kan gi
nytt forslag. Historikken slettes ikke.

Tester: followup-log.mjs (PGlite, ekte SQL/roller) og followup-browser.cjs
(isolerte demodata, begge roller, to trenere, mobil, feil/retry). Regresjon:
player-desk.mjs, coach-suggestions.mjs/cjs, training-journey.cjs og
shared-history.cjs. Produksjonsmigrering, RLS, indeks og execute-grants er
kontrollert. Ingen ekte spillernotater er skrevet under testingen.

Supabase security advisor for/etter hadde samme eksisterende funn:
- public.beta_edit_fixture er en eksponert security-definer. Se
  https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Lekkede passord er ikke blokkert i Auth. Se
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Syv private tabeller med RLS uten policies (INFO), beskyttet gjennom
  eksisterende funksjonsgrenser. Se
  https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Disse innstillingene er ikke endret som del av notatfunksjonen.
