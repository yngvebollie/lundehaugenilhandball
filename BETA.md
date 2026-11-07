# NHF training beta

Coaches can save and reopen multi-session programs, schedule them from a start date, assign a squad or an individual, review effort ratings and export completion reports. Matching session titles such as Squat, Recovery and Speed populate editable exercises from a built-in library. Each exercise becomes a checklist item. Athletes can review today, browse their program dates, track progress and share or change a session rating. A coach can turn a rating into an individual follow-up draft. The coach reviews its date and exercises before publishing.

## Try the demo

On this computer open http://127.0.0.1:3217/login for the running preview. To restart from source, use Node 24 and pnpm 11.25.0, run `pnpm install --frozen-lockfile` and `pnpm dev`, then open http://localhost:3000/login. With both Supabase variables blank, the demo account picker uses fictional local profiles. The public demo contains no password protection. Use fictional data only.

### Morning walkthrough

1. Open the login page as Demo Coach. The Current team menu switches teams. In Team management, create a second team, enter an invitation email, choose Coach or Athlete, and generate a link. To try it locally, open the link in another tab of the **same browser profile and origin** and enter the invited email and name. Demo invitations simulate identity. Hosted invitations require a verified email. Coaches share links themselves.
2. In Program builder, name the current session. In Exercise & session library, enter an exercise name, dosage and primary focus, then choose Save and add exercise. Add additional saved exercises, then Save current session. Saved sessions can be reused inside programs or scheduled directly in the weekly planner.
3. In Weekly planner, select the team or athlete. Open Schedule training or event, choose a saved session, game or practice, and choose its date, Oslo start time, planned minutes and number of weekly occurrences. Publishing creates separate entries for each recipient and week.
4. As the athlete, open Profile to add a portrait, position and bio. Use Plan to add a personal session or court activity. Personal entries appear in the coach's view of the same team. Check exercises or attendance and share an effort rating.
5. As the coach, select that athlete and week in the planner. Health monitor shows prescribed versus checked sets and exercises by body focus, prior-week planned sets, ratings, and scheduled versus attended court minutes. An exercise with no explicit set count contributes one exercise and zero counted sets. The monitor offers a coaching prompt based on the logged data. It does not estimate injury risk or change the plan. Use Draft follow-up in Athlete feedback to review and publish the next prescription.

## Set up a shared pilot

1. Run `supabase/beta/install.sql` followed by every numbered script in that folder, from `002_programs.sql` through `009_match_pad.sql`, in ascending order. Next apply the timestamped SQL files in `supabase/migrations` in order. Existing installations run only the scripts they have not applied. Enable the Data API for the public schema. Keep `nhf_private` outside the exposed schemas.
2. Enable email/password signups with email confirmation. Configure the application origin and its login callback in Auth URL settings. Create the first confirmed coach account in Supabase and substitute its actual UUID below. Existing teams are migrated automatically. After bootstrap, coaches create/rename teams and generate seven-day, single-use invitations bound to email and role. Share the link privately. An invited user opens it, creates an account or signs in, confirms their email and accepts. Accounts without membership cannot access team data.

    ```sql
    with team as (insert into public.beta_teams(name) values ('Senior squad') returning id)
    insert into public.beta_members(id,squad,name,role)
    select 'COACH-USER-UUID'::uuid,id,'Head Coach','coach' from team;
    ```

3. Add the files from the beta source ZIP to a private GitHub repository at its root. Connect that repository to a Railway service. It includes a Dockerfile and Railway configuration. Set `NEXT_PUBLIC_SUPABASE_URL` to the project URL and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to its public publishable or anon key in Railway. These are browser-visible build variables. Use only the public key. Redeploy after changing either variable. Keep service-role and secret keys out of this project.
4. Generate a Railway domain under the service's Networking settings. Sign in separately as coach and athlete on two devices. Publish today's workout, complete it, refresh the coach view, and compare the CSV. Both devices should see sign-in on first visit. A demo selector means the build used blank Supabase variables.
5. Add your chosen subdomain under Custom Domain on that Railway service. At your DNS provider enter the DNS records Railway displays for that hostname. Wait for Railway to confirm verification and HTTPS, then repeat the two-device test on the subdomain.

## Verification

