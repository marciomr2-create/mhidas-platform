# Event Multi Source Quality Summary Foundation

Versão: v4.8.32-event-multi-source-quality-summary-foundation

## Objetivo

Esta versão cria uma fundação pura para resumir a qualidade de múltiplas fontes ao mesmo tempo.

Ela prepara o USECLUBBERS para o cenário futuro em que o mesmo evento pode aparecer em diferentes fontes, como ticketerias, clubs, produtoras, festivais, artistas, fontes editoriais ou sugestões comunitárias.

## Arquivo criado

`src/app/api/official-events/_shared/eventMultiSourceQualitySummary.ts`

## O que a v4.8.32 adiciona

A v4.8.32 adiciona:

- tipo `EventMultiSourceQualityStatus`;
- tipo `EventMultiSourceQualitySummaryInput`;
- tipo `EventMultiSourceQualitySummary`;
- função `summarizeEventMultiSourceQuality`;
- função `resolveEventMultiSourceQualityStatus`;
- função `resolveHighestEventSourceReviewPriority`;
- função `summarizeEventMultiSourceCounts`;
- função `summarizeEventMultiSourceDistributions`;
- função `collectUniqueSourceKeys`.

## Status geral previsto

A fundação pode classificar o conjunto de fontes como:

- `empty`;
- `blocked`;
- `ready_for_review`;
- `mixed_review`.

## O que o resumo consolida

A fundação consolida:

- quantidade de fontes;
- chaves únicas de fonte;
- prioridade mais alta de revisão;
- fontes prontas para revisão manual;
- fontes bloqueadas;
- fontes bloqueadas por parse;
- fontes bloqueadas por validação;
- total de scripts;
- total de payloads parseados;
- total de erros de parse;
- total de objetos Event;
- total de candidatos brutos;
- total de candidatos normalizados;
- total de candidatos prontos para revisão;
- total de candidatos com erro;
- total de candidatos com aviso;
- total de erros de validação;
- total de avisos de validação;
- total de candidatos de publicação automática.

## Distribuições

A fundação também prepara distribuições por:

- nível de confiança da fonte;
- prioridade de revisão;
- gate de publicação.

## Regra de segurança

Mesmo quando uma ou mais fontes estiverem prontas para revisão manual, esta fundação mantém:

- `automatic_publication_allowed` igual a `false`;
- `automatic_publication_blocked` igual a `true`.

Isso significa que o sistema pode agregar múltiplas fontes e priorizar revisão, mas não pode publicar eventos automaticamente.

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

## Papel dentro da Central de Eventos

A v4.8.32 cria a primeira camada de consolidação de múltiplas fontes.

Ela prepara perguntas como:

- quantas fontes apontam para um possível evento?
- quantas estão prontas para revisão manual?
- quantas estão bloqueadas?
- qual é a maior prioridade de revisão?
- existem erros de parse?
- existem erros de validação?
- existem candidatos prontos para revisão?
- a publicação automática continua bloqueada?

## Relação com versões anteriores

- v4.8.29 validou o resumo técnico de qualidade da ingestão.
- v4.8.30 criou a fundação para associar qualidade a uma fonte lógica.
- v4.8.31 validou uma fonte lógica com amostra local.
- v4.8.32 cria a fundação para consolidar múltiplas fontes.

## Próximas evoluções possíveis

Evoluções futuras devem continuar pequenas e isoladas:

1. amostra local com múltiplas fontes;
2. deduplicação entre fontes;
3. vínculo futuro com `event_sources`;
4. fila interna de revisão;
5. diagnóstico técnico para admin;
6. preparação para submissão por organizadores.