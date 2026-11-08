# Min utvikling: klubbpilot

Klubbpilot på app.lundehaugenil.no/utvikling. Trener og utøver bruker egne kontoer. E-post, push, foresattilgang og utlevering av merker er ikke aktivert av denne modulen.

## Prøv visningene

- Trener: `/utvikling/demo`. Utøver: `/utvikling/demo?rolle=utover`. Uten Supabase velger snarveiene eksisterende demopersona. På klubbens domene brukes et isolert eksempellag uten nettverkstilkobling til treningsdata. Bytt testrolle i samme fane. Eksempelplanen er knyttet til demoutøveren Liv; den andre demoutøveren begynner med tom plan. Demodata er nettleserlagret og skal ikke brukes til ekte trenernotater.
- Autentisert visning: `/utvikling`. Trener kan også åpne siden fra en utøverprofil eller Lagoversikt. Utøveren har en inngang på Hjem og Profil.
- Første plan: Velg utøver → **Nytt mål**. Et prosessmål trenger ingen nivåvurdering. For et nivåmål: godkjenn først en lokal rubrikk under **Privat trenerområde → Godkjenn vurderingsrubrikk**. Avtal mål, kriterier og vurderingsdato, og publiser. **Tildel øvelse** foreslår treff på delferdighet/nivå og treningsforhold. Trener godkjenner selv alders- og kontekstegnethet.
- Utøver: **Registrer øving** åpner tildelt øvelse med holdepunkt. Registreringen kan gjelde flere egne mål. **Be om tilbakemelding** ber om vurdering, ikke bekreftelse av nivå. Endringer i treningskalenderen oppretter ingen øvingslogg.
- Trener: Åpne målet → **Registrer bruk i spill** → **Bekreft mål**. En separat ferdighetsvurdering kan legges inn samtidig og lagres atomisk. Uten eksplisitt vurdering endres ikke ferdighetsprofilen. Korrigering og tilbaketrekking av vurderinger er tilgjengelig under Historikk.
- **Lagoversikt** har ferdighets- og vurderingsfilter, per-utøver-valg for bekreftelse av en observert fellesøvelse, samt lenke til programbyggeren. Bare øvelses-ID sendes videre. Økten må redigeres og publiseres av trener.

## Integrasjon og tilgang

| Område | Implementasjon |
|---|---|
| Trener/utøver | Eksisterende `Workspace`, lagvelger og `beta_members`. Tilgang kontrolleres per forespørsel mot faktisk medlemskap og `extra_coaches`; klubbadmin som ikke trener laget får ikke private trenerrettigheter. |
| API | `app/api/development/route.ts` videresender til `club-development`, som verifiserer brukerens bearer-token med Supabase Auth. Klienten sender kommando, aldri autoritativ tilstand eller rolle. Bare serveren kan bruke databasens gateway. Responsen har `no-store`. |
| Persistens | `supabase/migrations/20261108173632_athlete_development.sql`: nye private plan-, policy-, notat-, audit- og outbox-tabeller. Revisjon per lag/utøver med atomisk sammenlign-og-oppdater. Samme praksis knyttes til flere mål. Private notater er ikke felt i spillerobjektet. Ekte data er aldri initialisert fra demo. |
| Fagmodell | `src/lib/development/`: åtte utespillerområder, keeperprofil med aktiverbare områder, versjonerte rubrikker med klinisk uavhengige lokale trenerkriterier, egen vurdering av område og delferdighet. Radar beregnes fra publiserte, gyldige observasjoner, ikke en lagret sum eller gjennomsnittsverdi. |
| UI | `src/features/beta/development*.tsx` og `development.css`: eget marineblått/rosa uttrykk. Videreføring av klubbens eksisterende navigasjon, ikonbibliotek, øvelser og treningsplan. |
| Bibliotek / kalender | Eksisterende lagøvelser og styrkebibliotek beholdes med sine ID-er. Tre originale håndballøvelser er tilgjengelige både i utviklingsmodulen og i øvelsesbyggeren. Tilpasninger og kobling til en allerede planlagt utøverøkt lagres på målet. Manglende katalogoppføring vises utilgjengelig med bevart trenertekst. Ingen eksterne videoer importeres. |
| Merker | Uendret katalog og uendrede terskler. `goal_getter`, `mission_complete`, `skill_collector`, `rising_star` får stabile kilde-ID-er i en transaksjonell kandidat-outbox. Oppdrag og milepæler trenger eksplisitt trenerbekreftelse. Ferdighetsmerker trenger eget godkjent mestringsnivå i en delferdighetsrubrikk. Tilbaketrekking invaliderer kilden. Ingen utlevering til merkemotoren før klubbens regel for allerede annonserte nivåer er avklart. |

