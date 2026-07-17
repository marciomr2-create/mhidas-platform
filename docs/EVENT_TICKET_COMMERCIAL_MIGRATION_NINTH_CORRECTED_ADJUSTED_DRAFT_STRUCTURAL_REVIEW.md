# EVENT TICKET COMMERCIAL MIGRATION — NINTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versao

`v4.8.113-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versao: `v4.8.112-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-safe`
- commit: `e79116a24155bf62c97a5de4ee834e19367cc90a`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `D8E4A96AEA9E02C6F8ED65821380714241082BD5C5D126220F2FCF282DDD7161`

## Decisao

`needs_adjustment_with_remediation_matrix`

O rascunho permanece protegido e nao pode ser promovido. Esta revisao preserva integralmente o SQL v4.8.112 e incorpora a matriz de remediacao, sem criar uma versao intermediaria exclusiva de planejamento.

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
| 1 | `base_preflight_rejects_required_legacy_indexes` | `critical` | O preflight exige `public.event_ticket_intents` e `public.partner_ticket_requests`, mas depois classifica como drift qualquer indice cujo nome contenha `ticket`. Os indices de chave primaria normalmente chamados `event_ticket_intents_pkey` e `partner_ticket_requests_pkey` entram nesse filtro, tornando a promocao inexequivel mesmo sobre a base esperada. | Trocar a busca ampla por um inventario fechado dos objetos comerciais novos, com allowlist explicita para tabelas e indices-base. Adicionar teste PostgreSQL real que execute o preflight sobre um schema representativo e prove zero falso positivo. |
| 2 | `credential_context_does_not_verify_credential_key_possession` | `critical` | A emissao compara o hash de `p_issuer_service_key` com `issuer_service_key_hash` e calcula HMAC com essa mesma chave. `verifier_key_hash` aparece apenas como texto dentro do payload; nenhuma assinatura e verificada com a chave publica ou material criptografico da credencial corrente. | Separar autoridade do emissor e prova da credencial. Verificar assinatura assimetrica ou prova equivalente contra a credencial corrente, vincular key id/algoritmo/versao e impedir que apenas o segredo do servico emita contexto em nome de qualquer credencial. |
| 3 | `credential_context_consumption_ignores_signed_request_payload` | `critical` | A emissao persiste `request_payload_hash`, mas `mhidas_ticket_consume_verified_credential_context_v6` nao compara esse valor com o `request_hash` do recibo nem com o payload do sinal. Um contexto emitido para um pedido pode autorizar outro pedido com a mesma operation/audience. | Persistir um hash canonico do pedido e exigir igualdade entre contexto, recibo e operacao consumidora na mesma transacao. O teste negativo deve provar que qualquer alteracao em evento, canal, clique, evidencia ou transacao invalida o contexto. |
| 4 | `commercial_url_proof_not_cryptographically_bound_to_destination` | `critical` | `mhidas_ticket_url_proof_is_fresh_v7` verifica formato de hashes, timestamps e igualdade do hash da chave do validador. Ela nao recebe nem valida `destination_url_hash`, ciphertext, payload assinado ou assinatura. Assim, os hashes de host, IP e redirects nao sao comprovadamente derivados da URL armazenada. | Definir atestado canonico assinado contendo channel_id, URL hash, hostname, IPs, redirects, validator version, validated_at e expires_at. Verificar assinatura e autoridade ativa no boundary antes de autorizar e novamente ao resolver. |
| 5 | `official_fallback_hostname_and_authority_not_bound` | `critical` | A attestation armazena `source_hostname`, `signer_key_hash` e manifesto sem `url_validation_authority_id`. O resolver testa se o hostname declarado e publico, mas nao exige que ele seja igual ao hostname extraido de `source_url` nem verifica uma autoridade ativa correspondente. | Adicionar FK para autoridade versionada, assinatura verificavel e constraint/RPC que compare hostname normalizado com a URL. O resolver deve recalcular hash/hostname e rejeitar URLs privadas, divergentes, expiradas ou sem cadeia de autoridade. |
| 6 | `retention_signal_family_is_not_batch_atomic` | `critical` | A FK de supersessao inclui `anonymized_transaction_hash`. O batch seleciona sinais individualmente por `LIMIT` e troca esse hash de `signal.family:*` para `signal.transaction:*`. Se predecessor e sucessor nao estiverem no mesmo lote, a atualizacao de um deles rompe a FK imediata ou deixa a familia inconsistente. | Processar familias completas sob bloqueio, preservar uma chave de familia imutavel ou tornar a migracao de chave diferivel e atomica. Incluir testes com attributed, confirmed e correction atravessando fronteiras de lote. |
| 7 | `service_role_table_dml_boundary_not_explicitly_closed` | `high` | O SQL revoga tabelas apenas de `anon` e `authenticated`, enquanto concede RPCs ao `service_role`. Sem inventario e revoke explicito dos privilegios DML efetivos do `service_role`, processos privilegiados podem contornar recibos, state machines e auditoria com escrita direta. | Inventariar grants herdados e diretos, revogar DML de tabelas do service_role quando compativel com a arquitetura e conceder somente EXECUTE nas RPCs autorizadas. Provar com testes de permissao que DML direto falha. |
| 8 | `retired_policy_strands_existing_evidence` | `high` | O executor resolve somente a policy atualmente ativa e filtra cada tabela pelo ID exato dessa policy. A RPC de aposentadoria nao exige substituta ativa nem migra o vinculo das linhas existentes; registros ligados a uma policy retired podem nunca mais ser processados. | Criar lineage/supersession de policy e executor que processe policies historicas ainda devidas, ou migracao controlada dos vinculos. Bloquear aposentadoria sem substituta aprovada e teste de drenagem. |
| 9 | `hmac_canonical_payload_is_ambiguous_and_session_dependent` | `high` | O payload e montado com `:` embora audience e operation aceitem `:`. Alem disso usa `p_expires_at::text`, cuja representacao depende de timezone/configuracao da sessao. Tuplas distintas podem produzir fronteiras ambiguas e clientes podem assinar representacoes diferentes. | Usar serializacao canonica com campos tipados e length-prefix ou JSON canonico, timestamp UTC em epoch/ISO fixo e domain separation versionada. Testar colisao de delimitador e diferentes timezones. |
| 10 | `receipt_terminal_result_state_is_open` | `high` | `mhidas_ticket_complete_operation_receipt_v5` recebe qualquer `p_result_status`. A constraint de estado exige apenas `receipt_status='completed'`, `completed_at` e `result_hash`, sem allowlist de resultado nem `result_version` obrigatoria. O recibo pode terminar como completed com status semantico invalido. | Definir estados de resultado por operation_scope/operation_name ou enum fechado, exigir result_version e validar transicoes terminalmente. Adicionar testes que rejeitem `pending`, `failed` e valores desconhecidos na conclusao. |

## Matriz tecnica de correcao integrada

| Fase | Bloqueador | Testes de aceitacao |
|---|---|---:|
| `R1` | `base_preflight_rejects_required_legacy_indexes` | `5` |
| `R2` | `credential_context_does_not_verify_credential_key_possession` | `5` |
| `R3` | `credential_context_consumption_ignores_signed_request_payload` | `5` |
| `R4` | `commercial_url_proof_not_cryptographically_bound_to_destination` | `5` |
| `R5` | `official_fallback_hostname_and_authority_not_bound` | `5` |
| `R6` | `retention_signal_family_is_not_batch_atomic` | `5` |
| `R7` | `service_role_table_dml_boundary_not_explicitly_closed` | `5` |
| `R8` | `retired_policy_strands_existing_evidence` | `5` |
| `R9` | `hmac_canonical_payload_is_ambiguous_and_session_dependent` | `5` |
| `R10` | `receipt_terminal_result_state_is_open` | `5` |

## Criterios obrigatorios para o proximo SQL

1. Preservar integralmente a v4.8.112 e criar novo SQL protegido.
2. Corrigir os dez bloqueadores sem concatenar camadas antigas.
3. Executar o preflight em PostgreSQL real sobre schema-base representativo.
4. Vincular prova da credencial, contexto, recibo e payload consumidor.
5. Tornar as provas de URL e fonte oficial criptograficamente verificaveis.
6. Processar familias de sinais de forma atomica durante retencao.
7. Fechar privilegios DML diretos e comprovar o boundary function-only.
8. Garantir continuidade de retencao entre versoes de policy.
9. Canonicalizar todos os payloads assinados.
10. Fechar a maquina de estados dos recibos.

## Pre-requisitos externos

- inventario completo e fresco do schema de producao;
- inventario de grants e memberships efetivos do `service_role`;
- contrato de assinatura e rotacao de credenciais;
- contrato de atestado de URL e fonte oficial;
- politica juridica de retencao e lineage;
- testes PostgreSQL de concorrencia, FK e idempotencia;
- backup e rollback de producao;
- dry-run em clone representativo;
- teste de volume e desempenho;
- revisao independente do proximo SQL.

## Limites preservados

- SQL protegido fora de `supabase/migrations`;
- nenhuma operacao Supabase;
- nenhuma escrita no banco;
- nenhuma alteracao da pagina publica de evento;
- nenhum canal comercial ativado;
- promocao bloqueada;
- plano intermediario separado dispensado.
