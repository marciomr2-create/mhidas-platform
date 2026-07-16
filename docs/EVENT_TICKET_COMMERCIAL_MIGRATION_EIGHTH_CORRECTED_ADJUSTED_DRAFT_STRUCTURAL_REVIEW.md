# EVENT TICKET COMMERCIAL MIGRATION — EIGHTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versão

`v4.8.111-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versão: `v4.8.110-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-safe`
- commit: `cad168206541292f73cb32f1370aae2f90a75cb6`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `F93476685C4DE2E99A32B2D232A95AD60F6681C5791467D04C6E9A572D79DBEB`

## Decisão

`needs_adjustment_with_remediation_matrix`

O rascunho fecha parte relevante dos bloqueadores anteriores, mas ainda não pode ser promovido. Esta revisão inclui a matriz técnica de remediação e elimina uma versão intermediária exclusiva de planejamento.

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
| 1 | `stable_retention_policy_resolver_attempts_row_lock` | `critical` | `mhidas_ticket_resolve_active_retention_policy_v1` é declarada `STABLE`, mas executa `SELECT ... FOR SHARE`. Funções STABLE rodam com semântica somente leitura; o contrato de bloqueio não é compatível com essa classificação e pode impedir a resolução operacional das policies. | Reclassificar o resolvedor como `VOLATILE` ou remover o bloqueio, definir a estratégia concorrente de leitura/ativação e executar teste PostgreSQL real que prove resolução, rotação e concorrência de policy. |
| 2 | `verified_credential_context_is_not_cryptographically_bound` | `critical` | A emissão aceita hashes fornecidos pelo `service_role`, não compara `p_issued_by_verifier_key_hash` com `verifier_key_hash` da credencial corrente e não inclui `p_issuer_service_key` nem a identidade do verificador no hash semântico do pedido. O consumo recebe apenas `context_id`; `context_token_hash` e a assinatura do pedido não são reapresentados nem verificados. | Criar boundary de verificação criptográfica com chave corrente, assinatura, audience, nonce e operação vinculados; incluir todos os campos no request hash e exigir token/prova de posse no consumo único do contexto. |
| 3 | `commercial_channel_activation_is_not_authorization_bound` | `critical` | `request_id` é apenas uma FK simples e não é vinculado ao mesmo parceiro/evento. A constraint de canal ativo exige somente `url_validation_status = validated`; não exige request aprovado, administrador autorizador, timestamps de autorização/ativação, modelo financeiro coerente ou scope ativo. O resolver público também não consulta o request nem esses campos. | Implementar RPC única de autorização/ativação com máquina de estados, FK/constraint semântica para request+partner+event, evidência administrativa e financeira obrigatória, snapshot de lifecycle e auditoria atômica. |
| 4 | `retention_execution_omits_sensitive_evidence_families` | `critical` | As 17 regras materializadas cobrem somente `event_ticket_operation_receipts` e `event_ticket_commercial_audit_log`. O batch atualiza apenas essas duas tabelas. A policy `trusted_signal` é resolvida na gravação, mas não existe execução de tombstone/minimização para purchase signals, click attributions, verified credential contexts, communications ou backfill rejections. | Criar matriz completa por família de evidência e executor fail-closed para cada tabela, com checkpoints, contagens, tombstone/anonymize/delete conforme policy, integridade referencial e testes de recuperação. |
| 5 | `receipt_minimization_preserves_raw_result_identity` | `critical` | O recibo nasce com `result_id = target_id`. O batch substitui `target_id`, mas não altera `result_id`; a matriz de 17 regras também omite esse campo. O identificador bruto continua diretamente disponível e ainda pode ser correlacionado por `receipt_id` no audit log. | Incluir `result_id` e toda coluna de vínculo na matriz, separar resultado operacional de identidade minimizada, substituir o valor de forma consistente e validar que nenhuma relação reidentificável permaneça após o batch. |
| 6 | `json_minimization_is_shallow_and_bypassable` | `critical` | `mhidas_ticket_json_object_is_minimized_v1` verifica somente chaves do primeiro nível com `?|`, de forma sensível a caixa. Estruturas como `{"safe":{"email":"..."}}`, chaves alternativas ou valores brutos sob nomes permitidos passam pelas constraints de metadata e snapshots. | Substituir blacklist genérica por schemas allowlist específicos por objeto, inspeção recursiva, limites de tamanho/profundidade e validação de valores; recusar qualquer payload fora do contrato. |
| 7 | `active_integration_credential_invariants_are_not_schema_closed` | `high` | A constraint da integração ativa exige apenas `partner_id`, permitindo `current_credential_version_id` nulo. Não existe índice parcial que impeça múltiplas credenciais `active` por integração. O self-check ignora integrações ativas sem ponteiro e não verifica validade temporal da credencial corrente. | Fechar invariantes com constraints/trigger diferível ou RPC exclusiva, unicidade parcial da credencial ativa e self-check que detecte ponteiro nulo, status divergente, validade expirada e múltiplas versões ativas. |
| 8 | `purchase_signal_lifecycle_and_supersession_are_inconsistent` | `high` | O índice único `(integration_id, external_transaction_hash)` cobre simultaneamente `attributed_conversion` e `confirmed_conversion`, impedindo registrar os dois estágios para a mesma transação. `supersedes_signal_id` é FK simples, sem vínculo de evento, integração ou transação, e a RPC não implementa correção/supersessão atômica. | Definir modelo explícito de evento ou estado de conversão, permitir progressão idempotente controlada, vincular supersessão por constraints compostas e atualizar o sinal anterior de forma auditada e concorrente. |
| 9 | `url_proof_and_official_fallback_are_not_authority_bound` | `high` | O freshness helper apenas testa formato e timestamps de hashes independentes; não há assinatura/manifesto que vincule URL, hostname, resolução, redirects e versão do validador. A validação de hostname é textual e o fallback aceita qualquer `source_url` com prefixo HTTPS, sem autoridade da fonte, frescor máximo ou política de domínio comercial. | Persistir atestado assinado e versionado do validador, validar resolução/IP e redirects no boundary seguro, exigir fonte oficial autorizada e fresca no fallback e aplicar allowlist/denylist comercial fail-closed. |
| 10 | `preflight_does_not_reject_legacy_security_bypass_objects` | `high` | O preflight rejeita apenas as assinaturas finais listadas e as tabelas-alvo. Ele não procura famílias anteriores de funções `mhidas_ticket_*`, policies, grants, triggers ou índices conflitantes. Uma RPC antiga ainda executável pode coexistir e ignorar os controles da v4.8.110. | Gerar inventário fechado de objetos por prefixo e assinatura, abortar diante de qualquer versão legada ou grant inesperado e incluir plano explícito de revoke/drop/migração antes da promoção. |

## Matriz técnica de correção integrada

| Fase | Entrega | Bloqueador coberto | Testes de aceitação |
|---|---|---|---:|
| `R1` | O resolvedor de policy de retenção tenta bloquear linhas dentro de uma função STABLE | `stable_retention_policy_resolver_attempts_row_lock` | `5` |
| `R2` | O contexto verificado pode ser emitido e consumido sem prova criptográfica vinculante | `verified_credential_context_is_not_cryptographically_bound` | `5` |
| `R3` | Um canal pode ficar ativo sem comprovar autorização comercial e request correspondente | `commercial_channel_activation_is_not_authorization_bound` | `5` |
| `R4` | A execução de retenção não alcança sinais, cliques, contextos ou comunicações | `retention_execution_omits_sensitive_evidence_families` | `5` |
| `R5` | A minimização do recibo mantém o identificador original em `result_id` | `receipt_minimization_preserves_raw_result_identity` | `5` |
| `R6` | A validação de JSON usa blacklist superficial e permite dados sensíveis aninhados | `json_minimization_is_shallow_and_bypassable` | `5` |
| `R7` | Integração ativa e credencial corrente ainda podem entrar em estado inválido | `active_integration_credential_invariants_are_not_schema_closed` | `5` |
| `R8` | A unicidade de transação conflita com a evolução attributed→confirmed e a supersessão não é vinculada | `purchase_signal_lifecycle_and_supersession_are_inconsistent` | `5` |
| `R9` | A prova de URL e o fallback oficial ainda dependem de artefatos não autenticados | `url_proof_and_official_fallback_are_not_authority_bound` | `5` |
| `R10` | O preflight não inventaria RPCs antigas, policies e grants que podem contornar o novo boundary | `preflight_does_not_reject_legacy_security_bypass_objects` | `5` |

### Critérios obrigatórios para o próximo SQL

1. Preservar integralmente a v4.8.110 e criar novo SQL protegido.
2. Manter o DDL normalizado a partir do schema-base.
3. Corrigir os dez bloqueadores com testes PostgreSQL reais, positivos, negativos e concorrentes.
4. Tornar a emissão e o consumo de contexto criptograficamente vinculantes.
5. Autorizar e ativar canal somente por state machine administrativa com request semântico aprovado.
6. Completar retenção e minimização para todas as famílias de evidência.
7. Fechar invariantes de integração, credencial, conversão e supersessão no schema.
8. Vincular URL proof e fallback a autoridade, frescor e política comercial.
9. Inventariar e bloquear objetos legados que possam contornar o boundary.
10. Manter promoção bloqueada até nova revisão independente e dry-run real.

## Dependências externas ainda abertas

1. inventário fresco e completo do schema de produção;
2. contrato definitivo de autorização administrativa;
3. serviço criptográfico real de verificação e rotação de credenciais;
4. política comercial de domínios, redirects e fontes oficiais;
5. semântica financeira comercial definitiva;
6. base legal, retenção, anonimização e tombstone por evidência;
7. testes PostgreSQL reais de concorrência, idempotência e falhas;
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