## Driftsoppsett

Migrasjonen er additiv. Produksjonstilgangen er begrenset til nåværende lagmedlemmer og tildelte trenere.

- Server: `DEVELOPMENT_ENABLED=true` og prosjektets eksisterende offentlige Supabase-innstillinger. Ingen privilegert nøkkel i Vercel. `club-development` bruker sin innebygde, private Supabase-tjenestenøkkel. `node scripts/pack-development-edge.mjs` genererer funksjonspakken fra de versjonerte domenemodulene. Uten konfigurasjon svarer API-et med 503, ikke eksempeldata.
- Meny: `NEXT_PUBLIC_DEVELOPMENT_ENABLED=true`. Plannerkobling: `NEXT_PUBLIC_DEVELOPMENT_PLANNER=true`. Nettleserdemo har disse to lokalt på.
- `nhf_private.dev_policy`: standard tre aktive mål; klubbens lag kan begrenses til 1–10. Keeper er av inntil rubrikker er vurdert. Godkjente keeperområder kan konfigureres med `keeper_axes`.
- Ingen foresattrolle eller verifisert foresatt–barn-relasjon ble funnet. Derfor er foresattilgang avvist, ikke simulert. Ingen eksisterende regel for tilbaketrekking av tildelte merker eller ekstern videolisens er antatt.
- Ingen KI-genererte individuelle treningsmengder. Mål og merker endres ikke fra kampstatistikk. Ingen synk av personlige planer til lagpublisert tekst.

## Verifikasjon og gjenstående akseptanse

| Akseptanseområde | Kontroll / begrensning |
|---|---|
| Målreise, forslag, kladd, avtale, praksis, review, transfer, bekreftelse, korreksjon | Domenetester og mobil-/trenertest. Bekreftet-visning krever fullført mål; telleverk for øving er ikke en mestringsprosent. |
| Idempotens, flere mål på én øving, kapasitet, gjenopptak, versjonskonflikt | Testet med domenemotor og PGlite. To konkurrerende skriv med samme revisjon gir én commit. Ikke lasttestet mot to separate produksjonstilkoblinger. |
| Radar | Manglende vurderinger, ingen polygon over gap, tabell, delferdighet uavhengig av område, tilbake-/omdatering, inkompatibel versjon, korreksjon og Oslo-datogrense testet. Ikke vitenskapelige aldersnormer. |
| Tilgang | PGlite har testet service-only RPC, nektet andre spillere/trenere, privat payload og medlemskapsendring. Hostet Auth, nettverksutfall og foresatte må ikke omtales som produksjonsverifisert. |
| Merker | Atomisk stabil kilde og korrigert eligibility testet i isolert database; eksisterende badges endres ikke. Levering/replay mot den ekte merkemotoren er blokkert inntil revokasjonspolicy er bestemt. |
| Øvelser og plan | Bulk-test krever eksplisitt spillervalg; utkastet inneholder bare øvelsen. Ingen ny leverandørkatalog eller videorettighet. Full test av tilbakekalt tredjepartsrettighet avventer faktisk rettighetskilde. |
| Pilot | Tastaturvennlige standardkontroller, fokusmarkering, responsive bredder og reduserte bevegelser. Ingen utprøving med et ekte lag, reell nettbrettmaskinvare eller foresatte. Klubbens personvern-/sletterutiner må vurderes før produksjon. |

Kjør `pnpm typecheck`, `node tests/development.mjs`, `pnpm build`, og `node tests/development-browser.cjs` mot den lokale demobygningen (standard port 3217, eventuelt `BETA_TEST_URL`). Nettlesertesten krever Playwright og Edge; sett `PLAYWRIGHT_PACKAGE` til installasjonen. `UI_QA_DIR` kan brukes for skjermbilder. `pnpm lint` går til Next sitt interaktive førstegangsoppsett i dette prosjektet og er ikke en bestått lint-sjekk.
