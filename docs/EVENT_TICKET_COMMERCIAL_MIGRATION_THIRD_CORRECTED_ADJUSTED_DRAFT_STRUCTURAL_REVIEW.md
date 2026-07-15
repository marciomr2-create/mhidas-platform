# Revisão estrutural do terceiro rascunho corrigido da migration comercial de ingressos

Versão: `v4.8.100-event-ticket-commercial-migration-third-corrected-adjusted-draft-structural-review-safe`

Base revisada:

- versão: `v4.8.99-event-ticket-commercial-migration-third-corrected-adjusted-draft-safe`;
- commit: `10ce52c4d616e4e4a2b67f3c10fc6ad21413ea7f`;
- SQL SHA256: `A137453B2C7F2A1BF0E580498D0F19B4461EF1EF594D6EB87CB34600DDA66DA9`;
- documento SHA256: `2839E478094419D9CFBA746B8C6DF78F58DBA9310A0B08B28CBD9CA46575EA20`;
- contrato SHA256: `A315414A90C2A752C7AF905E59835F99497F35D8F6CA631BBC7A19E8FE051E51`.

## Decisão

`needs_adjustment`

O rascunho v4.8.99 corrige os nove bloqueadores da revisão anterior. A quarta revisão estrutural independente encontrou nove incompatibilidades adicionais: cinco críticas e quatro altas. A promoção para migration executável permanece bloqueada.

## Resumo

| # | Chave | Severidade | Resumo |
|---:|---|---|---|
| 1 | `legacy_idempotency_paths_remain_non_atomic` | critical | Fluxos concedidos ainda usam o contrato idempotente v2 |
| 2 | `trusted_integration_identity_not_credential_bound` | critical | A integração é escolhida pelo chamador service_role |
| 3 | `partner_lifecycle_not_idempotent_or_transition_constrained` | critical | Lifecycle do parceiro não tem recibo nem matriz |
| 4 | `retention_retirement_not_idempotent_or_state_guarded` | critical | Política pode ser aposentada fora do estado ativo |
| 5 | `cascade_mutations_lack_per_object_audit` | critical | Cascatas não geram auditoria individual |
| 6 | `trusted_integration_onboarding_and_rotation_path_missing` | high | Falta onboarding e rotação controlados |
| 7 | `integration_scope_terminal_insert_and_audit_identity_ambiguous` | high | Scope terminal pode nascer sem histórico |
| 8 | `admin_full_purchase_signal_read_path_missing` | high | Administrador perdeu o caminho de leitura integral |
| 9 | `audit_and_receipt_retention_contract_missing` | high | Auditoria e recibos não têm retenção |

## Achados

### 1. Fluxos legados continuam fora da reserva idempotente atômica

**Severidade:** `critical`

A reserva v3 foi aplicada a sinais e parte do lifecycle novo, mas RPCs ainda concedidas continuam no padrão consultar-antes e gravar-depois. A validação URL v4 delega ao writer v2. Mutações de canal, solicitações, comunicações, expiração e retenção também continuam no contrato v2.

**Evidências:** `mhidas_record_event_ticket_channel_url_validation_v4` chama `mhidas_record_event_ticket_channel_url_validation_v2`; `mhidas_admin_mutate_event_ticket_commercial_channel_v2` usa `mhidas_ticket_assert_receipt_replay_v2` e `mhidas_ticket_write_operation_receipt_v2`; `mhidas_run_event_ticket_retention_batch_v2` permanece concedida ao `service_role`.

**Correção exigida:** migrar todos os RPCs efetivamente concedidos para reserva e conclusão atômicas, com replay determinístico de estados pending, completed e failed.

### 2. Identidade da integração é escolhida pelo chamador service_role

**Severidade:** `critical`

A RPC de conversão recebe `integration_id` e `provider_namespace` do payload e verifica somente se o registro está ativo. `credential_reference_hash` e `verification_evidence_hash` não participam da autorização da chamada. Um caminho com `service_role` pode se apresentar como outra integração ativa.

**Correção exigida:** derivar a integração de um contexto de credencial verificado pelo servidor, vincular a versão da credencial e registrar o verificador no recibo e na auditoria.

