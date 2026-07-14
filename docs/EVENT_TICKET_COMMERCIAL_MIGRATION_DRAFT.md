# EVENT TICKET COMMERCIAL MIGRATION DRAFT

## Versão

`v4.8.87-event-ticket-commercial-migration-draft-safe`

## Base estável

- versão-base: `v4.8.86-event-ticket-commercial-schema-plan-safe`
- commit-base: `fcd3b5a8d36a1278b8b12e96b0b1150f7a29af59`

## Objetivo

Este documento acompanha o primeiro rascunho SQL auditável da persistência comercial de ingressos do USECLUBBERS.

O rascunho converte em SQL as decisões aprovadas nas versões:

- `v4.8.84-event-ticket-commercial-governance-foundation-safe`;
- `v4.8.85-event-ticket-commercial-persistence-contract-safe`;
- `v4.8.86-event-ticket-commercial-schema-plan-safe`.

Ele não é uma migration executável e não altera o Supabase.

O arquivo SQL está armazenado em:

`docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT.sql`

Ele não está em:

`supabase/migrations`

---

# 1. Estado desta versão

A `v4.8.87` produz apenas documentação e um rascunho SQL para revisão estrutural.

Nesta versão:

- nenhuma migration real é criada;
- nenhuma operação Supabase é executada;
- nenhuma tabela é criada no banco;
- nenhuma coluna é alterada no banco;
- nenhuma RLS é aplicada;
- nenhum dado legado é migrado;
- nenhum link comercial é ativado;
- nenhuma página pública é alterada;
- nenhuma view pública é criada;
- nenhuma rota de escrita é implementada.

O rascunho contém SQL real para permitir auditoria técnica, mas possui três barreiras contra execução acidental:

1. está fora de `supabase/migrations`;
2. lança uma exceção incondicional antes do primeiro DDL ou DML;
3. termina com `ROLLBACK` e não contém `COMMIT`.

A remoção dessas barreiras exigirá uma versão futura, revisão separada, hash aprovado e autorização explícita.

---

# 2. Princípio de governança preservado

A persistência continua separando:

1. referência oficial do evento;
2. solicitação de parceria;
3. canal comercial monetizado;
4. auditoria comercial;
5. clique atribuído;
6. sinal de compra;
7. comunicação oficial;
8. projeção pública resolvida pelo servidor.

As regras centrais permanecem:

- evento validado não significa parceria comercial;
- referência oficial nunca vira canal monetizado automaticamente;
- parceiro pode solicitar, mas não pode publicar;
- somente o admin USECLUBBERS controla o canal definitivo;
- solicitação aprovada não ativa link;
- `ticket_url` legado não gera `Comprar ingresso`;
- clique não é compra;
- compra autodeclarada não é conversão confirmada;
- comunicação oficial não concede autorização comercial;
- link comercial público futuro deverá usar redirecionamento interno.

---

# 3. Objetos físicos representados no rascunho

## 3.1 Extensão de `canonical_event_sources`

A procedência canônica existente é reutilizada.

O rascunho propõe adicionar:

- `reference_status`;
- `reference_domain`;
- `confidence_score`;
- `discovered_automatically`;
- `validated_at`;
- `validated_by_role`;
- `validated_by_user_id`;
- `updated_at`.

Estados previstos:

- `candidate`;
- `validated`;
- `rejected`;
- `stale`.

Somente referências validadas, HTTPS, vigentes e aprovadas pelo futuro resolvedor poderão gerar:

**Ver evento oficial**

Essa referência nunca produzirá automaticamente:

**Comprar ingresso**

## 3.2 `event_ticket_partnership_requests`

Armazena solicitações enviadas por parceiros.

Estados exclusivos:

- `pending`;
- `needs_info`;
- `approved`;
- `rejected`;
- `withdrawn`.

O registro poderá nascer sem `canonical_event_id`, mas uma aprovação exigirá:

- evento canônico;
- admin revisor;
- data de revisão.

A tabela não possui estados `active`, `paused`, `expired` ou `revoked`.

