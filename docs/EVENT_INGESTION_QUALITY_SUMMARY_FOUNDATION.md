# Event Ingestion Quality Summary Foundation

Versão: v4.8.28-event-ingestion-quality-summary-foundation

## Objetivo

Esta versão cria uma fundação pura para resumir a qualidade técnica de uma ingestão de eventos em memória.

Ela consolida contagens vindas do extractor HTML JSON-LD, do normalizer JSON-LD e dos candidatos normalizados, sem gravar dados e sem publicar eventos.

## Arquivo criado

`src/app/api/official-events/_shared/eventIngestionQualitySummary.ts`

## O que a v4.8.28 adiciona

A v4.8.28 adiciona:

- tipo `EventIngestionQualityStatus`;
- tipo `EventIngestionQualitySummary`;
- função `summarizeEventIngestionQuality`;
- função `collectNormalizedCandidates`;
- função `resolveEventIngestionQualityStatus`.

## Campos resumidos

A fundação resume:

- `script_count`;
- `parsed_payload_count`;
- `parse_error_count`;
- `normalization_count`;
- `total_event_object_count`;
- `total_raw_candidate_count`;
- `total_normalized_candidate_count`;
- `review_ready_candidate_count`;
- `candidate_with_error_count`;
- `candidate_with_warning_count`;
- `validation_error_count`;
- `validation_warning_count`;
- `automatic_publication_candidate_count`;
- `automatic_publication_blocked`;
- `has_parse_errors`;
- `has_validation_errors`;
- `has_review_ready_candidates`;
- `quality_status`.

## Status possíveis

`EventIngestionQualityStatus` pode ser:

- `empty`;
- `blocked_by_parse_errors`;
- `blocked_by_validation_errors`;
- `ready_for_review`.

## Segurança

Esta versão não faz:

- não publica eventos;
- migration;
- Supabase;
- escrita no banco;
- criação de rota;
- fetch externo;
- chamada HTTP;
- crawler;
- scraping ativo;
- leitura de sitemap;
- criação de evento real;
- publicação automática;
- alteração de `/events`;
- alteração de `/event/[event_slug]`;
- alteração de dashboard;
- alteração de login;
- alteração de SSR;
- alteração de middleware;
- alteração de auth;
- alteração visual.

## Regra de publicação automática

Mesmo quando há candidatos prontos para revisão, esta fundação preserva o bloqueio de publicação automática.

O campo `automatic_publication_blocked` deve permanecer `true` quando nenhum candidato possuir `can_be_published_automatically` ativo.

Como o contrato atual mantém `can_be_published_automatically: false`, o resumo serve apenas para triagem e revisão técnica, não para publicação direta.

## Papel dentro da Central de Eventos

A v4.8.28 prepara uma camada intermediária de diagnóstico técnico.

Ela permite responder perguntas como:

- a página tinha JSON-LD?
- o JSON-LD foi parseado?
- havia objeto `Event`?
- foram gerados candidatos?
- os candidatos têm erros?
- existem candidatos prontos para revisão?
- a publicação automática continua bloqueada?

## Relação com versões anteriores

- v4.8.22 criou a fundação do extractor HTML JSON-LD.
- v4.8.23 validou HTML com JSON-LD simples.
- v4.8.24 validou HTML com múltiplos scripts JSON-LD.
- v4.8.25 validou erro de parse controlado.
- v4.8.26 validou payload JSON-LD com `@graph`.
- v4.8.27 validou HTML contendo script JSON-LD com `@graph`.
- v4.8.28 cria resumo técnico de qualidade para resultados de ingestão.

## Próximas evoluções possíveis

Evoluções futuras devem continuar pequenas e isoladas:

1. amostra local usando `summarizeEventIngestionQuality`;
2. adaptação futura para `event_sources`;
3. resumo por fonte;
4. score técnico de confiabilidade por ingestão;
5. integração com revisão interna;
6. deduplicação entre fontes HTML e APIs oficiais.