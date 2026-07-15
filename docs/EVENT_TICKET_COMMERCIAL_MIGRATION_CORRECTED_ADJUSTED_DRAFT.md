# Rascunho corrigido da migration comercial de ingressos — v4.8.93

## Decisão

`corrected_adjusted_draft_ready_for_second_structural_review`

Esta versão cria um novo SQL completo e protegido que aplica o segundo plano de ajustes da v4.8.92. O SQL da v4.8.90 permanece preservado e inalterado.

## Base

- versão-base: `v4.8.92-event-ticket-commercial-adjusted-draft-second-adjustment-plan-safe`
- commit-base: `c366f752abb380487dc1d3378d78d484b2715bf4`
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT.sql`
- novo SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 do novo SQL: `4DC566C2B3259DEC30498BC4BD3FF77AA9B52AA0D9A9F8B65013DD81B15CFECE`
- instruções PostgreSQL reconhecidas pelo parser: `145`

## Correções aplicadas

| Bloqueador v4.8.91 | Estado | Correção |
|---|---|---|
| `automation_expiry_state_mismatch` | corrigido | Expiração automática alinhada aos estados authorized, active e paused, com allowlist de colunas, recibo por canal e contagem apenas de updates efetivos. |
| `idempotency_receipt_not_bound_to_actor_and_request` | corrigido | Recibos vinculados a principal, operação, alvo, expected_lock_version e request_hash; autorização ocorre antes do replay. |
| `metadata_privacy_guard_is_denylist_only` | corrigido | Metadata passa a usar allowlists por contexto, formato plano, limite de bytes/itens e rejeição de valores com URL, token, e-mail, telefone ou IP. |
| `purchase_signal_retention_mutation_scope_too_broad` | corrigido | Trigger permite somente a allowlist de anonimização durante RPC dedicada e congela todos os campos factuais. |
| `retention_delete_conflicts_with_signal_lineage_and_audit_fk` | corrigido | DELETE de purchase signals foi removido; sinais são tombstoned antes dos cliques e cliques ainda referenciados são anonimizados, preservando lineage e auditoria. |
| `partner_membership_ambiguity_and_partner_status_gap` | corrigido | Representante é validado pelo partner_id exato, parceiro verified, representação active e vigência válida. |
| `url_validation_freshness_is_optional_and_resolver_fail_open` | corrigido | Booleano do chamador foi removido; drafts iniciam pending, somente RPC service-role registra prova e authorize/activate/cutover/resolver exigem validação fresca e saudável. |

## Controles de segurança preservados

- guarda incondicional antes do primeiro DDL;
- transação encerrada em `ROLLBACK`;
- SQL fora de `supabase/migrations`;
- ausência de `CREATE OR REPLACE` e de DDL permissivo com `IF NOT EXISTS`;
- nenhuma execução de migration;
- nenhum acesso ao Supabase;
- nenhuma escrita no banco;
- nenhuma alteração de página pública ou ativação de link comercial;
- promoção bloqueada até segunda revisão estrutural independente.

## Dependências externas ainda abertas

- `fresh_production_schema_inventory`
- `admin_authorization_rpc_contract`
- `verified_partner_onboarding`
- `commercial_financial_semantics`
- `server_side_url_validator`
- `ticketing_provider_namespace_registry`
- `privacy_legal_basis_and_retention`
- `legacy_partner_and_event_mapping`
- `backup_dry_run_and_reconciliation`
- `parallel_concurrency_and_failure_tests`

## Resultado

- `corrected_adjustments=7`
- `critical_corrections=6`
- `high_corrections=1`
- `postgres_statement_count=145`
- `previous_adjusted_draft_changed=False`
- `promotion_allowed=False`
- `executable_migration_created=False`
- `sql_moved_to_supabase_migrations=False`
- `supabase_operation_performed=False`
- `database_write_performed=False`
- `public_event_page_changed=False`
- `ticket_link_activated=False`

## Próximo passo permitido

Executar uma segunda revisão estrutural independente sobre o novo SQL. Nenhuma promoção ou operação de banco é permitida nesta versão.
