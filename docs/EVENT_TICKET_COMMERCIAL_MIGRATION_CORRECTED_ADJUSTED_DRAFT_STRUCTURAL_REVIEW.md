# EVENT TICKET COMMERCIAL MIGRATION — CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versão

`v4.8.94-event-ticket-commercial-migration-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versão: `v4.8.93-event-ticket-commercial-migration-corrected-adjusted-draft-safe`
- commit: `9a32ab300bbcac163327cce9a60829221a18d32f`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `4DC566C2B3259DEC30498BC4BD3FF77AA9B52AA0D9A9F8B65013DD81B15CFECE`

## Decisão

`needs_adjustment`

Os sete bloqueadores da revisão anterior foram corrigidos no rascunho v4.8.93. A revisão independente encontrou dez incompatibilidades adicionais: sete críticas e três altas. A promoção continua bloqueada.

## Resumo dos achados

| 1 | `url_validation_rpc_not_executable_by_service_role` | critical | RPC de validação de URL fica inacessível ao service_role |
| 2 | `rls_read_policies_without_table_select_grants` | critical | Policies de leitura são anuladas pela ausência de privilégios SELECT |
| 3 | `purchase_signal_click_context_not_validated` | critical | Sinal de compra aceita click_id de outro evento ou canal |
| 4 | `retention_policy_is_caller_controlled_and_not_active_bound` | critical | Política e prazo de retenção são controlados pelo chamador |
| 5 | `purchase_signal_idempotency_scope_conflicts_with_receipts` | high | Unicidade global do sinal contradiz recibos por principal |
| 6 | `non_event_communication_receipt_target_is_nullable` | critical | Comunicação sem evento falha ao gravar recibo |
| 7 | `trusted_integration_principal_not_namespaced` | high | Integrações confiáveis compartilham uma única identidade de idempotência |
| 8 | `signal_actor_type_evidence_matrix_missing` | critical | Tipos e fontes de evidência não são vinculados ao ator |
| 9 | `confirmed_conversion_lineage_semantics_incomplete` | critical | Conversão confirmada não exige lineage comercial coerente |
| 10 | `url_freshness_accepts_future_clock_and_missing_health_evidence` | high | Freshness aceita timestamps futuros e health check sem evidência obrigatória |

## Achados estruturais

### 1. RPC de validação de URL fica inacessível ao service_role

**Severidade:** `critical`

**Chave:** `url_validation_rpc_not_executable_by_service_role`

A função de validação é revogada de public, anon e authenticated, mas não recebe GRANT EXECUTE para service_role. Como authorize, activate e atomic_cutover exigem prova fresca, nenhum canal consegue avançar pelo fluxo previsto.

**Evidências:** revoke all on function public.mhidas_record_event_ticket_channel_url_validation_v2; SERVICE_ROLE_REQUIRED; ausência de grant execute da função para service_role.

**Correção exigida:** Conceder EXECUTE exclusivamente ao service_role e adicionar preflight/teste de privilégios efetivos antes da promoção.

### 2. Policies de leitura são anuladas pela ausência de privilégios SELECT

**Severidade:** `critical`

**Chave:** `rls_read_policies_without_table_select_grants`

As tabelas novas recebem REVOKE ALL e policies SELECT, porém não recebem GRANT SELECT. RLS filtra acesso, mas não substitui o privilégio de tabela; parceiros, clubbers e administradores não conseguem usar as leituras declaradas.

**Evidências:** revoke all on table public.event_ticket_partnership_requests; create policy event_ticket_partnership_requests_own_partner_or_admin_read_v490; ausência de grant select nas tabelas novas.

**Correção exigida:** Definir grants de coluna/tabela compatíveis com cada policy ou criar RPCs de leitura explícitas e remover policies sem caminho de uso.

### 3. Sinal de compra aceita click_id de outro evento ou canal

**Severidade:** `critical`

**Chave:** `purchase_signal_click_context_not_validated`

A RPC valida o evento do parent_signal_id e do channel_id, mas não verifica se click_id pertence ao mesmo canonical_event_id e channel_id. Isso permite lineage e atribuição cruzados.

**Evidências:** p_click_id é inserido diretamente; validação de event_ticket_commercial_channels existente; ausência de consulta a event_ticket_click_attributions antes do insert.

**Correção exigida:** Bloquear inserção quando click, evento e canal não coincidirem; exigir também consistência com o usuário quando aplicável.

### 4. Política e prazo de retenção são controlados pelo chamador

**Severidade:** `critical`

**Chave:** `retention_policy_is_caller_controlled_and_not_active_bound`

A RPC de sinais aceita retention_policy_version_id e retention_expires_at sem exigir policy active nem calcular o prazo a partir da política. Canais rastreados também podem referenciar versões draft, approved ou retired.

**Evidências:** p_retention_policy_version_id; p_retention_expires_at; tracking_method = none or retention_policy_version_id is not null.

**Correção exigida:** Resolver a política ativa no servidor, derivar retention_expires_at de seus dias e impedir authorize/activate quando a versão não estiver active.

### 5. Unicidade global do sinal contradiz recibos por principal

**Severidade:** `high`

**Chave:** `purchase_signal_idempotency_scope_conflicts_with_receipts`

Os recibos permitem a mesma idempotency_key para principais diferentes, mas event_ticket_purchase_signals impõe UNIQUE somente sobre idempotency_key. Dois usuários ou integrações podem colidir apesar de semanticamente independentes.

**Evidências:** event_ticket_purchase_signals_idempotency_v490_uq; on public.event_ticket_purchase_signals (idempotency_key); event_ticket_operation_receipts_semantic_v493_uq.

**Correção exigida:** Alinhar a chave do sinal ao principal/provedor ou remover a unicidade redundante e tornar o recibo a autoridade de idempotência.

### 6. Comunicação sem evento falha ao gravar recibo

**Severidade:** `critical`

**Chave:** `non_event_communication_receipt_target_is_nullable`

canonical_event_id é opcional para várias comunicações, mas create_draft usa esse campo como target_id do recibo, que é NOT NULL. A transação é revertida para music_release, exclusive_content, community_call e outros casos sem evento.

**Evidências:** canonical_event_id uuid sem NOT NULL; v_receipt_target_id := canonical_event_id; event_ticket_operation_receipts.target_id uuid not null.

**Correção exigida:** Usar partner_id ou communication_id como alvo idempotente e incluir o target_type correspondente no contrato de recibos.

### 7. Integrações confiáveis compartilham uma única identidade de idempotência

**Severidade:** `high`

**Chave:** `trusted_integration_principal_not_namespaced`

Todos os sinais trusted usam principal_type trusted_ticketing_integration e principal_id NULL. provider_namespace participa do payload, mas não da chave única do recibo, causando colisões entre provedores com a mesma chave.

**Evidências:** v_principal_type = trusted_ticketing_integration; v_actor_user_id := null; coalesce(principal_id, zero uuid) na unicidade do recibo.

**Correção exigida:** Adicionar integration_id/provider_namespace validado à identidade do principal e vinculá-lo ao registro oficial de provedores.

### 8. Tipos e fontes de evidência não são vinculados ao ator

**Severidade:** `critical`

**Chave:** `signal_actor_type_evidence_matrix_missing`

No fluxo clubber basta p_user_id coincidir com auth.uid(). O usuário pode declarar commercial_link_click com evidence_source useclubbers_redirect ou preencher campos reservados a integrações, contaminando métricas.

**Evidências:** ramo else define actor_role clubber; signal_type e evidence_source entram diretamente no INSERT; constraints não criam matriz ator × tipo × evidência.

**Correção exigida:** Aplicar matriz fail-closed por ator, signal_type e evidence_source; limpar ou rejeitar campos não permitidos em cada classe.

### 9. Conversão confirmada não exige lineage comercial coerente

**Severidade:** `critical`

**Chave:** `confirmed_conversion_lineage_semantics_incomplete`

confirmed_conversion exige apenas parent_signal_id do mesmo evento. Não exige parent attributed_conversion, canal igual, mesmo provider/transaction ou progressão de evidência.

**Evidências:** signal_type confirmed_conversion or correction exige parent_signal_id; parent check compara somente canonical_event_id; ausência de validação do tipo, canal e transação do parent.

**Correção exigida:** Definir grafo de transições permitido e validar parent type, evento, canal, provider_namespace, transaction_hash e ausência de confirmação duplicada.

### 10. Freshness aceita timestamps futuros e health check sem evidência obrigatória

**Severidade:** `high`

**Chave:** `url_freshness_accepts_future_clock_and_missing_health_evidence`

A função exige expiry futura e health checked nas últimas 24 horas, mas não limita url_validated_at/last_health_checked_at ao presente. last_health_check_hash também pode ser NULL em uma prova considerada saudável.

**Evidências:** p_last_health_checked_at > now() - interval 24 hours; ausência de p_last_health_checked_at <= now(); last_health_check_hash é opcional.

**Correção exigida:** Aplicar tolerância de clock explícita, rejeitar timestamps futuros e exigir hash/versionamento da evidência de health check.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo da autorização administrativa;
3. onboarding verificado de parceiros;
4. semântica financeira comercial;
5. validador server-side de URLs;
6. registro de namespaces de provedores;
7. base legal, retenção e anonimização;
8. mapeamento do legado;
9. backup, dry-run e reconciliação;
10. testes paralelos de concorrência e falhas.

## Limites desta versão

- não altera o SQL v4.8.93;
- não cria migration executável;
- não move arquivos para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não ativa canal comercial;
- não altera a página pública.

## Próxima decisão permitida

Criar um terceiro plano de ajustes protegido. Nenhum SQL novo deve ser promovido antes de resolver os dez achados e repetir a revisão estrutural independente.
