# Arbeidsinstruks for app-prosjektet

Når brukeren ber deg jobbe med appen, gjennomfør oppgaven selvstendig. Kjør relevante tester, rett feil innenfor oppgaven, og verifiser resultatet. Rydd opp i midlertidige testkontoer, testlag, testkamper og andre testdata du selv oppretter. Kontroller at postene tilhører testen før du sletter dem, slik at ekte kontoer, spillere, lag og kamper er beskyttet.

Bruk godkjenningen som allerede er gitt for oppgaven. Be om ekstra bekreftelse bare når verktøyet krever det. Hvis verktøyet krever bekreftelse, forklar hvilken handling det gjelder, og samle bekreftelser der verktøyet tillater det.

## Testmiljø og opprydding

- Bruk produksjon til lesekontroller som utgivelsesstatus, dekning og kontrollsummer. Kontroller ekte data før og etter arbeidet når det er relevant.
- Kjør lesetester som trener i produksjon i en separat nettleserprofil i bakgrunnen med en gjenbrukbar, dedikert testkonto. Bruk ordinær trenerrolle med tilgang kun til laget som skal verifiseres. Oppbevar innlogging i godkjent hemmelighetslager, og hold passord, innloggingslenker og øktfiler utenfor repoet. Bruk den dedikerte testkontoen på nytt ved senere kontroller.
- Kjør nettlesertester som oppretter eller endrer data i en egen nettleserprofil mot et lokalt eller dedikert testmiljø. Bruk testdata, simulert API eller en isolert testdatabase, og avslutt testøkten etterpå.
- Kjør skrivende databasetester i en transaksjon som alltid rulles tilbake når testen kan utføres innenfor én transaksjon. En nettlesertest som må se data over flere forespørsler bruker et testmiljø med gjenbrukbare testkontoer eller testdata som fjernes automatisk.
- Velg en testmåte med forutsigbar opprydding før testdata opprettes. Varige produksjonstester brukes når oppgaven krever det og de isolerte alternativene er utilstrekkelige. Samle eventuell verktøypåkrevd sletting i én avgrenset handling.
