# Rascunho ajustado da migration comercial de ingressos — v4.8.90

## Decisão

`adjusted_draft_ready_for_structural_review`

A versão `v4.8.90-event-ticket-commercial-migration-adjusted-draft-safe` produz um novo rascunho SQL protegido e independente, aplicando ao desenho os 18 ajustes exigidos pela revisão estrutural e organizados pelo plano da v4.8.89.

Esta decisão **não autoriza execução**. O próximo artefato permitido é uma nova revisão estrutural segura.

## Base protegida

- Versão base: `v4.8.89-event-ticket-commercial-migration-adjustment-plan-safe`
- Commit base: `79abab1cee9c63cbc112b05d931af7aa79913757`
- Rascunho anterior v4.8.87: preservado e não alterado
- Revisão estrutural v4.8.88: preservada e não alterada
- Plano de ajustes v4.8.89: preservado e não alterado

## Artefatos desta versão

1. `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT.sql`
   - SHA256: `2E6BE6D1DA005548E6272AD79432922B91778C5103AD4D7281699450F46A1F3C`
   - Guarda incondicional antes de qualquer DDL persistente
   - Transação encerrada em `ROLLBACK`
   - Permanece fora de `supabase/migrations`

2. `src/app/api/official-events/_shared/eventTicketCommercialMigrationAdjustedDraftReview.ts`
   - SHA256: `8C17FE35CD51B004820FE687206C568C22C370E5103DFDF8C197F22C94A0F93C`
   - Contrato de decisão, evidências, bloqueios e self-test
   - Não acessa Supabase, banco, rede ou filesystem

3. `docs/EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTED_DRAFT.md`
   - Este documento

## Limites obrigatórios

Esta versão não:

- executa migration;
- acessa o Supabase;
- escreve no banco;
- cria objetos reais;
- aplica RLS real;
- move SQL para `supabase/migrations`;
- ativa link comercial;
- altera `/events` ou `/event/[event_slug]`;
- modifica SSR, middleware, autenticação ou ownership;
- substitui ou edita o SQL protegido da v4.8.87;
- permite promoção sem nova revisão estrutural.

## Estrutura proposta no rascunho

O SQL protegido organiza os domínios em objetos separados:

- `canonical_event_sources`: referência oficial validada, sem equivaler a canal monetizado;
- `commercial_partners`: identidade comercial verificada;
- `commercial_partner_representatives`: vínculo verificável entre usuário e parceiro;
- `event_ticket_partnership_requests`: solicitações de parceiros, sem publicação direta;
- `event_ticket_commercial_channels`: canal monetizado autorizado e administrado exclusivamente pela USECLUBBERS;
- `event_ticket_click_attributions`: cliques com hashes versionados e retenção;
- `event_ticket_purchase_signals`: sinais append-only, distinguindo autodeclaração e conversão confiável;
- `partner_official_communications`: comunicações com lifecycle e aprovação;
- `event_ticket_commercial_audit_log`: auditoria append-only;
- `event_ticket_retention_policy_versions` e `event_ticket_retention_runs`: política e execução controlada de retenção;
- `event_ticket_backfill_rejections`: reconciliação explícita de registros legados não promovidos.

## Ajustes incorporados

