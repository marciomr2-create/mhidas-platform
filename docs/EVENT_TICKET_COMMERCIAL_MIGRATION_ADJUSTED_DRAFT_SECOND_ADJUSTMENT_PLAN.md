# Segundo plano de ajustes do rascunho comercial de ingressos — v4.8.92

## Decisão

`second_adjustment_plan_ready`

A revisão estrutural v4.8.91 identificou sete bloqueadores residuais. Esta versão converte cada bloqueador em uma correção técnica verificável, sem alterar o SQL protegido da v4.8.90.

## Base protegida

- versão-base: `v4.8.91-event-ticket-commercial-migration-adjusted-draft-structural-review-safe`
- commit-base: `4f70e1b3d1b35b1b38d5a502ada1cc06b2bb3777`
- SQL preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT.sql`
- SHA256 do SQL: `2E6BE6D1DA005548E6272AD79432922B91778C5103AD4D7281699450F46A1F3C`
- revisão v4.8.91 SHA256: `AF4E5199AA28A5D283CEA1A238E75320360F70CA78D6186B51AA92B8F0AA3BC0`
- contrato v4.8.91 SHA256: `273650DDA4B58BCA876B936394BC3752E442DE19C3B3E27889267113E0EE995B`

## Resultado

- fases: `5`
- ajustes obrigatórios: `7`
- ajustes críticos: `6`
- ajustes high: `1`
- testes de aceitação planejados: `35`
- dependências externas abertas: `10`
- próximo artefato permitido: `corrected_adjusted_migration_draft_safe`
- `promotion_to_executable_migration_allowed=False`
- `reviewed_sql_changed=False`
- `supabase_operation_performed=False`
- `database_write_performed=False`
- `public_event_page_changed=False`

## Fases

### Fase 1 — Fechar autorização e idempotência

**Chave:** `authorization_and_idempotency`

Corrigir recibos e autorização de representantes antes de qualquer replay.

### Fase 2 — Alinhar lifecycle e automação

**Chave:** `channel_lifecycle_and_automation`

Tornar expiração segura, idempotente e limitada a colunas autorizadas.

### Fase 3 — Fechar privacidade, imutabilidade e retenção

**Chave:** `privacy_and_retention`

Trocar metadata genérica, restringir anonimização e preservar lineage por tombstone.

### Fase 4 — Tornar URL fail-closed

**Chave:** `url_validation_fail_closed`

Exigir validação server-side fresca e saudável em mutações e resolução pública.

### Fase 5 — Produzir e revisar novo rascunho

**Chave:** `corrected_draft_and_re_review`

Gerar rascunho protegido e submetê-lo a nova revisão estrutural independente.

## Matriz dos ajustes

| Chave | Severidade | Fase |
|---|---|---|
| `automation_expiry_state_mismatch` | `critical` | `channel_lifecycle_and_automation` |
| `idempotency_receipt_not_bound_to_actor_and_request` | `critical` | `authorization_and_idempotency` |
| `metadata_privacy_guard_is_denylist_only` | `critical` | `privacy_and_retention` |
| `purchase_signal_retention_mutation_scope_too_broad` | `critical` | `privacy_and_retention` |
| `retention_delete_conflicts_with_signal_lineage_and_audit_fk` | `critical` | `privacy_and_retention` |
| `partner_membership_ambiguity_and_partner_status_gap` | `high` | `authorization_and_idempotency` |
| `url_validation_freshness_is_optional_and_resolver_fail_open` | `critical` | `url_validation_fail_closed` |

## 1. `automation_expiry_state_mismatch`

**Severidade:** `critical`

**Fase:** `channel_lifecycle_and_automation`

**Objetivo:** Permitir expiração idempotente de canais authorized, active e paused sem ampliar o poder geral do ator automation.

### Mudanças obrigatórias

- Substituir a exceção genérica do trigger por uma allowlist exclusiva de transição para expired nos três estados elegíveis.
- Comparar todas as colunas e permitir ao ator automation alterar somente channel_status, expired_by_actor_role, expired_at, lock_version e updated_at.
- Contabilizar somente updates efetivos e não auditar linhas perdidas por concorrência otimista.
- Vincular cada expiração a recibo idempotente específico por canal e versão esperada.

### Testes de aceitação

- authorized vencido expira sem erro e sem alterar campos comerciais.
- active vencido expira sem erro e sem alterar campos comerciais.
- paused vencido expira sem erro e sem alterar campos comerciais.
- canal não vencido ou estado não elegível não é atualizado.
- conflito de lock_version não incrementa a contagem nem gera auditoria falsa.

### Dependências externas

- `admin_authorization_rpc_contract`
- `parallel_concurrency_and_failure_tests`

### Considerado resolvido quando

Todos os testes acima passam no novo rascunho protegido e uma revisão estrutural independente confirma ausência do bloqueador.

## 2. `idempotency_receipt_not_bound_to_actor_and_request`

**Severidade:** `critical`

**Fase:** `authorization_and_idempotency`

**Objetivo:** Impedir replay cruzado, reutilização semântica divergente e retorno antecipado antes da autorização.

### Mudanças obrigatórias

- Adicionar principal_type, principal_id, operation_name, target_type, target_id, expected_lock_version e request_hash ao contrato de recibo.
- Trocar a unicidade por principal + operation_name + idempotency_key e validar igualdade semântica no replay.
- Executar autenticação, autorização e vínculo de parceiro antes de consultar ou devolver qualquer resultado idempotente.
- Calcular request_hash server-side a partir de payload canônico e rejeitar a mesma chave com fingerprint diferente.

### Testes de aceitação

- mesma chave e mesmo ator/payload retorna o resultado original.
- mesma chave com ator diferente é rejeitada.
- mesma chave com target diferente é rejeitada.
- mesma chave com payload ou expected_lock_version diferente é rejeitada.
- usuário sem autorização não obtém resultado por replay.

### Dependências externas

- `admin_authorization_rpc_contract`
- `parallel_concurrency_and_failure_tests`

### Considerado resolvido quando

Todos os testes acima passam no novo rascunho protegido e uma revisão estrutural independente confirma ausência do bloqueador.

## 3. `metadata_privacy_guard_is_denylist_only`

**Severidade:** `critical`

**Fase:** `privacy_and_retention`

**Objetivo:** Bloquear dados brutos e limitar forma, profundidade, quantidade e tamanho de metadata por objeto.

### Mudanças obrigatórias

- Remover o uso universal da função denylist e criar validadores versionados por tabela e finalidade.
- Aceitar somente chaves documentadas, tipos escalares aprovados e valores normalizados sem URL, token, e-mail, telefone, IP ou payload transacional bruto.
- Impor limites de bytes, profundidade, número de chaves e itens de array.
- Armazenar somente identificadores internos, enums e hashes versionados onde evidência adicional for necessária.

### Testes de aceitação

- chave não prevista é rejeitada.
- valor escalar contendo URL, token, e-mail, telefone ou IP é rejeitado.
- profundidade, bytes ou quantidade de itens acima do limite são rejeitados.
- metadata válida por objeto é aceita.
- snapshots de auditoria mantêm somente campos permitidos e hashes.

### Dependências externas

- `privacy_legal_basis_and_retention`
- `commercial_financial_semantics`

### Considerado resolvido quando

Todos os testes acima passam no novo rascunho protegido e uma revisão estrutural independente confirma ausência do bloqueador.

## 4. `purchase_signal_retention_mutation_scope_too_broad`

**Severidade:** `critical`

**Fase:** `privacy_and_retention`

**Objetivo:** Preservar a imutabilidade factual dos sinais durante o processamento de retenção.

### Mudanças obrigatórias

- Remover a exceção ampla do trigger e centralizar anonimização em RPC SECURITY DEFINER exclusiva para retenção.
- Permitir alterar somente user_id, click_id, attribution_campaign_id, metadata, retention_processed_at e retention_result, após contrato jurídico aprovado.
- Exigir igualdade de todas as demais colunas, inclusive provider, hashes, assinatura, nonce, valores, moeda e flags de confiança.
- Registrar before/after redigidos, policy_version, run_id e contagem real em auditoria.

### Testes de aceitação

- alteração de qualquer campo factual é rejeitada.
- anonimização da allowlist é aceita uma única vez.
- segunda execução idempotente não altera o sinal novamente.
- sinal com policy_version incompatível é rejeitado.
- auditoria registra somente snapshots redigidos e hashes.

### Dependências externas

- `privacy_legal_basis_and_retention`
- `parallel_concurrency_and_failure_tests`

### Considerado resolvido quando

Todos os testes acima passam no novo rascunho protegido e uma revisão estrutural independente confirma ausência do bloqueador.

## 5. `retention_delete_conflicts_with_signal_lineage_and_audit_fk`

**Severidade:** `critical`

**Fase:** `privacy_and_retention`

**Objetivo:** Eliminar a deleção fisicamente inviável de sinais e preservar vínculos de lineage e auditoria.

### Mudanças obrigatórias

- Remover delete de event_ticket_purchase_signals do lote de retenção.
- Adotar anonimização/tombstone para todos os tipos de sinal com retention_result explícito e campos pessoais nulos.
- Manter signal_id, parent_signal_id, canonical_event_id, signal_type, hashes não reversíveis, recorded_at e referências de auditoria.
- Renomear a ação da política para semântica compatível com tombstone e bloquear configurações que prometam delete.

### Testes de aceitação

- sinal com descendente é anonimizado sem quebrar parent_signal_id.
- sinal auditado é anonimizado sem violar foreign key.
- nenhum DELETE em purchase_signals permanece no rascunho corrigido.
- contagens do lote distinguem tombstoned e skipped.
- lineage e auditoria continuam consultáveis após retenção.

### Dependências externas

- `privacy_legal_basis_and_retention`

### Considerado resolvido quando

Todos os testes acima passam no novo rascunho protegido e uma revisão estrutural independente confirma ausência do bloqueador.

## 6. `partner_membership_ambiguity_and_partner_status_gap`

**Severidade:** `high`

**Fase:** `authorization_and_idempotency`

**Objetivo:** Eliminar seleção ambígua e impedir operações em nome de parceiro não verificado ou inativo.

### Mudanças obrigatórias

- Substituir SELECT INTO por EXISTS vinculado ao partner_id exato da operação.
- Juntar commercial_partners e exigir partner_status = verified.
- Exigir representation_status = active e vigência válida no mesmo predicado.
- Repetir a autorização antes de replay idempotente e em todas as policies/RPCs de parceiro.

### Testes de aceitação

- usuário representante de dois parceiros opera somente no partner_id solicitado.
- parceiro pending, suspended ou revoked é rejeitado.
- representação expirada ou inativa é rejeitada.
- representação ativa de parceiro verified é aceita.
- replay não contorna mudança posterior de autorização.

### Dependências externas

- `verified_partner_onboarding`
- `admin_authorization_rpc_contract`

### Considerado resolvido quando

Todos os testes acima passam no novo rascunho protegido e uma revisão estrutural independente confirma ausência do bloqueador.

## 7. `url_validation_freshness_is_optional_and_resolver_fail_open`

**Severidade:** `critical`

**Fase:** `url_validation_fail_closed`

**Objetivo:** Impedir autorização, ativação ou exposição pública de URL sem validação server-side recente e saudável.

### Mudanças obrigatórias

- Remover p_require_fresh_url do controle do chamador e tornar freshness obrigatória para authorize, activate, resume e cutover.
- Definir contrato versionado para validated_at, validation_expires_at, health_status, validator_version, resolved_host_hash e redirect_chain_hash.
- Fazer o resolvedor público exigir status active, validação não expirada, health_status healthy e autorização vigente.
- Falhar para fallback oficial quando qualquer prova estiver ausente, stale, rejected ou unhealthy.

### Testes de aceitação

- authorize/activate/cutover sem validação fresca é rejeitado.
- canal stale ou unhealthy nunca é retornado pelo resolvedor.
- canal validado e saudável dentro da janela pode ser resolvido.
- expiração da prova muda o resultado para fallback oficial sem mutação pública.
- redirect ou hostname revalidado altera hashes e exige nova aprovação quando material.

### Dependências externas

- `server_side_url_validator`
- `parallel_concurrency_and_failure_tests`

### Considerado resolvido quando

Todos os testes acima passam no novo rascunho protegido e uma revisão estrutural independente confirma ausência do bloqueador.

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

## Limites obrigatórios

- não alterar o SQL da v4.8.90 nesta versão;
- não criar migration executável;
- não mover SQL para `supabase/migrations`;
- não acessar Supabase;
- não escrever no banco;
- não alterar RLS real, página pública ou links comerciais;
- não declarar prontidão sem nova revisão estrutural.

## Próximo passo permitido

Criar um novo rascunho SQL protegido que aplique exclusivamente estes sete ajustes, preserve os 18 controles anteriores, mantenha guarda incondicional e termine em `ROLLBACK`.
