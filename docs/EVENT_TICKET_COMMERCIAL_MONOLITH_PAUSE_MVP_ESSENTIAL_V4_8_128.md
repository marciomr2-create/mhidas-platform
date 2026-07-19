# Event Ticket Commercial Monolith Pause — MVP Essential v4.8.128

## Decision

The monolithic commercial ticket migration is removed from the active deployment path for the demonstrable MVP and the essential monetization plan.

Removed from the active migration path:

`supabase/migrations/20260717150000_event_ticket_commercial_governance.sql`

Original source commit:

`be32e9de5f470f20cdf700f0b8dadd835e21dfa0`

Original SHA256:

`C0570F61BF76F63CF23D16A9F36E2299CCFD567801A5DB7C057AD7FA0E302742`

## Why

The migration combines partner governance, commercial channels, credential management, click attribution, purchase signals, communications, retention, audit, backfill, ACL and RLS in one deployment unit.

The staging database is known to remain at `prerequisite_applied`, with this migration not applied after verified rollback.

The demonstrable MVP and the essential monetization plan do not require this monolithic deployment unit.

## Preserved

The following remain in the active migration path:

- `20260717145900_event_ticket_security_prerequisites_fail_closed.sql`
- `20260717145950_event_ticket_pgcrypto_namespace_compatibility.sql`
- official event validation;
- canonical event model;
- official reference links;
- existing belonging and ticket-intent foundations;
- radar, rides, meetings and check-in;
- all commercial planning and review documents;
- the complete Git history of the removed migration.

## Recovery

The exact original migration can be recovered without rewriting history:

```powershell
git show be32e9de5f470f20cdf700f0b8dadd835e21dfa0:supabase/migrations/20260717150000_event_ticket_commercial_governance.sql
```

## Essential monetization plan

The replacement will be implemented later in small, isolated changes:

1. one private sales-link table;
2. admin-only create, activate, pause and replace operations;
3. public resolution with a safe official-link fallback;
4. minimal click attribution only after the core flow is stable.

The old monolithic migration must not be reused as the base of the replacement.

## Safety status

- database access during this cut: false;
- staging modification during this cut: false;
- production access: false;
- Git history rewrite: false;
- force push: false.
