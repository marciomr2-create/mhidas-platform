# EVENT TICKET COMMERCIAL MIGRATION — FIFTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versão

`v4.8.105-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versão: `v4.8.104-event-ticket-commercial-migration-fifth-corrected-adjusted-draft-safe`
- commit: `cc81223a701cfa3dfee5bbafcd2731807f721ef1`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_FIFTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `66ACF4664829AC9722B2DEF1A029D3CE42D883F30A34522DC782B0AE9699B161`

## Decisão

`needs_adjustment_with_remediation_matrix`

O rascunho permanece protegido e não pode ser promovido. Esta revisão inclui a matriz de remediação, portanto não exige uma versão intermediária exclusiva de planejamento.

## Resultado executivo

- ajustes obrigatórios: `9`;
- críticos: `4`;
- altos: `5`;
- testes de aceitação definidos: `45`;
- SQL revisado alterado: `False`;
- promoção permitida: `False`.

## Achados estruturais

| # | Chave | Severidade | Evidência | Correção obrigatória |
|---:|---|---|---|---|
| 1 | `credential_bound_receipt_insert_violates_pair_presence` | `critical` | **Reserva vinculada à credencial viola a própria integridade composta.** A v4.8.104 adiciona integration_id aos recibos e exige que integration_id e credential_version_id estejam ambos nulos ou ambos preenchidos. Porém mhidas_ticket_reserve_operation_receipt_v4 insere credential_version_id sem integration_id, e o sinal v6 tenta preencher integration_id somente depois da reserva. A inserção falha antes do UPDATE. | Criar reserva v5 recebendo integration_id e inserindo o par atomicamente; validar a FK composta no próprio INSERT e remover o UPDATE posterior. |
| 2 | `class_specific_retention_policies_not_seeded` | `critical` | **Triggers de recibo e auditoria não possuem policies ativas resolvíveis.** As policies existentes são convertidas para evidence_class=default. Os novos triggers exigem exatamente operation_receipt e commercial_audit por SELECT INTO STRICT, mas o SQL não cria nem reconcilia essas duas policies ativas. A primeira gravação de recibo ou auditoria falha. | Adicionar backfill determinístico e fail-closed para policies de receipt/audit; validar unicidade dimensional e bloquear instalação se os contratos não puderem ser reconciliados. |
| 3 | `new_security_definer_functions_keep_public_execute` | `critical` | **Novas funções SECURITY DEFINER permanecem executáveis por PUBLIC.** As funções novas da camada v4.8.104 não recebem REVOKE ALL explícito. PostgreSQL concede EXECUTE a PUBLIC por padrão; helpers como consume context v2, cascade audit v3, fail receipt v2 e classify receipt v2 também não possuem verificação interna suficiente. | Revogar PUBLIC/anon/authenticated em todas as funções internas; conceder somente aos papéis necessários e repetir autorização dentro de cada boundary SECURITY DEFINER. |
| 4 | `trusted_signal_v6_nests_legacy_receipt_and_audit_path` | `critical` | **Sinal v6 divide a atomicidade entre recibo novo e caminho legado.** mhidas_record_event_ticket_purchase_signal_v6 reserva um recibo v4 e consome a credencial, mas chama mhidas_record_event_ticket_purchase_signal_v4. A função v4 cria outro recibo v3, completa pelo contrato v1 e grava audit v1. O lineage de credencial fica separado e a idempotência deixa de ser uma única autoridade transacional. | Criar writer v7 completo que grave o sinal diretamente sob um único recibo credential-bound, complete uma única state machine e escreva audit v3 com receipt/integration/credential lineage. |
| 5 | `credential_context_lifecycle_has_no_receipt_or_audit_lineage` | `high` | **Emissão, revogação, expiração e consumo de contexto não são auditadas.** As RPCs de contexto alteram estado crítico, porém não criam operation receipt, retention run ou audit row. O target_type de auditoria também não contempla credential_context. | Adicionar target type e writer específicos; registrar emissão, consumo, revogação e expiração com receipt, integration_id, credential_version_id, evidence hash e correlação. |
| 6 | `credential_context_issuance_retry_is_not_idempotent` | `high` | **Retry de emissão pode revogar o próprio resultado ou colidir no nonce.** A emissão revoga contextos issued com o mesmo issuance_request_hash e depois insere outro. Um retry com o mesmo nonce colide no índice único; com nonce diferente cria nova emissão sem replay determinístico. Não existe idempotency_key nem resultado durável. | Criar emissão v2 com receipt/reservation, chave semântica por integration+credential+request+nonce e retorno idempotente do mesmo contexto já emitido. |
| 7 | `retention_minimization_rules_are_declarative_only` | `high` | **Matriz de minimização é criada, mas nunca executada.** event_ticket_retention_minimization_rules aparece apenas na definição da tabela. O batch v2 mantém uma lista hardcoded de campos e ignora minimization_action, stable_hash_namespace e preserve_for_legal_hold. | Validar e materializar regras permitidas por classe; executar uma matriz fechada server-side ou remover a tabela declarativa para evitar falsa governança. |
| 8 | `governance_retention_batch_v2_lacks_durable_run_and_idempotency` | `high` | **Batch de governança não registra execução durável nem replay.** mhidas_run_event_ticket_governance_retention_batch_v2 recebe correlation_id e idempotency_key, mas apenas devolve seus hashes em JSON. Não cria event_ticket_retention_runs, operation receipt ou audit row, nem oferece replay determinístico para concorrência/retry. | Criar batch v3 com reserva atômica, retention_run persistente, contagens por policy/evidence class, terminal receipt e auditoria do resultado. |
| 9 | `cascade_audit_replacements_are_missing` | `high` | **RPCs administrativas antigas são revogadas sem substitutos funcionais.** A v4.8.104 revoga partner status v2 e retention policy retire v2 de todos os papéis, mas apenas define mhidas_ticket_write_cascade_audit_v3 e um comentário. Não existem novas RPCs administrativas que executem a mutação e chamem o writer v3. | Criar substitutos v3 completos antes de revogar os contratos anteriores; preservar lock_version, receipt lineage, auditoria por objeto e grants explícitos. |

## Matriz técnica de correção integrada

| Fase | Entrega | Bloqueador coberto | Testes de aceitação |
|---|---|---|---:|
| `R1` | `credential_bound_receipt_insert_violates_pair_presence` | `credential_bound_receipt_insert_violates_pair_presence` | `5` |
| `R2` | `class_specific_retention_policies_not_seeded` | `class_specific_retention_policies_not_seeded` | `5` |
| `R3` | `new_security_definer_functions_keep_public_execute` | `new_security_definer_functions_keep_public_execute` | `5` |
| `R4` | `trusted_signal_v6_nests_legacy_receipt_and_audit_path` | `trusted_signal_v6_nests_legacy_receipt_and_audit_path` | `5` |
| `R5` | `credential_context_lifecycle_has_no_receipt_or_audit_lineage` | `credential_context_lifecycle_has_no_receipt_or_audit_lineage` | `5` |
| `R6` | `credential_context_issuance_retry_is_not_idempotent` | `credential_context_issuance_retry_is_not_idempotent` | `5` |
| `R7` | `retention_minimization_rules_are_declarative_only` | `retention_minimization_rules_are_declarative_only` | `5` |
| `R8` | `governance_retention_batch_v2_lacks_durable_run_and_idempotency` | `governance_retention_batch_v2_lacks_durable_run_and_idempotency` | `5` |
| `R9` | `cascade_audit_replacements_are_missing` | `cascade_audit_replacements_are_missing` | `5` |

### Critérios obrigatórios para o próximo SQL

1. Preservar integralmente a v4.8.104 e criar novo SQL protegido.
2. Corrigir os nove bloqueadores com evidência estática e teste negativo.
3. Toda função `SECURITY DEFINER` deve ter revoke/grant explícito e autorização interna.
4. Recibos credential-bound devem inserir `integration_id` e `credential_version_id` atomicamente.
5. Policies de receipt/audit devem existir e ser resolvíveis antes de qualquer trigger dependente.
6. Sinais confiáveis devem usar um único receipt, um único writer e auditoria credential-bound.
7. Lifecycle de contexto e retenção deve possuir recibo, auditoria e replay idempotente.
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

Criar novo SQL protegido corrigindo os nove bloqueadores desta revisão. Não criar versão separada de plano.
