# EVENT TICKET COMMERCIAL MIGRATION — TWELFTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versao

`v4.8.119-event-ticket-commercial-migration-twelfth-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versao: `v4.8.118-event-ticket-commercial-migration-twelfth-corrected-adjusted-draft-safe`
- commit: `a02b051fa6bb44a144395b5585e71781da168aad`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_TWELFTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `82550D9EFDF9CDF50C65BB1E5310DC65FDAB5CFD06A537B624814BF090B6DE56`

## Decisao

`needs_adjustment_with_remediation_matrix`

O rascunho permanece protegido e nao pode ser promovido. Esta revisao preserva integralmente o SQL v4.8.118 e incorpora a matriz de remediacao, sem criar uma versao intermediaria exclusiva de planejamento.

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
| 1 | `legacy_backfill_fk_targets_table_created_later` | `critical` | O DDL de event_ticket_legacy_backfill_items declara FK para event_ticket_backfill_rejections antes de essa tabela existir no script. | Reordenar o DDL para criar a tabela referenciada antes do FK, ou adicionar a constraint somente depois que ambas existirem; validar o script em PostgreSQL real com check_function_bodies padrao. |
| 2 | `pretable_rowtype_function_forward_reference_is_not_closed` | `critical` | mhidas_ticket_assert_current_credential_invariant_v1 e criado antes de event_ticket_trusted_integrations e declara public.event_ticket_trusted_integrations%rowtype, sem desabilitar validacao de corpos. | Mover helpers dependentes para depois das tabelas ou criar tipos independentes; nao depender de forward reference e executar dry-run com check_function_bodies=on. |
| 3 | `signal_family_retention_can_partially_tombstone_under_concurrency` | `critical` | A selecao da familia usa advisory lock apenas no executor e a CTE de linhas usa FOR UPDATE SKIP LOCKED. Escritores nao tomam o mesmo lock e linhas bloqueadas podem ser ignoradas, permitindo tombstone parcial ou insercao concorrente na familia. | Compartilhar o mesmo lock entre gravacao e retencao, bloquear e revalidar a familia completa sem SKIP LOCKED parcial e abortar quando a cardinalidade travada divergir da elegivel. |
| 4 | `url_and_official_source_signatures_are_not_key_hash_aware` | `critical` | As provas de URL e fonte oficial comparam signer_key_hash da linha, mas verificam a assinatura por mhidas_verify_detached_signature_v1, sem passar o hash da chave aprovada ao verificador. | Usar verificador hash-aware para ambas as provas e vincular authority id, key id, algoritmo, key hash e manifest version ao payload assinado. |
| 5 | `credential_context_idempotency_omits_token_and_expiry` | `critical` | O context_id deterministico e o recibo de emissao nao vinculam context_token_hash nem expires_at; o request_hash do recibo e apenas p_request_payload_hash. Reuso da mesma chave pode devolver contexto emitido com segredo ou TTL diferentes. | Incluir token hash, expiry, canonical payload hash e assinatura na identidade semantica/idempotente, e exigir igualdade integral no replay. |
| 6 | `credential_context_consumption_omits_fingerprint_snapshot` | `critical` | O consumo compara verifier_key_hash, key id, algoritmo e issuer hash, mas nao compara credential_fingerprint_hash_snapshot com a credencial corrente. | Comparar fingerprint snapshot e todos os campos da attestation; tornar o snapshot imutavel e revogar contextos quando qualquer componente autorizado divergir. |
| 7 | `commercial_envelope_hash_is_required_but_never_verified` | `high` | destination_envelope_hash e obrigatorio para canal ativo, mas nao participa do helper de decriptacao, da ativacao, do resolver ou do self-check. | Definir o hash canonico do envelope, recomputa-lo no boundary de decriptacao e inclui-lo no payload/prova assinada antes de ativar e resolver. |
| 8 | `retention_batch_limit_is_not_a_global_work_bound` | `high` | p_batch_limit e aplicado separadamente a cada familia de evidencia e a expiracao de contextos ativos e ilimitada. Uma execucao pode alterar muitas vezes o limite declarado. | Criar orcamento global de linhas, limitar expiracoes e cada fase pelo saldo restante e registrar contagens tentadas, bloqueadas e alteradas. |
| 9 | `legacy_backfill_pipeline_is_only_prepared_and_source_contract_drifts` | `high` | A RPC de backfill apenas conta fontes e cria run vazio; nao materializa items, rejections ou checkpoints. O inventario inclui event_sources, mas o check de source_table das rejeicoes nao permite event_sources. | Implementar pipeline receipt-first de mapeamento/rejeicao/checksum/cutover, alinhar allowlists de fontes e impor invariantes de mapped versus rejected. |
| 10 | `channel_activation_overwrites_found_before_target_validation` | `high` | A funcao seleciona o canal, executa PERFORM pg_advisory_xact_lock e somente depois testa IF NOT FOUND. O PERFORM sobrescreve FOUND, mascarando canal inexistente e invalidando a ordem de validacao/lock. | Validar FOUND imediatamente apos SELECT, depois adquirir lock por chave nao nula e reconsultar/revalidar o canal sob o lock. |

## Matriz tecnica de correcao integrada

| Fase | Bloqueador | Testes de aceitacao |
|---|---|---:|
| `R1` | `legacy_backfill_fk_targets_table_created_later` | `5` |
| `R2` | `pretable_rowtype_function_forward_reference_is_not_closed` | `5` |
| `R3` | `signal_family_retention_can_partially_tombstone_under_concurrency` | `5` |
| `R4` | `url_and_official_source_signatures_are_not_key_hash_aware` | `5` |
| `R5` | `credential_context_idempotency_omits_token_and_expiry` | `5` |
| `R6` | `credential_context_consumption_omits_fingerprint_snapshot` | `5` |
| `R7` | `commercial_envelope_hash_is_required_but_never_verified` | `5` |
| `R8` | `retention_batch_limit_is_not_a_global_work_bound` | `5` |
| `R9` | `legacy_backfill_pipeline_is_only_prepared_and_source_contract_drifts` | `5` |
| `R10` | `channel_activation_overwrites_found_before_target_validation` | `5` |

## Criterios obrigatorios para o proximo SQL

1. Preservar integralmente a v4.8.118 e criar novo SQL protegido.
2. Corrigir a ordem de criacao das tabelas e eliminar forward references de tipos/relacoes.
3. Tornar a retencao de familias de sinais atomica sob concorrencia compartilhada com os escritores.
4. Vincular provas de URL e fonte oficial ao hash real da chave aprovada.
5. Fechar a identidade idempotente completa da emissao de contexto.
6. Validar fingerprint e toda a attestation no consumo do contexto.
7. Vincular e verificar o hash canonico do envelope comercial.
8. Aplicar limite global real no executor de retencao.
9. Materializar o pipeline completo de backfill e alinhar as fontes permitidas.
10. Corrigir a ordem FOUND/lock na ativacao de canal.

## Pre-requisitos externos

- PostgreSQL real para dry-run do DDL com validacao normal de corpos;
- inventario fresco do schema e dos dados legados;
- contrato hash-aware para autoridades de URL e fontes oficiais;
- contrato canonico do envelope criptografado;
- protocolo de lock compartilhado entre escrita e retencao de sinais;
- matriz global de orcamento do executor de retencao;
- testes de concorrencia, FK, idempotencia e rollback;
- backup e rollback de producao;
- clone representativo para backfill/cutover;
- revisao independente do proximo SQL.

## Limites preservados

- SQL protegido fora de `supabase/migrations`;
- nenhuma operacao Supabase;
- nenhuma escrita no banco;
- nenhuma alteracao em `/events`, `/event/[event_slug]`, caronas, encontros, check-ins ou ingressos publicos;
- nenhuma promocao para migration executavel.
