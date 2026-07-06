# Event JSON-LD Graph Sample Foundation

Versão: v4.8.26-event-jsonld-graph-sample-foundation

## Objetivo

Esta versão cria uma amostra local para validar que o normalizer JSON-LD consegue encontrar um evento dentro de um payload com `@graph`.

O formato `@graph` é comum em páginas reais, porque permite agrupar vários objetos estruturados no mesmo JSON-LD.

A amostra contém:

- `Organization`;
- `Place`;
- `BreadcrumbList`;
- `Event`.

## Arquivo criado

`src/app/api/official-events/_shared/eventJsonLdGraphSample.ts`

## O que a v4.8.26 valida

A v4.8.26 valida que o fluxo local consegue:

1. receber um payload JSON-LD fictício em memória;
2. percorrer a chave `@graph`;
3. ignorar objetos que não são evento;
4. encontrar o objeto `Event`;
5. gerar candidato bruto;
6. gerar candidato normalizado;
7. preservar publicação automática desativada.

## Resultado esperado

A amostra deve gerar:

- `graph_object_count` igual a 4;
- `expected_event_object_count` igual a 1;
- `event_object_count` igual a 1;
- `raw_candidate_count` igual a 1;
- `normalized_candidate_count` igual a 1;
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

A v4.8.26 comprova que o motor de ingestão pode, em uma etapa futura, lidar com páginas reais que usam JSON-LD em formato de grafo.

A versão atual continua puramente local e em memória. Ela não coleta HTML externo, não acessa URLs, não grava banco e não publica eventos.

## Observação técnica

Esta versão não altera o normalizer.

A inspeção prévia mostrou que o normalizer atual já percorre chaves aninhadas como:

- `@graph`;
- `graph`;
- `itemListElement`;
- `mainEntity`;
- `about`;
- `subjectOf`.

Por isso, esta evolução adiciona apenas uma amostra de validação.

## Próximas evoluções possíveis

Evoluções futuras devem continuar separadas em escopos pequenos:

1. amostra HTML contendo JSON-LD com `@graph`;
2. vínculo controlado com `event_sources`;
3. pipeline interno de revisão;
4. submissão por organizadores;
5. sugestão comunitária por Clubbers;
6. reivindicação de eventos por organizadores;
7. deduplicação entre fontes HTML e APIs oficiais;
8. classificação de qualidade por fonte.