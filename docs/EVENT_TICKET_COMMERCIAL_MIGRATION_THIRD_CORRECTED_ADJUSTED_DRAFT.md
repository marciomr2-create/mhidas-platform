# EVENT TICKET COMMERCIAL MIGRATION — THIRD CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.99-event-ticket-commercial-migration-third-corrected-adjusted-draft-safe`

## Base

- plano: `v4.8.98-event-ticket-commercial-second-corrected-draft-fourth-adjustment-plan-safe`
- commit base: `3d03bad5b60f5ecc8415f7d28c07efc28f7491d6`
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SECOND_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 anterior: `B866D36FDAF867F84D27C920069A3D355BB1DF6387698E19A489E1958604F5B0`

## Decisão

`third_corrected_adjusted_draft_ready_for_fourth_structural_review`

Este artefato cria um novo rascunho completo e protegido. Ele não substitui a v4.8.96, não entra em `supabase/migrations`, não acessa Supabase e não executa escrita no banco.

## Correções aplicadas

| # | Chave | Severidade | Resultado estrutural |
|---:|---|---|---|
| 1 | `url_validation_nullable_boolean_bypass` | `critical` | Prova de URL estritamente booleana e fail-closed |
| 2 | `authenticated_purchase_signal_read_exposes_sensitive_evidence` | `critical` | Leitura própria redigida sem evidência técnica ou finanças |
| 3 | `trusted_integration_not_bound_to_verified_partner_lifecycle` | `critical` | Integração vinculada ao estado verificado do parceiro |
| 4 | `system_click_user_identity_is_caller_controlled` | `critical` | Identidade derivada exclusivamente do clique server-side |
| 5 | `receipt_idempotency_is_not_atomic_under_concurrency` | `critical` | Reserva atômica do recibo antes do efeito |
| 6 | `active_channel_can_outlive_active_retention_policy` | `critical` | Retirada de policy pausa canais e resolução falha fechada |
| 7 | `attributed_conversion_transaction_deduplication_missing` | `high` | Unicidade de atribuição por transação canônica |
| 8 | `trusted_integration_channel_event_relation_not_constrained` | `high` | FK composta integração–canal–evento |
| 9 | `trusted_integration_registry_has_no_controlled_audited_lifecycle` | `high` | Lifecycle administrado, versionado e auditado |

## Controles centrais

1. A prova de URL v4 usa `COALESCE(..., false)` e as RPCs validam com `IS NOT TRUE`.
2. `authenticated` perde SELECT da tabela completa de sinais e recebe somente uma view redigida com `security_invoker`.
3. Integrações ativas exigem parceiro `verified` no lifecycle e em cada uso confiável.
4. O `user_id` do clique é derivado do registro server-side; o valor do chamador serve apenas para conferência.
5. O recibo idempotente é reservado com `INSERT ... ON CONFLICT DO NOTHING` antes do efeito e possui estados `pending`, `completed` e `failed`.
6. Retirada de policy ativa exige pausa atômica dos canais dependentes, e o resolvedor público consulta a policy atual.
7. Conversões atribuídas possuem unicidade semântica por integração, namespace e hash de transação.
8. A autorização da integração usa FK composta para garantir coerência entre canal e evento.
9. Integrações e escopos possuem `lock_version`, guards, RPCs administrativas e auditoria append-only.

## Segurança do rascunho

- guarda incondicional antes do primeiro DDL;
- termina obrigatoriamente em `ROLLBACK`;
- nenhuma cláusula `CREATE OR REPLACE`;
- nenhuma criação permissiva com `IF NOT EXISTS`;
- nenhuma operação Supabase;
- nenhuma escrita de banco realizada por esta versão;
- nenhuma alteração de página pública;
- promoção para migration executável permanece bloqueada.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo de autorização administrativa;
3. onboarding verificado de parceiros e integrações;
4. semântica financeira comercial;
5. validador server-side de URLs;
6. registro real de namespaces e credenciais;
7. contrato jurídico de retenção e anonimização;
8. testes paralelos de concorrência e falha;
9. plano de backup e rollback de produção;
10. nova revisão estrutural independente.

## Próxima decisão

A promoção só poderá ser considerada após uma quarta revisão estrutural independente do novo SQL e fechamento explícito das dependências externas.
