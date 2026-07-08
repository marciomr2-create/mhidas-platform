# Event Canonical Migration File Draft Foundation

Versão: v4.8.50-event-canonical-migration-file-draft-foundation

## Objetivo

Esta versão cria um draft controlado de arquivo de migration real para o schema canônico de eventos.

Ela não cria uma migration real em `supabase/migrations`.

Ela não aplica nada no Supabase.

Ela não grava nada no banco.

A função desta versão é transformar a autorização formal da v4.8.49 em um artefato de migration-file draft, com nome de migration futura, mas guardado fora do diretório de migrations reais.

## Arquivos criados

`src/app/api/official-events/_shared/eventCanonicalMigrationFileDraft.ts`

`src/app/api/official-events/_shared/eventCanonicalMigrationFileDraftSample.ts`

`docs/EVENT_CANONICAL_MIGRATION_FILE_DRAFT_FOUNDATION.md`

`docs/migration-drafts/20260707120000_event_canonical_schema_v4_8_50.sql`

## Local seguro do draft

O draft fica em:

`docs/migration-drafts/20260707120000_event_canonical_schema_v4_8_50.sql`

Ele não fica em:

`supabase/migrations`

Essa separação é obrigatória nesta versão.

## Cadeia estratégica

A cadeia atual fica:

pipeline de decisão de fontes
→ deduplicação canônica
→ documento local de busca
→ contrato de persistência
→ plano de schema futuro
→ SQL draft local revisável
→ readiness gate de migration futura
→ autorização formal de migration futura
→ migration-file draft local controlado

## Diferença para a v4.8.47

A v4.8.47 criou um SQL draft local de schema.

A v4.8.50 cria um draft com nome e formato de arquivo de migration futura, mas ainda fora de `supabase/migrations`.

Isso permite revisar o arquivo como se fosse virar uma migration real futuramente, sem permitir execução real agora.

## Segurança

Esta versão mantém:

- `local_migration_file_draft_only = true`;
- `stored_outside_supabase_migrations = true`;
- `supabase_migration_file_created = false`;
- `supabase_operation_performed = false`;
- `database_write_performed = false`;
- `external_request_performed = false`;
- `human_event_analysis_required = false`;
- `real_auto_publish_enabled = false`;
- `real_auto_publish_allowed = false`.

## Bloqueios

A camada TypeScript bloqueia:

- autorização ausente;
- output path em `supabase/migrations`;
- pedido de criação de migration Supabase real;
- pedido de apply Supabase;
- pedido de escrita no banco.

## Conteúdo do draft SQL

O draft inclui:

- extensão `pgcrypto`;
- tabela `canonical_events`;
- tabela `canonical_event_sources`;
- tabela `canonical_event_search_documents`;
- tabela `canonical_event_feature_feeds`;
- constraints;
- índices;
- enablement de RLS;
- placeholder de políticas RLS;
- notas de rollback.

## Amostra local

A amostra valida sete cenários:

1. draft local autorizado pronto para revisão;
2. path explícito em `docs/migration-drafts` permitido;
3. autorização ausente bloqueando draft;
4. path em `supabase/migrations` bloqueado;
5. pedido de migration Supabase real bloqueado;
6. pedido de apply Supabase bloqueado;
7. pedido de escrita em banco bloqueado.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 7;
- `valid_sample_case_count` igual a 7;
- `invalid_sample_case_count` igual a 0;
- `local_migration_file_draft_only` igual a `true`;
- `stored_outside_supabase_migrations` igual a `true`;
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

Esta versão cria o primeiro artefato com formato de migration futura, mas mantém a execução real bloqueada.

Ela prepara a próxima etapa possível: revisão humana do arquivo antes de qualquer cópia para `supabase/migrations`.