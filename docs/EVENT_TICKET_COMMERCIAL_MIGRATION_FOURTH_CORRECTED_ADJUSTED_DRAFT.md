# EVENT TICKET COMMERCIAL MIGRATION — FOURTH CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.102-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-safe`

## Base

- plano: `v4.8.101-event-ticket-commercial-third-corrected-draft-fifth-adjustment-plan-safe`
- commit: `b2f0bbf2a47d9b91b10cc4fbafb17204d48ba48c`
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 do SQL anterior: `A137453B2C7F2A1BF0E580498D0F19B4461EF1EF594D6EB87CB34600DDA66DA9`

## Decisão

`fourth_corrected_adjusted_draft_ready_for_fifth_structural_review`

Este artefato cria um novo rascunho protegido para os nove bloqueadores encontrados na v4.8.100. Ele não substitui o SQL v4.8.99, não é uma migration executável e permanece fora de `supabase/migrations`.

## Correções incorporadas

| # | Chave | Severidade | Implementação no rascunho |
|---:|---|---|---|
| 1 | `legacy_idempotency_paths_remain_non_atomic` | critical | Revogação dos caminhos v2, recibo atômico v4 e preflight de grants |
| 2 | `trusted_integration_identity_not_credential_bound` | critical | Versões de credencial, contexto server-side consumível e signal v5 |
| 3 | `partner_lifecycle_not_idempotent_or_transition_constrained` | critical | Lifecycle v2 com matriz, lock, recibo e snapshots |
| 4 | `retention_retirement_not_idempotent_or_state_guarded` | critical | Apenas `active -> retired`, com recibo e cascata transacional |
| 5 | `cascade_mutations_lack_per_object_audit` | critical | Auditoria individual para integração, scope e canal |
| 6 | `trusted_integration_onboarding_and_rotation_path_missing` | high | RPCs de onboarding e rotação com histórico de credencial |
| 7 | `integration_scope_terminal_insert_and_audit_identity_ambiguous` | high | Criação e transição separadas com identificador composto determinístico |
| 8 | `admin_full_purchase_signal_read_path_missing` | high | Leitura admin por finalidade, evento e período com auditoria |
| 9 | `audit_and_receipt_retention_contract_missing` | high | Retenção, holds e batch server-side de anonimização |

## Propriedades de segurança

- guarda incondicional antes do primeiro DDL;
- transação termina em `ROLLBACK`;
- sem `CREATE OR REPLACE`;
- sem DDL permissivo com `IF NOT EXISTS`;
- SQL v4.8.99 preservado;
- sem acesso ao Supabase;
- sem escrita no banco;
- sem alteração da página pública;
- sem ativação de canal comercial;
- promoção bloqueada.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo de autorização administrativa;
3. onboarding verificado de parceiros e integrações;
4. semântica financeira comercial;
5. validador server-side de URL e credencial;
6. registro real de namespaces e credenciais;
7. base legal, retenção e anonimização;
8. testes paralelos de concorrência e falhas;
9. backup e rollback de produção;
10. quinta revisão estrutural independente.

## Limites

- não executa migration;
- não move SQL para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa venda ou link comercial;
- não altera a página pública.

## Próxima decisão permitida

Executar uma quinta revisão estrutural independente deste rascunho. A promoção permanece proibida até fechamento dos pré-requisitos externos e aprovação explícita posterior.