### 3. Lifecycle do parceiro não possui recibo nem matriz de transição

**Severidade:** `critical`

`mhidas_admin_mutate_commercial_partner_status_v1` recebe `idempotency_key`, mas não usa recibo. A função aceita `verified`, `suspended` ou `deactivated` sem validar o estado anterior, não mantém `suspended_at` e `deactivated_at` e registra `previous_status` nulo.

**Correção exigida:** adicionar recibo atômico, matriz explícita, hashes obrigatórios, timestamps coerentes e snapshots before/after.

### 4. Aposentadoria da política não exige estado ativo nem recibo

**Severidade:** `critical`

`mhidas_admin_retire_event_ticket_retention_policy_v1` pode definir `retired` sobre uma política draft, approved ou já retired. A auditoria informa `active` como estado anterior sem confirmar isso, e a retentativa não possui autoridade de recibo.

**Correção exigida:** permitir somente `active -> retired`, reservar recibo antes dos efeitos e reproduzir o resultado concluído em retentativas.

### 5. Cascatas alteram dependências sem auditoria individual

**Severidade:** `critical`

Suspender ou revogar integração altera scopes; suspender parceiro altera integrações e scopes; aposentar política pausa canais. Cada função escreve somente a auditoria do objeto principal, sem uma entrada append-only para cada dependência alterada.

**Correção exigida:** gerar auditoria individual e correlacionada para cada scope, integração e canal, com before/after, versão e resultado.

### 6. Registro não possui onboarding e rotação de credencial controlados

**Severidade:** `high`

O trigger bloqueia mutação direta fora do contexto interno, mas a RPC criada suporta apenas activate, suspend e revoke. Não existe caminho administrado para criar integração, trocar `credential_reference_hash` ou renovar `verification_evidence_hash` com lock, recibo e auditoria.

**Correção exigida:** criar onboarding e rotação transacionais, com histórico de credenciais e revogação da versão anterior.

### 7. Scope terminal pode nascer sem histórico e sua auditoria é ambígua

**Severidade:** `high`

A RPC de scope usa UPSERT para authorize, suspend e revoke. Na ausência do registro, suspend ou revoke cria diretamente um estado terminal. A auditoria usa apenas `channel_id` como `target_id`, não registra `integration_id` e mantém o estado anterior nulo.

**Correção exigida:** permitir INSERT somente em estado inicial autorizado, exigir existência para suspend/revoke e identificar a chave composta na auditoria.

### 8. A redaction remove também a leitura operacional do administrador

**Severidade:** `high`

O SELECT integral foi revogado de `authenticated` e substituído por colunas redigidas. A policy administrativa não supera a ausência de privilégio nas demais colunas. Não há view ou RPC admin-only para hashes, evidências e valores necessários à reconciliação.

**Correção exigida:** manter o caminho redigido para clubbers e criar leitura administrativa mínima, auditada e com finalidade explícita.

### 9. Auditoria e recibos não possuem retenção ou anonimização

**Severidade:** `high`

`event_ticket_commercial_audit_log` e `event_ticket_operation_receipts` armazenam identificadores, correlação, idempotência e hashes sem `retention_expires_at`, processamento ou política associada. O batch existente trata apenas cliques e sinais.

**Correção exigida:** definir retenção e anonimização para auditoria e recibos, preservando somente a evidência necessária.

## Dependências externas abertas

1. inventário fresco do schema de produção;
2. contrato definitivo da autorização administrativa;
3. onboarding verificado de parceiros e integrações;
4. semântica financeira comercial;
5. validador server-side de URL e credencial;
6. registro real de namespaces e credenciais;
7. base legal, retenção e anonimização;
8. testes paralelos de concorrência e falhas;
9. backup e rollback de produção;
10. quinta revisão estrutural independente.

## Limites

- não altera o SQL v4.8.99;
- não cria migration executável;
- não move SQL para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não ativa canal comercial;
- não altera a página pública.

## Próxima decisão permitida

Criar um quinto plano de ajustes protegido para os nove achados. Nenhum SQL pode ser promovido antes da correção e de nova revisão estrutural independente.
