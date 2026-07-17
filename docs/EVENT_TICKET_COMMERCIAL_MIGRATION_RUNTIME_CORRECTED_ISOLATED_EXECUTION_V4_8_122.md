# EVENT TICKET COMMERCIAL MIGRATION — RUNTIME-CORRECTED ISOLATED EXECUTION

## Version

`v4.8.122-event-ticket-commercial-migration-runtime-corrected-isolated-postgresql-execution-safe`

## Frozen base

- gate: `v4.8.121-event-ticket-commercial-migration-thirteenth-corrected-adjusted-draft-final-frozen-gate-safe`;
- base commit: `7d28571cdf60b70f9e26c298d8fbc4fd3ed7ff29`;
- original protected SQL SHA256: `2616F739754484EAF56252F06C8E38BF3E5E21E6A0B2450B31016B0693242549`;
- runtime-corrected protected SQL SHA256: `D6292E37EFC430E5D94D073F560C5B37066203C2E74C5D948BF46CA78E2FE4C1`;
- PostgreSQL image: `postgres:16-alpine`.
- parsed PostgreSQL statements: `149`.

## Reproducible runtime defects closed

1. `event_ticket_retention_policy_versions` used `rule_manifest_hash` without declaring the column. The corrected draft adds the protected column with a 64-character hash invariant.
2. `mhidas_ticket_try_uuid_v1` rejected PostgreSQL-compatible UUID values when their version and variant bits did not match a restrictive regular expression. The corrected helper now delegates validation to the native PostgreSQL `uuid` cast and returns `null` only for `invalid_text_representation`.
3. The purchase-signal request hash included `credential_context_id` and `context_token_hash`, while the credential context itself required that request hash before it could be issued. The corrected draft introduces `mhidas_ticket_purchase_signal_request_hash_v1`, a context-independent semantic hash that is computed before context issuance; the exact context ID and token remain independently bound and consumed by `mhidas_ticket_consume_verified_credential_context_v8`.
4. The retention executor contracts had the rule counts for `partner_communication` and `backfill_rejection` swapped. The corrected draft binds the actual counts: 6 and 5 respectively, while preserving the frozen total of 44 minimization rules.

No new product, security, commercial or governance requirement was introduced.

## Decision

`isolated_execution_passed`

The corrected SQL executed in disposable PostgreSQL databases under rollback, commit and fresh-repeat scenarios. All ten frozen runtime checks must pass before publication. The R9 package preserves complete-sweep execution and closes the final decoded PostgreSQL 22025 defect in the contract JSON hash-suffix validator. The original v4.8.120 SQL remained unchanged.

## Frozen runtime checks

1. DDL creation order and function-body compilation: `passed`.
2. Transaction rollback with zero persistent objects: `passed`.
3. Constraints, triggers, RLS and grants: `passed`.
4. Credential rotation and context lifecycle: `passed`.
5. Commercial channel activation, replacement and resolution: `passed`.
6. Purchase-signal idempotency and concurrency: `passed`.
7. Retention-family concurrency and global work budget: `passed`.
8. Legacy backfill, rejection, checksum, cutover and replay: `passed`.
9. Operation receipt terminal state and result contracts: `passed`.
10. Failure cleanup and repeatable execution: `passed`.

## Safety

- original protected SQL changed: `False`;
- executable migration created: `False`;
- Supabase operation performed: `False`;
- production database write performed: `False`;
- production promotion allowed: `False`.

## Exit

The next stage is creation of the definitive migration candidate from the runtime-corrected protected SQL.

5. The retention checkpoint JSON validator called `jsonb_object_length`, which is not part of the PostgreSQL JSONB processing API used by the isolated runtime. The corrected validator counts keys through `jsonb_object_keys` before enforcing the 12-key limit.
6. The repeatability assertions used `CAST(1/0 AS text)` in a CASE branch. PostgreSQL could evaluate the constant expression during planning, producing a false failure even when counts were correct. The assertions now use a procedural DO block and report actual mismatched counts.

7. The contract JSON validator used `LIKE '%\_hash' ESCAPE '\\'`. With `standard_conforming_strings=on`, the escape expression contained two characters, and PostgreSQL raised SQLSTATE `22025` (`invalid escape string`). The failure hash `F56BD47AB0371D4598913436F4BCCD95484FEB63B3A8144F3635852E9518B36A` was decoded exactly as `sha256('22025:invalid escape string')`. The corrected validator now identifies hash fields with `right(v_key,5)='_hash'`, eliminating escape-string semantics entirely.
