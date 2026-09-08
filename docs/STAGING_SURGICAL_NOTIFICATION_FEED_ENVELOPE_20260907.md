# STAGING Surgical Notification Feed Recovery — 2026-09-07

## Scope

Environment: STAGING only

Project ref: `snpvfsaixsekatnzrphu`

Production accessed: NO

Supabase CLI linked: NO (`UNLINKED_SAFE` restored before correction)

Migration history modified: NO

Full migration applied: NO

## Incident

The local Dashboard notification panel failed with PostgREST error `PGRST202`.

The application expected:

- `public.mhidas_get_social_notifications_feed(integer, boolean, timestamp with time zone, uuid)`
- `public.mhidas_get_social_notifications_envelope(integer, boolean, timestamp with time zone, uuid)`

Direct PostgreSQL catalog inspection in STAGING confirmed both functions were missing.

## Dependency audit

Confirmed PRESENT before correction:

- `public.notification_events` with RLS enabled
- `public.notification_recipients` with RLS enabled
- `public.social_notifications` with RLS enabled
- `public.mhidas_get_social_notification_unread_count()`
- `public.mhidas_mark_social_notification_read(uuid)`
- `public.mhidas_mark_all_social_notifications_read()`
- `public.mhidas_sync_social_notification_to_unified()`
- trigger `social_notifications.trg_social_notifications_unified_sync`

The required columns used by the canonical feed implementation were also confirmed present.

## Repository migration-history finding

`supabase migration list` showed twelve local migrations as not recorded remotely.

This was not treated as proof that their schema objects were absent.

A known example was `20260904162500_identity_governance_foundation_mvp1.sql`, whose objects had already been validated in STAGING despite the migration not appearing as remote-applied in CLI history.

For this reason, no `db push`, `migration repair`, or `--include-all` was used.

## Authorized surgical correction

Authorization:

`AUTORIZO CORREÇÃO CIRÚRGICA FEED + ENVELOPE NO STAGING`

Only these two functions were created, using the canonical definitions already present in repository migrations:

- `20260816010000_notification_central_unified_feed_runtime_v4_8_167.sql`
- `20260816023000_notification_central_feed_envelope_v4_8_167.sql`

No table, RLS policy, trigger, existing function, migration-history row, or application source file was altered by the database correction.

## Post-correction database validation

Both functions validated as:

- `security_definer = true`
- volatility `stable`
- `search_path = pg_catalog, public`
- authenticated execute = true
- service_role execute = true
- anon execute = false

## Functional validation

Authenticated Dashboard validation in a private browser confirmed:

- notification panel loads
- previous user-facing load error is absent
- empty state renders normally
- retry error state is absent

Result:

`PGRST202_USER_FACING_ERROR=RESOLVED`

The local Push/VAPID message about the public notification key is separate from this incident.

## Git safety

Pre-database checkpoint:

`0fc5192e155ab5f63ff75c1446f19309156ef068`

Remote WIP branch:

`wip/r8e-i-pre-db-surgical-20260907`

`origin/main` remained unchanged during the recovery workflow.

No production deployment, tag, or production database change was part of this recovery.