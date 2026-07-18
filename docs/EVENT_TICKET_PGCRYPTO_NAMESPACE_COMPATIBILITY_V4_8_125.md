# Event Ticket pgcrypto Namespace Compatibility — v4.8.125

## Decision

`pgcrypto_namespace_compatibility_created_and_isolated_validated`

The fail-closed prerequisite migration applied correctly in staging. The
unchanged commercial migration then failed while creating its first helper
because its fixed function search path is `public, pg_temp`, while Supabase
installs `pgcrypto` in the `extensions` schema.

The correction is a new migration ordered between the fail-closed prerequisite
and the commercial migration:

`20260717145950_event_ticket_pgcrypto_namespace_compatibility.sql`

The frozen commercial migration
`20260717150000_event_ticket_commercial_governance.sql` remains byte-for-byte
unchanged.

## Behavior

When `pgcrypto` is installed in `public`, the migration verifies the native
`digest(text,text)` and `hmac(text,text,text)` contracts and creates nothing.

When `pgcrypto` is installed in `extensions`, the migration creates two
owner-only compatibility adapters:

- `public.digest(text,text)` delegates to `extensions.digest`;
- `public.hmac(text,text,text)` delegates to `extensions.hmac`.

Direct execution is revoked from `PUBLIC`, `anon`, `authenticated`, and
`service_role`. The adapters exist only so the commercial helpers can compile
and run under their already reviewed fixed search path.

Any missing extension, unsupported extension schema, missing pgcrypto contract,
or conflicting public function causes a fail-closed exception.

## Isolated proof

The package validates the full chain in two independent PostgreSQL 16
databases:

1. `pgcrypto` installed in `public`;
2. `pgcrypto` installed in `extensions` with the Supabase search-path model.

Both databases apply, in order:

1. the base fixture;
2. `20260717145900` fail-closed security prerequisites;
3. `20260717145950` namespace compatibility;
4. the unchanged `20260717150000` commercial migration;
5. fail-closed assertions;
6. commercial structural postflight;
7. pgcrypto namespace and helper-output assertions.

## Operational boundaries

- Supabase operation performed: false
- Staging database write performed by this evolution: false
- Production database write performed: false
- Commercial migration modified: false
- Staging retry allowed after publication: true
- Production promotion allowed: false
