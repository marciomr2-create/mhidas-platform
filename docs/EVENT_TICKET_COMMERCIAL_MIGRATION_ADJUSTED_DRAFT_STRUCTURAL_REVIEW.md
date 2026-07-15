# Revisão estrutural do rascunho ajustado da migration comercial de ingressos — v4.8.91

## Decisão

`needs_adjustment`

A revisão estática da v4.8.90 confirmou que os 18 ajustes planejados foram representados no rascunho protegido. Entretanto, sete incompatibilidades estruturais ainda impedem qualquer promoção para migration executável.

O SQL da v4.8.90 não foi alterado.

## Base revisada

- Versão: `v4.8.90-event-ticket-commercial-migration-adjusted-draft-safe`
- Commit: `c09f4af422659a8fe7ba2f76155635043caffcbf`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT.sql`
- SHA256 do SQL: `2E6BE6D1DA005548E6272AD79432922B91778C5103AD4D7281699450F46A1F3C`
- Documento v4.8.90 SHA256: `182CFB09C586B254BD51D2B3E68FBEB80ABDD6500C80496AA6BB151CA173DA2D`
- Contrato v4.8.90 SHA256: `8C17FE35CD51B004820FE687206C568C22C370E5103DFDF8C197F22C94A0F93C`

## Método

Revisão estática do SQL completo, dos contratos da v4.8.88–v4.8.90 e das migrations capturadas. O parser PostgreSQL reconheceu 127 instruções. Nenhum SQL foi executado e não houve acesso ao Supabase ou ao banco.

## Controles preservados

- guarda incondicional antes do DDL;
- término em `ROLLBACK`;
- SQL fora de `supabase/migrations`;
- referência oficial separada de canal monetizado;
- solicitação de parceiro sem publicação direta;
- canal ativo único por evento;
- autorização administrativa e concorrência otimista desenhadas;
- sinais de compra separados por nível de confiança;
- auditoria e reconciliação sem promoção automática;
- promoção, banco, Supabase e página pública bloqueados.

## Ajustes obrigatórios

| Chave | Severidade | Bloqueador |
|---|---|---|
| `automation_expiry_state_mismatch` | critical | Expiração automática incompatível com o guard do canal |
| `idempotency_receipt_not_bound_to_actor_and_request` | critical | Recibos de idempotência não vinculam ator, alvo e fingerprint da requisição |
| `metadata_privacy_guard_is_denylist_only` | critical | Proteção de metadata é denylist de chaves e não bloqueia conteúdo escalar |
| `purchase_signal_retention_mutation_scope_too_broad` | critical | Exceção de retenção não congela todos os campos imutáveis do sinal |
| `retention_delete_conflicts_with_signal_lineage_and_audit_fk` | critical | Deleção de sinais conflita com lineage e auditoria em ON DELETE RESTRICT |
| `partner_membership_ambiguity_and_partner_status_gap` | high | Validação de representante pode ser ambígua e ignora status do parceiro |
| `url_validation_freshness_is_optional_and_resolver_fail_open` | critical | Freshness da URL é opcional na mutação e ausente no resolvedor público |

### 1. Expiração automática incompatível com o guard do canal

**Problema:** O lote seleciona canais authorized, active e paused, mas o trigger permite actor automation somente para active → expired. Um canal authorized ou paused vencido interrompe o lote.

**Evidências no rascunho:** `channel_status in ('authorized','active','paused')`, `old.channel_status = 'active'`, `COMMERCIAL_CHANNEL_ADMIN_ONLY`.

**Correção exigida:** Alinhar seleção e guard: permitir expiração automatizada idempotente dos três estados, com checagem estrita das únicas colunas mutáveis e contagem real de linhas atualizadas.

### 2. Recibos de idempotência não vinculam ator, alvo e fingerprint da requisição

**Problema:** RPCs consultam operation_scope + idempotency_key e podem retornar o alvo antes de revalidar autorização específica. O recibo não registra ator, operação concreta, target esperado nem hash do payload.

**Evidências no rascunho:** `event_ticket_operation_receipts_v490_unique`, `operation_scope = 'request_mutation'`, `operation_scope = 'signal_insert'`.

**Correção exigida:** Autorizar antes do replay e vincular o recibo a principal, target, operation, expected version e request_hash; rejeitar reutilização semântica divergente.

### 3. Proteção de metadata é denylist de chaves e não bloqueia conteúdo escalar

**Problema:** A função recursiva rejeita alguns nomes de chave, mas aceita uma chave genérica contendo URL, token, e-mail, telefone, IP ou transação bruta; também não limita profundidade, tamanho ou conjunto permitido.

**Evidências no rascunho:** `mhidas_ticket_metadata_is_safe_v1`, `jsonb_each(p_value)`, `lower(v_key) = any`.

**Correção exigida:** Substituir por allowlists específicas por objeto, limites de bytes/profundidade/itens e validação dos valores escalares.

### 4. Exceção de retenção não congela todos os campos imutáveis do sinal

**Problema:** O trigger compara apenas parte das colunas. Em contexto automation, uma atualização poderia alterar provider, prova, assinatura, nonce, valores financeiros, moeda ou confirmação confiável.

**Evidências no rascunho:** `PURCHASE_SIGNAL_APPEND_ONLY`, `v_actor_role = 'automation'`, `old.transaction_hash is not distinct from new.transaction_hash`.

**Correção exigida:** Usar allowlist explícita das colunas anonimizáveis e exigir igualdade de todas as demais colunas, preferencialmente em RPC de retenção dedicado.

### 5. Deleção de sinais conflita com lineage e auditoria em ON DELETE RESTRICT

**Problema:** O lote tenta excluir sinais não conversão, mas parent_signal_id e event_ticket_commercial_audit_log.signal_id usam ON DELETE RESTRICT. Sinais auditados ou com descendentes não podem ser removidos.

**Evidências no rascunho:** `parent_signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict`, `signal_id uuid references public.event_ticket_purchase_signals(signal_id) on delete restrict`, `delete from public.event_ticket_purchase_signals`.

**Correção exigida:** Adotar anonimização/tombstone preservando lineage, ou redesenhar FKs e auditoria com política jurídica explícita; não prometer delete inviável.

### 6. Validação de representante pode ser ambígua e ignora status do parceiro

**Problema:** O guard de solicitação seleciona partner_id por usuário sem filtrar o parceiro-alvo, podendo retornar múltiplas linhas. Fluxos e policies validam representante ativo, mas não exigem commercial_partners.partner_status = verified.

**Evidências no rascunho:** `select r.partner_id`, `where r.user_id = auth.uid()`, `representation_status = 'active'`.

**Correção exigida:** Validar com EXISTS pelo partner_id exato, juntar commercial_partners e exigir parceiro verified, vigência válida e representação ativa.

### 7. Freshness da URL é opcional na mutação e ausente no resolvedor público

**Problema:** p_require_fresh_url é controlado pelo chamador e o resolvedor aceita qualquer canal active + validated, sem limite de idade, health status ou prova de revalidação periódica.

**Evidências no rascunho:** `p_require_fresh_url boolean`, `if p_require_fresh_url`, `url_validation_status = 'validated'`.

**Correção exigida:** Tornar freshness obrigatória para authorize/activate/cutover e fazer o resolvedor falhar fechado por idade, health check e evidência do validador server-side.

## Dependências externas

As dez dependências externas da v4.8.90 continuam abertas:

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

## Resultado

- `structural_decision=needs_adjustment`
- `required_adjustments=7`
- `critical_adjustments=6`
- `high_adjustments=1`
- `external_prerequisites=10`
- `reviewed_sql_changed=False`
- `promotion_allowed=False`
- `executable_migration_created=False`
- `sql_moved_to_supabase_migrations=False`
- `supabase_operation_performed=False`
- `database_write_performed=False`
- `public_event_page_changed=False`
- `ticket_link_activated=False`

## Próximo passo permitido

Criar um plano de ajustes específico para os sete bloqueadores desta revisão. Não alterar o SQL até o plano ser revisado e aprovado.
