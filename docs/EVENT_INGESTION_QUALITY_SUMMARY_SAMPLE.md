# Event Ingestion Quality Summary Sample

Versão: v4.8.29-event-ingestion-quality-summary-sample

## Objetivo

Esta versão cria uma amostra local para validar, na prática, a fundação de resumo de qualidade criada na v4.8.28.

Ela reutiliza o HTML fictício com JSON-LD `@graph` da v4.8.27, executa o extractor HTML JSON-LD, normaliza o evento e passa o resultado para `summarizeEventIngestionQuality`.

## Arquivo criado

`src/app/api/official-events/_shared/eventIngestionQualitySummarySample.ts`

## Fluxo validado

A v4.8.29 valida o seguinte fluxo em memória:

1. usa HTML fictício com script `application/ld+json`;
2. o script contém payload JSON-LD com `@graph`;
3. o extractor HTML ignora script comum;
4. o extractor HTML coleta o JSON-LD válido;
5. o normalizer encontra o objeto `Event`;
6. o normalizer gera candidato bruto;
7. o normalizer gera candidato normalizado;
8. `summarizeEventIngestionQuality` consolida o resumo técnico;
9. o status técnico esperado é `ready_for_review`;
10. a publicação automática permanece bloqueada.

## Resultado esperado

A amostra espera:

- `script_count` igual a 1;
- `parsed_payload_count` igual a 1;
- `parse_error_count` igual a 0;
- `total_event_object_count` igual a 1;
- `total_raw_candidate_count` igual a 1;
- `total_normalized_candidate_count` igual a 1;
- `review_ready_candidate_count` igual a 1;
- `automatic_publication_candidate_count` igual a 0;
- `automatic_publication_blocked` igual a `true`;
- `quality_status` igual a `ready_for_review`;
- `passed_expectations` igual a `true`;
- `failed_expectation_codes` vazio.

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

Mesmo com `quality_status` igual a `ready_for_review`, a amostra confirma que a publicação automática segue bloqueada.

O campo `automatic_publication_candidate_count` deve permanecer `0`.

O campo `automatic_publication_blocked` deve permanecer `true`.

## Papel dentro da Central de Eventos

A v4.8.29 transforma a fundação da v4.8.28 em uma amostra verificável.

Ela prova que o pipeline local consegue sair de um HTML fictício com JSON-LD `@graph` e chegar a um resumo técnico de qualidade sem acessar rede, sem banco e sem publicar eventos.

## Relação com versões anteriores

- v4.8.27 validou HTML contendo script JSON-LD com `@graph`.
- v4.8.28 criou a fundação pura de resumo de qualidade.
- v4.8.29 valida a fundação de resumo de qualidade usando a amostra HTML `@graph`.

## Próximas evoluções possíveis

Evoluções futuras devem continuar pequenas e isoladas:

1. resumo de qualidade por fonte;
2. vínculo controlado com `event_sources`;
3. score técnico de confiabilidade por ingestão;
4. deduplicação entre fontes HTML e APIs oficiais;
5. integração com fila interna de revisão;
6. painel técnico de diagnóstico para admin.