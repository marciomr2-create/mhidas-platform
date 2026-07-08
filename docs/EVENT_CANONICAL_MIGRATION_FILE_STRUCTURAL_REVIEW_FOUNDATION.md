# Event Canonical Migration File Structural Review Foundation

Versão: v4.8.51-event-canonical-migration-file-structural-review-foundation

## Objetivo

Esta versão cria uma revisão estrutural local para o migration-file draft da v4.8.50.

Ela não cria migration real.

Ela não copia arquivo para `supabase/migrations`.

Ela não aplica nada no Supabase.

Ela não grava nada no banco.

A função desta versão é validar se o draft SQL contém a estrutura mínima exigida antes de qualquer revisão futura mais profunda.

## Arquivos criados

`src/app/api/official-events/_shared/eventCanonicalMigrationFileStructuralReview.ts`

`src/app/api/official-events/_shared/eventCanonicalMigrationFileStructuralReviewSample.ts`

`docs/EVENT_CANONICAL_MIGRATION_FILE_STRUCTURAL_REVIEW_FOUNDATION.md`

## Arquivo de entrada esperado

A revisão é desenhada para o draft criado na v4.8.50:

`docs/migration-drafts/20260707120000_event_canonical_schema_v4_8_50.sql`

Este arquivo continua fora de:

`supabase/migrations`

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
→ revisão estrutural local do migration-file draft

## Checks estruturais

A camada valida presença de:

- cabeçalho de draft local;
- extensão `pgcrypto`;
- tabela `canonical_events`;
- tabela `canonical_event_sources`;
- tabela `canonical_event_search_documents`;
- tabela `canonical_event_feature_feeds`;
- constraint de evento validado;
- constraint única de rastro de fonte;
- índice GIN de tokens de busca;
- RLS habilitado nas quatro tabelas;
- ausência de política RLS permissiva;
- notas de rollback;
- aviso de não copiar para `supabase/migrations`.

## Estados criados

### `structurally_valid_for_future_review`

O SQL contém a estrutura obrigatória e pode seguir para futura revisão.

Mesmo nesse estado, não é permitido copiar para `supabase/migrations` nem aplicar Supabase.

### `hold_missing_required_structure`

O SQL está incompleto ou contém estrutura insegura.

### `blocked_authorization_not_confirmed`

A revisão estrutural é bloqueada porque a autorização formal ainda não foi confirmada.

### `blocked_copy_to_supabase_migrations_requested`

Um pedido de cópia para `supabase/migrations` foi feito, mas é bloqueado nesta fundação.

### `blocked_supabase_apply_requested`

Um pedido de apply Supabase foi feito, mas é bloqueado nesta fundação.

### `blocked_database_write_requested`

Um pedido de escrita no banco foi feito, mas é bloqueado nesta fundação.

## Segurança

Esta versão mantém:

- `structural_review_only = true`;
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
- v4.8.47 criou SQL draft local revisável, fora de `supabase/migrations`.
- v4.8.48 criou o readiness gate antes de qualquer migration real.
- v4.8.49 criou a autorização formal futura.
- v4.8.50 criou o migration-file draft local controlado.
- v4.8.51 cria a revisão estrutural local do draft.

## Amostra local

A amostra valida sete cenários:

1. estrutura válida com autorização;
2. autorização ausente bloqueando revisão;
3. SQL incompleto em hold;
4. política RLS permissiva em hold;
5. pedido de cópia para `supabase/migrations` bloqueado;
6. pedido de apply Supabase bloqueado;
7. pedido de escrita em banco bloqueado.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 7;
- `valid_sample_case_count` igual a 7;
- `invalid_sample_case_count` igual a 0;
- `structural_review_only` igual a `true`;
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
- cópia para `supabase/migrations`;
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

Esta versão cria uma validação estrutural auditável antes de qualquer revisão humana ou técnica mais avançada do arquivo.

Ela mantém a execução real bloqueada e reduz o risco de transformar um draft incompleto em migration real no futuro.