# EVENT TICKET COMMERCIAL MIGRATION — CORRECTED ADJUSTED DRAFT THIRD ADJUSTMENT PLAN

## Versão

`v4.8.95-event-ticket-commercial-corrected-draft-third-adjustment-plan-safe`

## Base

- versão revisora: `v4.8.94-event-ticket-commercial-migration-corrected-adjusted-draft-structural-review-safe`
- commit: `19f0b1cc380c98a8d39cc4df7122acb0497368c4`
- SQL preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 SQL: `4DC566C2B3259DEC30498BC4BD3FF77AA9B52AA0D9A9F8B65013DD81B15CFECE`

## Decisão

`third_adjustment_plan_ready`

Os dez achados da revisão v4.8.94 foram convertidos em correções técnicas verificáveis. Este artefato não altera o SQL v4.8.93 e não autoriza promoção para migration executável.

## Resumo executivo

- fases: `6`;
- ajustes obrigatórios: `10`;
- críticos: `7`;
- altos: `3`;
- testes de aceitação planejados: `50`;
- dependências externas abertas: `10`;
- SQL revisado alterado: `false`;
- promoção permitida: `false`.

## Ordem de execução

1. **Fechar privilégios e superfícies de leitura** — Garantir que RPCs e leituras declaradas tenham privilégios efetivos e mínimos.
2. **Fechar identidade, contexto e idempotência dos sinais** — Vincular sinais ao principal, integração, evento, canal e clique corretos.
3. **Vincular retenção à política ativa** — Resolver política e prazo no servidor, sem controle do chamador.
4. **Corrigir recibos de comunicações** — Suportar comunicações com e sem evento usando alvos idempotentes não nulos.
5. **Fechar lineage e matriz de evidências** — Aplicar transições fail-closed e progressão confiável até conversão confirmada.
6. **Endurecer evidência de URL e revisar novamente** — Rejeitar provas temporais inválidas e submeter novo rascunho a revisão independente.

## Plano por bloqueador

### 1. Conceder execução mínima da RPC de validação

- chave: `url_validation_rpc_not_executable_by_service_role`
- severidade: `critical`
- fase: `privileges_and_read_surfaces`
- objetivo: Permitir que somente service_role registre validações de URL sem abrir execução a outros papéis.

**Mudanças obrigatórias**

- Adicionar GRANT EXECUTE explícito da função versionada exclusivamente para service_role.
- Manter REVOKE ALL de public, anon e authenticated e validar ausência de grant indireto por PUBLIC.
- Adicionar preflight que compare proacl efetiva, owner e assinatura exata da função antes da promoção.
- Registrar o contrato de privilégio no self-test e no relatório de drift da migration futura.

**Testes de aceitação**

- service_role consegue executar a RPC com payload válido.
- anon não consegue executar a RPC.
- authenticated não consegue executar a RPC.
- PUBLIC não possui EXECUTE residual.
- preflight falha quando assinatura, owner ou ACL divergem.

**Pré-requisitos**

- `admin_authorization_rpc_contract`
- `server_side_url_validator`

### 2. Alinhar grants de leitura às policies ou RPCs

- chave: `rls_read_policies_without_table_select_grants`
- severidade: `critical`
- fase: `privileges_and_read_surfaces`
- objetivo: Criar caminhos de leitura efetivos sem ampliar o acesso além das policies aprovadas.

**Mudanças obrigatórias**

- Inventariar cada policy SELECT e definir se o acesso será por GRANT SELECT mínimo ou por RPC SECURITY DEFINER dedicada.
- Aplicar grants por tabela ou coluna somente aos papéis que possuem caminho de leitura aprovado.
- Remover policies sem consumidor real quando a leitura for exclusivamente por RPC.
- Adicionar testes de privilégio e RLS para parceiro, clubber, administrador, anon e service_role.

**Testes de aceitação**

- parceiro autorizado lê somente solicitações do próprio parceiro.
- clubber lê somente dados públicos ou próprios definidos no contrato.
- administrador autorizado acessa a visão administrativa prevista.
- papel sem grant recebe permission denied antes de qualquer vazamento.
- policy sem grant ou grant sem policy é detectado pelo preflight.

**Pré-requisitos**

- `admin_authorization_rpc_contract`
- `verified_partner_onboarding`

### 3. Validar contexto integral do clique

- chave: `purchase_signal_click_context_not_validated`
- severidade: `critical`
- fase: `signal_identity_and_context`
- objetivo: Impedir que click_id de outro evento, canal ou usuário contamine lineage e atribuição.

**Mudanças obrigatórias**

- Consultar event_ticket_click_attributions antes do insert e bloquear click inexistente ou incompatível.
- Exigir igualdade de canonical_event_id e channel_id entre clique, sinal e parent_signal quando presentes.
- Exigir consistência de user_id ou principal quando o clique estiver identificado.
- Persistir snapshot mínimo do vínculo validado e registrar rejeições com motivo estruturado.

