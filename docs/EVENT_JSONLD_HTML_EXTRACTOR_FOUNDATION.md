# Event JSON-LD HTML Extractor Foundation

Versão: v4.8.22-event-jsonld-html-extractor-foundation

## Objetivo

Esta versão cria a fundação do extrator HTML de JSON-LD para eventos dentro do MHIDAS / USECLUBBERS.

O objetivo é receber HTML já fornecido à aplicação e extrair blocos:

`<script type="application/ld+json">`

Depois, os payloads extraídos podem ser enviados ao normalizador JSON-LD criado na v4.8.20.

## Arquivo criado

`src/app/api/official-events/_shared/eventJsonLdHtmlExtractor.ts`

## O que a v4.8.22 entrega

A v4.8.22 adiciona funções puras para:

- receber uma string HTML já disponível;
- localizar blocos `<script>` com `application/ld+json`;
- extrair o conteúdo textual desses blocos;
- tentar converter cada bloco em JSON;
- registrar erros de parse sem quebrar o fluxo;
- normalizar os payloads válidos usando `normalizeJsonLdPayload`;
- gerar totais de objetos de evento, candidatos brutos e candidatos normalizados.

## Fluxo conceitual

O fluxo em memória é:

1. HTML já recebido por uma etapa futura;
2. extração de scripts JSON-LD;
3. parse seguro dos blocos JSON;
4. normalização por `eventJsonLdNormalizer.ts`;
5. geração de resumo técnico.

Nesta versão, não existe coleta externa.

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

A v4.8.22 prepara uma etapa intermediária da futura Central de Eventos:

1. uma fonte pública poderá expor HTML;
2. uma versão futura poderá obter esse HTML de modo controlado;
3. este extrator transformará o HTML em payloads JSON-LD;
4. o normalizador da v4.8.20 converterá os payloads em candidatos;
5. etapas futuras poderão revisar, deduplicar, ranquear e confirmar eventos.

A versão atual termina em memória e não publica nada.

## Próximas evoluções possíveis

Evoluções futuras podem ser feitas em versões separadas:

1. amostra local com HTML fictício;
2. testes unitários para HTML com múltiplos scripts;
3. suporte a JSON-LD em array;
4. suporte a `@graph` com múltiplos eventos;
5. vínculo controlado com `event_sources`;
6. pipeline interno de revisão;
7. sugestão comunitária por Clubbers;
8. submissão por organizadores.