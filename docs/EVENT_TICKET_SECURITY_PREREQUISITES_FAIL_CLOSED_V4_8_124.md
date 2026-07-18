# Event Ticket Security Prerequisites — Fail-Closed Foundation v4.8.124

## Decision

`fail_closed_security_prerequisites_created_and_isolated_validated`

The commercial migration remains unchanged. A new earlier migration creates the
four missing contracts as deliberately disabled, fail-closed adapters:

- `mhidas_is_useclubbers_admin_v1(uuid)` always returns `false`;
- both detached-signature verifiers always return `false`;
- URL-envelope decryption always raises
  `MHIDAS_URL_ENVELOPE_DECRYPTION_BACKEND_NOT_CONFIGURED_V1`.

This is not a permissive fixture and does not simulate successful security.
It allows the commercial schema to compile and be deployed while every
security-sensitive operation remains blocked.

## Ordering

1. `20260717145900_event_ticket_security_prerequisites_fail_closed.sql`
2. `20260717150000_event_ticket_commercial_governance.sql`

The v4.8.123 commercial migration is not modified.

## Privileges

- `anon`, `authenticated`, and `service_role` may call the admin predicate,
  which always denies;
- only `service_role` may directly call the signature and decryption adapters;
- `PUBLIC` execution is revoked from all four functions.

## Isolated validation

The package validates both migrations in two independent PostgreSQL 16
databases. Each database proves:

- the base fixture contains none of the four prerequisite functions;
- all four fail-closed contracts are created;
- authorization is denied;
- signatures are rejected;
- decryption raises the exact not-configured error;
- direct privileges are restricted;
- the unchanged commercial migration applies after the prerequisite migration;
- 25 commercial tables, 25 RLS-enabled tables, 32 commercial functions, and
  all expected seed contracts exist;
- the commercial migration does not replace or weaken the fail-closed adapters.

## Operational boundaries

- Supabase operation performed: false
- Staging database write performed: false
- Production database write performed: false
- Commercial operations enabled: false
- Staging schema installation allowed after this version: true
- Production promotion allowed: false

The real administrator authority, signature backend, and decryption backend
remain separate future evolutions. Replacing the adapters requires explicit
security design and independent validation.
