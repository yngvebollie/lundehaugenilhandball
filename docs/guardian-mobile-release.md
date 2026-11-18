# Guardian Access and Athlete Mobile Layout

## Delivered Scope

- M1: separate guardian identity; multiple children and guardians; recipient-bound, expiring invitations; coach revocation and audit history.
- M2: coach invitation by email or personal link for an existing player or a new child. New child completes the existing registration with independent credentials and optional email.
- M3: read-only Mine barn with published calendar sessions, exercise instructions/video links, training sets, own match statistics, agreed development goals, badges and targeted team notices.
- Athlete navigation reduced to Home, Calendar, Statistics, Badges and More. Existing pink/navy theme retained.
- Mobile statistics use readable match rows, team filters, goals, 7m, 2m, cards and clickable W/D/L. Badge feed links to badge details and the awarded match.

## Verification

- `tests/guardian-access.mjs`: full migration in isolated PostgreSQL; coach permissions, email recipient, siblings, second guardian, revocation, child enrollment, role separation, private-field exclusion and own match totals.
- `tests/guardian-registration.cjs`: server registration validation, address binding, separate identity, existing-account protection and missing configuration.
- `tests/guardian-browser.cjs`: actual React components with isolated API fixtures for coach, guardian and athlete at 360, 390 and 1280 pixels. Child switching, revoked access, set history, badge-to-match navigation and no horizontal page overflow.
- `tests/athlete-match-log.cjs`: full local Next app, exercise search, copied sets, log persistence, badge feed, match link and voting.
- `tests/invitation-delivery.cjs`: athlete and guardian email paths, sender, delivery IDs/status, provider failures and access isolation.
- TypeScript and production build passed. Existing CSS autoprefixer warnings in workspace/player-desk are unchanged.
- Database migration `guardian_access_m1_m3` applied to the configured project. Public registration RPC remains service-role-only.

## Access Boundaries

No guardian access to private conversations, health information, internal coach notes or other children. No write operations on behalf of children in M1-M3. Revocation is checked server-side on every snapshot. Existing coach accounts may also accept a guardian link; athlete accounts cannot.

The database advisor reports intentional authenticated SECURITY DEFINER RPCs and private RLS tables with no direct policies. Functions validate coach/guardian scope and use an empty search path. Direct client table access is revoked. The existing leaked-password-protection warning is unchanged; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Remaining Verification and Follow-ups

- Live parent registration from a real received invitation still needs a production account acceptance test. Automated role tests used isolated data, not real child accounts. The existing real athlete email delivery was verified separately.
- Parent match statistics currently use the active season. Historical badge entries outside that season do not yet open an archived match in the parent view.
- M4, actions on behalf of a child, remains a separate milestone with explicit actor attribution and permissions.

## Entry Points

- Athlete: `/athlete`.
- Coach: `/team?vis=foresatte`.
- Guardian: `/foresatt` (personal invitation required before child data is available).

