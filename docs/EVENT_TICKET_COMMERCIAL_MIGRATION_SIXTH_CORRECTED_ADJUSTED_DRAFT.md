# EVENT TICKET COMMERCIAL MIGRATION — SIXTH CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.106-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-safe`

## Base

- revisão: `v4.8.105-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-structural-review-safe`
- commit: `4e075b71be20883210da9e1fd4ee47fc943f4e50`
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 do SQL anterior: `66ACF4664829AC9722B2DEF1A029D3CE42D883F30A34522DC782B0AE9699B161`

## Decisão

`sixth_corrected_adjusted_draft_ready_for_seventh_structural_review`

Novo rascunho protegido que aplica diretamente a matriz da v4.8.105. Não substitui o SQL anterior e não é uma migration executável.

## Correções incorporadas

| # | Chave | Severidade | Implementação |
|---:|---|---|---|
| 1 | `credential_bound_receipt_insert_violates_pair_presence` | `critical` | Recibo v5 insere integração e credencial atomicamente. |
| 2 | `class_specific_retention_policies_not_seeded` | `critical` | Policies ativas de recibo e auditoria são materializadas e validadas. |
| 3 | `new_security_definer_functions_keep_public_execute` | `critical` | Matriz explícita de REVOKE e GRANT para boundaries SECURITY DEFINER. |
| 4 | `trusted_signal_v6_nests_legacy_receipt_and_audit_path` | `critical` | Writer v7 usa um único recibo, insert direto e auditoria credential-bound. |
| 5 | `credential_context_lifecycle_has_no_receipt_or_audit_lineage` | `high` | Lifecycle de contexto possui recibo, auditoria e correlação. |
| 6 | `credential_context_issuance_retry_is_not_idempotent` | `high` | Emissão v2 retorna replay durável pelo recibo semântico. |
| 7 | `retention_minimization_rules_are_declarative_only` | `high` | Executor fechado aplica minimização a recibos e auditoria. |
| 8 | `governance_retention_batch_v2_lacks_durable_run_and_idempotency` | `high` | Batch v3 persiste run, recibo terminal, contagens e auditoria. |
| 9 | `cascade_audit_replacements_are_missing` | `high` | RPCs administrativas v3 substituem contratos revogados. |


## Validação estática

- instruções PostgreSQL analisadas: `442`;
- ajustes corrigidos: `9`;
- críticos: `4`;
- altos: `5`;
- guarda incondicional antes do primeiro DDL;
- transação encerrada em `ROLLBACK`;
- sem `CREATE OR REPLACE`;
- sem DDL permissivo com `IF NOT EXISTS`;
- nove evidências positivas e nove testes negativos;
- SQL v4.8.104 preservado;
- promoção bloqueada.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo de autorização administrativa;
3. serviço real de verificação criptográfica e emissão de contexto;
4. semântica financeira comercial;
5. registro real de namespaces e credenciais;
6. base legal, retenção e anonimização;
7. testes paralelos de concorrência e falhas;
8. backup e rollback de produção;
9. teste de performance e volume;
10. revisão estrutural independente do novo SQL.

## Limites

- não executa migration;
- não move SQL para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa canal comercial;
- não altera página pública.

## Próxima evolução

Executar revisão estrutural independente deste SQL, já com matriz de remediação integrada caso ainda existam bloqueadores.
