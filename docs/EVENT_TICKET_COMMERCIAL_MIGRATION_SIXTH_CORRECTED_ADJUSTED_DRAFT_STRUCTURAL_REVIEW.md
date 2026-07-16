# EVENT TICKET COMMERCIAL MIGRATION — SIXTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versão

`v4.8.107-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versão: `v4.8.106-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-safe`
- commit: `f210c2451fa6b35d929fd90c56e909384c418bde`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `F55552F8ED23DC6BB529B090250CD7DD5631CBB6808CE890BB29B219B54A9360`

## Decisão

`needs_adjustment_with_remediation_matrix`

O rascunho permanece protegido e não pode ser promovido. Esta revisão inclui a matriz de remediação, portanto não exige uma versão intermediária exclusiva de planejamento.

## Resultado executivo

- ajustes obrigatórios: `10`;
- críticos: `6`;
- altos: `4`;
- testes de aceitação definidos: `50`;
- SQL revisado alterado: `False`;
- promoção permitida: `False`.

## Achados estruturais

| # | Chave | Severidade | Evidência | Correção obrigatória |
|---:|---|---|---|---|
| 1 | `retention_dimension_ddl_is_redeclared` | `critical` | **O SQL cumulativo não é executável.** A seção 23 remove `event_ticket_retention_policy_one_active_v490_uq` e adiciona `policy_purpose`, `jurisdiction_code` e `evidence_class`. A seção 40 tenta remover o mesmo índice novamente e adicionar as mesmas três colunas outra vez, sem `IF EXISTS`. A execução falha antes de alcançar as correções mais recentes. | Criar o próximo rascunho como DDL normalizado a partir do schema-base: cada índice, coluna e constraint deve ser criado, alterado ou removido exatamente uma vez. Adicionar self-test de duplicidade estrutural. |
| 2 | `retention_dimension_constraints_are_mutually_incompatible` | `critical` | **As constraints dimensionais antigas e novas são incompatíveis.** `event_ticket_retention_policy_dimensions_v496_check` exige `policy_purpose = 'event_ticket_tracking'` e classes `clubber/redirect/trusted/admin`; a camada v4.8.104 tenta gravar `commercial_governance`, `security_audit`, `operation_receipt` e `commercial_audit` sem remover a constraint anterior. | Remover explicitamente a constraint v496 e substituir por um único contrato dimensional final. Reconciliar os dados antes de aplicar `NOT NULL` e a nova unicidade ativa. |
| 3 | `credential_context_receipt_scope_and_target_are_not_allowed` | `critical` | **Emissão e revogação de contexto não conseguem reservar recibo.** As funções v2 usam `operation_scope='credential_context_mutation'` e `target_type='credential_context'`, porém as constraints finais de `event_ticket_operation_receipts` não incluem esses valores. O INSERT do recibo falha. | Criar constraints finais que incluam os novos escopos e alvos antes das RPCs dependentes; adicionar teste negativo para qualquer valor fora da enumeração. |
| 4 | `credential_context_issuance_retry_uses_random_result_identity` | `critical` | **O retry de emissão continua não idempotente.** `mhidas_ticket_issue_verified_credential_context_v2` gera `v_context_id := gen_random_uuid()` antes da reserva e usa esse UUID como `target_id`, `result_id` e parte do resultado. No retry com a mesma chave, o recibo existente encontra um target diferente e dispara `IDEMPOTENCY_KEY_SEMANTIC_REUSE_DENIED_V5`. | Derivar uma identidade determinística da chave semântica ou consultar o recibo antes de gerar o UUID. O retry deve retornar exatamente o mesmo contexto já emitido. |
| 5 | `receipt_semantic_uniqueness_omits_principal_namespace` | `high` | **A chave única de recibo mistura integrações diferentes.** O índice semântico usa `principal_type`, `principal_id`, `operation_name` e `idempotency_key`, mas não inclui `principal_namespace`. Para `service_role` com `principal_id = null`, duas integrações que reutilizem a mesma chave colidem globalmente e a segunda recebe negação por namespace divergente. | Incluir namespace normalizado ou identidade da integração na autoridade de idempotência; migrar e validar recibos existentes sem permitir colisões entre tenants. |
| 6 | `retention_minimization_rules_are_never_materialized` | `critical` | **O batch v3 é estruturalmente inexequível.** A tabela `event_ticket_retention_minimization_rules` é criada, mas o SQL não insere nenhuma regra. O batch exige `v_rule_count > 0` e sempre lança `RETENTION_MINIMIZATION_RULES_REQUIRED`. | Materializar uma matriz fechada por policy/evidence class, validar cobertura obrigatória e impedir ativação de policy sem o conjunto mínimo de regras. |
| 7 | `retention_batch_uses_one_policy_id_for_receipts_and_audits` | `critical` | **O batch usa uma única policy para classes distintas.** Recibos usam `operation_receipt` e auditorias usam `commercial_audit`, mas `mhidas_run_event_ticket_governance_retention_batch_v3` filtra ambas as tabelas pelo mesmo `p_retention_policy_version_id`. Uma das classes fica sem processamento. | Resolver separadamente as policies de recibo e auditoria, persistir ambos os IDs no run/receipt e aplicar cada matriz somente à sua evidence class. |
| 8 | `failed_receipt_state_is_rolled_back_on_reraise` | `high` | **A falha terminal não é durável.** O writer v7 e o batch v3 chamam `mhidas_ticket_fail_operation_receipt_v2` no bloco `EXCEPTION` e logo executam `RAISE`. O erro aborta a transação e desfaz também o UPDATE do recibo para `failed`. | Não prometer falha durável dentro da mesma transação abortada. Separar execução em envelope transacional controlado, usar retorno terminal sem re-raise ou persistência externa confiável. |
| 9 | `admin_lifecycle_replay_checks_mutated_state_before_receipt` | `high` | **Retries administrativos não alcançam o replay.** Partner status v3 e retention retire v3 validam lock/status atuais e incluem `previous_status` no request hash antes de consultar o recibo. Depois do primeiro sucesso, o mesmo retry falha por lock/status ou hash diferente. A revogação de contexto possui o mesmo padrão. | Consultar a autoridade de idempotência antes das validações mutáveis; guardar o resultado/snapshot original e retornar esse resultado em replay. |
| 10 | `credential_context_consumption_receipt_is_not_semantically_bound` | `high` | **O consumo aceita qualquer UUID de recibo existente.** `mhidas_ticket_consume_verified_credential_context_v3` grava `consumed_receipt_id` sem verificar se o recibo está pendente, pertence à mesma integração/credencial, possui operação `record_purchase_signal_v7` e target correto. A FK isolada garante existência, não semântica. | Validar e bloquear o recibo antes do consumo; exigir integration/credential pair, operação, target, status pending e ownership da reserva. Preferir FK/constraint composta quando aplicável. |

## Matriz técnica de correção integrada

| Fase | Entrega | Bloqueador coberto | Testes de aceitação |
|---|---|---|---:|
| `R1` | Normalização do DDL cumulativo | `retention_dimension_ddl_is_redeclared` | `5` |
| `R2` | Contrato dimensional único de retenção | `retention_dimension_constraints_are_mutually_incompatible` | `5` |
| `R3` | Escopos e alvos finais de recibos | `credential_context_receipt_scope_and_target_are_not_allowed` | `5` |
| `R4` | Emissão idempotente com identidade determinística | `credential_context_issuance_retry_uses_random_result_identity` | `5` |
| `R5` | Autoridade de idempotência multi-tenant | `receipt_semantic_uniqueness_omits_principal_namespace` | `5` |
| `R6` | Materialização obrigatória da matriz de minimização | `retention_minimization_rules_are_never_materialized` | `5` |
| `R7` | Batch com policies separadas por evidence class | `retention_batch_uses_one_policy_id_for_receipts_and_audits` | `5` |
| `R8` | Semântica transacional real para falhas de recibo | `failed_receipt_state_is_rolled_back_on_reraise` | `5` |
| `R9` | Replay antes de lock/status mutáveis | `admin_lifecycle_replay_checks_mutated_state_before_receipt` | `5` |
| `R10` | Vínculo semântico do consumo ao recibo | `credential_context_consumption_receipt_is_not_semantically_bound` | `5` |

### Critérios obrigatórios para o próximo SQL

1. Preservar integralmente a v4.8.106 e criar novo SQL protegido.
2. Gerar um DDL normalizado, não uma concatenação cumulativa de camadas incompatíveis.
3. Corrigir os dez bloqueadores com evidência estática e teste negativo.
4. Garantir replay determinístico antes de validar estado mutável.
5. Incluir namespace/integração na autoridade de idempotência de principal técnico.
6. Materializar e aplicar policies e regras por evidence class.
7. Não declarar falha durável em uma transação que será abortada.
8. A promoção continuará bloqueada até nova revisão estrutural independente.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo de autorização administrativa;
3. serviço real de verificação e emissão de contexto de credencial;
4. semântica financeira comercial;
5. registro real de namespaces e credenciais;
6. base legal, retenção e anonimização;
7. testes paralelos de concorrência e falhas;
8. backup e rollback de produção;
9. teste de performance e volume;
10. revisão estrutural independente do próximo SQL.

## Limites

- não executa migration;
- não move SQL para `supabase/migrations`;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa canal comercial;
- não altera página pública.

## Próxima evolução direta

Criar novo SQL protegido e normalizado corrigindo os dez bloqueadores desta revisão. Não criar versão separada de plano.
