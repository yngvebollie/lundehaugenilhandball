# Samlet kalender og hjemskjerm

1. [x] Samle styrkeokter, handballokter, kamper, skolegym og annen aktivitet.
2. [x] Uke, maned og liste; filtrering; aapne detaljer og redigere fra kalenderen.
3. [x] Trygg trenerredigering: valgt spillerutvalg, konfliktkontroll, logg og
   vern av gjennomfort trening. Faste planer endres bare fra valgt dato fremover.
4. [x] Hjemskjerm-app med klubbikon, manifest og iPhone/Android-veiledning.
5. [x] Test datatilgang, redigering, mobil, manifest og produksjonsbygg.
6. [ ] Publiser databasemigrering og app; kontroller produksjonslenker.

Behold rosa/navy stil. Ikke cache private spillerdata eller love offlinebruk.
Telefonens egen godkjenning er nodvendig for a legge til hjemskjermikonet.

## Verifisering 18.11.2026

Bestatt: produksjonsbygg, calendar-access.mjs (inkludert overlapper,
registrerte fremtidige dager, avslutning og bevart historikk),
unified-calendar.cjs, home-screen.cjs, coach-experience.cjs,
activity-load.mjs og court-sessions.mjs.
Nettlesertester bruker isolerte demodata og 360/390 px mobilbredder.
Installasjonshendelser er simulert; fysisk iPhone/Android er ikke testet.

Databasemigreringen er publisert. Anonyme har ikke execute-tilgang;
trener- og lagtilgang valideres av funksjonene. Ingen nye advisor-funn.
Eksisterende varsler: beta_edit_fixture SECURITY DEFINER og deaktivert
leaked-password protection. Referanser:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Kalenderen viser uke, maned og liste. Trener kan redigere fremtidige,
uregistrerte aktiviteter for valgte spillere; gjennomfort og personlig
aktivitet er lesbar, men beskyttet mot treneroverskriving. Handballokter
og turneringer aapnes i eksisterende redigeringsvisning. Trenerutkast
vises ikke for utov eren. Styrkebygger og belastning ligger i egne menyer.