| Nº | Chave | Estado no rascunho | Resultado |
|---:|---|---|---|
| 1 | `exact_schema_preflight_without_drift_masking` | `implemented_in_protected_draft` | Preflight exato falha diante de schema divergente ou objetos-alvo já existentes. |
| 2 | `verified_partner_registry_foreign_key` | `implemented_in_protected_draft` | Solicitações, canais e comunicações usam parceiros e representantes verificados com chaves estrangeiras. |
| 3 | `financial_field_matrix` | `implemented_in_protected_draft` | A matriz financeira impede combinações ambíguas entre percentual, valor fixo e moeda. |
| 4 | `transactional_admin_mutation_rpc` | `implemented_in_protected_draft` | A mutação administrativa de canal é transacional, auditada e idempotente. |
| 5 | `optimistic_concurrency_expected_version` | `implemented_in_protected_draft` | Solicitações, canais e comunicações exigem expected_lock_version. |
| 6 | `request_lifecycle_guard_and_audit` | `implemented_in_protected_draft` | O lifecycle de solicitações possui transições autorizadas, evidência e auditoria. |
| 7 | `request_channel_cross_entity_consistency` | `implemented_in_protected_draft` | Canal derivado de solicitação aprovada deve manter o mesmo parceiro e evento canônico. |
| 8 | `freeze_sensitive_active_channel_fields` | `implemented_in_protected_draft` | Campos sensíveis ficam congelados enquanto o canal está ativo. |
| 9 | `expiry_and_atomic_channel_cutover` | `implemented_in_protected_draft` | Expiração e troca de canal ativo são controladas em transação única. |
| 10 | `official_reference_url_domain_integrity` | `implemented_in_protected_draft` | Referência oficial validada exige HTTPS, domínio autorizado e evidência hash. |
| 11 | `commercial_url_public_network_validation` | `external_validator_required` | O SQL valida estrutura e provas, mas DNS, redirects e SSRF dependem de validador externo. |
| 12 | `immutable_purchase_signal_lineage` | `implemented_in_protected_draft` | Sinais são append-only; confirmação ou correção cria novo registro com lineage. |
| 13 | `conversion_channel_and_provider_namespace` | `implemented_in_protected_draft` | Conversões atribuídas ou confirmadas exigem canal e namespace de provider confiável. |
| 14 | `hash_format_and_metadata_privacy_guards` | `implemented_in_protected_draft` | Hashes são versionados e metadata rejeita dados brutos sensíveis. |
| 15 | `communication_lifecycle_evidence` | `implemented_in_protected_draft` | Comunicações têm lifecycle, lock otimista, evidência e coerência comercial. |
| 16 | `audit_coverage_and_consistency` | `implemented_in_protected_draft` | Operações críticas geram auditoria append-only com correlação e idempotência. |
| 17 | `retention_and_cleanup_enforcement` | `external_policy_approval_required` | O lote de retenção existe, mas períodos e base legal exigem aprovação externa. |
| 18 | `backfill_reconciliation_and_no_silent_skip` | `rejection_first_reconciliation` | Todas as linhas legadas relevantes são classificadas; nenhuma vira canal ativo automaticamente. |

## Decisões técnicas principais

### Referência oficial não é canal comercial

A validação de `canonical_event_sources.source_url` apenas habilita o fallback **Ver evento oficial**. Ela não cria remuneração, tracking ou autorização de venda.

### Canal ativo é imutável nos campos sensíveis

URL, domínio, parceiro, origem, tracking, modelo financeiro, evidências e validade não podem ser alterados enquanto o canal estiver ativo. Mudança material exige novo canal e troca atômica.

### Operações administrativas são transacionais

A RPC administrativa proposta exige:

- usuário autenticado e autorização administrativa confiável;
- `expected_lock_version`;
- `idempotency_key`;
- `correlation_id`;
- motivo;
- auditoria;
- recibo de operação;
- atualização atômica do canal anterior e do novo canal durante cutover.

### Validação de URL possui duas camadas

O SQL cobre apenas a camada estrutural:

- HTTPS;
- hostname normalizado;
- ausência de userinfo;
- ausência de porta;
- bloqueio de localhost, IP literal e sufixos internos;
- domínio autorizado;
- hashes versionados de validação.

A camada dinâmica permanece como dependência externa obrigatória:

- resolução DNS;
- bloqueio de redes privadas, loopback, link-local e ranges reservados;
- validação de todos os redirects;
- revalidação periódica;
- proteção contra DNS rebinding;
- evidência de resultado assinada ou verificável.

### Compra autodeclarada não é conversão confirmada