## 3.3 `event_ticket_commercial_channels`

Armazena o canal monetizado definitivo.

Estados:

- `draft`;
- `authorized`;
- `active`;
- `paused`;
- `expired`;
- `revoked`.

A tabela prevê:

- evento canônico obrigatório;
- origem da proposta separada do ator administrativo;
- ticketeira;
- domínio autorizado;
- URL comercial;
- método de rastreamento;
- referência de segredo, nunca segredo bruto;
- modelo de remuneração;
- comissão;
- autorização documental;
- vigência;
- prioridade;
- transparência pública;
- responsáveis administrativos;
- concorrência otimista;
- idempotência.

A URL comercial é classificada como dado restrito ao servidor.

O público futuro receberá somente uma rota interna USECLUBBERS.

## 3.4 `event_ticket_commercial_audit_log`

Tabela append-only para preservar decisões comerciais.

O rascunho inclui:

- bloqueio de `UPDATE`;
- bloqueio de `DELETE`;
- ação;
- ator;
- estados anterior e posterior;
- snapshots redigidos;
- justificativa;
- correlação;
- idempotência;
- timestamp.

Os snapshots propostos omitem:

- URL comercial completa;
- referência de segredo;
- valores de comissão;
- contatos;
- identificadores externos brutos.

## 3.5 `event_ticket_click_attributions`

Registra apenas a saída pelo canal monetizado.

Não registra:

- compra;
- pagamento;
- receita;
- comissão reconhecida;
- presença.

O rascunho proíbe uma coluna de IP bruto.

Ele exige:

- token de redirecionamento em hash;
- destino em hash;
- base de tratamento;
- prazo obrigatório de retenção.

## 3.6 `event_ticket_purchase_signals`

Separa:

- `interest`;
- `commercial_link_click`;
- `self_declared_purchase`;
- `attributed_conversion`;
- `confirmed_conversion`.

O trigger de confirmação bloqueia `confirmed_conversion` sem:

- evidência confiável verificada;
- hash da transação externa;
- data de confirmação;
- ator confiável.

Valores financeiros somente podem existir em `confirmed_conversion`.

`self_declared_purchase` permanece uma declaração do Clubber, sem reconhecimento de receita.

## 3.7 `partner_official_communications`

Mantém comunicação oficial separada da autorização de ingressos.

Tipos editoriais podem existir sem parceria comercial.

Comunicações ligadas a ingressos, como desconto, pré-venda, troca de lote e código promocional, exigirão canal comercial ativo e vigente antes da publicação.

Parceiros nunca publicam diretamente.

## 3.8 Projeção pública

O rascunho não cria view pública nem função `SECURITY DEFINER`.

A projeção conceitual:

`resolved_public_event_ticket_channel`

será implementada futuramente por uma rota de servidor.

Prioridade prevista:

1. canal comercial ativo e vigente;
2. referência oficial validada;
3. canal indisponível.

Resultados públicos futuros:

- **Comprar ingresso**;
- **Ver evento oficial**;
- **Canal de vendas a confirmar**.

---

# 4. Restrições e índices

O rascunho propõe:

- idempotência única para solicitações;
- idempotência única para canais;
- no máximo um canal `active` por evento;
- validação de domínio e HTTPS;
- vigência coerente;
- estados separados;
- valores financeiros não negativos;
- moeda ISO 4217;
- hash externo único para transações;
- hash único de token de redirecionamento;
- fila indexada de retenção;
- índices de fila administrativa;
- índices de histórico por evento e canal.

A unicidade de canal ativo é expressa por índice parcial:

`event_ticket_commercial_channels_one_active_per_event_uq`

com condição:

`channel_status = 'active'`

---

# 5. Lifecycle administrativo

O rascunho de trigger do canal prevê:

- criação inicial somente em `draft`;
- `draft → authorized`;
- `authorized → active`;
- `active → paused`;
- `paused → active`;
- `active/paused → expired`;
- estados permitidos para revogação;
- `revoked` como estado terminal;
- bloqueio de exclusão física;
- identidade canônica imutável;
- origem e idempotência imutáveis;
- incremento de `lock_version`;
- atualização de `updated_at`;
- auditoria na mesma transação.

