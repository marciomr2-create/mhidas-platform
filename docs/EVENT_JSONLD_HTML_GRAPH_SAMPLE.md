# Event JSON-LD HTML Graph Sample

Versão: v4.8.27-event-jsonld-html-graph-sample

## Objetivo

Esta versão cria uma amostra local para validar o cenário mais próximo de uma página real: HTML fictício contendo um script `application/ld+json` com payload em formato `@graph`.

A amostra combina duas fundações já validadas:

- extractor HTML JSON-LD;
- normalizer JSON-LD com suporte a `@graph`.

## Arquivo criado

`src/app/api/official-events/_shared/eventJsonLdHtmlGraphSample.ts`

## O que a v4.8.27 valida

A v4.8.27 valida que o fluxo local consegue:

1. receber HTML fictício em memória;
2. ignorar script comum sem `application/ld+json`;
3. extrair o script JSON-LD válido;
4. parsear o payload com `@graph`;
5. percorrer objetos aninhados dentro do grafo;
6. ignorar `Organization`, `Place` e `BreadcrumbList`;
7. encontrar o objeto `Event`;
8. gerar candidato bruto;
9. gerar candidato normalizado;
10. preservar publicação automática desativada.

## Resultado esperado

A amostra deve gerar:

- `script_count` igual a 1;
- `parsed_payload_count` igual a 1;
- `parse_error_count` igual a 0;
- `normalization_count` igual a 1;
- `expected_jsonld_script_count` igual a 1;
- `expected_event_object_count` igual a 1;
- `total_event_object_count` igual a 1;
- `total_raw_candidate_count` igual a 1;
- `total_normalized_candidate_count` igual a 1;
- `has_graph_payload` igual a `true`;
- `can_be_published_automatically` igual a `false`.

## Segurança

Esta versão não faz:

- migration;
- fetch externo;
- chamada HTTP;
- crawler;
- scraping ativo;
- leitura de sitemap;
- Supabase;
- escrita no banco;
- criação de rota;
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

## Papel dentro da Central de Eventos

A v4.8.27 aproxima o pipeline de ingestão do formato encontrado em páginas reais, mas ainda de forma totalmente local, fictícia e em memória.

Ela não coleta HTML externo, não acessa URLs, não grava banco e não publica eventos.

## Relação com versões anteriores

- v4.8.22 criou a fundação do extractor HTML JSON-LD.
- v4.8.23 validou HTML com JSON-LD simples.
- v4.8.24 validou HTML com múltiplos scripts JSON-LD.
- v4.8.25 validou erro de parse controlado.
- v4.8.26 validou payload JSON-LD com `@graph`.
- v4.8.27 valida HTML contendo script JSON-LD com `@graph`.

## Próximas evoluções possíveis

Evoluções futuras devem continuar separadas em escopos pequenos:

1. vínculo controlado com `event_sources`;
2. resumo de qualidade de ingestão por fonte;
3. pipeline interno de revisão;
4. submissão por organizadores;
5. sugestão comunitária por Clubbers;
6. reivindicação de eventos por organizadores;
7. deduplicação entre fontes HTML e APIs oficiais;
8. classificação de qualidade por fonte.