# EVENT TICKET COMMERCIAL MIGRATION — THIRD CORRECTED ADJUSTED DRAFT FIFTH ADJUSTMENT PLAN

## Versão

`v4.8.101-event-ticket-commercial-third-corrected-draft-fifth-adjustment-plan-safe`

## Base

- revisão estrutural: `v4.8.100-event-ticket-commercial-migration-third-corrected-adjusted-draft-structural-review-safe`
- commit: `5671d3e02e1877f65db71c6259f2a95be5f762a5`
- SQL preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_THIRD_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `A137453B2C7F2A1BF0E580498D0F19B4461EF1EF594D6EB87CB34600DDA66DA9`
- SHA256 documento base: `2839E478094419D9CFBA746B8C6DF78F58DBA9310A0B08B28CBD9CA46575EA20`
- SHA256 contrato base: `A315414A90C2A752C7AF905E59835F99497F35D8F6CA631BBC7A19E8FE051E51`
- SHA256 revisão estrutural: `4D63316B2BBE97ACC717F3FA02B29CEF45D8E168596067A73C2170FF47936FE6`
- SHA256 contrato da revisão: `84A8598C5AAEBB421B392C296B3F1E6275500F505693367E61A4188AAF0FCFAA`

## Decisão

`fifth_adjustment_plan_ready`

O plano converte os nove bloqueadores comprovados na v4.8.100 em mudanças técnicas e testes de aceitação. O SQL v4.8.99 permanece inalterado e a promoção continua bloqueada.

## Resumo

- fases: `6`
- ajustes obrigatórios: `9`
- críticos: `5`
- altos: `4`
- testes de aceitação: `45`
- dependências externas abertas: `10`
- próximo artefato permitido: `fourth_corrected_adjusted_migration_draft_safe`
- promoção para migration executável: `false`

## Fases

### 1. Migrar todos os fluxos para recibos atômicos

**Chave:** `atomic_receipt_migration`

Eliminar contratos v2 concedidos e tornar replay, falha e concorrência determinísticos.

### 2. Vincular identidade da integração à credencial

**Chave:** `credential_bound_integration_identity`

Derivar a integração do contexto verificado pelo servidor e registrar a versão da credencial.

### 3. Fechar lifecycles de parceiro e retenção

**Chave:** `partner_and_retention_lifecycle`

Aplicar matrizes explícitas, locks, timestamps e idempotência às transições administrativas.

### 4. Auditar cada efeito de cascata

**Chave:** `cascade_audit_integrity`

Gerar auditoria append-only individual para cada objeto dependente alterado.

### 5. Criar onboarding, rotação e escopo coerentes

**Chave:** `integration_onboarding_rotation_and_scope`

Administrar credenciais e scopes com histórico, chave composta e transições válidas.

### 6. Fechar leitura administrativa e retenção

**Chave:** `admin_read_retention_and_re_review`

Criar acesso admin mínimo e auditado, retenção para auditoria/recibos e nova revisão independente.

## Plano dos ajustes

### 1. Migrar todas as RPCs concedidas para o contrato idempotente atômico

**Chave:** `legacy_idempotency_paths_remain_non_atomic`

**Severidade:** `critical`

**Fase:** `atomic_receipt_migration`

**Objetivo:** Remover o padrão consultar-antes/gravar-depois dos fluxos ainda expostos.

**Mudanças obrigatórias:**

1. Inventariar todas as RPCs com GRANT efetivo que ainda chamam assert/write v2 ou delegam para writers v2.
2. Substituir cada fluxo por reserve, complete e fail de recibo com chave semântica, principal, payload_hash e estado persistido.
3. Fazer pending concorrente aguardar ou retornar estado controlado e completed reproduzir exatamente o resultado vencedor.
4. Revogar EXECUTE dos contratos v2 legados e adicionar preflight que falhe se qualquer caminho concedido ainda os referenciar.

**Testes de aceitação:**

1. nenhuma RPC concedida referencia mhidas_ticket_assert_receipt_replay_v2 ou mhidas_ticket_write_operation_receipt_v2.
2. duas chamadas simultâneas com mesma chave e payload produzem um único efeito.
3. replay completed retorna o mesmo result_id e o mesmo resultado serializado.
4. mesma chave com payload divergente é rejeitada sem executar mutação.
5. preflight bloqueia promoção quando encontra contrato v2 alcançável por GRANT.

**Dependências:**

- `parallel_concurrency_and_failure_tests`
- `admin_authorization_rpc_contract`

### 2. Derivar a integração de credencial verificada pelo servidor

**Chave:** `trusted_integration_identity_not_credential_bound`

**Severidade:** `critical`

**Fase:** `credential_bound_integration_identity`

**Objetivo:** Impedir que service_role escolha livremente integration_id e provider_namespace.

**Mudanças obrigatórias:**

1. Criar contexto server-side imutável contendo integration_id, credential_version_id, provider_namespace e verifier_evidence_hash.
2. Remover integration_id e provider_namespace como autoridade do payload, mantendo-os apenas como valores de conferência quando necessários.
3. Validar status da integração, parceiro, credencial e scope na mesma transação antes de registrar conversão.
4. Persistir credential_version_id, verificador, namespace derivado e correlação no recibo e na auditoria.

