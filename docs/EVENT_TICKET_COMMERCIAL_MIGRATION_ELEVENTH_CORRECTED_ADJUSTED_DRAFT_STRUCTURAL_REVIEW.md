# EVENT TICKET COMMERCIAL MIGRATION — ELEVENTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versao

`v4.8.117-event-ticket-commercial-migration-eleventh-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versao: `v4.8.116-event-ticket-commercial-migration-eleventh-corrected-adjusted-draft-safe`
- commit: `97fe043a240f94fd05339bd104e9b0a0c7575d74`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_ELEVENTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `554B610AFE4747C11554A2BAD7A9E4E81A281AA8523F11A401AA045CFD44CFCA`

## Decisao

`needs_adjustment_with_remediation_matrix`

O rascunho permanece protegido e nao pode ser promovido. Esta revisao preserva integralmente o SQL v4.8.116 e incorpora a matriz de remediacao, sem criar uma versao intermediaria exclusiva de planejamento.

## Resultado executivo

- ajustes obrigatorios: `10`;
- criticos: `6`;
- altos: `4`;
- testes de aceitacao definidos: `50`;
- SQL revisado alterado: `False`;
- promocao permitida: `False`.

## Achados estruturais

| # | Chave | Severidade | Evidencia | Correcao obrigatoria |
|---:|---|---|---|---|
| 1 | `retention_signal_family_tombstones_not_due_rows` | `critical` | O batch seleciona uma familia quando qualquer sinal esta vencido, mas a CTE seguinte bloqueia e minimiza todos os sinais ainda nao minimizados dessa familia, sem reaplicar a data-limite ou a policy individual. O limite tambem conta familias, nao linhas, permitindo que uma familia extensa ultrapasse `p_batch_limit`. | Tornar a elegibilidade atomica por familia somente quando todos os membros relevantes estiverem vencidos sob suas policies, ou minimizar apenas membros vencidos sem quebrar a cadeia. Limitar e medir linhas efetivamente bloqueadas e testar familias com correcoes recentes. |
| 2 | `concurrent_receipt_semantic_reuse_is_partially_validated` | `critical` | No caminho normal, o recibo existente compara scope, integration, credential, target type, target id, lock version, request hash e policy. No `unique_violation`, um recibo concluido e reutilizado verificando somente `request_hash` e `target_id`, abrindo uma corrida para reuso semantico divergente. | Centralizar uma comparacao completa e reutiliza-la nos dois caminhos. O replay concorrente deve exigir igualdade de todos os campos semanticos e da policy de retencao. |
| 3 | `credential_signature_is_not_bound_to_registered_key_hash` | `critical` | A emissao verifica assinatura apenas por `credential_key_id` e algoritmo. `verifier_key_hash` e `credential_fingerprint_hash` nao entram no verificador; o primeiro e somente copiado para snapshot. Uma troca de chave no registry sob o mesmo key id pode ser aceita sem corresponder ao hash aprovado no banco. | Usar verificador hash-aware ou attestation imutavel que prove key id, algoritmo, public-key hash e fingerprint. A rotacao e a emissao devem falhar quando o material efetivo nao corresponder aos hashes registrados. |
| 4 | `commercial_destination_ciphertext_is_not_bound_to_signed_url` | `critical` | A prova assinada cobre `destination_url_hash` e hostname, enquanto a ativacao exige apenas que `destination_url_ciphertext` exista e tenha tamanho aceitavel. Nao ha decriptacao, MAC de envelope ou recomputacao de hash/hostname ligando o ciphertext ao destino assinado. | Verificar o envelope criptografico antes da ativacao e novamente no redirect: decriptar em boundary controlado, recomputar URL hash e hostname e comparar com a prova assinada, sem expor plaintext no resolver publico. |
| 5 | `confirmed_conversion_bypasses_conversion_confirmation_scope` | `critical` | A RPC de sinais exige sempre o scope `purchase_signal`. O scope `conversion_confirmation`, apesar de existir no schema, nao e consultado para `confirmed_conversion`; assim uma integracao autorizada apenas a registrar sinais pode confirmar conversoes. | Exigir `conversion_confirmation` ativo, vigente e semanticamente vinculado para confirmacoes. Definir matriz explicita de signal type para scope e aplicar a mesma regra a correcoes de conversao. |
| 6 | `expired_active_channel_blocks_replacement` | `critical` | O indice unico permite apenas uma linha com `channel_status='active'` por evento. O resolver deixa de usar a linha apos `valid_until`, mas nenhuma RPC muda automaticamente o status para `expired` nem faz troca atomica; a linha vencida continua ativa e bloqueia a proxima ativacao. | Criar expiracao e substituicao receipt-first, sob lock, que feche o canal anterior antes de ativar o sucessor. Testar vencimento natural, troca concorrente e rollback sem janela com dois canais ativos. |
| 7 | `retention_rule_contract_is_self_referential` | `high` | O manifesto e o `executor_contract_hash` sao recalculados a partir das regras da propria policy, enquanto o executor continua hardcoded. Na substituicao, exige-se apenas a mesma contagem da policy anterior; um conjunto diferente e auto-consistente pode ser ativado sem corresponder ao comportamento executado. | Fixar manifests canonicos por versao de executor e evidencia, ou executar uma DSL allowlisted derivada das regras. Validar campos, acoes, namespaces e hash do codigo/contrato contra uma referencia externa imutavel. |
| 8 | `legacy_data_backfill_and_cutover_are_absent` | `high` | O preflight exige `event_ticket_intents`, `partner_ticket_requests` e `event_sources`, mas o SQL nao le essas tabelas, nao cria backfill deterministico e nao popula `event_ticket_backfill_rejections`. Tambem nao ha dual-read, checksum ou criterio de cutover. | Adicionar fase protegida de inventario e backfill com mapeamento, rejeicoes, contagens, checksums, idempotencia e plano de cutover/rollback. Nenhum dado legado pode ficar silenciosamente fora do novo modelo. |
| 9 | `contract_json_scalar_types_allow_minimization_bypass` | `high` | O validador recursivo controla nomes de chaves e aplica regex apenas a strings. Numeros, booleanos e `null` passam sem contrato por chave; identificadores, telefones ou valores brutos podem ser armazenados como escalares numericos e escapar das regras de minimizacao. | Definir schema por chave com tipo, formato, tamanho, faixa e nulabilidade. Recusar containers onde nao previstos e normalizar valores antes da validacao. |
| 10 | `post_create_function_execute_allowlist_is_incomplete` | `high` | As funcoes novas revogam EXECUTE somente de `PUBLIC`. Default privileges podem conceder diretamente a `anon`, `authenticated` ou outros roles. O self-check final fecha apenas o allowlist efetivo do `service_role`, sem detectar acesso inesperado aos helpers SECURITY DEFINER pelos demais roles. | Revogar explicitamente de todos os roles nao autorizados, inventariar ACLs e memberships efetivos para todos os login roles e validar allowlist exata por assinatura apos a criacao. |

## Matriz tecnica de correcao integrada

| Fase | Bloqueador | Testes de aceitacao |
|---|---|---:|
| `R1` | `retention_signal_family_tombstones_not_due_rows` | `5` |
| `R2` | `concurrent_receipt_semantic_reuse_is_partially_validated` | `5` |
| `R3` | `credential_signature_is_not_bound_to_registered_key_hash` | `5` |
| `R4` | `commercial_destination_ciphertext_is_not_bound_to_signed_url` | `5` |
| `R5` | `confirmed_conversion_bypasses_conversion_confirmation_scope` | `5` |
| `R6` | `expired_active_channel_blocks_replacement` | `5` |
| `R7` | `retention_rule_contract_is_self_referential` | `5` |
| `R8` | `legacy_data_backfill_and_cutover_are_absent` | `5` |
| `R9` | `contract_json_scalar_types_allow_minimization_bypass` | `5` |
| `R10` | `post_create_function_execute_allowlist_is_incomplete` | `5` |

## Criterios obrigatorios para o proximo SQL

1. Preservar integralmente a v4.8.116 e criar novo SQL protegido.
2. Corrigir a elegibilidade e o limite atomico de familias de sinais na retencao.
3. Unificar a validacao semantica completa dos recibos em todos os caminhos concorrentes.
4. Vincular verificacao de assinatura ao hash e fingerprint da chave aprovada.
5. Vincular o ciphertext comercial ao URL hash e hostname assinados.
6. Aplicar matriz fechada de scopes por tipo de sinal.
7. Criar expiracao e substituicao atomica de canais ativos.
8. Tornar regras de retencao autoridade real e externamente verificavel do executor.
9. Materializar backfill, rejeicoes, checksums e cutover dos dados legados.
10. Fechar tipos JSON e privileges efetivos de todas as funcoes SECURITY DEFINER.

## Pre-requisitos externos

- inventario fresco do schema e volume de dados legado;
- contrato imutavel do registry de chaves com hash-aware verification;
- contrato de criptografia e decriptacao do destino comercial;
- matriz oficial de scopes por tipo de sinal;
- contrato canonico de executor e policies de retencao;
- inventario de default privileges, ACLs e memberships efetivos;
- testes PostgreSQL de DDL, RLS, concorrencia, FK e idempotencia;
- backup e rollback de producao;
- dry-run em clone representativo com backfill;
- revisao independente do proximo SQL.

## Limites preservados

- SQL protegido fora de `supabase/migrations`;
- nenhuma operacao Supabase;
- nenhuma escrita no banco;
- nenhuma alteracao em `/events`, `/event/[event_slug]`, caronas, encontros, check-ins ou ingressos publicos;
- nenhuma promocao para migration executavel.
