# EVENT TICKET COMMERCIAL MIGRATION — SEVENTH CORRECTED ADJUSTED DRAFT STRUCTURAL REVIEW

## Versão

`v4.8.109-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-structural-review-safe`

## Base revisada

- versão: `v4.8.108-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-safe`
- commit: `5c6b65d3c7413854d99bf5086bb2f6ae1548be00`
- SQL: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `102DB5CF994DC82D35B6C13236906F0E0B2C7986BD95EFDFB5AEC20BB17485E6`

## Decisão

`needs_adjustment_with_remediation_matrix`

O rascunho normalizado corrigiu a duplicidade cumulativa, mas ainda não pode ser promovido. Esta revisão inclui a matriz de remediação e elimina uma versão intermediária exclusiva de planejamento.

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
| 1 | `current_credential_version_is_not_authoritative` | `critical` | As RPCs de emissão de contexto e gravação de sinal aceitam qualquer credencial com status active. Elas não exigem current_credential_version_id = p_credential_version_id e não bloqueiam a integração/credencial durante a validação. Uma credencial antiga ainda ativa pode continuar operando após rotação ou mudança concorrente de status. | Exigir a versão corrente ativa em todas as operações confiáveis, bloquear as linhas durante a autorização e tornar atômica a rotação entre current_credential_version_id e o status das versões. |
| 2 | `public_channel_ignores_partner_and_integration_lifecycle` | `critical` | O resolver público seleciona somente event_ticket_commercial_channels por status e prova URL. Ele não verifica commercial_partners.partner_status, event_ticket_trusted_integrations.integration_status nem o escopo ativo da integração. Um canal pode continuar público após suspensão do parceiro ou da integração. | Resolver o canal em snapshot único com partner verified, integration active, credential current e scope ativo; pausar/revogar canais de forma atômica nas transições terminais. |
| 3 | `url_proof_nullable_hostname_and_unbounded_health_age` | `critical` | A constraint chama uma função STRICT com destination_hostname nulo; o resultado NULL faz o CHECK passar no PostgreSQL. O freshness helper apenas impede timestamps futuros e não impõe idade máxima ao last_health_checked_at. | Exigir hostname e todos os artefatos de prova como NOT NULL para estado validated, validar porta/DNS/redirects de forma fail-closed e impor janela máxima de health check. |
| 4 | `purchase_signal_semantic_relations_are_not_bound` | `critical` | A RPC de sinal valida o scope da integração para o evento, mas não comprova que channel_id pertence ao mesmo evento/integração nem que click_id pertence ao mesmo canal/evento. Conversões atribuídas ou confirmadas também podem ser gravadas sem external_transaction_hash. | Bloquear e validar canal e clique no mesmo snapshot, usar constraints compostas quando possível e exigir transação externa única para attributed_conversion e confirmed_conversion. |
| 5 | `receipt_terminal_states_can_be_reused_as_pending_work` | `critical` | Os writers tratam apenas receipt_status completed. Um recibo failed retornado pela reserva segue novamente para mutação, enquanto complete_operation_receipt retorna silenciosamente o estado existente quando não consegue atualizar pending. A função pode reportar sucesso com recibo ainda failed. | Definir máquina de estados fechada: completed retorna replay; failed retorna falha terminal ou exige nova chave; pending concorrente deve aguardar/recusar; complete/fail devem falhar se a transição esperada não ocorrer. |
| 6 | `retention_minimization_and_policy_authority_are_incomplete` | `critical` | O batch grava hashes, mas mantém target_id, principal_id, integration_id e credential_version_id brutos em recibos/auditoria. As RPCs de contexto, sinal e administração recebem IDs de policy do chamador sem resolver status, purpose, jurisdiction e evidence_class no servidor. | Resolver policies ativas no servidor por classe/jurisdição, substituir ou separar identificadores brutos conforme a matriz legal e validar cobertura completa de minimização antes de processar. |
| 7 | `public_resolver_returns_ciphertext_and_drops_official_url` | `high` | A função pública expõe destination_url_ciphertext como destino do canal comercial. No fallback official_reference, ela detecta canonical_event_sources.source_url, mas a coluna retornada continua sendo c.destination_url_ciphertext e fica nula. | Retornar apenas token de redirect opaco ou URL pública autorizada por boundary seguro; no fallback, devolver a referência oficial validada sem expor ciphertext. |
| 8 | `partner_status_mutation_has_no_valid_transition_contract` | `high` | A RPC aceita qualquer próximo status permitido pela tabela. A transição para verified não preenche verified_by_admin_user_id/verified_at e falha na constraint; transições de suspensão/deativação não cascata ou auditam integrações, scopes e canais afetados. | Implementar matriz de origem/destino, preencher evidências de verificação e executar cascatas auditadas por objeto com expected_lock_version. |
| 9 | `rls_read_policies_have_no_table_select_grants` | `high` | O SQL cria policies SELECT para authenticated e depois revoga todos os privilégios de tabela de authenticated, sem GRANT SELECT correspondente. RLS não concede privilégio; as policies ficam inoperantes. | Definir explicitamente quais tabelas possuem leitura direta, conceder somente SELECT necessário e manter o restante acessível exclusivamente por RPCs seguras. |
| 10 | `base_preflight_is_not_schema_exact` | `high` | O preflight confirma apenas existência de algumas relações e funções e ausência de três tabelas-alvo. Não valida colunas, tipos, PKs/FKs, extensões, papéis, auth.uid(), objetos-alvo restantes ou drift de funções/policies. | Gerar inventário fechado de dependências e objetos-alvo, validar assinaturas e tipos antes do primeiro DDL e abortar com relatório completo de drift. |

