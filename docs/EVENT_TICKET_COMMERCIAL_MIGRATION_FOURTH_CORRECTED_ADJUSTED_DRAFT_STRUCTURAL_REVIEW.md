# EVENT TICKET COMMERCIAL MIGRATION — FOURTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versão

`v4.8.103-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versão: `v4.8.102-event-ticket-commercial-migration-fourth-corrected-adjusted-draft-safe`
- commit: `4b8fe9a3a312e12c0cf3f08e0432544a2d3aeb8b`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `E39D742A2505D5EE4B678469AF3DDB8B750B77D50CAE2E6FBADC8C56FC676444`

## Decisão

`needs_adjustment_with_remediation_matrix`

O rascunho permanece protegido e não pode ser promovido. Esta revisão já incorpora a matriz técnica de correção, eliminando uma versão intermediária exclusiva de planejamento.

## Resultado executivo

- ajustes obrigatórios: `8`;
- críticos: `4`;
- altos: `4`;
- testes de aceitação definidos: `40`;
- SQL revisado alterado: `False`;
- promoção permitida: `False`.

## Achados estruturais

| # | Chave | Severidade | Evidência | Correção obrigatória |
|---:|---|---|---|---|
| 1 | `retention_policy_resolution_and_batch_scope_not_bound` | `critical` | **Resolução e execução de retenção não estão vinculadas à policy correta.** O trigger escolhe qualquer policy ativa sem dimensões determinísticas e usa signal_retention_days para recibos e auditorias. O batch recebe uma policy, mas não filtra os candidatos por retention_policy_version_id. | Criar policies específicas para receipt/audit; resolver por purpose, jurisdiction e evidence class com unicidade; filtrar ambos os lotes pela policy recebida e registrar contagens por classe. |
| 2 | `verified_credential_context_issuance_authority_missing` | `critical` | **Contexto de credencial é consumido, mas não possui autoridade de emissão.** A tabela de contextos existe e há RPC de consumo, porém o SQL não contém caminho controlado de INSERT, validação criptográfica de emissão, revogação ou expiração server-side. | Adicionar RPC service_role de emissão com verificador, nonce e request hash; revogar contextos antigos; expirar contextos por batch; auditar emissão, consumo e revogação. |
| 3 | `current_credential_cross_integration_integrity_missing` | `critical` | **Credencial atual não possui integridade composta com a integração.** current_credential_version_id referencia somente credential_version_id. O banco não impede uma integração de apontar para uma credencial pertencente a outra integração. | Adicionar unicidade composta (integration_id, credential_version_id) e FK composta; validar no trigger e no preflight; testar tentativa cross-integration. |
| 4 | `purchase_signal_replay_not_credential_bound_before_reservation` | `critical` | **Replay de sinal confiável pode retornar antes de validar a credencial apresentada.** A reserva v4 é criada com credential_version_id e verifier_evidence_hash nulos. Em replay completed, a função retorna o sinal antes de consumir ou validar o novo contexto. | Resolver e bloquear o contexto antes da reserva, incluir credential_version_id e verifier hash na chave semântica, e somente permitir replay para a mesma credencial e assinatura. |
| 5 | `cascade_audit_lineage_uses_legacy_writer` | `high` | **Cascatas administrativas ainda gravam auditoria sem lineage do recibo.** As cascatas de parceiro e retenção usam mhidas_ticket_write_audit_v1, não vinculando receipt_id, parent target, target hash e evidência de credencial. | Migrar todas as cascatas para audit v2; vincular cada objeto ao recibo pai; adicionar preflight que proíba audit v1 nos novos RPCs. |
| 6 | `admin_signal_read_hash_not_same_snapshot_as_result` | `high` | **Hash da leitura administrativa pode não representar as linhas retornadas.** A função calcula count/hash em um SELECT e retorna linhas em outro SELECT. Em READ COMMITTED, os comandos podem observar snapshots diferentes. | Materializar o conjunto uma única vez em tabela temporária/CTE persistida na função; calcular hash e retornar exatamente o mesmo conjunto; incluir ordenação canônica. |
| 7 | `retention_anonymization_minimization_incomplete` | `high` | **Anonimização mantém identificadores operacionais correlacionáveis.** O batch limpa principal_id e snapshots, mas preserva idempotency_key, target_id, correlation_id e outros vínculos capazes de reidentificação operacional. | Definir matriz de campos por classe; substituir chaves brutas por hashes estáveis quando permitido; preservar somente lineage legal mínimo e testar não reidentificação. |
| 8 | `operation_receipt_failure_and_pending_replay_contract_incomplete` | `high` | **Estado terminal de recibos não é totalmente idempotente.** mhidas_ticket_fail_operation_receipt_v1 exige pending e usa RETURNING INTO STRICT. Repetição de falha ou corrida com completion gera erro não classificado; alguns chamadores tratam qualquer replay não owner de forma inconsistente. | Criar fail v2 idempotente; distinguir pending/completed/failed em todos os chamadores; registrar failure hash consistente e definir recuperação controlada. |

## Matriz técnica de correção integrada

| Fase | Entrega | Bloqueadores cobertos | Testes de aceitação |
|---|---|---|---:|
| `R1` | `retention_contract_v2` | `retention_policy_resolution_and_batch_scope_not_bound` | `5` |
| `R2` | `credential_context_issuance_and_revocation` | `verified_credential_context_issuance_authority_missing` | `5` |
| `R3` | `composite_credential_integrity` | `current_credential_cross_integration_integrity_missing` | `5` |
| `R4` | `credential_bound_signal_idempotency` | `purchase_signal_replay_not_credential_bound_before_reservation` | `5` |
| `R5` | `receipt_linked_cascade_audit` | `cascade_audit_lineage_uses_legacy_writer` | `5` |
| `R6` | `single_snapshot_admin_read` | `admin_signal_read_hash_not_same_snapshot_as_result` | `5` |
| `R7` | `data_minimization_retention_matrix` | `retention_anonymization_minimization_incomplete` | `5` |
| `R8` | `terminal_receipt_state_machine_v2` | `operation_receipt_failure_and_pending_replay_contract_incomplete` | `5` |

### Critérios obrigatórios para o próximo SQL

1. Cada correção deve ser adicionada em novo SQL protegido, preservando integralmente a v4.8.102.
2. Os oito bloqueadores devem possuir evidência estática e teste negativo correspondente.
3. Nenhuma função nova pode depender de contexto de credencial emitido fora de um contrato server-side explícito.
4. Retenção deve ser determinística por policy e classe de registro.
5. Idempotência deve vincular ator, credencial, operação, alvo, payload e estado terminal.
6. Auditoria de leitura e cascata deve representar exatamente o conjunto ou objeto afetado.
7. A promoção continuará bloqueada até nova revisão estrutural independente.

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

Criar um novo SQL protegido corrigindo os oito bloqueadores desta revisão. Não criar uma versão separada de plano.
