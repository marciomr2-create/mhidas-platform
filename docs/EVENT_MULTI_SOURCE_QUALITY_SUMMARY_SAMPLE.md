# Event Multi Source Quality Summary Sample

Versão: v4.8.33-event-multi-source-quality-summary-sample

## Objetivo

Esta versão cria uma amostra local para validar a fundação multi-fonte criada na v4.8.32.

A amostra usa a fonte lógica validada na v4.8.31 e simula uma segunda fonte verificada, consolidando ambas com `summarizeEventMultiSourceQuality`.

## Arquivo criado

`src/app/api/official-events/_shared/eventMultiSourceQualitySummarySample.ts`

## Fluxo validado

A v4.8.33 valida o fluxo:

1. usa a fonte lógica local validada na v4.8.31;
2. cria uma segunda fonte lógica simulada;
3. define a primeira fonte como `editorial_source` com `trust_tier` igual a `discovery`;
4. define a segunda fonte como `venue` com `trust_tier` igual a `verified`;
5. mantém as duas fontes com `publication_gate` igual a `ready_for_manual_review`;
6. consolida as duas fontes com `summarizeEventMultiSourceQuality`;
7. gera `source_count` igual a 2;
8. gera `quality_status` igual a `ready_for_review`;
9. gera `highest_review_priority` igual a `high`;
10. mantém `automatic_publication_allowed` igual a `false`;
11. mantém `automatic_publication_blocked` igual a `true`.

## Resultado esperado

A amostra espera:

- `source_count` igual a 2;
- `unique_source_count` igual a 2;
- `quality_status` igual a `ready_for_review`;
- `highest_review_priority` igual a `high`;
- `ready_for_manual_review_source_count` igual a 2;
- `blocked_source_count` igual a 0;
- `total_review_ready_candidate_count` igual a 2;
- `total_automatic_publication_candidate_count` igual a 0;
- `automatic_publication_allowed` igual a `false`;
- `automatic_publication_blocked` igual a `true`;
- `has_ready_for_manual_review_source` igual a `true`;
- `has_blocked_source` igual a `false`;
- distribuição por confiança com `discovery` igual a 1;
- distribuição por confiança com `verified` igual a 1;
- distribuição por prioridade com `normal` igual a 1;
- distribuição por prioridade com `high` igual a 1;
- distribuição por gate com `ready_for_manual_review` igual a 2;
- `passed_expectations` igual a `true`;
- `failed_expectation_codes` vazio.

## Segurança

Esta versão não faz:

- não publica eventos;
- migration;
- Supabase;
- banco;
- sem banco;
- escrita no banco;
- alteração da tabela `event_sources`;
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

Mesmo quando duas fontes estão prontas para revisão manual, a publicação automática continua bloqueada.

A amostra valida:

- `automatic_publication_allowed = false`;
- `automatic_publication_blocked = true`.

## Papel dentro da Central de Eventos

A v4.8.33 prova que o USECLUBBERS já consegue consolidar mais de uma fonte lógica em um resumo multi-fonte, calcular prioridade geral de revisão e manter publicação automática bloqueada.

## Relação com versões anteriores

- v4.8.31 validou uma fonte lógica em amostra local.
- v4.8.32 criou a fundação para consolidar múltiplas fontes.
- v4.8.33 valida a consolidação multi-fonte com uma amostra local.

## Próximas evoluções possíveis

Evoluções futuras devem continuar pequenas e isoladas:

1. amostra multi-fonte com fonte bloqueada;
2. deduplicação entre fontes;
3. vínculo futuro com `event_sources`;
4. fila interna de revisão;
5. diagnóstico técnico para admin;
6. preparação para submissão por organizadores.