**Testes de aceitação**

- clique do mesmo evento, canal e usuário é aceito.
- clique de outro evento é rejeitado.
- clique de outro canal é rejeitado.
- clique de outro usuário ou principal é rejeitado quando identificado.
- clique inexistente não cria sinal nem recibo concluído.

**Pré-requisitos**

- `parallel_concurrency_and_failure_tests`

### 4. Resolver política ativa de retenção no servidor

- chave: `retention_policy_is_caller_controlled_and_not_active_bound`
- severidade: `critical`
- fase: `retention_and_policy_binding`
- objetivo: Remover do chamador o poder de escolher versão e prazo de retenção.

**Mudanças obrigatórias**

- Remover retention_policy_version_id e retention_expires_at do contrato público de gravação de sinais.
- Resolver server-side a única versão active aplicável por finalidade, jurisdição e tipo de evidência.
- Calcular retention_expires_at a partir de recorded_at e retention_days versionados.
- Bloquear authorize, activate e tracking quando não houver política active compatível.

**Testes de aceitação**

- política active compatível é resolvida e o prazo é derivado corretamente.
- política draft, approved não ativa ou retired é rejeitada.
- chamador não consegue antecipar ou estender retention_expires_at.
- duas políticas active conflitantes bloqueiam o fluxo por drift.
- canal rastreado sem política active não pode ser autorizado ou ativado.

**Pré-requisitos**

- `privacy_legal_basis_and_retention`
- `commercial_financial_semantics`

### 5. Unificar a autoridade de idempotência dos sinais

- chave: `purchase_signal_idempotency_scope_conflicts_with_receipts`
- severidade: `high`
- fase: `signal_identity_and_context`
- objetivo: Eliminar colisão global de idempotency_key entre principais independentes.

**Mudanças obrigatórias**

- Definir event_ticket_operation_receipts como autoridade de idempotência para criação de sinais.
- Remover a unicidade global isolada de purchase_signals.idempotency_key ou substituí-la por chave semanticamente equivalente ao recibo.
- Persistir receipt_id no sinal para lineage operacional auditável.
- Adicionar preflight que rejeite coexistência de índices com escopos semânticos divergentes.

**Testes de aceitação**

- dois principais diferentes podem usar a mesma chave sem colisão.
- mesmo principal e mesmo payload recebe o mesmo resultado.
- mesmo principal e payload divergente é rejeitado.
- cada sinal criado referencia o recibo autoritativo.
- índice global legado ou divergente é detectado antes da promoção.

**Pré-requisitos**

- `parallel_concurrency_and_failure_tests`

### 6. Definir alvo idempotente para comunicação sem evento

- chave: `non_event_communication_receipt_target_is_nullable`
- severidade: `critical`
- fase: `communication_receipt_model`
- objetivo: Permitir rascunhos não vinculados a evento sem violar target_id NOT NULL.

**Mudanças obrigatórias**

- Adicionar target_type versionado para partner, communication e canonical_event no contrato de recibos.
- Usar canonical_event_id somente quando a comunicação for realmente orientada a evento.
- Usar partner_id ou communication_id estável para categorias sem evento, conforme momento da operação.
- Validar igualdade entre target_type, target_id e payload no replay idempotente.

**Testes de aceitação**

- comunicação de evento usa canonical_event como alvo.
- music_release sem evento cria rascunho e recibo válido.
- exclusive_content sem evento cria rascunho e recibo válido.
- replay com target_type ou target_id diferente é rejeitado.
- nenhuma operação grava recibo com target_id nulo.

**Pré-requisitos**

- `admin_authorization_rpc_contract`

### 7. Namespaciar a identidade de integrações confiáveis

- chave: `trusted_integration_principal_not_namespaced`
- severidade: `high`
- fase: `signal_identity_and_context`
- objetivo: Impedir colisões e impersonação entre provedores que usam a mesma chave idempotente.

**Mudanças obrigatórias**

- Criar integration_id estável ligado ao registro oficial de namespaces de provedores.
- Usar principal_type trusted_ticketing_integration e principal_id igual ao integration_id validado.
- Exigir correspondência entre integration_id, provider_namespace, credencial e evento/canal autorizado.
- Bloquear namespace não registrado, suspenso, revogado ou divergente do principal autenticado.

**Testes de aceitação**

- duas integrações distintas reutilizam a mesma chave sem colisão.
- namespace divergente da integração autenticada é rejeitado.
- integração suspensa ou revogada é rejeitada.
- recibo e sinal persistem integration_id e provider_namespace coerentes.
- integração não registrada não cria sinal nem resultado idempotente.

**Pré-requisitos**

- `ticketing_provider_namespace_registry`
- `verified_partner_onboarding`

### 8. Aplicar matriz ator × sinal × evidência