O trigger depende de um futuro contrato de contexto administrativo, ainda não congelado.

Os nomes provisórios usados no rascunho são:

- `mhidas.commercial_actor_role`;
- `mhidas.commercial_actor_user_id`;
- `mhidas.commercial_operation_reason`;
- `mhidas.commercial_correlation_id`.

Eles não deverão ser considerados definitivos até a aprovação da rota administrativa e do predicado de autorização.

---

# 6. Segurança e RLS

Para as seis tabelas comerciais novas, o rascunho propõe:

- `ENABLE ROW LEVEL SECURITY`;
- `FORCE ROW LEVEL SECURITY`;
- revogação completa para `public`, `anon` e `authenticated`;
- nenhuma policy direta para clientes;
- operações somente por rotas protegidas de servidor.

Nenhuma policy de parceiro é criada no banco.

O futuro parceiro acessará somente:

- rotas autenticadas;
- validação de ownership;
- projeções redigidas;
- campos autorizados.

O admin acessará:

- rotas protegidas;
- confirmação explícita;
- idempotência;
- concorrência otimista;
- auditoria.

## 6.1 Ponto de revisão de `canonical_event_sources`

A tabela existente possui leitura autenticada por linha.

RLS não protege colunas individualmente.

Como a extensão propõe campos de auditoria, o rascunho inclui uma proposta de:

- revogar `SELECT` amplo para `authenticated`;
- conceder uma lista explícita de colunas não secretas.

Essa alteração exige teste de regressão antes de uma migration real, pois consultas existentes podem depender de colunas atualmente acessíveis.

Esse ponto permanece um bloqueador de prontidão.

---

# 7. Privacidade e retenção

O rascunho preserva as seguintes regras:

- IP bruto não é armazenado;
- URL comercial não é copiada para a tabela de cliques;
- destino é representado por hash;
- sessão pode ser pseudonimizada;
- identificador de transação é armazenado como hash;
- contatos não entram na projeção pública;
- comissão não entra na projeção pública;
- segredos não entram em `metadata`;
- cliques exigem `retention_expires_at`;
- sinais podem possuir prazo de retenção ou anonimização.

Nenhum rastreamento deverá ser ativado antes da existência de:

- política de retenção;
- processo de limpeza ou anonimização;
- teste do processo;
- registro de base legal.

---

# 8. Backfill legado shadow-only

O rascunho inclui uma seção de compatibilidade sem ativação pública.

## 8.1 Referências canônicas

`canonical_events.official_url` poderá originar apenas uma referência `candidate`.

`canonical_events.ticket_url` poderá originar apenas evidência `candidate`.

Nenhum dos dois cria canal monetizado.

## 8.2 Solicitações legadas

`partner_ticket_requests` será normalizada para:

- `pending`;
- `needs_info`;
- `approved`;
- `rejected`.

Estados legados `active`, `paused` e `expired` serão convertidos apenas em solicitação `approved`, nunca em canal público ativo.

Uma solicitação aprovada continuará separada do canal definitivo.

## 8.3 Campos comerciais de `event_groups`

Campos `partner_ticket_*` poderão originar somente canal:

`draft`

O registro exigirá nova:

- revisão;
- autorização;
- ativação pelo admin.

Nenhum estado público legado será preservado.

## 8.4 Intenção de ingresso

`event_ticket_intents.ticket_acquired` poderá originar apenas:

`self_declared_purchase`

Nunca:

- `attributed_conversion`;
- `confirmed_conversion`;
- receita confirmada.

## 8.5 Mapeamento canônico obrigatório

O repositório não contém um vínculo físico aprovado entre:

`event_group_id`

e:

`canonical_event_id`

Por isso, o rascunho cria uma tabela temporária vazia de mapeamento e bloqueia o backfill quando existe linha legada sem mapeamento aprovado.

O futuro mapeamento deverá ser:

