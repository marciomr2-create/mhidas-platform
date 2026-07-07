# Event Source Quality Summary Foundation

Versão: v4.8.30-event-source-quality-summary-foundation

## Objetivo

Esta versão cria uma fundação pura para associar o resumo de qualidade técnica de uma ingestão a uma fonte lógica futura.

Ela prepara o caminho para dizer que uma ingestão veio de uma fonte específica, com papel, nível de confiança, prioridade de revisão e bloqueio de publicação automática.

## Arquivo criado

`src/app/api/official-events/_shared/eventSourceQualitySummary.ts`

## O que a v4.8.30 adiciona

A v4.8.30 adiciona:

- tipo `EventSourceQualityRole`;
- tipo `EventSourceQualityTrustTier`;
- tipo `EventSourceQualityReviewPriority`;
- tipo `EventSourceQualityPublicationGate`;
- tipo `EventSourceQualitySummaryInput`;
- tipo `EventSourceQualitySummary`;
- função `summarizeEventSourceQuality`;
- função `resolveEventSourcePublicationGate`;
- função `resolveEventSourceReviewPriority`.

## Papéis de fonte previstos

A fundação aceita os seguintes papéis lógicos:

- `ticketing_platform`;
- `venue`;
- `producer`;
- `festival`;
- `artist`;
- `editorial_source`;
- `community`;
- `other`.

## Níveis de confiança previstos

A fundação aceita os seguintes níveis de confiança:

- `official`;
- `verified`;
- `discovery`;
- `community`;
- `unknown`.

## Prioridades de revisão

A função pode classificar a revisão como:

- `ignore`;
- `low`;
- `normal`;
- `high`.

## Gates de publicação

A função pode retornar:

- `blocked_automatic_publication`;
- `blocked_parse_errors`;
- `blocked_validation_errors`;
- `ready_for_manual_review`.

## Regra de segurança

Mesmo quando a ingestão estiver com `quality_status` igual a `ready_for_review`, esta fundação mantém:

- `automatic_publication_allowed` igual a `false`;
- `automatic_publication_blocked` igual a `true`.

Isso significa que o sistema pode preparar candidatos para revisão manual, mas não pode publicar eventos automaticamente.

## Segurança

Esta versão não faz:

- não publica eventos;
- migration;
- Supabase;
- escrita no banco;
- sem banco;
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

A v4.8.30 cria uma camada intermediária entre a qualidade técnica da ingestão e a fonte de origem.

Ela prepara perguntas como:

- essa ingestão veio de qual fonte?
- a fonte é oficial, verificada, descoberta, comunitária ou desconhecida?
- o papel da fonte é ticketeria, club, produtora, festival, artista, editorial ou comunidade?
- o resultado deve ser ignorado, revisado com baixa prioridade, prioridade normal ou alta prioridade?
- a publicação automática continua bloqueada?

## Relação com versões anteriores

- v4.8.27 validou HTML contendo script JSON-LD com `@graph`.
- v4.8.28 criou a fundação pura de resumo de qualidade.
- v4.8.29 validou a fundação de resumo de qualidade usando a amostra HTML `@graph`.
- v4.8.30 associa o resumo de qualidade a uma fonte lógica futura.

## Próximas evoluções possíveis

Evoluções futuras devem continuar pequenas e isoladas:

1. amostra local usando `summarizeEventSourceQuality`;
2. vínculo futuro com `event_sources`;
3. resumo técnico por fonte;
4. deduplicação entre fontes HTML e APIs oficiais;
5. fila interna de revisão;
6. painel técnico de diagnóstico para admin.