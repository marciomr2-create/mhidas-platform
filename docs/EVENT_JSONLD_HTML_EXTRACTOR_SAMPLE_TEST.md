# Event JSON-LD HTML Extractor Sample Test

Versão: v4.8.23-event-jsonld-html-extractor-sample-test

## Objetivo

Esta versão cria uma amostra local para validar a fundação do extractor HTML JSON-LD criada na v4.8.22.

A amostra usa HTML fictício em memória contendo um bloco:

`<script type="application/ld+json">`

Esse bloco representa um evento fictício no padrão Schema.org/Event.

## Arquivo criado

`src/app/api/official-events/_shared/eventJsonLdHtmlExtractorSample.ts`

## O que a v4.8.23 valida

A v4.8.23 valida que o fluxo local funciona:

1. HTML fictício é carregado em memória;
2. o extractor encontra o bloco JSON-LD;
3. o conteúdo do bloco é convertido para JSON;
4. o payload válido é enviado para `normalizeJsonLdPayload`;
5. o normalizador gera candidato bruto e candidato normalizado;
6. a amostra retorna um resumo técnico seguro.

## Resultado esperado

A amostra deve gerar:

- `script_count` igual a 1;
- `parsed_payload_count` igual a 1;
- `parse_error_count` igual a 0;
- `normalization_count` igual a 1;
- pelo menos 1 objeto de evento;
- pelo menos 1 candidato bruto;
- pelo menos 1 candidato normalizado;
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

A v4.8.23 é uma prova local controlada de que HTML já disponível pode ser transformado em dados estruturados de evento.

Ela não resolve coleta externa. Ela apenas valida que a camada de extração e normalização em memória está pronta para ser conectada, futuramente, a fontes oficiais ou editoriais controladas.

## Próximas evoluções possíveis

Evoluções futuras devem continuar separadas em escopos pequenos:

1. amostra com múltiplos blocos JSON-LD;
2. amostra com JSON-LD inválido e erro controlado;
3. suporte mais amplo a `@graph`;
4. vínculo com `event_sources`;
5. pipeline de revisão interna;
6. submissão por organizadores;
7. sugestão comunitária por Clubbers;
8. reivindicação de eventos por organizadores.