- explícito;
- revisado;
- assinado por admin;
- exportado em relatório;
- protegido por hash;
- livre de fuzzy matching dentro da migration.

---

# 9. Bloqueadores de prontidão

A migration real continua bloqueada por:

1. inventário atualizado do schema de produção;
2. backup e contagem das tabelas legadas;
3. mapeamento aprovado de `event_group_id` para `canonical_event_id`;
4. decisão sobre registro verificado de parceiros;
5. definição do secret manager;
6. política e job de retenção;
7. predicado administrativo congelado;
8. contrato de assinatura e replay protection para conversões;
9. teste de regressão de leitura de `canonical_event_sources`;
10. revisão jurídica e comercial dos campos de remuneração;
11. validação local e em projeto ligado sem aplicação;
12. aprovação do hash da futura migration real.

Enquanto qualquer bloqueador permanecer aberto:

- não mover o SQL para `supabase/migrations`;
- não executar `supabase db push`;
- não executar `supabase migration up`;
- não habilitar rotas de escrita;
- não ativar botão público.

---

# 10. Ordem futura de implantação

A implantação permanece dividida em seis fases.

## Fase 1 — inventário e backup

Somente leitura.

## Fase 2 — schema aditivo

Criação de colunas, tabelas, índices e constraints.

## Fase 3 — segurança e integridade

RLS, revogações e triggers.

## Fase 4 — backfill shadow-only

Somente candidatos, solicitações, canais `draft` e sinais autodeclarados.

## Fase 5 — rotas protegidas e shadow read

Sem alteração pública.

## Fase 6 — ativação pública separada

Apenas após piloto comercial aprovado.

---

# 11. Rollback futuro

Antes de existirem escritas reais da aplicação, o rollback poderá:

1. desabilitar rotas futuras;
2. remover triggers;
3. remover as seis tabelas em ordem reversa;
4. restaurar privilégios anteriores de `canonical_event_sources`;
5. remover colunas aditivas sem dados necessários;
6. manter estruturas legadas intactas.

Após dados comerciais reais, auditoria ou conversões, a estratégia deverá mudar de `drop` para:

- desativação de rotas;
- pausa de canais;
- preservação de dados;
- migration corretiva;
- rollback lógico.

A auditoria não deve ser apagada.

---

# 12. Critérios para promover o rascunho

O SQL somente poderá se tornar migration real quando houver:

- revisão linha por linha;
- comparação com schema de produção;
- validação das dependências;
- validação de SQL em banco descartável;
- testes de triggers;
- testes de RLS;
- testes de idempotência;
- testes de concorrência;
- testes de backfill;
- relatório de zero ativação pública;
- rollback ensaiado;
- hash final;
- autorização expressa.

A futura migration real deverá possuir outro nome, outra versão e outro hash.

---

# 13. Invariantes finais

A revisão deve reprovar qualquer migration que permita:

- parceiro ativar canal;
- canal nascer `active`;
- `ticket_url` virar link monetizado;
- solicitação publicar link;
- dois canais ativos para o mesmo evento;
- URL comercial bruta sair no público;
- comissão sair no público;
- clique virar compra;
- autodeclaração virar receita;
- conversão sem evidência confiável;
- armazenamento de IP bruto;
- alteração ou exclusão do audit log;
- comunicação comercial publicada sem canal ativo;
- view pública não auditada;
- backfill por correspondência ambígua;
- preservação automática de status comercial legado.

---

# 14. Resultado da v4.8.87

A versão entrega:

- um rascunho SQL completo;
- documentação de revisão;
- plano de rollback;
- regras de backfill;
- RLS deny-by-default;
- triggers de integridade;
- barreiras contra execução acidental;
- nenhuma operação real.

Flags desta versão:

- `migration_draft_created=True`
- `migration_file_created=False`
- `sql_stored_outside_supabase_migrations=True`
- `unconditional_execution_guard=True`
- `transaction_ends_with_rollback=True`
- `database_write_performed=False`
- `supabase_operation_performed=False`
- `public_database_view_created=False`
- `ticket_link_activated=False`
- `public_event_page_changed=False`
