# Invitation delivery status

## Implementation

- Team management / Inviter / E-post shows the last 100 tracked sends for the
  selected team. Each recipient has a sender, status, check time and provider ID.
- Only a Resend delivery event (or its later open/click event) counts as delivered.
  Delivered means accepted by the receiving mail server, not read or inbox placement.
- Pending, queued, sent, delayed, bounced, failed, suppressed, complained,
  canceled and unknown are distinct. Failed status checks preserve the last status.
- Status is retrieved when the section opens, on refresh and every 65 seconds while
  visible. At most ten receipts are checked per request, oldest check first; each
  receipt is cached for 60 seconds. Sends older than 30 days keep their last status.
- No automatic resending. A timeout is unknown, not failed or delivered.
- Older invitations without provider IDs cannot be retroactively verified.
- Invitation tokens and email bodies are not stored in the delivery log.
- Authenticated team coaches may read receipts. Athletes and other teams cannot.
  Only the server service role writes authoritative status. All reads precede any
  privileged provider lookup; recipient and sender must match the returned receipt.

## Deployment

Database: supabase/beta/010_invitation_delivery.sql, applied through MCP migration
`invitation_delivery_receipts` on 2026-11-18. Existing invitations are unchanged.

Server-only environment variables:
- RESEND_API_KEY: sending key, as before.
- RESEND_READ_API_KEY: Full access key for receipt lookup. When absent, lookup tries
  RESEND_API_KEY. A sending-only key produces an explicit read-permission warning.
- SUPABASE_SERVICE_ROLE_KEY: write delivery receipts. Never expose to the browser.
- INVITE_FROM: defaults to noreply@lundehaugenil.no.
- APP_ORIGIN: defaults to https://app.lundehaugenil.no.

If the service-role setting is missing, the existing Resend sending path remains
available, with an explicit warning that delivery tracking is unavailable. A
missing sending key still blocks sending. A configured but failed database write
stops sending before transport. Manual invitation links still work. Supabase SMTP and WordPress
FluentSMTP are separate and are not modified by this implementation.

## Verification

- tests/invitation-delivery.cjs: mocked Resend transport; IDs, statuses, timeout,
  malformed receipt, rejected send, mismatched recipient, read permission, throttling,
  authorization boundary, database failure and missing configuration.
- tests/invitation-delivery-access.mjs: PGlite RLS, coach/athlete/other-team/anon;
  clients cannot insert, update or delete delivery receipts.
- tests/invitation-delivery-browser.cjs: actual React component with isolated mock
  auth and HTTP, refresh, reload, retained status after error, 1280/390/360 px.
- tests/player-access.mjs and production Next build/typecheck pass.
- No new security advisor findings for beta_invitation_deliveries.

These tests do not prove production email delivery. The end-to-end acceptance
check requires an actual send to the authorized test alias, provider status,
mailbox receipt with From header, and the invitation on a mobile viewport.
Previous direct-link test confirmed correct athlete enrollment in Lundehaugen IL;
the earlier email itself was not found in the mailbox.

## Operational limitations

This is on-demand polling, not a background delivery webhook. No claim is made
that a delivery error will notify a coach while the page is closed. For more than
100 sends the UI is a recent-send view, not an unlimited historical archive.

References:
- https://resend.com/docs/api-reference/emails/send-batch-emails
- https://resend.com/docs/api-reference/emails/retrieve-email
- https://resend.com/docs/dashboard/emails/manage-emails
