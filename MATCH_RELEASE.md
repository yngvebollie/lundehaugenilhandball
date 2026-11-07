# Kamper and team entry

## Coach workflows

Select the current local team first. In **Team management**, use **Share an application link** when you do not know recipients' emails. Each holder authenticates with their own email and applies to this team only. For direct invitations use **Invite by email** (up to 100 recipients), or share a six-character athlete code. An athlete can enter the code at registration and confirm it after email verification. The shared application URL and the private, one-time authentication email are different links. Never forward anyone else's authentication email.

**Kamper → Kampoversikt → Opprett manuell kamp** works without any NIF credentials. In the match, confirm participants, select a player, and save manual statistics. The separate tablet shot recorder is under **Kamppad**. Its live event log is not added to manual totals a second time. In Administrer lag a team admin can register multiple NIF team/season pairs or pause a registration without deleting history.

## Deployment and integrations

- Apply `supabase/migrations/20261107153357_match_evaluations.sql` after the team admin and application-link migrations. Existing match IDs and pad events remain unchanged.
- Supabase Auth: enable email sign-in, configure a verified custom SMTP sender, and set the Site URL to the production origin. Allow the app's production `/login`, `/join`, and `/apply` redirects **including their query strings**; e.g. `https://app.lundehaugenil.no/apply**` (likewise for the other paths). Keep passwordless email templates using the supplied confirmation URL. Do not use a public wildcard domain. Public share links never contain an auth session. For direct coach-sent emails configure the existing `RESEND_API_KEY`, `INVITE_FROM` and `APP_ORIGIN`; these do not configure Supabase SMTP.
- NIF: server-only `NIF_CLIENT_ID`, `NIF_CLIENT_SECRET`, `NIF_TOKEN_URL` (NIF-issued HTTPS OAuth token endpoint), `NIF_SCOPES` (schedule: `data_ta_read`; participants/roster: also `data_ta_person_read` when granted). Set `SUPABASE_SERVICE_ROLE_KEY` server-side and `NIF_ALLOWED_TEAMS` to a JSON object mapping each authorized local team UUID to its allowed numeric NIF org IDs. Registering an ID in the UI does not authorize access on its own.
- Discovery calls ScheduledMatches on each refresh, and TournamentMatches for tournaments discovered there or entered by the admin. For historical seasons without upcoming fixtures, supply the tournament ID. Previously imported fixtures absent from those lists are rechecked individually. No shot data, images or birth dates are imported. Participant fallback supplies candidates, not proof of attendance.
- The GitHub Actions workflow targets Monday 04:00 Europe/Oslo. Enable Actions and set the same strong `MATCH_CRON_SECRET` on Vercel and as a GitHub Actions secret. A scheduled run may start late. No NIF agreement or credentials are included.

## Restricted information

All evaluation reads and changes go through a team-coach RPC and write a content-free audit entry. Neither athletes nor anonymous clients can read its private tables. The sync service uses a separate import RPC which cannot write evaluations. Admin coaches can delete an individual evaluation. For retention expiry the database owner can delete rows from `nhf_private.player_match_statistics` by `updated_at` under the club's agreed policy, and age out audit entries by `at`. Do not copy notes to logs or to NIF. `nhf_private.match_season_totals` provides internal totals grouped by local team, registration/season, competition and player; only confirmed participants in completed, nonfuture matches count.

## Changed files

- Invitations: `app/api/invitations/route.ts`, `app/apply/page.tsx`, `app/login/page.tsx`, `app/join/page.tsx`, `src/lib/invite-auth.ts`, `src/features/beta/team-tools.tsx`, `src/features/beta/team-entry.tsx`, `app/documentation/page.tsx`. Without Resend, direct invitations request a recipient-specific Supabase Auth magic email; production delivery requires authorized SMTP. A coach never receives the private authentication token.
- Matches: `src/features/beta/workspace.tsx`, `src/features/beta/kamper.tsx`, `src/features/beta/kamper.css`, `src/lib/match-journal.ts`, `src/lib/nif.ts`, `app/api/matches/sync/route.ts`, the migration and `.github/workflows/match-sync.yml`.
- Verification: `tests/beta-access.mjs`, `tests/nif-discovery.mjs`, `tests/kamper-browser.cjs`, `tests/athlete-entry-browser.cjs`, `tests/invitation-email.cjs`, `tests/match-mobile.cjs`.
## Published NHF Schedule

Without NIF OAuth credentials, **Hent kamper nå** refreshes team fixtures and public results from the schedule used on handball.no. It does not import personnel, reports, or match evaluations. The registration's team ID, active season and configured tournament IDs constrain every import. An empty or unavailable upstream list never deletes existing fixtures. Direct NIF roster access still requires separately authorized credentials.

Deploy the `nhf-public-schedule` Edge Function with its supplied config. The function checks the user's verified session and team access, or claims a single-use job scoped to one registration. Only the function can call the database import RPC. Do not place service credentials in the frontend.

For another deployment, configure the private `nhf_sync_endpoint` row with that project's HTTPS Edge Function URL. The `nhf-published-weekends` database cron job runs at 04:00 UTC Friday, Saturday and Sunday. With no configured URL it does nothing. The optional NIF workflow is separate.

