# Event Canonical Schema Plan Foundation

Versão: v4.8.46-event-canonical-schema-plan-foundation

## Objetivo

Esta versão cria o plano tipado do schema canônico futuro para eventos validados.

Ela não cria migration real.

Ela não aplica nada no Supabase.

Ela não grava nada no banco.

## Arquivos criados

`src/app/api/official-events/_shared/eventCanonicalSchemaPlan.ts`

`src/app/api/official-events/_shared/eventCanonicalSchemaPlanSample.ts`

`docs/EVENT_CANONICAL_SCHEMA_PLAN_FOUNDATION.md`

## Cadeia estratégica

A cadeia atual fica:

pipeline de decisão de fontes
→ deduplicação canônica
→ documento local de busca
→ contrato de persistência
→ plano de schema futuro

Esta versão prepara o desenho das tabelas futuras, sem executar nenhuma operação real.

## Tabelas planejadas

### `canonical_events`

Tabela futura para armazenar um registro canônico interno por ocorrência real de evento.

Papéis principais:

- identidade canônica;
- nome normalizado;
- data;
- local;
- URL oficial;
- URL de ingresso;
- provider primário;
- ID externo primário;
- status de validação;
- resumo de validação.

### `canonical_event_sources`

Tabela futura para armazenar o rastro de origem de cada evento canônico.

Ela permite anexar:

- API autorizada de ticketeria;
- site oficial;
- site do venue;
- produtora;
- calendário de artista;
- página pública de ingresso;
- post oficial;
- fonte editorial;
- sinal de comunidade.

### `canonical_event_search_documents`

Tabela futura para armazenar documento local de busca/autocomplete.

Ela prepara:

- título de busca;
- título normalizado;
- data;
- slug seed;
- tokens;
- escopo de disponibilidade;
- rank;
- resumo de origem.

### `canonical_event_feature_feeds`

Tabela futura para alimentar features do evento.

Ela prepara referência para:

- check-in;
- ticket intent;
- caronas;
- encontros;
- radar social.

Por padrão, esta tabela entra apenas quando o plano pede `include_feature_feed_plan = true`.

## O que esta versão garante

A versão garante que o plano de schema é apenas contrato local.

Campos de segurança:

- `migration_file_created = false`;
- `supabase_operation_performed = false`;
- `database_write_performed = false`;
- `external_request_performed = false`;
- `human_event_analysis_required = false`;
- `real_auto_publish_enabled = false`;
- `real_auto_publish_allowed = false`.

## O que esta versão bloqueia

A versão bloqueia:

- pedido de migration real;
- pedido de escrita em banco;
- escopo vazio;
- escopo fora das tabelas aprovadas.

## RLS e segurança futura

Esta versão não cria RLS real.

Ela apenas registra que, antes de uma migration real futura, será obrigatório definir:

- política de escrita admin;
- política de escrita por service role;
- política de leitura adequada;
- backup antes da migration;
- revisão de diff Supabase;
- build aprovado;
- idempotência de persistência.

## Relação com versões anteriores

- v4.8.42 conectou normalização, adaptador, fallback e política em pipeline local.
- v4.8.43 criou a fundação canônica/deduplicação.
- v4.8.44 criou documento local de busca/autocomplete/features.
- v4.8.45 criou contrato de persistência futura.
- v4.8.46 cria o plano tipado de schema futuro, sem migration real.

## Amostra local

A amostra valida seis cenários:

1. plano padrão sem feature feed;
2. plano com feature feed;
3. escopo estreito para eventos e search documents;
4. pedido de migration real bloqueado;
5. pedido de escrita em banco bloqueado;
6. escopo vazio bloqueado.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 6;
- `valid_sample_case_count` igual a 6;
- `invalid_sample_case_count` igual a 0;
- `schema_plan_only` igual a `true`;
- `migration_file_created` igual a `false`;
- `supabase_operation_performed` igual a `false`;
- `database_write_performed` igual a `false`;
- `external_request_performed` igual a `false`;
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

Esta versão reduz risco antes de qualquer alteração real de banco.

Ela permite discutir, validar e revisar o modelo canônico antes de uma migration futura.