## Matriz técnica de correção integrada

| Fase | Entrega | Bloqueador coberto | Testes de aceitação |
|---|---|---|---:|
| `R1` | A credencial corrente da integração não é autoridade operacional | `current_credential_version_is_not_authoritative` | `5` |
| `R2` | O canal público ignora o lifecycle do parceiro e da integração | `public_channel_ignores_partner_and_integration_lifecycle` | `5` |
| `R3` | A prova de URL permite hostname nulo e health check indefinidamente antigo | `url_proof_nullable_hostname_and_unbounded_health_age` | `5` |
| `R4` | Evento, canal, clique e transação do sinal não estão semanticamente vinculados | `purchase_signal_semantic_relations_are_not_bound` | `5` |
| `R5` | Recibos failed ou não concluídos podem ser reutilizados como trabalho pendente | `receipt_terminal_states_can_be_reused_as_pending_work` | `5` |
| `R6` | Minimização preserva identificadores brutos e policies ainda são fornecidas pelo chamador | `retention_minimization_and_policy_authority_are_incomplete` | `5` |
| `R7` | O resolver público retorna ciphertext e não devolve a URL oficial | `public_resolver_returns_ciphertext_and_drops_official_url` | `5` |
| `R8` | A mutação de parceiro não possui matriz válida de transições | `partner_status_mutation_has_no_valid_transition_contract` | `5` |
| `R9` | As policies de leitura não são alcançáveis pelos papéis declarados | `rls_read_policies_have_no_table_select_grants` | `5` |
| `R10` | O preflight não comprova o schema-base exato | `base_preflight_is_not_schema_exact` | `5` |

### Critérios obrigatórios para o próximo SQL

1. Preservar integralmente a v4.8.108 e criar novo SQL protegido.
2. Manter o DDL normalizado a partir do schema-base.
3. Corrigir os dez bloqueadores com testes positivos, negativos e de concorrência.
4. Tornar a credencial corrente a única autoridade operacional.
5. Vincular canal público ao lifecycle completo de parceiro, integração, credencial e scope.
6. Fechar prova URL e relações semânticas de sinais em modo fail-closed.
7. Tornar recibos uma máquina de estados terminal e inequívoca.
8. Resolver policies de retenção no servidor e minimizar identificadores realmente.
9. Entregar destino público por redirect/token seguro, nunca por ciphertext.
10. Manter promoção bloqueada até nova revisão independente.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo de autorização administrativa;
3. serviço real de verificação e rotação de credenciais;
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
