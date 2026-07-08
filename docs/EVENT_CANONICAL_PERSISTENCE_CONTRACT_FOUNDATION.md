# Event Canonical Persistence Contract Foundation

Versão: v4.8.45-event-canonical-persistence-contract-foundation

## Objetivo

Esta versão cria a fundação do contrato de persistência do evento canônico interno.

Ela prepara como o sistema deverá montar um plano seguro para salvar futuramente:

- registro canônico do evento;
- rastro de origem;
- documento local de busca;
- referência futura para features do evento.

Esta versão não grava nada no banco.

## Arquivos criados

`src/app/api/official-events/_shared/eventCanonicalPersistenceContract.ts`

`src/app/api/official-events/_shared/eventCanonicalPersistenceContractSample.ts`

`docs/EVENT_CANONICAL_PERSISTENCE_CONTRACT_FOUNDATION.md`

## Conceito central

A cadeia estratégica atual fica:

evento 100% validado
→ deduplicação canônica
→ documento local de busca
→ contrato de persistência futura

A função desta versão é preparar o plano, não executar o plano.

## O que é um contrato de persistência

O contrato de persistência define o que precisaria ser salvo futuramente quando a escrita real for autorizada.

Ele organiza:

- intenção de persistência;
- chave de idempotência;
- payload canônico;
- payload de rastro de origem;
- payload de documento de busca;
- papéis de registros planejados;
- flags de segurança.

## Intenções de persistência

### `create_new_canonical_event`

Prepara um plano para criar um novo evento canônico interno.

### `update_existing_canonical_event`

Prepara um plano para atualizar um evento canônico interno já existente.

### `attach_source_trace_to_existing_canonical`

Prepara um plano para anexar uma fonte/sinal adicional a um evento canônico já existente.

### `sync_search_document`

Prepara um plano para sincronizar o documento local de busca.

### `hold_for_more_identity`

Indica que o evento deve aguardar mais identidade antes de qualquer plano.

### `blocked`

Indica que o evento não pode gerar plano de persistência.

## Papéis de registros planejados

A camada trabalha com papéis abstratos, não com migrations reais:

- `canonical_event_record`;
- `canonical_event_source_trace`;
- `canonical_search_document`;
- `event_feature_feed_reference`.

Esses papéis ajudam a desenhar a persistência futura sem afirmar ainda nomes reais de tabelas.

## Idempotência

Todo plano aprovado recebe uma chave de idempotência.

A chave evita que o mesmo evento seja salvo mais de uma vez quando a escrita real for ativada futuramente.

A chave considera:

- intenção;
- ID canônico;
- nome;
- data;
- cidade;
- estado;
- ID externo;
- provider.

## Estados criados

### `prepare_create_canonical_event_plan`

Evento 100% validado pode preparar plano futuro de criação canônica.

### `prepare_update_existing_canonical_event_plan`

Evento 100% validado e já existente pode preparar plano futuro de atualização.

### `prepare_attach_source_trace_plan`

Sinal complementar pode preparar plano para anexar rastro ao canônico existente.

### `prepare_search_document_sync_plan`

Documento local de busca pode preparar plano de sincronização futura.

### `hold_missing_required_identity`

Evento sem identidade mínima precisa aguardar mais sinais.

### `blocked_unvalidated_canonical_event`

Evento não validado não pode preparar persistência canônica.

### `blocked_by_conflict_or_status`

Evento com conflito ou status bloqueado não pode preparar persistência.

### `blocked_real_write_not_enabled`

Mesmo que uma escrita real seja solicitada, esta fundação bloqueia a execução.

## Segurança

Esta versão mantém:

- `external_request_performed = false`;
- `database_write_performed = false`;
- `human_event_analysis_required = false`;
- `real_auto_publish_enabled = false`;
- `real_auto_publish_allowed = false`.

## Relação com versões anteriores

- v4.8.42 conectou normalização, adaptador, fallback e política em pipeline local.
- v4.8.43 criou a fundação canônica/deduplicação.
- v4.8.44 criou o documento local de busca/autocomplete/features.
- v4.8.45 cria o contrato/plano de persistência futura, sem escrita real.

## Amostra local

A amostra valida sete cenários:

1. evento canônico novo validado preparando plano de criação;
2. evento canônico existente validado preparando plano de atualização;
3. sinal complementar preparando anexação de rastro;
4. documento de busca preparando sincronização;
5. candidato sem data aguardando identidade;
6. candidato não validado bloqueado;
7. solicitação de escrita real bloqueada.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 7;
- `valid_sample_case_count` igual a 7;
- `invalid_sample_case_count` igual a 0;
- `persistence_contract_only` igual a `true`;
- `source_trace_should_be_preserved` igual a `true`;
- `search_document_should_be_preserved` igual a `true`;
- `external_request_performed` igual a `false`;
- `database_write_performed` igual a `false`;
- `human_event_analysis_required` igual a `false`;
- `real_auto_publish_enabled` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `all_sample_cases_valid` igual a `true`.

## O que esta versão não faz

Esta versão não faz:

- migration;
- Supabase;
- escrita no banco;
- criação de rota;
- fetch externo;
- chamada HTTP;
- crawler;
- scraping ativo;
- leitura de sitemap;
- integração real com API de ticketeria;
- armazenamento de token;
- OAuth;
- criação real de evento;
- publicação automática real;
- análise humana de evento;
- alteração de `/events`;
- alteração de `/event/[event_slug]`;
- alteração de dashboard;
- alteração de login;
- alteração de SSR;
- alteração de middleware;
- alteração de auth;
- alteração visual.

## Papel dentro da Central de Eventos

Esta versão prepara a Central de Eventos para salvar eventos canônicos no futuro com segurança.

Ela ainda não ativa a persistência real.

O objetivo é reduzir risco antes de qualquer migration ou escrita em produção.