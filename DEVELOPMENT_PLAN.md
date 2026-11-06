# NHF beta development plan

## 1. Planning and library
The beta includes four weekly styles, individual load-aware suggestions, a visible coach prompt with help, an invite-based account screen, and a searchable catalog of 50 strength exercises. Coach usage is recorded when adding an exercise through the library, including Save and add exercise. Counts are personal; ties use last use, then alphabetical order.

The catalog is curated. References for exercise selection include [Skadefri handball](https://www.skadefri.no/en/idretter/handball/Handball/) and the [EHF strength and conditioning material](https://www.eurohandball.com/media/ialnvxza/sc-documentation-2011.pdf). Muscle maps show approximate target areas. Sample dosages and weekly set budgets are editable coaching defaults, without clinical validation.

## 2. Verification
Run the production build, database access checks and browser workflows in BETA.md. Run tests/planner-preview.cjs for the new planner. Accept when a coach can preview the suggested dates and exercises, existing training affects the result, publishing updates the calendar, and the coach's top exercise stays first after a refresh.

## 3. Release and shared access
Push the reviewed app files to yngvebollie/lundehaugenilhandball. Connect main to Railway as a Dockerfile service, generate an HTTPS domain, and confirm /login renders on a second device. A deployment without Supabase settings provides a browser-local demo.

## 4. Real team pilot
Apply beta migrations through 005_coach_usage.sql and configure the two public Supabase build variables. Configure email confirmation and redirect URLs, bootstrap the first coach and redeploy. Test an invitation on a second device, athlete completion, and the coach's updated totals. Enable live AI only after server key setup and a coach-only smoke test.

## Owner instructions
Add instructions here by step number with the requested change and what should be visible or testable when it is complete.
