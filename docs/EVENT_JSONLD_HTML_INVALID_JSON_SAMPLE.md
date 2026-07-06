# Event JSON-LD HTML Invalid JSON Sample

Versão: v4.8.25-event-jsonld-html-invalid-json-sample

## Objetivo

Esta versão cria uma amostra local para validar que o extractor HTML JSON-LD lida com JSON-LD inválido de forma segura.

A amostra usa HTML fictício em memória contendo um bloco:

`<script type="application/ld+json">`

O conteúdo do bloco é propositalmente inválido, com erro de sintaxe JSON.

## Arquivo criado

`src/app/api/official-events/_shared/eventJsonLdHtmlInvalidJsonSample.ts`

## O que a v4.8.25 valida

A v4.8.25 valida que o fluxo local consegue:

1. receber HTML fictício em memória;
2. encontrar um bloco `application/ld+json`;
3. tentar parsear o conteúdo;
4. capturar o erro de parse;
5. registrar o erro em `parse_errors`;
6. manter `parsed_payload_count` igual a 0;
7. não lançar exceção;
8. não gerar publicação automática.

## Resultado esperado

A amostra deve gerar:

- `script_count` igual a 1;
- `parsed_payload_count` igual a 0;
- `parse_error_count` igual a 1;
- `first_parse_error_index` igual a 0;
- `is_error_handled_without_throwing` igual a `true`;
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

A v4.8.25 comprova que uma futura etapa de ingestão poderá encontrar HTML com JSON-LD quebrado sem derrubar o pipeline.

O erro fica registrado em memória para revisão técnica futura, sem criar evento, sem gravar banco e sem publicar nada.

## Próximas evoluções possíveis

Evoluções futuras devem continuar separadas em escopos pequenos:

1. suporte mais amplo a `@graph`;
2. vínculo controlado com `event_sources`;
3. pipeline interno de revisão;
4. submissão por organizadores;
5. sugestão comunitária por Clubbers;
6. reivindicação de eventos por organizadores;
7. deduplicação entre fontes HTML e APIs oficiais;
8. classificação de qualidade por fonte.