`ticket_acquired` e ações equivalentes permanecem sinais autodeclarados. Uma conversão confiável exige novo registro append-only com canal, namespace de provider, hash de transação, hash de evidência, validação de assinatura e nonce contra replay.

### Backfill é rejection-first

Nenhum link legado é ativado automaticamente. Cada linha relevante de:

- `partner_ticket_requests`;
- colunas comerciais de `event_groups`;
- `event_ticket_intents` com `ticket_acquired`;

é classificada exatamente uma vez. Sem parceiro verificado, evento canônico reconciliado, autorização, termos financeiros e validação server-side, o registro vai para o relatório de rejeitados com fingerprint SHA256. A contagem fecha o conjunto de origem e bloqueia omissão silenciosa.

## Dependências externas abertas

| Nº | Dependência | Evidência exigida | Estado |
|---:|---|---|---|
| 1 | `fresh_production_schema_inventory` | Inventário atual de schema, constraints, policies, funções e grants da produção. | Aberta |
| 2 | `admin_authorization_rpc_contract` | Contrato aprovado de mhidas_is_useclubbers_admin_v1(uuid), sem depender de metadata editável pelo usuário. | Aberta |
| 3 | `verified_partner_onboarding` | Processo de verificação de parceiro, representante, validade e revogação. | Aberta |
| 4 | `commercial_financial_semantics` | Aprovação comercial e contábil dos modelos de remuneração, moeda e arredondamento. | Aberta |
| 5 | `server_side_url_validator` | Serviço server-side para DNS público, IP privado, redirects, SSRF, HTTPS e freshness. | Aberta |
| 6 | `ticketing_provider_namespace_registry` | Registro de namespaces e contratos de evidência para integrações de ticketeiras. | Aberta |
| 7 | `privacy_legal_basis_and_retention` | Base legal, classificação, períodos, anonimização, deleção e auditoria. | Aberta |
| 8 | `legacy_partner_and_event_mapping` | Mapeamento verificado de parceiro legado e event_group para canonical_event_id. | Aberta |
| 9 | `backup_dry_run_and_reconciliation` | Backup, dry-run em cópia, relatório de rejeitados e plano de rollback operacional. | Aberta |
| 10 | `parallel_concurrency_and_failure_tests` | Testes com sessões paralelas, retries, idempotência, falha intermediária e cutover atômico. | Aberta |

## Critérios obrigatórios da próxima revisão estrutural

A próxima revisão deve, no mínimo:

1. comparar o SQL com um inventário atual da produção;
2. validar assinaturas de tabelas, constraints, policies, funções, grants e extensões;
3. revisar a função administrativa de autorização;
4. revisar RLS e `SECURITY DEFINER`;
5. validar todas as assinaturas de `REVOKE` e `GRANT`;
6. simular concorrência, retries e idempotência;
7. revisar transições de todos os lifecycles;
8. revisar a matriz financeira com comercial e contabilidade;
9. revisar privacidade, base legal, retenção e anonimização;
10. especificar e testar o validador de URL server-side;
11. construir os mapas legados verificados;
12. executar dry-run em cópia isolada, com backup e reconciliação;
13. demonstrar rollback operacional;
14. confirmar que nenhuma página pública ou link comercial foi ativado.

## Resultado esperado dos testes desta versão

- `adjustments_total=18`
- `external_prerequisites=10`
- `draft_decision=adjusted_draft_ready_for_structural_review`
- `promotion_allowed=False`
- `executable_migration_created=False`
- `sql_moved_to_supabase_migrations=False`
- `supabase_operation_performed=False`
- `database_write_performed=False`
- `commercial_channel_activated=False`
- `public_event_page_changed=False`
- `prior_v4_8_87_draft_changed=False`
- `new_structural_review_required=True`

## Próximo passo permitido

Produzir uma nova revisão estrutural do rascunho ajustado. Nenhuma execução ou promoção é permitida nesta etapa.
