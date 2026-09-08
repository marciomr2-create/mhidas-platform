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
## R8E-I final readback

Environment: STAGING only

Execution mode: read-only transaction

Controlled request:

`R8E-I TESTE REVISAO ARTISTA 20260906`

Final request id:

`d89004f0-b252-42e5-ab28-942ad4257af6`

Final status:

`rejected`

Readback result:

- requester account count = 1
- reviewer account count = 1
- target request count = 1
- request kind = create
- requested entity type = artist
- submitted_at = present
- reviewed_at = present
- reviewed_by_user_id = expected reviewer
- decision_reason = present
- entity_id = null
- email_signal_status = unassessed
- professional_email_domain = null
- evidence count = 0
- document count = 0
- official entity side effect count = 0
- entity membership side effect count = 0
- public handle side effect count = 0
- verification email outbox count = 0
- audit row count = 6
- requester audit actors = 2
- reviewer audit actors = 4
- active verification_reviewer membership = 1
- target request remaining in review queue = 0

Audit sequence:

1. `verification.request_draft_created`
2. `verification.request_submitted`
3. `verification.request_review_started`
4. `verification.request_more_info_requested`
5. `verification.request_review_resumed`
6. `verification.request_rejected`

Actor-kind sequence:

1. user
2. user
3. reviewer
4. reviewer
5. reviewer
6. reviewer

More-info reason:

`Envie o site oficial ou outro canal público que confirme sua relação com esta identidade.`

Final rejection reason:

`Não foi possível confirmar a relação legítima com esta identidade com as informações apresentadas.`

Final classification:

`R8E_I_REVIEWER_REJECTION_FLOW=PASS`

Important scope note:

Final approval remains intentionally unimplemented in this macroblock. No official entity, entity membership, universal public handle, verification email, or approval side effect was created.

Database writes during this readback: NO

Production accessed: NO