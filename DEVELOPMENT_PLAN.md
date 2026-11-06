# NHF beta development plan

## 1. Planning and library
The beta includes four weekly styles, individual load-aware suggestions, a visible coach prompt with help, an invite-based account screen, and a searchable catalog of 50 strength exercises. Coach usage is recorded when adding an exercise through the library, including Save and add exercise. Counts are personal; ties use last use, then alphabetical order.

The catalog is curated. References for exercise selection include [Skadefri handball](https://www.skadefri.no/en/idretter/handball/Handball/) and the [EHF strength and conditioning material](https://www.eurohandball.com/media/ialnvxza/sc-documentation-2011.pdf). Muscle maps show approximate target areas. Sample dosages and weekly set budgets are editable coaching defaults, without clinical validation.

## 2. Verification
Run the production build, database access checks and browser workflows in BETA.md. Run tests/planner-preview.cjs for the new planner. Accept when a coach can preview the suggested dates and exercises, existing training affects the result, publishing updates the calendar, and the coach's top exercise stays first after a refresh.

## 3. Release and shared access
Deliver the reviewed app files on main in yngvebollie/lundehaugenilhandball. The owner chose local checkouts on each device. Railway configuration is included for a later deployment.

## 4. Real team pilot
Apply beta migrations through 009_match_pad.sql and configure the two public Supabase variables in both installations. Configure email confirmation and redirect URLs, bootstrap the first coach and test an invitation on a second device, athlete completion, and the coach's updated totals. Enable live AI after server key setup and a coach-only smoke test.

## 5. Team and match workflows
Implemented in the shared frontend: public product introduction, role-specific sign-in, athlete registration, team discovery/applications, rotating six-character codes, team roster and profile, staff conversations, native completion sharing, bulk invite links, club logos, explicit Save and a separate team switcher. The tablet match recorder has a selectable lineup, court and goal coordinates, outcomes, scorers, assists, undo and a match log. Browser testing covers these workflows with fictional local data. Hosted verification remains a pilot task.

## 6. Backlog: Spond activities
Research only. Spond's [event documentation](https://help.spond.com/app/en/articles/127163-creating-and-managing-events-in-spond-groups) says it does not currently offer an open API. Its [calendar sync](https://help.spond.com/app/en/articles/115529-calendar-synchronisation) puts invited events into the user's phone calendar and supports group-level settings. Direct Spond OAuth and team-wide programmatic export have not been verified.

First spike: ask Spond about approved partner access. Separately test an explicitly selected, Spond-synced calendar or coach-provided ICS export with a pilot group. Confirm event visibility, stable IDs, repeat exceptions, cancellations, time zones and permission revocation before promising continuous sync. Prototype a preview with duplicate detection and coach mapping to Game or Practice. Import only approved activities, not contacts, unrelated calendar entries or attendance. No Spond credentials are collected by this release.

## Owner instructions
Add instructions here by step number with the requested change and what should be visible or testable when it is complete.
