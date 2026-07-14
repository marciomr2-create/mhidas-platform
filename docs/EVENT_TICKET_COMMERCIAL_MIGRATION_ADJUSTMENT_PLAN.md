# PLANO DE AJUSTES DA MIGRATION COMERCIAL DE INGRESSOS

## Versão

`v4.8.89-event-ticket-commercial-migration-adjustment-plan-safe`

## Base

- versão-base: `v4.8.88-event-ticket-commercial-migration-structural-review-safe`
- commit-base: `6eb7fe5de2c60dbef05885984d61e614396ffb24`
- revisão estrutural congelada: `60456C95D3D220CA224F329B1B5F0ACDF83F6883591988C7198014CD1E20603A`
- SQL revisado e preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT.sql`
- SHA-256 do SQL preservado: `B2CA2791D41E38697754FD29BBA1DED0E1DD7F0EB4603A377E5689E53526BA62`

## Decisão

**`adjustment_plan_ready`**

Os 18 bloqueadores da revisão estrutural foram convertidos em um plano técnico verificável, com ordem de implementação, dependências, objetos afetados, estratégia SQL, testes de aceitação e condição de conclusão.

Isso não significa que a migration esteja pronta. A promoção para arquivo executável continua bloqueada.

## Estado desta versão

- fases: `9`
- ajustes obrigatórios: `18`
- ajustes críticos: `15`
- pré-requisitos externos: `10`
- testes de aceitação planejados: `54`
- próximo artefato permitido: `corrected_migration_draft_safe`
- `promotion_to_executable_migration_allowed=False`
- `reviewed_draft_changed=False`
- `executable_migration_created=False`
- `sql_moved_to_supabase_migrations=False`
- `supabase_operation_performed=False`
- `database_write_performed=False`
- `ticket_link_activated=False`
- `public_event_page_changed=False`

---

# 1. Princípios preservados

A correção futura deve preservar todos os 17 controles aprovados na `v4.8.88`, especialmente:

- referência oficial separada do canal monetizado;
- aprovação de solicitação separada da ativação;
- somente um canal ativo por evento;
- canal legado sempre rebaixado a `draft`;
- `ticket_url` legado nunca promovido automaticamente;
- `ticket_acquired` apenas como `self_declared_purchase`;
- clique separado de compra e receita;
- conversão confirmada dependente de evidência confiável;
- auditoria append-only;
- RLS e privilégios deny-by-default;
- URL comercial bruta somente no servidor;
- ausência de view pública no banco;
- ativação pública em versão posterior e separada.

Nenhuma correção pode simplificar esses controles para acelerar a migration.

---

# 2. Ordem de implementação

## Fase 1 — Congelar contratos externos e o preflight exato do schema

**Objetivo:** Eliminar decisões em aberto e impedir que a futura correção mascare drift ou invente entidades não aprovadas.

**Ajustes:**
- `exact_schema_preflight_without_drift_masking`
- `verified_partner_registry_foreign_key`
- `financial_field_matrix`

**Critérios de saída:**
- Inventário e assinatura do schema de produção aprovados.
- Contrato do registro verificado de parceiros congelado.
- Matriz financeira aprovada por jurídico e comercial.
## Fase 2 — Criar a fronteira administrativa transacional

**Objetivo:** Concentrar autorização, idempotência, concorrência, auditoria e readback em uma única transação protegida.

**Ajustes:**
- `transactional_admin_mutation_rpc`
- `optimistic_concurrency_expected_version`

**Critérios de saída:**
- RPC SECURITY DEFINER com search_path fixo e grants mínimos definido.
- expected_lock_version obrigatório e conflito verificável.
- Contexto do ator e mutação executados na mesma transação.
## Fase 3 — Fechar governança de solicitações de parceiros

**Objetivo:** Garantir identidade verificada, máquina de estados, auditoria e consistência entre solicitação, evento e canal.

**Ajustes:**
- `request_lifecycle_guard_and_audit`
- `request_channel_cross_entity_consistency`

**Critérios de saída:**
- Transições e atores permitidos definidos para cada status.
- Aprovação de solicitação não ativa canal.
- source_request_id só referencia solicitação aprovada do mesmo evento.
## Fase 4 — Blindar o lifecycle do canal comercial ativo

**Objetivo:** Impedir alteração material sem nova autorização e permitir expiração e troca atômica sem janela inválida.

**Ajustes:**
- `freeze_sensitive_active_channel_fields`
- `expiry_and_atomic_channel_cutover`

**Critérios de saída:**
- Campos sensíveis imutáveis enquanto o canal permanecer active.
- Expiração idempotente e auditada definida.
- Cutover encerra o anterior e ativa o sucessor atomicamente.
## Fase 5 — Fechar integridade de referência oficial e segurança de URL

**Objetivo:** Vincular domínio declarado ao destino real e impedir SSRF, host privado, porta indevida ou redirect não autorizado.

**Ajustes:**
- `official_reference_url_domain_integrity`
- `commercial_url_public_network_validation`

**Critérios de saída:**
- reference_domain corresponde ao hostname normalizado de source_url.
- Mudança de source_url rebaixa a validação oficial.
- Política de URL pública segura cobre DNS, porta e redirects.
## Fase 6 — Tornar sinais, conversões e dados pseudonimizados estruturalmente seguros

**Objetivo:** Preservar a linhagem factual e impedir promoção, replay, colisão de namespace ou armazenamento bruto indevido.

**Ajustes:**
- `immutable_purchase_signal_lineage`
- `conversion_channel_and_provider_namespace`
- `hash_format_and_metadata_privacy_guards`

**Critérios de saída:**
- signal_type e evidência são imutáveis.
- Conversão confirmada é novo fato com canal e namespace confiável.
- Hashes versionados e metadata por allowlist rejeitam dados sensíveis.
## Fase 7 — Completar lifecycle editorial e cobertura de auditoria

**Objetivo:** Registrar todas as decisões comerciais e editoriais relevantes sem expor URLs, segredos ou termos brutos.

**Ajustes:**
- `communication_lifecycle_evidence`
- `audit_coverage_and_consistency`

**Critérios de saída:**
- Comunicações possuem máquina de estados, atores e timestamps completos.
- Solicitações, canais, comunicações, conversões, correções e limpeza são auditados.
- Snapshots usam hashes e redações seguras.
## Fase 8 — Implantar retenção antes de habilitar tracking

**Objetivo:** Converter datas declarativas em limpeza idempotente, auditada e recuperável.

**Ajustes:**
- `retention_and_cleanup_enforcement`

**Critérios de saída:**
- Prazos por tipo de dado possuem base jurídica aprovada.
- Job idempotente de anonimização ou exclusão definido.
- Falha, retomada, auditoria e prova de execução possuem testes.
## Fase 9 — Executar backfill somente com reconciliação fechada

**Objetivo:** Garantir classificação total, contagens exatas e nenhuma omissão silenciosa de dados legados.

**Ajustes:**
- `backfill_reconciliation_and_no_silent_skip`

**Critérios de saída:**
- Relatório de elegibilidade e rejeição cobre todas as linhas.
- Contagens antes e depois fecham por status e destino.
- Canal draft preserva vínculo com solicitação normalizada quando aplicável.

---

# 3. Plano detalhado dos 18 ajustes

## 1. `exact_schema_preflight_without_drift_masking`

**Severidade:** `critical`
**Categoria:** `database_compatibility`
**Fase:** `contract_and_schema_preflight`

### Problema

IF NOT EXISTS e CREATE OR REPLACE podem aceitar objetos parciais ou assinaturas incompatíveis.

### Risco

A migration pode concluir sobre um schema divergente sem criar todas as garantias planejadas.

### Objetos afetados

- `pg_catalog`
- `canonical_event_sources`
- `funções, triggers, constraints e índices comerciais`

### Estratégia SQL recomendada

- Inventariar tipo, nulabilidade, defaults, constraints, índices, funções, triggers, RLS e grants.
- Comparar assinaturas com um manifesto aprovado e falhar em qualquer divergência.
- Criar objetos com nomes versionados sem sobrescrever funções desconhecidas.

### Dependências entre ajustes

- Nenhuma dependência interna anterior.

### Pré-requisitos externos

- `fresh_production_schema_inventory`

### Testes de aceitação

- Objeto incompatível pré-existente aborta antes de DDL.
- Objeto ausente segue para criação planejada.
- Assinaturas aprovadas produzem relatório determinístico.

### Considerado resolvido quando

O preflight falha fechado e o manifesto do schema aprovado acompanha a futura correção.
## 2. `verified_partner_registry_foreign_key`

**Severidade:** `critical`
**Categoria:** `authorization`
**Fase:** `contract_and_schema_preflight`

### Problema

partner_id não possui foreign key, ownership nem prova de vínculo do usuário remetente.

### Risco

Solicitações e comunicações podem atribuir identidade a um parceiro não verificado.

### Objetos afetados

- `registro de parceiros a aprovar`
- `event_ticket_partnership_requests`
- `partner_official_communications`

### Estratégia SQL recomendada

- Congelar entidade, chave primária, status, papéis e desativação do parceiro.
- Adicionar foreign keys e regras de ownership sem permitir publicação direta.
- Separar usuário representante, parceiro e autorização comercial.

### Dependências entre ajustes

- `exact_schema_preflight_without_drift_masking`

### Pré-requisitos externos

- `verified_partner_registry_contract`

### Testes de aceitação

- partner_id inexistente é rejeitado.
- Usuário sem vínculo não envia em nome do parceiro.
- Parceiro desativado não cria nova solicitação.

### Considerado resolvido quando

A entidade verificada e suas foreign keys estão aprovadas sem conceder poder de ativação ao parceiro.
## 3. `financial_field_matrix`

**Severidade:** `critical`
**Categoria:** `commercial_finance`
**Fase:** `contract_and_schema_preflight`

### Problema

Os modelos atuais aceitam combinações de percentual, valor fixo e moeda semanticamente incoerentes.

### Risco

Termos inválidos podem alimentar relatórios, atribuição ou pagamento incorreto.

### Objetos afetados

- `event_ticket_commercial_channels`

### Estratégia SQL recomendada

- Definir matriz por remuneration_model com campos obrigatórios, proibidos e limites.
- Exigir moeda quando houver valor monetário e precisão aprovada.
- Versionar termos financeiros e registrar hash seguro no audit log.

### Dependências entre ajustes

- `exact_schema_preflight_without_drift_masking`

### Pré-requisitos externos

- Nenhum pré-requisito externo exclusivo.

### Testes de aceitação

- Cada modelo aceita somente sua combinação válida.
- Campo financeiro proibido causa rejeição.
- Mudança financeira em canal ativo é rejeitada.

### Considerado resolvido quando

Jurídico e comercial aprovam a matriz e todos os checks positivos e negativos passam.
## 4. `transactional_admin_mutation_rpc`

**Severidade:** `critical`
**Categoria:** `authorization`
**Fase:** `transactional_admin_boundary`

### Problema

SET LOCAL, autorização, mutação e auditoria não estão garantidos na mesma transação por escrita comum via PostgREST.

### Risco

Triggers podem operar sem contexto confiável ou a auditoria pode divergir da mutação.

### Objetos afetados

- `mhidas_admin_mutate_event_ticket_commercial_channel_v1`
- `event_ticket_commercial_channels`
- `event_ticket_commercial_audit_log`

### Estratégia SQL recomendada

- Criar função SECURITY DEFINER com search_path fixo e EXECUTE revogado por padrão.
- Validar admin real, confirmação, motivo, correlação e idempotência.
- Configurar contexto local, executar uma mutação, auditar e reler na mesma transação.

### Dependências entre ajustes

- `exact_schema_preflight_without_drift_masking`
- `financial_field_matrix`

### Pré-requisitos externos

- `admin_authorization_rpc_contract`

### Testes de aceitação

- Ator não admin é rejeitado.
- Retry com mesma idempotency_key retorna o mesmo resultado.
- Falha de auditoria reverte a mutação.

### Considerado resolvido quando

A única superfície de lifecycle comercial é a RPC protegida com readback e uma linha afetada.
## 5. `optimistic_concurrency_expected_version`

**Severidade:** `high`
**Categoria:** `lifecycle`
**Fase:** `transactional_admin_boundary`

### Problema

lock_version incrementa, mas o banco não exige que o chamador prove qual versão leu.

### Risco

Decisões concorrentes podem sobrescrever alterações sem conflito explícito.

### Objetos afetados

- `event_ticket_commercial_channels`
- `mhidas_admin_mutate_event_ticket_commercial_channel_v1`

### Estratégia SQL recomendada

- Receber expected_lock_version obrigatório.
- Atualizar por channel_id e lock_version exatos.
- Retornar conflito quando nenhuma linha corresponder e nunca tratar como sucesso.

### Dependências entre ajustes

- `transactional_admin_mutation_rpc`

### Pré-requisitos externos

- `admin_authorization_rpc_contract`

### Testes de aceitação

- Versão correta atualiza uma linha.
- Versão obsoleta retorna conflito.
- Duas mutações concorrentes não vencem simultaneamente.

### Considerado resolvido quando

Nenhuma atualização material ignora a versão esperada.
## 6. `request_lifecycle_guard_and_audit`

**Severidade:** `critical`
**Categoria:** `lifecycle`
**Fase:** `partner_request_governance`

### Problema

A tabela permite status, mas não impõe transições, atores, evidências ou trilha integral.

### Risco

Parceiros ou processos internos podem saltar estados ou aprovar sem evidência suficiente.

### Objetos afetados

- `event_ticket_partnership_requests`
- `event_ticket_commercial_audit_log`
- `guard/RPC de solicitações`

### Estratégia SQL recomendada

- Definir transições pending, needs_info, approved, rejected e withdrawn.
- Restringir aprovação e rejeição ao admin; permitir retirada somente ao representante válido.
- Auditar cada transição com ator, motivo, correlação e versão.

### Dependências entre ajustes

- `verified_partner_registry_foreign_key`
- `transactional_admin_mutation_rpc`

### Pré-requisitos externos

- `verified_partner_registry_contract`
- `admin_authorization_rpc_contract`

### Testes de aceitação

- Parceiro não aprova a própria solicitação.
- Transição inválida é rejeitada.
- Aprovação registra evidência e não ativa canal.

### Considerado resolvido quando

Toda transição aceita está documentada, autorizada e auditada.
## 7. `request_channel_cross_entity_consistency`

**Severidade:** `critical`
**Categoria:** `referential_integrity`
**Fase:** `partner_request_governance`

### Problema

source_request_id pode apontar para solicitação de outro evento, status inadequado ou origem incompatível.

### Risco

Um canal pode herdar autorização comercial que não pertence ao evento ou não foi aprovada.

### Objetos afetados

- `event_ticket_partnership_requests`
- `event_ticket_commercial_channels`
- `RPC de canal`

### Estratégia SQL recomendada

- Validar mesma canonical_event_id na RPC e em guard defensivo.
- Exigir request_status approved quando source_origin for approved_partner_request.
- Proibir source_request_id incompatível com outras origens.

### Dependências entre ajustes

- `request_lifecycle_guard_and_audit`
- `transactional_admin_mutation_rpc`

### Pré-requisitos externos

- Nenhum pré-requisito externo exclusivo.

### Testes de aceitação

- Solicitação de outro evento é rejeitada.
- Solicitação pending não origina canal.
- Origem manual não aceita source_request_id indevido.

### Considerado resolvido quando

Nenhum canal persiste referência cruzada inconsistente.
## 8. `freeze_sensitive_active_channel_fields`

**Severidade:** `critical`
**Categoria:** `governance`
**Fase:** `active_channel_integrity`

### Problema

Um UPDATE pode manter channel_status active e trocar URL, domínio, tracking, segredo, remuneração, autorização ou vigência.

### Risco

O destino ou acordo comercial pode mudar sem nova autorização e sem nova ativação.

### Objetos afetados

- `event_ticket_commercial_channels`
- `mhidas_event_ticket_commercial_channel_guard`

### Estratégia SQL recomendada

- Definir allowlist mínima de campos operacionais mutáveis em active.
- Rejeitar alterações materiais OLD active para NEW active.
- Exigir pausa e novo draft ou cutover para qualquer mudança sensível.

### Dependências entre ajustes

- `transactional_admin_mutation_rpc`
- `optimistic_concurrency_expected_version`
- `financial_field_matrix`

### Pré-requisitos externos

- Nenhum pré-requisito externo exclusivo.

### Testes de aceitação

- Troca de commercial_url em active é rejeitada.
- Troca de remuneração em active é rejeitada.
- Novo draft autorizado pode ser ativado pelo cutover.

### Considerado resolvido quando

Todos os campos sensíveis possuem teste negativo e caminho seguro de substituição.
## 9. `expiry_and_atomic_channel_cutover`

**Severidade:** `critical`
**Categoria:** `lifecycle`
**Fase:** `active_channel_integrity`

### Problema

Canal vencido pode permanecer active e ocupar a unicidade, impedindo um sucessor.

### Risco

O botão pode resolver acordo vencido ou falhar na ativação do próximo canal.

### Objetos afetados

- `event_ticket_commercial_channels`
- `job de expiração`
- `RPC de cutover`
- `event_ticket_commercial_audit_log`

### Estratégia SQL recomendada

- Definir status expired, expired_at e ator system/automation auditado.
- Resolver publicamente apenas vigência válida mesmo antes do job.
- Encerrar o anterior e ativar o sucessor na mesma transação e sob lock.

### Dependências entre ajustes

- `freeze_sensitive_active_channel_fields`
- `optimistic_concurrency_expected_version`

### Pré-requisitos externos

- Nenhum pré-requisito externo exclusivo.

### Testes de aceitação

- Canal vencido não resolve publicamente.
- Job repetido é idempotente.
- Cutover nunca deixa dois active nem janela intermediária inválida.

### Considerado resolvido quando

Expiração e substituição possuem operação atômica, auditoria e teste de concorrência.
## 10. `official_reference_url_domain_integrity`

**Severidade:** `critical`
**Categoria:** `url_security`
**Fase:** `official_reference_and_url_security`

### Problema

A referência validada não prova que o domínio declarado corresponde à URL atual nem perde validação após drift.

### Risco

Uma referência oficial pode mudar de destino preservando estado validated.

### Objetos afetados

- `canonical_event_sources`
- `guard de referência oficial`

### Estratégia SQL recomendada

- Normalizar hostname sem credenciais, porta ou ponto final.
- Comparar reference_domain com source_url e política de subdomínio aprovada.
- Ao alterar source_url, rebaixar validated para candidate/stale e exigir nova validação.

### Dependências entre ajustes

- `exact_schema_preflight_without_drift_masking`

### Pré-requisitos externos

- `canonical_source_grant_regression`

### Testes de aceitação

- Domínio divergente é rejeitado.
- Mudança da URL rebaixa o status.
- Grants públicos existentes não são ampliados.

### Considerado resolvido quando

Toda referência validada prova coerência entre URL, domínio e estado.
## 11. `commercial_url_public_network_validation`

**Severidade:** `critical`
**Categoria:** `url_security`
**Fase:** `official_reference_and_url_security`

### Problema

Regex HTTPS não bloqueia porta não padrão, IP privado, DNS local, credenciais ou redirects para outro domínio.

### Risco

O redirecionador futuro pode realizar SSRF ou enviar o usuário a destino não autorizado.

### Objetos afetados

- `event_ticket_commercial_channels`
- `serviço server-only de validação e redirect`

### Estratégia SQL recomendada

- Persistir apenas URL já validada pelo serviço server-only e hash da validação.
- Permitir HTTPS porta 443, host público e domínio final autorizado.
- Bloquear localhost, IP literal privado, DNS privado, credenciais e redirect fora da allowlist.

### Dependências entre ajustes

- `transactional_admin_mutation_rpc`
- `freeze_sensitive_active_channel_fields`

### Pré-requisitos externos

- `secret_manager_contract`

### Testes de aceitação

- localhost, RFC1918, link-local e porta não 443 são rejeitados.
- Redirect para domínio diferente é rejeitado.
- Timeout ou DNS inconsistente falha fechado.

### Considerado resolvido quando

A mesma política segura é aplicada no cadastro, revalidação e redirecionamento.
## 12. `immutable_purchase_signal_lineage`

**Severidade:** `critical`
**Categoria:** `conversion_integrity`
**Fase:** `conversion_and_privacy_integrity`

### Problema

UPDATE pode transformar self_declared_purchase no mesmo registro em confirmed_conversion.

### Risco

A distinção entre intenção, atribuição e receita confirmada pode ser apagada retroativamente.

### Objetos afetados

- `event_ticket_purchase_signals`
- `guard append-only/compensatório`

### Estratégia SQL recomendada

- Tornar signal_type, evidence_source e evidência imutáveis.
- Criar confirmação como novo registro vinculado ao sinal anterior.
- Corrigir por evento compensatório auditado e bloquear DELETE físico.

### Dependências entre ajustes

- `exact_schema_preflight_without_drift_masking`

### Pré-requisitos externos

- `trusted_conversion_signature_contract`

### Testes de aceitação

- Autodeclaração não pode ser promovida por UPDATE.
- Confirmação cria novo fato com lineage.
- Correção preserva o registro original.

### Considerado resolvido quando

A história factual é append-only e toda derivação possui vínculo explícito.
## 13. `conversion_channel_and_provider_namespace`

**Severidade:** `critical`
**Categoria:** `conversion_integrity`
**Fase:** `conversion_and_privacy_integrity`

### Problema

Conversão atribuída ou confirmada pode não ter channel_id e o hash externo é global sem namespace do provedor.

### Risco

Vendas podem ser atribuídas sem canal monetizado ou colidir entre integrações.

### Objetos afetados

- `event_ticket_purchase_signals`
- `integração confiável de conversão`

### Estratégia SQL recomendada

- Exigir channel_id para attributed_conversion e confirmed_conversion.
- Compor unicidade por provider_namespace, hash_version e transaction_hash.
- Validar assinatura, timestamp, nonce e idempotência antes da inserção.

### Dependências entre ajustes

- `immutable_purchase_signal_lineage`
- `transactional_admin_mutation_rpc`

### Pré-requisitos externos

- `trusted_conversion_signature_contract`

### Testes de aceitação

- Conversão sem canal é rejeitada.
- Mesmo ID em namespaces distintos não colide.
- Replay com mesmo nonce ou idempotency_key não duplica.

### Considerado resolvido quando

Toda conversão confiável identifica canal, provedor, algoritmo e prova antirreplay.
## 14. `hash_format_and_metadata_privacy_guards`

**Severidade:** `critical`
**Categoria:** `privacy`
**Fase:** `conversion_and_privacy_integrity`

### Problema

Campos de hash aceitam texto arbitrário e metadata pode armazenar IP, URL, segredo, transação ou dado pessoal bruto.

### Risco

A minimização prometida pode ser violada mesmo sem coluna explicitamente sensível.

### Objetos afetados

- `event_ticket_click_attributions`
- `event_ticket_purchase_signals`
- `event_ticket_commercial_audit_log`

### Estratégia SQL recomendada

- Registrar hash_algorithm e hash_version e validar tamanho/alfabeto.
- Definir schemas de metadata por tipo de registro.
- Rejeitar chaves e padrões sensíveis nas rotas e no banco defensivo.

### Dependências entre ajustes

- `conversion_channel_and_provider_namespace`

### Pré-requisitos externos

- `secret_manager_contract`

### Testes de aceitação

- Hash fora do formato é rejeitado.
- Metadata com ip, raw_url, secret ou transaction_id é rejeitada.
- Payload permitido permanece serializável e mínimo.

### Considerado resolvido quando

Nenhum campo pseudonimizado ou JSON aceita valor bruto fora da allowlist.
## 15. `communication_lifecycle_evidence`

**Severidade:** `high`
**Categoria:** `governance`
**Fase:** `communication_and_audit_coverage`

### Problema

Faltam transições completas, atores, approved_at, published_at, pausa, expiração e vínculo obrigatório ao evento/canal quando comercial.

### Risco

Uma comunicação pode ser publicada sem aprovação editorial suficiente ou sem contexto comercial válido.

### Objetos afetados

- `partner_official_communications`
- `guard/RPC de comunicação`

### Estratégia SQL recomendada

- Definir draft, submitted, approved, published, paused, expired e rejected.
- Manter publicação exclusiva do admin e parceiro apenas como remetente/submissor.
- Exigir evento e canal ativo/autorizado para comunicação comercial de ingresso.

### Dependências entre ajustes

- `request_lifecycle_guard_and_audit`
- `expiry_and_atomic_channel_cutover`

### Pré-requisitos externos

- `verified_partner_registry_contract`
- `admin_authorization_rpc_contract`

### Testes de aceitação

- Parceiro não publica diretamente.
- Comunicação comercial sem evento/canal é rejeitada.
- Pausa e expiração registram ator, motivo e timestamp.

### Considerado resolvido quando

Toda comunicação publicada possui cadeia editorial e contexto canônico auditáveis.
## 16. `audit_coverage_and_consistency`

**Severidade:** `high`
**Categoria:** `audit`
**Fase:** `communication_and_audit_coverage`

### Problema

A auditoria automática cobre principalmente canais e não garante coerência cruzada nem hashes dos termos sensíveis.

### Risco

Decisões, conversões, correções ou limpezas podem ficar sem trilha suficiente.

### Objetos afetados

- `event_ticket_commercial_audit_log`
- `solicitações, canais, comunicações, sinais e jobs`

### Estratégia SQL recomendada

- Padronizar eventos de auditoria append-only por lifecycle.
- Registrar identidade canônica, versão, ação, ator, motivo, correlação e hashes redigidos.
- Validar que request_id, channel_id e canonical_event_id pertencem ao mesmo contexto.

### Dependências entre ajustes

- `transactional_admin_mutation_rpc`
- `request_lifecycle_guard_and_audit`
- `communication_lifecycle_evidence`
- `immutable_purchase_signal_lineage`

### Pré-requisitos externos

- Nenhum pré-requisito externo exclusivo.

### Testes de aceitação

- Cada transição material gera exatamente um evento auditável.
- Falha ao auditar reverte a operação.
- Snapshot não contém URL, segredo ou termo bruto.

### Considerado resolvido quando

A matriz de ações e alvos possui cobertura integral e consistência canônica.
## 17. `retention_and_cleanup_enforcement`

**Severidade:** `critical`
**Categoria:** `retention`
**Fase:** `retention_enforcement`

### Problema

retention_expires_at não executa anonimização, exclusão, auditoria ou prova de cumprimento.

### Risco

Dados pseudonimizados e pessoais podem permanecer além do prazo aprovado.

### Objetos afetados

- `event_ticket_click_attributions`
- `event_ticket_purchase_signals`
- `job de retenção`
- `event_ticket_commercial_audit_log`

### Estratégia SQL recomendada

- Definir ação por tipo de dado: anonimizar, agregar ou excluir.
- Criar job idempotente com lote, checkpoint, retry e lock.
- Auditar contagens e falhas sem copiar dados removidos para o log.

### Dependências entre ajustes

- `hash_format_and_metadata_privacy_guards`
- `audit_coverage_and_consistency`

### Pré-requisitos externos

- `retention_legal_basis_and_job`

### Testes de aceitação

- Registro expirado recebe a ação correta.
- Reexecução não duplica nem falha.
- Interrupção retoma do checkpoint e mantém contagens.

### Considerado resolvido quando

O tracking continua bloqueado até job, política e prova de execução estarem aprovados.
## 18. `backfill_reconciliation_and_no_silent_skip`

**Severidade:** `critical`
**Categoria:** `backfill`
**Fase:** `backfill_reconciliation`

### Problema

Filtros atuais podem omitir solicitações ou vínculos antigos sem falhar e sem fechar contagens.

### Risco

Dados comerciais podem desaparecer, ficar órfãos ou perder a origem histórica.

### Objetos afetados

- `partner_ticket_requests legado`
- `event_ticket_intents`
- `event_ticket_partnership_requests`
- `event_ticket_commercial_channels`
- `event_ticket_purchase_signals`

### Estratégia SQL recomendada

- Materializar relatório de elegibilidade, classificação e rejeição antes dos inserts.
- Falhar se qualquer linha não estiver classificada ou mapeada.
- Comparar contagens por origem/status e vincular canal draft à solicitação normalizada.

### Dependências entre ajustes

- `request_channel_cross_entity_consistency`
- `immutable_purchase_signal_lineage`
- `exact_schema_preflight_without_drift_masking`

### Pré-requisitos externos

- `backup_and_legacy_counts`
- `canonical_mapping_artifact`

### Testes de aceitação

- Linha sem mapeamento aborta o backfill.
- Contagens de origem, inseridos, rejeitados e já existentes fecham.
- ticket_acquired gera somente self_declared_purchase.

### Considerado resolvido quando

Nenhuma linha é omitida silenciosamente e o relatório final fecha em zero pendências.

---

# 4. Pré-requisitos externos e gates

| Pré-requisito | Exigido antes da fase | Evidência obrigatória |
|---|---|---|
| `fresh_production_schema_inventory` | `contract_and_schema_preflight` | Dump estrutural sem dados, hashes e catálogo de objetos/grants no momento do preflight. |
| `backup_and_legacy_counts` | `backfill_reconciliation` | Backup restaurável e contagens por tabela/status usadas na reconciliação. |
| `canonical_mapping_artifact` | `backfill_reconciliation` | Artefato versionado e sem ambiguidades para event_group_id e registros legados. |
| `verified_partner_registry_contract` | `contract_and_schema_preflight` | Entidade, ownership, papéis, status e política de desativação aprovados. |
| `secret_manager_contract` | `official_reference_and_url_security` | Formato de referências opacas, rotação, revogação e acesso server-only definidos. |
| `retention_legal_basis_and_job` | `retention_enforcement` | Matriz por dado, ação, prazo, responsável, job e prova de execução aprovados. |
| `admin_authorization_rpc_contract` | `transactional_admin_boundary` | Fonte de verdade do admin, confirmação, idempotência, motivo, correlação e grants. |
| `trusted_conversion_signature_contract` | `conversion_and_privacy_integrity` | Provedor, namespace, assinatura, timestamp, nonce, hash e rotação definidos. |
| `canonical_source_grant_regression` | `official_reference_and_url_security` | Teste que prova ausência de ampliação de acesso após novas colunas e guards. |
| `disposable_database_validation` | `backfill_reconciliation` | Apply, testes positivos/negativos, concorrência, backfill, rollback e diff final do schema. |

O último pré-requisito, `disposable_database_validation`, não autoriza produção. Ele apenas prova que o rascunho corrigido pode ser aplicado, testado e revertido em ambiente descartável.

---

# 5. Gates de promoção

## Gate A — plano

Concluído por esta versão. Os 18 ajustes possuem estratégia e aceite.

## Gate B — rascunho corrigido

Uma versão futura poderá alterar somente o rascunho em `docs/sql`, mantendo guarda incondicional e `ROLLBACK`.

## Gate C — nova revisão estrutural

Todos os 18 ajustes precisam ser encontrados no SQL corrigido, sem regressão dos 17 controles aprovados.

## Gate D — banco descartável

Devem ser aprovados apply, constraints, grants, RLS, concorrência, jobs, backfill, reconciliação e rollback.

## Gate E — arquivo executável ainda protegido

Somente depois dos gates anteriores poderá existir um candidato em `supabase/migrations`, ainda sem aplicação em produção.

## Gate F — preflight real de produção

Inventário, backup, contagens, mapeamentos e autorização operacional devem estar atuais imediatamente antes da execução.

Nenhum gate pode ser pulado.

---

# 6. Escopo técnico da próxima correção

O próximo artefato permitido deve:

- corrigir o SQL ainda em `docs/sql`;
- preservar a guarda incondicional;
- continuar terminando em `ROLLBACK`;
- não usar `IF NOT EXISTS` ou `CREATE OR REPLACE` para mascarar drift;
- incluir preflight exato;
- manter URL bruta e segredo fora da projeção pública;
- não criar view pública;
- não ativar canal;
- não conectar ao Supabase;
- não executar DDL ou DML.

O próximo artefato não está autorizado a:

- mover o SQL para `supabase/migrations`;
- aplicar migration;
- escrever no banco;
- criar rota pública de compra;
- alterar a página do evento;
- tratar autodeclaração como conversão confirmada.

---

# 7. Resultado final desta versão

A `v4.8.89` transforma o parecer `needs_adjustment` em sequência técnica executável por versões futuras, mas permanece inteiramente documental e estática.

Flags finais:

- `plan_decision=adjustment_plan_ready`
- `phases=9`
- `required_adjustments=18`
- `critical_adjustments=15`
- `external_prerequisites=10`
- `acceptance_tests=54`
- `promotion_allowed=False`
- `reviewed_draft_changed=False`
- `executable_migration_created=False`
- `supabase_operation_performed=False`
- `database_write_performed=False`
- `ticket_link_activated=False`
- `public_event_page_changed=False`
