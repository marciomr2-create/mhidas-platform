# EVENT TICKET COMMERCIAL MIGRATION — SECOND CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versão

`v4.8.97-event-ticket-commercial-migration-second-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versão: `v4.8.96-event-ticket-commercial-migration-second-corrected-adjusted-draft-safe`
- commit: `ada5e61e4b45b6c4601100841177919efc11a437`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SECOND_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `B866D36FDAF867F84D27C920069A3D355BB1DF6387698E19A489E1958604F5B0`
- documentação base SHA256: `32BD967BF5BF1B66F31B2187CA5F980F3A8888A6798033FE79C64DA40C18614B`
- contrato base SHA256: `CB1A5C91521B9304004ECA927168E28E228A7A44C56E67E5E5D99573A4AECAF8`

## Decisão

`needs_adjustment`

O rascunho v4.8.96 corrigiu os dez bloqueadores da revisão anterior. A terceira revisão estrutural independente encontrou nove incompatibilidades adicionais: seis críticas e três altas. A promoção continua bloqueada.

## Resumo dos achados

| # | Chave | Severidade | Resumo |
|---:|---|---|---|
| 1 | `url_validation_nullable_boolean_bypass` | critical | Validação de URL aceita prova nula por lógica ternária |
| 2 | `authenticated_purchase_signal_read_exposes_sensitive_evidence` | critical | Leitura própria expõe evidências e valores comerciais sensíveis |
| 3 | `trusted_integration_not_bound_to_verified_partner_lifecycle` | critical | Integração ativa não depende do estado atual do parceiro |
| 4 | `system_click_user_identity_is_caller_controlled` | critical | Identidade do usuário em clique de sistema é controlada pelo chamador |
| 5 | `receipt_idempotency_is_not_atomic_under_concurrency` | critical | Idempotência continua vulnerável a concorrência |
| 6 | `active_channel_can_outlive_active_retention_policy` | critical | Canal ativo pode continuar público após retirada da política de retenção |
| 7 | `attributed_conversion_transaction_deduplication_missing` | high | Conversão atribuída não possui unicidade por transação |
| 8 | `trusted_integration_channel_event_relation_not_constrained` | high | Escopo integração–canal–evento pode ficar internamente inconsistente |
| 9 | `trusted_integration_registry_has_no_controlled_audited_lifecycle` | high | Registro de integrações não possui caminho controlado e auditado de mutação |

## Achados estruturais

### 1. Validação de URL aceita prova nula por lógica ternária

**Severidade:** `critical`

**Chave:** `url_validation_nullable_boolean_bypass`

A função de freshness pode retornar NULL quando hashes ou timestamps obrigatórios estão ausentes. A RPC usa IF NOT sobre esse resultado; em PL/pgSQL, NOT NULL continua NULL e o bloco de rejeição não é executado. O CHECK da tabela também aceita NULL, pois constraints CHECK rejeitam somente FALSE.

**Evidências:** mhidas_ticket_url_proof_is_fresh_v3 usa uma cadeia booleana sem COALESCE; mhidas_record_event_ticket_channel_url_validation_v3 usa if not função(...) then; event_ticket_commercial_channels_url_proof_v490_check não exige IS NOT NULL para todos os hashes.

**Correção exigida:** Tornar o predicado estritamente booleano com COALESCE(..., false), testar IS NOT TRUE e exigir NOT NULL explícito para toda evidência de uma prova validated.

### 2. Leitura própria expõe evidências e valores comerciais sensíveis

**Severidade:** `critical`

**Chave:** `authenticated_purchase_signal_read_exposes_sensitive_evidence`

O GRANT SELECT de tabela inteira combinado com a policy user_id = auth.uid() entrega ao clubber todas as colunas do sinal, incluindo namespace do provedor, hashes de transação, assinatura, replay, evidência e valores bruto/comissão.

**Evidências:** grant select on table public.event_ticket_purchase_signals to authenticated; policy event_ticket_purchase_signals_own_or_admin_read_v490; colunas transaction_hash, signature_validation_hash, replay_nonce_hash, gross_amount_minor e commission_amount_minor.

**Correção exigida:** Usar view/RPC redigida ou grants por coluna; manter os campos de integração e finanças disponíveis somente para administração e processamento servidor.

### 3. Integração ativa não depende do estado atual do parceiro

**Severidade:** `critical`

**Chave:** `trusted_integration_not_bound_to_verified_partner_lifecycle`

A ativação da integração exige verificação administrativa, mas não exige que commercial_partners permaneça verified. A RPC de sinais busca apenas integration_status = active, permitindo que parceiro suspenso ou desativado continue enviando conversões.

**Evidências:** event_ticket_trusted_integrations possui partner_id; constraint de ativação verifica somente verified_by_admin_user_id e verified_at; mhidas_record_event_ticket_purchase_signal_v3 não junta commercial_partners.

**Correção exigida:** Vincular uso e ativação ao parceiro verified, bloquear suspensão/desativação com integração ativa ou suspender/revogar integrações atomicamente.

### 4. Identidade do usuário em clique de sistema é controlada pelo chamador

**Severidade:** `critical`

**Chave:** `system_click_user_identity_is_caller_controlled`

No fluxo commercial_link_click, p_user_id é gravado diretamente. A RPC só compara o usuário quando o click já possui user_id; para clique anônimo, o service_role pode associar qualquer usuário, alterando ownership, leitura RLS e métricas.

**Evidências:** ramo commercial_link_click define actor_role system; p_user_id entra diretamente no INSERT; validação usa if v_click.user_id is not null antes de comparar.

**Correção exigida:** Derivar user_id exclusivamente do registro de click ou exigir igualdade com IS NOT DISTINCT FROM, sem aceitar enriquecimento arbitrário.

### 5. Idempotência continua vulnerável a concorrência

**Severidade:** `critical`

**Chave:** `receipt_idempotency_is_not_atomic_under_concurrency`

O fluxo consulta recibo e só depois grava o recibo ou executa a mutação. Duas requisições simultâneas podem passar pela consulta inicial; a segunda termina em unique violation ou conflito de lock, em vez de retornar deterministicamente o primeiro resultado.

**Evidências:** mhidas_ticket_assert_receipt_replay_v2 ocorre antes da reserva do recibo; event_ticket_operation_receipts_semantic_v493_uq é a única barreira concorrente; não há INSERT ON CONFLICT, advisory lock ou segunda leitura após conflito.

**Correção exigida:** Reservar a chave idempotente atomicamente antes do efeito, usar upsert/lock transacional e retornar o resultado vencedor em concorrência.

### 6. Canal ativo pode continuar público após retirada da política de retenção

**Severidade:** `critical`

**Chave:** `active_channel_can_outlive_active_retention_policy`

O trigger valida a policy quando o canal é inserido ou atualizado, mas nada impede a policy de mudar para retired depois. A resolução pública v3 não verifica se a policy associada ao canal ainda está active.

**Evidências:** event_ticket_channel_retention_policy_guard_v496 executa apenas em mudanças do canal; event_ticket_retention_policy_versions permite lifecycle até retired; mhidas_resolve_public_event_ticket_action_v3 não consulta policy_status.

**Correção exigida:** Bloquear retirement enquanto houver canal dependente ativo ou pausar canais atomicamente; a resolução pública também deve falhar fechada quando a policy não estiver active.

### 7. Conversão atribuída não possui unicidade por transação

**Severidade:** `high`

**Chave:** `attributed_conversion_transaction_deduplication_missing`

O índice global de transação foi removido e o novo índice cobre somente confirmed_conversion. A mesma transação pode gerar várias attributed_conversion com idempotency keys ou nonces diferentes, inflando atribuição.

**Evidências:** drop index public.event_ticket_purchase_signals_transaction_v490_uq; event_ticket_purchase_signals_confirmed_transaction_v496_uq usa where signal_type = confirmed_conversion; replay_nonce e recibo não garantem unicidade semântica da transação atribuída.

**Correção exigida:** Criar entidade transacional canônica ou unicidade por integração/provedor/hash/estágio, com regra explícita de progressão attributed para confirmed.

### 8. Escopo integração–canal–evento pode ficar internamente inconsistente

**Severidade:** `high`

**Chave:** `trusted_integration_channel_event_relation_not_constrained`

A tabela de autorização armazena channel_id e canonical_event_id separadamente, porém não existe FK composta ou trigger garantindo que o evento seja o evento do canal. A RPC falha fechada, mas o registro pode conter autorizações active inválidas e auditoria ambígua.

**Evidências:** event_ticket_trusted_integration_channels possui channel_id e canonical_event_id; primary key cobre apenas integration_id e channel_id; ausência de constraint composta com event_ticket_commercial_channels.

**Correção exigida:** Remover a duplicação do evento ou criar chave composta/trigger que imponha igualdade antes de permitir authorization_status active.

### 9. Registro de integrações não possui caminho controlado e auditado de mutação

**Severidade:** `high`

**Chave:** `trusted_integration_registry_has_no_controlled_audited_lifecycle`

As tabelas de integrações são centrais para evidência confiável, mas não possuem lock_version, guard trigger, RPC administrativa, recibos de idempotência ou auditoria de ativação, suspensão e revogação.

**Evidências:** create table event_ticket_trusted_integrations; create table event_ticket_trusted_integration_channels; somente grants de leitura e nenhuma RPC de lifecycle definida.

**Correção exigida:** Adicionar lifecycle transacional administrado, optimistic concurrency, evidência obrigatória, auditoria append-only e revogação atômica dos escopos.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo da autorização administrativa;
3. onboarding verificado de parceiros e integrações;
4. semântica financeira comercial;
5. validador server-side de URLs;
6. registro real de namespaces e credenciais de provedores;
7. base legal, retenção e anonimização;
8. mapeamento do legado;
9. backup, dry-run e reconciliação;
10. testes paralelos de concorrência e falhas.

## Limites desta versão

- não altera o SQL v4.8.96;
- não cria migration executável;
- não move arquivos para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não ativa canal comercial;
- não altera a página pública.

## Próxima decisão permitida

Criar um quarto plano de ajustes protegido para os nove achados. Nenhum SQL novo pode ser promovido antes da correção e de outra revisão estrutural independente.
