# EVENT TICKET COMMERCIAL MIGRATION — SECOND CORRECTED ADJUSTED DRAFT FOURTH ADJUSTMENT PLAN

## Versão

`v4.8.98-event-ticket-commercial-second-corrected-draft-fourth-adjustment-plan-safe`

## Base

- revisão estrutural: `v4.8.97-event-ticket-commercial-migration-second-corrected-adjusted-draft-structural-review-safe`
- commit: `27c122d91f0c00242f1bb8269cd4dcb0b8c777b4`
- SQL preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SECOND_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `B866D36FDAF867F84D27C920069A3D355BB1DF6387698E19A489E1958604F5B0`
- SHA256 documento base: `32BD967BF5BF1B66F31B2187CA5F980F3A8888A6798033FE79C64DA40C18614B`
- SHA256 contrato base: `CB1A5C91521B9304004ECA927168E28E228A7A44C56E67E5E5D99573A4AECAF8`
- SHA256 revisão estrutural: `8BD4972F023C9D3644D6D805504B91FDF44E5A2757050E25837854544C65851C`
- SHA256 contrato da revisão: `6625493D3F07C3EDD1F0FC53FCFD9A7B3125C2A4DC5D4F1A048832201B2AC56A`

## Decisão

`fourth_adjustment_plan_ready`

O plano converte os nove bloqueadores comprovados na v4.8.97 em mudanças técnicas e testes de aceitação. O SQL v4.8.96 permanece inalterado e a promoção continua bloqueada.

## Resumo

- fases: `6`
- ajustes obrigatórios: `9`
- críticos: `6`
- altos: `3`
- testes de aceitação: `45`
- dependências externas abertas: `10`
- próximo artefato permitido: `third_corrected_adjusted_migration_draft_safe`
- promoção para migration executável: `false`

## Fases

### 1. Fechar prova de URL e resolução pública

**Chave:** `url_proof_and_fail_closed_resolution`

Tornar toda validação estritamente booleana e impedir publicação com evidência incompleta.

### 2. Reduzir a superfície de leitura dos sinais

**Chave:** `purchase_signal_read_minimization`

Separar dados próprios do clubber de evidências técnicas e valores comerciais sensíveis.

### 3. Vincular integração, parceiro e escopo

**Chave:** `integration_partner_lifecycle_and_scope`

Garantir lifecycle administrado e coerência entre integração, parceiro, canal e evento.

### 4. Fechar identidade de clique e lineage transacional

**Chave:** `click_identity_and_transaction_lineage`

Derivar identidade no servidor e deduplicar progressões de conversão por transação.

### 5. Tornar a idempotência atômica

**Chave:** `atomic_idempotency_and_concurrency`

Reservar recibos antes dos efeitos e retornar resultados determinísticos sob concorrência.

### 6. Vincular retenção ao lifecycle e revisar novamente

**Chave:** `retention_policy_lifecycle_and_re_review`

Impedir canais ativos com política inválida e submeter o próximo rascunho a revisão independente.

## Plano dos ajustes

### 1. Transformar a prova de URL em predicado estritamente booleano

**Chave:** `url_validation_nullable_boolean_bypass`

**Severidade:** `critical`

**Fase:** `url_proof_and_fail_closed_resolution`

**Objetivo:** Eliminar qualquer caminho em que NULL seja interpretado como validação suficiente.

**Mudanças obrigatórias:**

1. Reescrever a função de freshness para retornar COALESCE(resultado, false) em todos os ramos.
2. Trocar verificações PL/pgSQL por IS NOT TRUE nas RPCs de validação, autorização, ativação e cutover.
3. Exigir NOT NULL para hashes, timestamps, versão do validador e estado healthy quando validation_status for validated.
4. Fazer o resolvedor público reutilizar a mesma função fail-closed e retornar fallback quando a prova estiver incompleta.

**Testes de aceitação:**

1. prova completa, íntegra e fresca retorna true.
2. qualquer hash obrigatório nulo retorna false.
3. timestamp obrigatório nulo retorna false.
4. RPC rejeita resultado NULL usando IS NOT TRUE.
5. resolvedor público não expõe canal com prova incompleta.

**Dependências:**

- `server_side_url_validator`
- `parallel_concurrency_and_failure_tests`

### 2. Criar leitura redigida para sinais próprios

**Chave:** `authenticated_purchase_signal_read_exposes_sensitive_evidence`

**Severidade:** `critical`

**Fase:** `purchase_signal_read_minimization`

**Objetivo:** Permitir ao clubber consultar somente o estado funcional do próprio sinal.

**Mudanças obrigatórias:**

1. Revogar SELECT de tabela inteira de authenticated em event_ticket_purchase_signals.
2. Criar view ou RPC redigida com colunas explicitamente permitidas para leitura própria.
3. Manter hashes técnicos, namespace, nonce, evidência, valores brutos e comissão restritos a serviço e administração.
4. Adicionar preflight que detecte grants de tabela ou coluna incompatíveis com a matriz de exposição.

