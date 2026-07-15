# EVENT TICKET COMMERCIAL MIGRATION — FIFTH CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.104-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-safe`

## Base

- revisão: `v4.8.103-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-structural-review-safe`
- commit: `4b268861090ca92b02fc7cb72ef2cb1cf3e78a44`
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 do SQL anterior: `E39D742A2505D5EE4B678469AF3DDB8B750B77D50CAE2E6FBADC8C56FC676444`

## Decisão

`fifth_corrected_adjusted_draft_ready_for_sixth_structural_review`

Este artefato aplica diretamente a matriz de remediação da v4.8.103. Ele cria um novo rascunho protegido, não substitui a v4.8.102 e não é uma migration executável.

## Correções incorporadas

| # | Chave | Severidade | Implementação |
|---:|---|---|---|
| 1 | `retention_policy_resolution_and_batch_scope_not_bound` | `critical` | Retenção determinística por finalidade, jurisdição e classe |
| 2 | `verified_credential_context_issuance_authority_missing` | `critical` | Emissão, revogação e expiração server-side do contexto de credencial |
| 3 | `current_credential_cross_integration_integrity_missing` | `critical` | Integridade composta entre integração e versão de credencial |
| 4 | `purchase_signal_replay_not_credential_bound_before_reservation` | `critical` | Reserva e replay vinculados à credencial antes do recibo |
| 5 | `cascade_audit_lineage_uses_legacy_writer` | `high` | Auditoria de cascata v3 vinculada ao recibo pai |
| 6 | `admin_signal_read_hash_not_same_snapshot_as_result` | `high` | Leitura administrativa e hash no mesmo snapshot SQL |
| 7 | `retention_anonymization_minimization_incomplete` | `high` | Matriz de minimização e remoção de identificadores brutos |
| 8 | `operation_receipt_failure_and_pending_replay_contract_incomplete` | `high` | Estado terminal e falha idempotente de recibos |

## Validação estrutural estática

- instruções PostgreSQL analisadas: `395`;
- guarda incondicional antes do primeiro DDL;
- transação terminada em `ROLLBACK`;
- sem `CREATE OR REPLACE`;
- sem DDL permissivo com `IF NOT EXISTS`;
- oito evidências positivas e oito testes negativos declarados;
- SQL anterior preservado;
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
10. sexta revisão estrutural independente.

## Limites

- não executa migration;
- não move SQL para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa canal comercial;
- não altera página pública.

## Próxima evolução

Executar revisão estrutural independente do novo SQL. A promoção permanece proibida.