- chave: `signal_actor_type_evidence_matrix_missing`
- severidade: `critical`
- fase: `conversion_lineage_and_evidence`
- objetivo: Impedir que clubbers, parceiros ou integrações emitam classes de evidência que não lhes pertencem.

**Mudanças obrigatórias**

- Definir matriz versionada fail-closed para actor_role, signal_type, evidence_source e campos permitidos.
- Rejeitar combinações não previstas em vez de normalizá-las silenciosamente.
- Limpar do contrato de entrada campos reservados e calculá-los server-side quando aplicável.
- Registrar matrix_version e motivo de rejeição sem armazenar payload bruto.

**Testes de aceitação**

- clubber pode registrar somente tipos e evidências autodeclarados permitidos.
- clubber não pode declarar commercial_link_click de infraestrutura.
- integração confiável aceita somente evidências vinculadas ao namespace autenticado.
- parceiro não pode declarar confirmação financeira reservada.
- combinação desconhecida é rejeitada por padrão e auditada de forma redigida.

**Pré-requisitos**

- `commercial_financial_semantics`
- `ticketing_provider_namespace_registry`

### 9. Definir grafo de lineage da conversão confirmada

- chave: `confirmed_conversion_lineage_semantics_incomplete`
- severidade: `critical`
- fase: `conversion_lineage_and_evidence`
- objetivo: Exigir progressão comercial coerente e impedir confirmação duplicada ou cruzada.

**Mudanças obrigatórias**

- Definir transições permitidas entre intent, click, attributed_conversion, confirmed_conversion e correction.
- Exigir parent attributed_conversion compatível para confirmed_conversion, salvo fluxo excepcional explicitamente versionado.
- Validar igualdade de evento, canal, integration/provider namespace e transaction_hash entre os nós aplicáveis.
- Impor unicidade de confirmação confiável por provedor e transação, preservando correções como novos nós.

**Testes de aceitação**

- attributed_conversion compatível pode originar uma confirmação.
- parent de tipo não permitido é rejeitado.
- evento, canal, provedor ou transação divergente é rejeitado.
- segunda confirmação da mesma transação é rejeitada ou retorna replay idempotente.
- correção cria novo nó e preserva lineage completo sem editar o sinal original.

**Pré-requisitos**

- `commercial_financial_semantics`
- `parallel_concurrency_and_failure_tests`

### 10. Endurecer tempo e evidência de health check

- chave: `url_freshness_accepts_future_clock_and_missing_health_evidence`
- severidade: `high`
- fase: `url_evidence_and_re_review`
- objetivo: Rejeitar timestamps futuros e provas saudáveis sem hash ou versão verificável.

**Mudanças obrigatórias**

- Definir tolerância máxima de clock e rejeitar validated_at ou last_health_checked_at além da janela futura permitida.
- Exigir last_health_check_hash, validator_version e evidence_recorded_at em qualquer estado healthy.
- Vincular o hash à URL normalizada, resolved_host_hash, redirect_chain_hash, status e instante da verificação.
- Fazer authorize, activate, resume, cutover e resolvedor público reutilizarem a mesma função fail-closed.

**Testes de aceitação**

- timestamp futuro além da tolerância é rejeitado.
- health_status healthy sem hash é rejeitado.
- hash incompatível com URL ou cadeia de redirect é rejeitado.
- prova válida dentro da tolerância e da janela de freshness é aceita.
- resolver público retorna fallback quando qualquer evidência temporal ou criptográfica estiver ausente.

**Pré-requisitos**

- `server_side_url_validator`
- `parallel_concurrency_and_failure_tests`

## Dependências externas ainda abertas

1. `fresh_production_schema_inventory`
2. `admin_authorization_rpc_contract`
3. `verified_partner_onboarding`
4. `commercial_financial_semantics`
5. `server_side_url_validator`
6. `ticketing_provider_namespace_registry`
7. `privacy_legal_basis_and_retention`
8. `legacy_partner_and_event_mapping`
9. `backup_dry_run_and_reconciliation`
10. `parallel_concurrency_and_failure_tests`

## Critérios para o próximo rascunho

- criar um novo SQL completo e protegido, sem substituir a v4.8.93;
- aplicar os dez ajustes sem introduzir `IF NOT EXISTS` ou `CREATE OR REPLACE` que ocultem drift;
- manter guarda incondicional antes do primeiro DDL e encerrar em `ROLLBACK`;
- manter o arquivo fora de `supabase/migrations`;
- executar parser PostgreSQL, self-test, TypeScript, build e revisão estrutural independente;
- preservar a separação entre referência oficial, canal monetizado, solicitação de parceiro e sinais de compra.

## Limites

- não altera o SQL v4.8.93;
- não cria migration executável;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa link comercial;
- não altera a página pública;
- não move SQL para `supabase/migrations`.

## Próxima decisão permitida

Produzir um segundo rascunho SQL corrigido e protegido, seguido de nova revisão estrutural independente. A promoção permanece bloqueada.