**Testes de aceitação:**

1. clubber consulta somente sinal próprio pela superfície redigida.
2. clubber não recebe transaction_hash nem signature_validation_hash.
3. clubber não recebe gross_amount_minor nem commission_amount_minor.
4. service_role mantém acesso técnico necessário.
5. grant amplo para authenticated é detectado pelo preflight.

**Dependências:**

- `admin_authorization_rpc_contract`
- `commercial_financial_semantics`

### 3. Vincular integração ativa ao parceiro verificado

**Chave:** `trusted_integration_not_bound_to_verified_partner_lifecycle`

**Severidade:** `critical`

**Fase:** `integration_partner_lifecycle_and_scope`

**Objetivo:** Impedir uso de integração quando o parceiro estiver suspenso, desativado ou revogado.

**Mudanças obrigatórias:**

1. Exigir commercial_partners.partner_status = verified na ativação e em cada uso da integração.
2. Bloquear suspensão ou desativação do parceiro enquanto houver integrações active, salvo transação de suspensão em cascata.
3. Criar RPC administrativa que suspenda ou revogue parceiro, integrações e escopos atomicamente.
4. Registrar auditoria append-only da transição e da evidência administrativa utilizada.

**Testes de aceitação:**

1. parceiro verified com integração active pode operar.
2. parceiro suspended é rejeitado mesmo com integração marcada active.
3. desativação sem cascata é bloqueada quando há integração ativa.
4. suspensão em cascata revoga todos os escopos na mesma transação.
5. auditoria registra ator, motivo, estado anterior e estado final.

**Dependências:**

- `verified_partner_and_integration_onboarding`
- `admin_authorization_rpc_contract`

### 4. Derivar a identidade do clique exclusivamente no servidor

**Chave:** `system_click_user_identity_is_caller_controlled`

**Severidade:** `critical`

**Fase:** `click_identity_and_transaction_lineage`

**Objetivo:** Impedir enriquecimento ou troca arbitrária de user_id em sinais originados por clique.

**Mudanças obrigatórias:**

1. Remover p_user_id como autoridade no fluxo commercial_link_click.
2. Derivar user_id somente de event_ticket_click_attributions ou do principal autenticado validado.
3. Exigir igualdade com IS NOT DISTINCT FROM quando uma identidade também for fornecida para conferência.
4. Persistir origem da identidade e rejeitar associação posterior de clique anônimo a usuário arbitrário.

**Testes de aceitação:**

1. clique identificado gera sinal com o mesmo user_id.
2. user_id divergente do clique é rejeitado.
3. clique anônimo permanece anônimo.
4. chamador não consegue associar usuário a clique anônimo.
5. lineage registra a fonte server-side da identidade.

**Dependências:**

- `parallel_concurrency_and_failure_tests`

### 5. Reservar recibo idempotente antes de qualquer efeito

**Chave:** `receipt_idempotency_is_not_atomic_under_concurrency`

**Severidade:** `critical`

**Fase:** `atomic_idempotency_and_concurrency`

**Objetivo:** Garantir replay determinístico mesmo com requisições simultâneas.

**Mudanças obrigatórias:**

1. Inserir ou reservar atomicamente a chave semântica do recibo antes da mutação principal.
2. Usar INSERT ON CONFLICT, lock transacional ou mecanismo equivalente com segunda leitura do vencedor.
3. Persistir estado pending, completed ou failed com payload_hash e resultado estável.
4. Fazer concorrentes aguardarem ou retornarem exatamente o resultado vencedor sem unique violation exposta.

**Testes de aceitação:**

1. duas chamadas simultâneas com mesmo payload produzem um único efeito.
2. a chamada perdedora retorna o mesmo result_id da vencedora.
3. mesma chave com payload divergente é rejeitada deterministicamente.
4. falha antes do efeito não deixa recibo completed.
5. unique violation interna não é exposta ao chamador.

**Dependências:**

- `parallel_concurrency_and_failure_tests`

### 6. Impedir canal ativo com política de retenção inativa

**Chave:** `active_channel_can_outlive_active_retention_policy`

**Severidade:** `critical`

**Fase:** `retention_policy_lifecycle_and_re_review`

**Objetivo:** Vincular permanentemente a elegibilidade pública do canal ao estado atual da política.

**Mudanças obrigatórias:**

1. Bloquear retirement ou suspensão de policy enquanto houver canal active dependente, salvo transação de pausa em cascata.
2. Criar RPC administrativa para retirar policy e pausar canais dependentes atomicamente.
3. Fazer authorize, activate, resume e resolvedor público exigirem policy_status = active.
4. Registrar auditoria e relatório de canais afetados em qualquer transição de policy.

**Testes de aceitação:**

