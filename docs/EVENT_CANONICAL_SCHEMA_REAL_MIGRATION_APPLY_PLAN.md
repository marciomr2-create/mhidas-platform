# Event Canonical Schema Real Migration Apply Plan

Versao: v4.8.53-event-canonical-schema-real-migration

## Estado antes do apply

Antes de aplicar a migration, confirmar:

- branch `main`;
- HEAD em `d8f0f1c9683925e946e60a9a51eeedbdab768053`;
- origin/main igual ao HEAD;
- backup confirmado;
- arquivo de migration criado;
- build aprovado;
- diff check limpo;
- working tree controlado;
- nenhuma outra migration aberta;
- nenhuma alteracao fora do staging.

## Comando de aplicacao previsto

A aplicacao deve ser feita em etapa separada com Supabase CLI.

A etapa de apply deve:

1. validar backup;
2. validar migration no path exato;
3. executar apply;
4. verificar existencia das quatro tabelas;
5. verificar RLS habilitado;
6. verificar politicas de leitura;
7. verificar ausencia de politicas publicas de escrita;
8. executar build novamente;
9. somente entao permitir commit/tag.

## Validacoes pos-migration

Validar existencia das tabelas:

- `public.canonical_events`;
- `public.canonical_event_sources`;
- `public.canonical_event_search_documents`;
- `public.canonical_event_feature_feeds`.

Validar RLS habilitado.

Validar indices principais.

Validar constraints principais.

Validar que nao existem policies de insert/update/delete publicas para anon/authenticated.

## Rollback

Rollback logico previsto no comentario final da migration:

- remover policies;
- remover tabelas na ordem inversa;
- restaurar backup se necessario.

O backup data-only teve aviso de foreign keys circulares em `event_sources`.

Se restauracao total for necessaria, considerar full restore controlado, disable triggers temporario ou procedimento Supabase adequado.

## Nao fazer nesta versao

Nao criar:

- eventos reais ainda;
- seed;
- alteracao em `/event/[event_slug]`;
- alteracao em ticket intent;
- alteracao em check-in;
- alteracao em carona;
- alteracao em encontros;
- alteracao em conexoes/radar;
- integracao real com ticketerias.

Essas etapas vem depois que o schema real estiver validado.