**Testes de aceitação:**

1. credencial ativa resolve exatamente uma integração e namespace.
2. payload que tenta declarar outra integração é rejeitado.
3. credencial revogada ou rotacionada não autoriza nova conversão.
4. recibo registra a versão da credencial usada na autorização.
5. auditoria permite reconstruir quem verificou a credencial e qual integração foi derivada.

**Dependências:**

- `server_side_url_and_credential_validator`
- `provider_namespace_and_credentials_registry`

### 3. Tornar o lifecycle do parceiro idempotente e governado por matriz

**Chave:** `partner_lifecycle_not_idempotent_or_transition_constrained`

**Severidade:** `critical`

**Fase:** `partner_and_retention_lifecycle`

**Objetivo:** Permitir somente transições válidas com recibo, prova e snapshots completos.

**Mudanças obrigatórias:**

1. Definir matriz explícita para pending, verified, suspended e deactivated, incluindo estados terminais e reativação permitida.
2. Reservar recibo atômico antes da transição e validar expected_lock_version, payload_hash e evidência administrativa.
3. Manter verified_at, suspended_at e deactivated_at coerentes com o novo estado, limpando apenas campos permitidos pela matriz.
4. Registrar before/after, ator, motivo, evidência, lock_version e resultado no audit log append-only.

**Testes de aceitação:**

1. pending para verified exige evidência válida e atualiza verified_at.
2. verified para suspended atualiza suspended_at e preserva histórico de verificação.
3. transição inválida é rejeitada antes de qualquer efeito.
4. replay da mesma transição retorna o resultado original sem incrementar lock_version.
5. auditoria contém snapshots anterior e posterior completos.

**Dependências:**

- `verified_partner_and_integration_onboarding`
- `admin_authorization_rpc_contract`

### 4. Restringir aposentadoria de política a active para retired

**Chave:** `retention_retirement_not_idempotent_or_state_guarded`

**Severidade:** `critical`

**Fase:** `partner_and_retention_lifecycle`

**Objetivo:** Impedir retirement fora do estado ativo e garantir replay determinístico.

**Mudanças obrigatórias:**

1. Exigir policy_status = active e expected_lock_version antes da aposentadoria.
2. Reservar recibo atômico e vincular idempotency_key ao ator, policy_id, payload_hash e operação.
3. Executar pausa de canais dependentes na mesma transação ou bloquear a operação quando o modo cascata não for autorizado.
4. Persistir retired_at, motivo, before/after e relatório determinístico dos canais afetados.

**Testes de aceitação:**

1. active para retired é aceita com lock e evidência válidos.
2. draft, approved ou retired para retired é rejeitada.
3. replay não altera lock_version nem duplica auditoria.
4. retirement em cascata pausa todos os canais dependentes atomicamente.
5. falha intermediária reverte policy, canais, recibo e auditorias da transação.

**Dependências:**

- `legal_retention_and_anonymization`
- `parallel_concurrency_and_failure_tests`

### 5. Gerar auditoria individual para cada mutação em cascata

**Chave:** `cascade_mutations_lack_per_object_audit`

**Severidade:** `critical`

**Fase:** `cascade_audit_integrity`

**Objetivo:** Eliminar efeitos dependentes sem lineage append-only por objeto.

**Mudanças obrigatórias:**

1. Capturar before/after de cada integração, scope e canal afetado antes de executar os UPDATEs em lote.
2. Inserir uma entrada de auditoria por objeto com target_type, target_id, chave composta, versão e correlation_id comum.
3. Registrar resultado, causa raiz, objeto pai e ordem da cascata para permitir reconstrução determinística.
4. Fazer a transação falhar se qualquer auditoria individual não puder ser gravada.

**Testes de aceitação:**

1. suspensão de parceiro gera auditoria para o parceiro e para cada integração e scope alterado.
2. revogação de integração gera auditoria para cada scope afetado.
3. retirement de policy gera auditoria para cada canal pausado.
4. todas as entradas compartilham correlation_id e identificam o objeto pai.
5. ausência de uma auditoria individual provoca rollback completo da cascata.

**Dependências:**

- `admin_authorization_rpc_contract`
- `production_backup_and_rollback_plan`

### 6. Criar onboarding e rotação transacionais de integração

**Chave:** `trusted_integration_onboarding_and_rotation_path_missing`

**Severidade:** `high`

**Fase:** `integration_onboarding_rotation_and_scope`

**Objetivo:** Administrar criação e credenciais sem mutação direta ou perda de histórico.

**Mudanças obrigatórias:**

1. Criar RPC de onboarding com parceiro verified, namespace permitido, expected partner lock e evidência de verificação.
2. Criar tabela ou registro histórico de versões de credencial com status active, rotated e revoked.
3. Criar RPC de rotação que ative nova versão e revogue a anterior atomicamente com recibo e auditoria.
4. Bloquear UPDATE direto de credential_reference_hash e verification_evidence_hash fora das RPCs administradas.

