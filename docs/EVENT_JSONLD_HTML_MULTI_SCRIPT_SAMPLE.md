# Event JSON-LD HTML Multi Script Sample

Versão: v4.8.24-event-jsonld-html-multi-script-sample

## Objetivo

Esta versão cria uma amostra local para validar que o extractor HTML JSON-LD suporta múltiplos scripts no mesmo HTML.

A amostra contém:

- um script comum irrelevante;
- um JSON-LD de `Organization`;
- um JSON-LD de `BreadcrumbList`;
- um JSON-LD de `Event` válido.

## Arquivo criado

`src/app/api/official-events/_shared/eventJsonLdHtmlMultiScriptSample.ts`

## O que a v4.8.24 valida

A v4.8.24 valida que o fluxo local consegue:

1. receber HTML fictício em memória;
2. ignorar script comum sem `application/ld+json`;
3. extrair múltiplos scripts JSON-LD;
4. parsear todos os JSON-LD válidos;
5. normalizar somente o conteúdo reconhecido como evento;
6. gerar um candidato bruto;
7. gerar um candidato normalizado;
8. retornar resumo técnico seguro.

## Resultado esperado

A amostra deve gerar:

- `script_count` igual a 3;
- `parsed_payload_count` igual a 3;
- `parse_error_count` igual a 0;
- `normalization_count` igual a 3;
- `total_event_object_count` igual a 1;
- `total_raw_candidate_count` igual a 1;
- `total_normalized_candidate_count` igual a 1;
- `non_event_payload_count` igual a 2;
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

A v4.8.24 comprova que páginas HTML reais, que normalmente misturam scripts comuns e vários JSON-LD não relacionados a eventos, poderão ser processadas com segurança em uma etapa futura.

A versão atual continua puramente local e em memória. Ela não coleta HTML externo e não publica eventos.

## Próximas evoluções possíveis

Evoluções futuras devem continuar separadas em escopos pequenos:

1. amostra com JSON-LD inválido e erro controlado;
2. suporte mais amplo a `@graph`;
3. vínculo controlado com `event_sources`;
4. pipeline interno de revisão;
5. submissão por organizadores;
6. sugestão comunitária por Clubbers;
7. reivindicação de eventos por organizadores;
8. deduplicação entre fontes HTML e APIs oficiais.