# EVENT TICKET COMMERCIAL MIGRATION — TENTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versao

`v4.8.115-event-ticket-commercial-migration-tenth-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versao: `v4.8.114-event-ticket-commercial-migration-tenth-corrected-adjusted-draft-safe`
- commit: `f8750bbab51265e99136636c22214eebeab626af`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `85BE3D63BC57B65A42BE72B09A28F9BF58FE97186DACF5EB138762698B534768`

## Decisao

`needs_adjustment_with_remediation_matrix`

O rascunho permanece protegido e nao pode ser promovido. Esta revisao preserva integralmente o SQL v4.8.114 e incorpora a matriz de remediacao, sem criar uma versao intermediaria exclusiva de planejamento.

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
| 1 | `retention_lineage_columns_declared_on_wrong_table` | `critical` | `event_ticket_retention_policy_versions` usa `superseded_by_policy_version_id` no CHECK, cria FK sobre essa coluna e depois atualiza tambem `retirement_drain_completed_at`, mas nenhuma das duas colunas existe nessa tabela. Ambas aparecem indevidamente em `event_ticket_trusted_integrations`. O DDL falha ainda na criacao da tabela de policies. | Mover as duas colunas para `event_ticket_retention_policy_versions`, remover os campos espurios de integrations e executar parsing mais teste PostgreSQL real do DDL completo antes da proxima publicacao. |
| 2 | `active_retention_policy_bootstrap_is_absent` | `critical` | As sete policies materializadas entram como `draft`. Todas as RPCs operacionais exigem policy `active`, mas nao existe RPC de aprovacao/ativacao inicial e o DML das tabelas foi revogado de `authenticated` e `service_role`. Uma instalacao nova fica sem emitir recibos, contextos, sinais ou executar retencao sem SQL ad hoc do owner. | Criar bootstrap receipt-first para aprovar e ativar exatamente uma policy por dimensao, com auditoria, lock_version, manifest/rules completos e teste de instalacao limpa que prove as sete resolucoes ativas. |
| 3 | `nullable_admin_authorization_predicates_fail_open` | `critical` | As quatro RPCs administrativas usam `if not mhidas_is_useclubbers_admin_v1(auth.uid()) then`. Em PL/pgSQL, `NOT NULL` permanece NULL e o bloco `IF` nao executa; portanto um veredito de autorizacao nulo nao e negado em funcoes `SECURITY DEFINER`. | Trocar todos os gates por `IF ... IS DISTINCT FROM TRUE` ou `IS NOT TRUE`, exigir `auth.uid()` nao nulo e adicionar testes sob roles/JWT ausentes, invalidos e parcialmente resolvidos. |
| 4 | `nullable_credential_proof_predicates_fail_open` | `critical` | A chave do emissor e validada com `sha256(p_issuer_service_key) <> hash`; com entrada NULL a condicao vira NULL e nao bloqueia. A assinatura usa `if not mhidas_verify_detached_signature_v1(...)`; se o verificador retornar NULL, a emissao tambem prossegue. | Exigir entradas nao nulas, comparar a chave com `IS DISTINCT FROM` e aceitar assinatura somente quando o verificador retornar exatamente TRUE. Testar NULL, key id desconhecido, algoritmo divergente e backend de verificacao indisponivel. |
| 5 | `commercial_url_proof_activation_is_nullable_fail_open` | `critical` | A RPC usa `if not mhidas_ticket_url_proof_is_fresh_v8(...)`. A funcao SQL pode retornar NULL quando hostname, timestamps, health hash, validator version, resolved host ou redirect hash forem NULL. O CHECK de canal ativo nao exige todos esses campos, entao `NOT NULL` nao dispara a excecao e o estado pode ser marcado como ativo. | Fazer a funcao retornar `coalesce(resultado,false)`, usar `IS NOT TRUE` no boundary e tornar todos os componentes assinados obrigatorios no CHECK de estado ativo, incluindo ordem temporal coerente. |
| 6 | `active_channel_is_not_redeemable_or_time_bound` | `critical` | `destination_url_ciphertext` e `valid_from` sao opcionais; o CHECK de canal ativo nao os exige e a RPC de ativacao nao os valida nem inicializa. O resolver publico exige `valid_from <= now()`, logo um canal ativado com NULL fica invisivel, e sem ciphertext o redirect nao consegue recuperar o destino mesmo com hash/prova validos. | Exigir ciphertext, hash, hostname e `valid_from` no estado ativo; validar coerencia com a prova assinada; inicializar/limpar timestamps de lifecycle de forma atomica e testar a redencao real pelo token. |
| 7 | `purchase_signal_correction_chain_is_blocked_by_unique_index` | `high` | O indice unico cobre `(integration_id, external_transaction_hash, signal_type)` enquanto `signal_status <> 'tombstoned'`, portanto inclui linhas `superseded`. A RPC insere a nova correcao antes de superseder a anterior; uma segunda correcao conflita com a primeira e continuaria conflitando mesmo depois de marcada `superseded`. | Modelar unicidade apenas do estado corrente, por exemplo predicate `signal_status = recorded`, ou introduzir sequence/version por familia. Atualizar predecessor e inserir sucessor sob constraints diferiveis e testes concorrentes de cadeias longas. |
| 8 | `retention_policy_rules_are_not_execution_authority` | `high` | O batch apenas exige `count(*) = 44` e executa UPDATEs hardcoded. Ele nao consulta `retention_action`, `minimization_action`, `source_field` ou namespaces durante a aplicacao. A troca de policy verifica apenas status e dimensoes, sem validar matriz, manifest ou compatibilidade de acao. | Validar a matriz exata por policy e executar um plano versionado/allowlisted derivado dela, ou declarar o codigo como contrato versionado imutavel e conferir hash completo. Bloquear ativacao de replacement incompleto. |
| 9 | `expired_active_credential_contexts_are_never_closed` | `high` | O consumo rejeita `expires_at <= now()`, mas nao muda `context_status` para `expired`. O batch de retencao seleciona somente `context_status <> 'active'`. Nao existe outro UPDATE que feche automaticamente contextos ativos vencidos, deixando hashes e vinculos retidos indefinidamente. | Adicionar transicao receipt-first ou etapa inicial do batch que marque expirados sob lock, preencha `expired_at`/lifecycle receipt e permita minimizacao apos o prazo. Testar expiracao concorrente com consumo e rotacao. |
| 10 | `legacy_privileged_routine_bypass_inventory_is_incomplete` | `high` | A busca de funcoes cobre apenas uma lista exata das versoes novas. A verificacao de grants inesperados considera `PUBLIC`, `anon` e `authenticated`, mas omite `service_role`. Funcoes SECURITY DEFINER antigas, views ou wrappers ainda executaveis pelo service_role podem sobreviver e contornar receipts, RLS e lifecycle. | Inventariar por prefixo e assinatura todas as routines/views/triggers legadas, incluir grants efetivos e memberships do service_role e usar allowlist fechada. O preflight deve falhar diante de qualquer caminho privilegiado nao autorizado. |

## Matriz tecnica de correcao integrada

| Fase | Bloqueador | Testes de aceitacao |
|---|---|---:|
| `R1` | `retention_lineage_columns_declared_on_wrong_table` | `5` |
| `R2` | `active_retention_policy_bootstrap_is_absent` | `5` |
| `R3` | `nullable_admin_authorization_predicates_fail_open` | `5` |
| `R4` | `nullable_credential_proof_predicates_fail_open` | `5` |
| `R5` | `commercial_url_proof_activation_is_nullable_fail_open` | `5` |
| `R6` | `active_channel_is_not_redeemable_or_time_bound` | `5` |
| `R7` | `purchase_signal_correction_chain_is_blocked_by_unique_index` | `5` |
| `R8` | `retention_policy_rules_are_not_execution_authority` | `5` |
| `R9` | `expired_active_credential_contexts_are_never_closed` | `5` |
| `R10` | `legacy_privileged_routine_bypass_inventory_is_incomplete` | `5` |

## Criterios obrigatorios para o proximo SQL

1. Preservar integralmente a v4.8.114 e criar novo SQL protegido.
2. Corrigir a declaracao e o lifecycle das colunas de lineage de retencao.
3. Criar bootstrap governado para as sete policies ativas.
4. Tornar todos os gates booleanos e criptograficos estritamente fail-closed.
5. Exigir canal ativo recuperavel, temporalmente valido e comprovado.
6. Permitir cadeias arbitrarias e concorrentes de correcao de sinais.
7. Tornar policy/rules a autoridade efetiva do executor de retencao.
8. Encerrar e minimizar contextos expirados sem consumo.
9. Fechar todos os caminhos legados privilegiados, inclusive service_role.
10. Executar parsing e testes PostgreSQL reais sobre schema-base representativo.

## Pre-requisitos externos

- inventario completo e fresco do schema de producao;
- inventario de routines, views, triggers, grants e memberships efetivos;
- contrato nao nulo do verificador de assinaturas e registry de chaves;
- contrato de criptografia/decriptacao do destino comercial;
- contrato de bootstrap e aprovacao das policies de retencao;
- testes PostgreSQL de DDL, RLS, concorrencia, FK e idempotencia;
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

## Proxima evolucao

Criar diretamente o proximo SQL corrigido usando esta matriz, sem uma versao intermediaria exclusiva de plano.
