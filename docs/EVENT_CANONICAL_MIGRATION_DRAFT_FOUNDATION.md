# Event Canonical Migration Draft Foundation

Versão: v4.8.47-event-canonical-migration-draft-foundation

## Objetivo

Esta versão cria um rascunho SQL local e revisável do schema canônico futuro.

Ela converte o plano tipado da v4.8.46 em um draft de SQL para discussão técnica.

Ela não cria migration real.

Ela não aplica nada no Supabase.

Ela não grava nada no banco.

## Arquivos criados

`src/app/api/official-events/_shared/eventCanonicalMigrationDraft.ts`

`src/app/api/official-events/_shared/eventCanonicalMigrationDraftSample.ts`

`docs/EVENT_CANONICAL_MIGRATION_DRAFT_FOUNDATION.md`

`docs/sql-drafts/EVENT_CANONICAL_SCHEMA_DRAFT_V4_8_47.sql`

## Local seguro do SQL

O SQL fica em:

`docs/sql-drafts/EVENT_CANONICAL_SCHEMA_DRAFT_V4_8_47.sql`

Ele não fica em:

`supabase/migrations`

Essa separação é intencional.

O arquivo é um rascunho de revisão, não uma migration aplicável.

## Cadeia estratégica

A cadeia atual fica:

pipeline de decisão de fontes
→ deduplicação canônica
→ documento local de busca
→ contrato de persistência
→ plano de schema futuro
→ SQL draft local revisável

## Tabelas incluídas no draft

O draft inclui proposta local para:

- `canonical_events`;
- `canonical_event_sources`;
- `canonical_event_search_documents`;
- `canonical_event_feature_feeds`.

## Elementos incluídos

O draft inclui:

- plano de extensão `pgcrypto`;
- tabelas;
- constraints;
- índices;
- RLS enablement como draft;
- placeholder explícito de políticas RLS;
- plano de rollback comentado.

## Segurança importante

O arquivo SQL contém `begin;` e `rollback;` para reforçar que é um artefato de revisão.

Mesmo assim, ele não deve ser executado.

Antes de qualquer migration real futura será necessário:

- backup do banco;
- revisão de RLS;
- revisão de service role;
- revisão de admin write path;
- revisão de Supabase diff;
- build aprovado;
- nova versão dedicada para migration real.

## Bloqueios desta versão

A camada TypeScript bloqueia:

- pedido para criar arquivo em `supabase/migrations`;
- pedido para criar migration Supabase real;
- pedido para aplicar migration;
- pedido para escrever no banco;
- output path inseguro.

## Flags preservadas

Esta versão mantém:

- `local_sql_draft_only = true`;
- `supabase_migration_file_created = false`;
- `supabase_operation_performed = false`;
- `database_write_performed = false`;
- `external_request_performed = false`;
- `human_event_analysis_required = false`;
- `real_auto_publish_enabled = false`;
- `real_auto_publish_allowed = false`.

## Relação com versões anteriores

- v4.8.42 conectou normalização, adaptador, fallback e política em pipeline local.
- v4.8.43 criou a fundação canônica/deduplicação.
- v4.8.44 criou documento local de busca/autocomplete/features.
- v4.8.45 criou contrato de persistência futura.
- v4.8.46 criou plano tipado de schema futuro.
- v4.8.47 cria SQL draft local revisável, fora de `supabase/migrations`.

## Amostra local

A amostra valida seis cenários:

1. draft local padrão pronto para revisão;
2. path explícito em `docs/sql-drafts` permitido;
3. path em `supabase/migrations` bloqueado;
4. pedido de arquivo de migration Supabase bloqueado;
5. pedido de apply Supabase bloqueado;
6. pedido de escrita em banco bloqueado.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 6;
- `valid_sample_case_count` igual a 6;
- `invalid_sample_case_count` igual a 0;
- `local_sql_draft_only` igual a `true`;
- `supabase_migration_file_created` igual a `false`;
- `supabase_operation_performed` igual a `false`;
- `database_write_performed` igual a `false`;
- `external_request_performed` igual a `false`;
- `human_event_analysis_required` igual a `false`;
- `real_auto_publish_enabled` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `all_sample_cases_valid` igual a `true`.

## O que esta versão não faz

Esta versão não faz:

- migration real;
- arquivo em `supabase/migrations`;
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

Esta versão permite revisar tecnicamente o SQL antes de qualquer operação real de banco.

Ela reduz risco e mantém a evolução auditável.