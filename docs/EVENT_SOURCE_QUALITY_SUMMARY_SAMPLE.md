# Event Source Quality Summary Sample

Versão: v4.8.31-event-source-quality-summary-sample

## Objetivo

Esta versão cria uma amostra local para validar a fundação criada na v4.8.30.

A amostra usa o resultado da v4.8.29, que já validava o resumo técnico de qualidade da ingestão, e passa esse resumo para `summarizeEventSourceQuality`.

## Arquivo criado

`src/app/api/official-events/_shared/eventSourceQualitySummarySample.ts`

## Fluxo validado

A v4.8.31 valida o fluxo:

1. usa o resultado local da v4.8.29;
2. pega o `quality_summary` da ingestão;
3. associa esse resumo a uma fonte lógica futura;
4. define a fonte como `editorial_source`;
5. define o nível de confiança como `discovery`;
6. gera `review_priority` igual a `normal`;
7. gera `publication_gate` igual a `ready_for_manual_review`;
8. mantém `automatic_publication_allowed` igual a `false`;
9. mantém `automatic_publication_blocked` igual a `true`.

## Resultado esperado

A amostra espera:

- `source_role` igual a `editorial_source`;
- `trust_tier` igual a `discovery`;
- `ingestion_quality_status` igual a `ready_for_review`;
- `review_priority` igual a `normal`;
- `publication_gate` igual a `ready_for_manual_review`;
- `automatic_publication_allowed` igual a `false`;
- `automatic_publication_blocked` igual a `true`;
- `review_ready_candidate_count` igual a 1;
- `automatic_publication_candidate_count` igual a 0;
- `is_ready_for_manual_review` igual a `true`;
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

Mesmo quando a fonte lógica recebe um resumo com `ready_for_review`, a publicação automática continua bloqueada.

A amostra valida:

- `automatic_publication_allowed = false`;
- `automatic_publication_blocked = true`.

## Papel dentro da Central de Eventos

A v4.8.31 prova que o USECLUBBERS já consegue ligar uma ingestão tecnicamente válida a uma fonte lógica futura, classificando prioridade de revisão sem publicar eventos automaticamente.

## Relação com versões anteriores

- v4.8.29 validou o resumo técnico de qualidade da ingestão.
- v4.8.30 criou a fundação para associar resumo técnico a uma fonte lógica futura.
- v4.8.31 valida essa associação com uma amostra local.

## Próximas evoluções possíveis

Evoluções futuras devem continuar pequenas e isoladas:

1. resumo por múltiplas fontes;
2. vínculo futuro com `event_sources`;
3. deduplicação entre fontes;
4. fila interna de revisão;
5. diagnóstico técnico para admin;
6. preparação para submissão por organizadores.