Team management can issue a seven-day reusable application link for the selected team. An athlete link can be issued by any coach; a coach link requires a team admin. Replacing or revoking a link prevents new submissions but preserves pending applications. Applicants provide name, phone and email on /apply, confirm their account and submit; no membership is granted until approval. Keep the production /apply invitation return URL allowed in Supabase Auth settings. Addressed invitations and six-character athlete join codes are separate, direct-admission options.

Under Staff & roster permissions, admin coaches can promote or demote additional staff and remove coaches. The last admin cannot be removed or demoted. All coaches can remove athletes. Removing a member preserves their login and team history. Removing an athlete expires the team's six-character join code; generate a fresh one as needed.

### Teams and match day

Use the role selector on /login. An athlete can register, verify their email, and visit /join to apply to a discoverable team or enter its six-character code. Email-addressed invitations still work for either role. Coaches enable discoverability and approve or decline applications on /team. Generating a team code replaces the previous one; codes last seven days. Hosted code entry is limited to five attempts per verified user per hour.

Team management has separate forms for Save (current name and logo) and Create team. Creating a team keeps the current publishing team selected. Paste up to 100 addresses, choose a role and select Send invitations or Create links only. Each recipient gets a separate message and an email-bound, seven-day link. Provider acceptance is not proof of inbox delivery. Demo mode only creates links.

For the Vercel pilot, import the club GitHub repo as Next.js. Set the two public Supabase variables before building, and set APP_ORIGIN=https://app.lundehaugenil.no, INVITE_FROM=noreply@lundehaugenil.no and RESEND_API_KEY as server settings. Add the custom domain in Project Settings / Domains and copy the displayed CNAME target to the app record in the club DNS zone. Never use a Supabase service key in the frontend.

Verify the sending domain lundehaugenil.no in Resend using its exact DNS records. Do not replace the club's root MX records. Set up custom SMTP in Supabase Auth for account-confirmation mail as well; configure its Site URL to the public app origin and allow its /login invitation and /join redirects. Test a new account and an existing account using a controlled inbox before inviting players. Run node tests/invitation-email.cjs after a demo production build for the mocked delivery checks.

From Match pad (/match), choose an opponent, date and lineup. Pick a shooter, outcome, and optional assister for a goal. Tap the attacking half court for shot origin. For goals and saves, also tap the goal target. Record the attempt. The maps display previous positions, and the table totals attempts, shots on goal, goals and assists for each player. Open Shot log or undo the latest entry. The recorder tracks the selected team's attack; opponent scoring and goalkeeper statistics are future features.

### Coach AI

Open **Program builder → AI coach assistant**. Select Polish text, Suggest program or Create exercise. Polish text includes the current session's exercise lines. Other modes use the training brief. Only enter training information you intend to send to OpenAI.

In the local demo, copy the prepared request into your own ChatGPT chat, paste its JSON reply into the assistant and select Preview reply. The coach chooses whether to apply the draft. Exercise suggestions fill the exercise editor; use Save and add exercise after reviewing it. Program suggestions replace the editable program draft. Save or publish separately.

For one-click generation, configure the authenticated Supabase deployment described above and set **OPENAI_API_KEY** in the server's runtime environment (Railway service variables or an ignored local `.env.local`). Restart the service. Use an OpenAI Platform project key with model access and API billing enabled. Optionally set **OPENAI_MODEL** to a Responses API model that supports strict structured outputs; the default is `gpt-5-mini`. Keep the key server-side. The route verifies the signed-in account's coach membership before calling OpenAI and requests `store: false`. The beta limits each coach to 20 requests per hour per running server process. The manual import works without an API key.

[OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart) · [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

`pnpm run build` checks app compilation and TypeScript. `node tests/beta-access.mjs` runs the beta schema and tests database role isolation, invitations, multi-team membership, personal plans and completion tracking in local PostgreSQL via PGlite. Run `node tests/beta-browser.cjs` and `node tests/team-week-browser.cjs` against the local demo on port 3217 with Playwright and Edge. Set `PLAYWRIGHT_PACKAGE`, `BROWSER_CHANNEL`, and `BETA_TEST_URL` to use another local installation or port.

The beta is intended for a small closed pilot. The coach view refreshes on focus and every 30 seconds. Run the hosted smoke test above before admitting testers.