**Testes de aceitação:**

1. onboarding cria integração e primeira versão de credencial em uma transação.
2. parceiro não verificado não pode receber integração ativa.
3. rotação ativa uma única versão e revoga a anterior.
4. credencial anterior deixa de autorizar chamadas após commit.
5. replay de onboarding ou rotação retorna o mesmo resultado sem duplicar versões.

**Dependências:**

- `verified_partner_and_integration_onboarding`
- `provider_namespace_and_credentials_registry`

### 7. Restringir criação de scope e identificar a chave composta na auditoria

**Chave:** `integration_scope_terminal_insert_and_audit_identity_ambiguous`

**Severidade:** `high`

**Fase:** `integration_onboarding_rotation_and_scope`

**Objetivo:** Impedir INSERT em estado terminal e remover ambiguidade entre integração e canal.

**Mudanças obrigatórias:**

1. Permitir INSERT de scope somente no estado inicial autorizado definido pela matriz.
2. Exigir registro existente, expected_lock_version e transição válida para suspend e revoke.
3. Eliminar UPSERT genérico e separar comandos de create, transition e revoke com recibos próprios.
4. Registrar integration_id, channel_id e identificador composto estável em auditoria e resultados.

**Testes de aceitação:**

1. authorize cria scope ausente no estado inicial permitido.
2. suspend ou revoke sobre scope ausente é rejeitado.
3. transição usa expected_lock_version e falha sob versão divergente.
4. auditoria identifica inequivocamente integration_id e channel_id.
5. replay não cria scope duplicado nem altera versão.

**Dependências:**

- `admin_authorization_rpc_contract`
- `parallel_concurrency_and_failure_tests`

### 8. Criar leitura administrativa mínima, auditada e por finalidade

**Chave:** `admin_full_purchase_signal_read_path_missing`

**Severidade:** `high`

**Fase:** `admin_read_retention_and_re_review`

**Objetivo:** Restaurar reconciliação técnica sem reabrir SELECT amplo para authenticated.

**Mudanças obrigatórias:**

1. Manter a superfície redigida para clubbers e criar RPC ou view security definer exclusiva para administradores autorizados.
2. Exigir finalidade, escopo do evento, correlação e limite temporal em cada consulta administrativa.
3. Retornar somente campos técnicos e financeiros necessários à finalidade declarada.
4. Registrar cada leitura administrativa com ator, finalidade, filtros, quantidade e hash da resposta.

**Testes de aceitação:**

1. clubber continua sem acesso a hashes e valores sensíveis.
2. administrador autorizado consulta somente o evento e período permitidos.
3. finalidade ausente ou inválida bloqueia a consulta.
4. resposta não inclui campos fora da allowlist da finalidade.
5. cada leitura gera auditoria append-only com quantidade e hash da resposta.

**Dependências:**

- `admin_authorization_rpc_contract`
- `commercial_financial_semantics`

### 9. Definir retenção e anonimização para auditoria e recibos

**Chave:** `audit_and_receipt_retention_contract_missing`

**Severidade:** `high`

**Fase:** `admin_read_retention_and_re_review`

**Objetivo:** Limitar dados identificáveis sem destruir evidência necessária de governança.

**Mudanças obrigatórias:**

1. Adicionar retention_policy_version_id, retention_expires_at, retention_status e processed_at em auditoria e recibos.
2. Classificar campos preserváveis, anonimizáveis e elimináveis por tipo de operação e base legal.
3. Criar batch server-resolved com lock, relatório, recibo e auditoria para anonimização ou expurgo permitido.
4. Bloquear remoção de evidência sob hold, disputa, reconciliação ou obrigação legal ativa.

**Testes de aceitação:**

1. novas auditorias e recibos recebem política e data de expiração válidas.
2. batch anonimiza identificadores permitidos e preserva hashes probatórios necessários.
3. registro sob legal hold não é alterado.
4. replay do batch retorna o mesmo relatório sem repetir efeitos.
5. quinta revisão estrutural confirma retenção, leitura admin e todos os oito ajustes anteriores.

**Dependências:**

- `legal_retention_and_anonymization`
- `fifth_independent_structural_review`

## Dependências externas abertas

1. `fresh_production_schema_inventory`
2. `admin_authorization_rpc_contract`
3. `verified_partner_and_integration_onboarding`
4. `commercial_financial_semantics`
5. `server_side_url_and_credential_validator`
6. `provider_namespace_and_credentials_registry`
7. `legal_retention_and_anonymization`
8. `parallel_concurrency_and_failure_tests`
9. `production_backup_and_rollback_plan`
10. `fifth_independent_structural_review`

## Limites

- não altera o SQL v4.8.99;
- não cria migration executável;
- não move SQL para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não ativa canal comercial;
- não altera a página pública;

## Próxima decisão permitida

Criar um quarto rascunho SQL corrigido e protegido para os nove ajustes. A promoção somente poderá ser reavaliada após nova revisão estrutural independente.