1. canal com policy active pode ser resolvido publicamente.
2. retirement isolado é bloqueado quando há canal ativo dependente.
3. retirement em cascata pausa os canais na mesma transação.
4. resolvedor público falha fechado quando a policy deixa de estar active.
5. auditoria lista todos os canais afetados pela transição.

**Dependências:**

- `legal_retention_and_anonymization`
- `admin_authorization_rpc_contract`

### 7. Deduplicar conversões atribuídas por transação canônica

**Chave:** `attributed_conversion_transaction_deduplication_missing`

**Severidade:** `high`

**Fase:** `click_identity_and_transaction_lineage`

**Objetivo:** Impedir inflação de atribuição por múltiplos sinais equivalentes da mesma transação.

**Mudanças obrigatórias:**

1. Definir chave canônica por integration_id, provider_namespace e transaction_hash.
2. Impor unicidade semântica para attributed_conversion dentro do estágio aplicável.
3. Modelar progressão explícita de attributed_conversion para confirmed_conversion sem duplicar a transação.
4. Preservar correções como novos nós versionados ligados à transação canônica.

**Testes de aceitação:**

1. primeira attributed_conversion da transação é aceita.
2. segunda atribuição equivalente retorna replay ou é rejeitada sem novo efeito.
3. mesmo hash em integrações distintas não colide indevidamente.
4. confirmação progride a transação sem criar segunda identidade canônica.
5. correção cria novo nó mantendo a transação e o lineage.

**Dependências:**

- `commercial_financial_semantics`
- `provider_namespace_and_credentials_registry`

### 8. Impor coerência entre integração, canal e evento

**Chave:** `trusted_integration_channel_event_relation_not_constrained`

**Severidade:** `high`

**Fase:** `integration_partner_lifecycle_and_scope`

**Objetivo:** Eliminar autorizações ativas cujo canonical_event_id não pertença ao channel_id informado.

**Mudanças obrigatórias:**

1. Remover canonical_event_id redundante da autorização ou criar chave composta verificável com o canal.
2. Adicionar constraint ou trigger fail-closed antes de authorization_status = active.
3. Validar a mesma relação em todas as RPCs de criação, ativação, uso e revogação.
4. Adicionar preflight que detecte escopos existentes inconsistentes e gere relatório de rejeitados.

**Testes de aceitação:**

1. canal e evento correspondentes permitem autorização.
2. evento divergente do canal é rejeitado.
3. alteração posterior do canal não deixa escopo ativo inconsistente.
4. RPC de sinal rejeita autorização estruturalmente inválida.
5. preflight lista todas as inconsistências sem corrigi-las silenciosamente.

**Dependências:**

- `fresh_production_schema_inventory`
- `legacy_mapping`

### 9. Criar lifecycle administrado para integrações confiáveis

**Chave:** `trusted_integration_registry_has_no_controlled_audited_lifecycle`

**Severidade:** `high`

**Fase:** `integration_partner_lifecycle_and_scope`

**Objetivo:** Controlar criação, verificação, ativação, suspensão e revogação com concorrência otimista e auditoria.

**Mudanças obrigatórias:**

1. Adicionar lock_version, lifecycle guard e matriz explícita de transições para integrações e escopos.
2. Criar RPCs administrativas transacionais com expected_lock_version e recibos idempotentes.
3. Exigir evidência administrativa redigida em ativação, suspensão, revogação e reativação.
4. Registrar auditoria append-only e revogar escopos atomicamente quando a integração deixar de estar active.

**Testes de aceitação:**

1. integração draft pode seguir somente para estado permitido.
2. expected_lock_version divergente bloqueia a mutação.
3. replay idempotente retorna o mesmo resultado sem nova auditoria.
4. revogação remove todos os escopos ativos atomicamente.
5. mutação direta fora da RPC é bloqueada pelo guard trigger.

**Dependências:**

- `admin_authorization_rpc_contract`
- `verified_partner_and_integration_onboarding`

## Dependências externas abertas

1. `fresh_production_schema_inventory`
2. `admin_authorization_rpc_contract`
3. `verified_partner_and_integration_onboarding`
4. `commercial_financial_semantics`
5. `server_side_url_validator`
6. `provider_namespace_and_credentials_registry`
7. `legal_retention_and_anonymization`
8. `legacy_mapping`
9. `backup_dry_run_and_reconciliation`
10. `parallel_concurrency_and_failure_tests`

## Limites obrigatórios

- não alterar o SQL v4.8.96 nesta versão;
- não criar migration executável;
- não mover SQL para `supabase/migrations`;
- não acessar Supabase;
- não escrever no banco;
- não alterar página pública;
- não ativar link comercial;
- não fechar dependências externas sem evidência real;
- submeter o próximo rascunho a nova revisão estrutural independente.

## Resultado esperado

O próximo rascunho protegido deverá aplicar exatamente estes nove ajustes, preservar o histórico dos SQLs anteriores e continuar encerrado por guarda incondicional e `ROLLBACK`.
