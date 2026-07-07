# Event Multi Source Quality Blocked Sample

Versão: v4.8.34-event-multi-source-quality-blocked-sample

## Objetivo

Esta versão cria uma amostra local complementar para validar o comportamento da consolidação multi-fonte quando existem múltiplas fontes para um evento, mas uma delas está bloqueada por erro de validação.

A evolução permanece técnica, local e em memória.

## Arquivos criados

`src/app/api/official-events/_shared/eventMultiSourceQualityBlockedSample.ts`

`docs/EVENT_MULTI_SOURCE_QUALITY_BLOCKED_SAMPLE.md`

## O que a v4.8.34 valida

A amostra simula duas fontes:

1. uma fonte editorial pronta para revisão manual;
2. uma fonte de venue verificada, mas bloqueada por erro de validação.

Depois disso, a amostra consolida as fontes usando `summarizeEventMultiSourceQuality()`.

## Resultado esperado

A amostra deve consolidar:

- `source_count` igual a 2;
- `ready_for_manual_review_source_count` igual a 1;
- `blocked_source_count` igual a 1;
- `quality_status` igual a `mixed_review`;
- `total_review_ready_candidate_count` igual a 1;
- `total_automatic_publication_candidate_count` igual a 0;
- `automatic_publication_allowed` igual a `false`;
- `automatic_publication_blocked` igual a `true`.

## Regra de segurança

Mesmo com uma fonte pronta para revisão manual, a publicação automática continua bloqueada.

A presença de uma fonte bloqueada não deve permitir publicação automática e deve manter a consolidação em estado de revisão mista.

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

## Relação com versões anteriores

- v4.8.31 validou o resumo de qualidade por fonte única.
- v4.8.32 criou a fundação de consolidação multi-fonte.
- v4.8.33 validou duas fontes prontas para revisão manual.
- v4.8.34 valida o cenário misto: uma fonte pronta para revisão manual e uma fonte bloqueada.

## Papel dentro da Central de Eventos

Esta versão prepara a Central de Eventos para diferenciar sinais positivos e sinais bloqueantes vindos de múltiplas origens.

Isso ajuda a impedir que uma fonte forte, mas inválida ou inconsistente, contamine o processo de revisão manual e preserva o bloqueio de publicação automática.