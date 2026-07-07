# Event External Raw Event Normalizer

Versão: v4.8.40-event-external-raw-event-normalizer

## Objetivo

Esta versão cria um normalizador local de evento bruto vindo de fonte externa.

A função desta camada é transformar formatos diferentes de futuras APIs ou feeds autorizados em um formato interno consistente, antes de alimentar o adaptador de ticketerias criado na v4.8.39.

A versão não faz integração real com nenhuma API.

## Arquivos criados

`src/app/api/official-events/_shared/eventExternalRawEventNormalizer.ts`

`src/app/api/official-events/_shared/eventExternalRawEventNormalizerSample.ts`

`docs/EVENT_EXTERNAL_RAW_EVENT_NORMALIZER.md`

## O que a v4.8.40 adiciona

A versão adiciona uma camada de normalização para dados brutos de eventos externos.

Ela extrai e normaliza:

- ID externo do evento;
- nome do evento;
- data de início;
- nome do venue;
- cidade;
- estado;
- país;
- URL oficial;
- URL de ingresso;
- URL de origem;
- estado expirado.

## Por que isso é necessário

Cada API de ticketeria pode enviar campos com nomes diferentes.

Exemplos:

- `name`;
- `title`;
- `eventName`;
- `event.name`;
- `startsAt`;
- `startDate`;
- `date`;
- `venue.name`;
- `venueName`;
- `location.city`;
- `ticketUrl`;
- `buyUrl`.

A v4.8.40 cria uma camada local para converter esses formatos em um contrato interno único.

## Resultado normalizado

O normalizador produz um `EventTicketingApiRawEventSignal`, compatível com o adaptador da v4.8.39.

Também retorna:

- identidade normalizada;
- quantidade de sinais fortes;
- erros de validação;
- se o payload pode alimentar com segurança o adaptador de ticketerias;
- confirmação de que nenhuma chamada externa foi feita;
- confirmação de que não há análise humana.

## Validações locais

A amostra valida seis cenários:

1. payload estilo Ticketmaster completo;
2. payload estilo Shotgun/Sympla flat completo;
3. payload sem data;
4. payload sem URL oficial;
5. evento expirado detectado por data;
6. payload com mapa de campos customizado.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 6;
- `valid_sample_case_count` igual a 6;
- `invalid_sample_case_count` igual a 0;
- `external_request_performed` igual a `false`;
- `human_event_analysis_required` igual a `false`;
- `all_sample_cases_valid` igual a `true`.

## Sem chamadas externas

Esta versão não executa:

- chamada HTTP;
- OAuth;
- refresh token;
- armazenamento de token;
- consulta a API real;
- crawler;
- scraping;
- sincronização externa.

Todos os dados são locais e simulados.

## Sem análise humana

Esta versão preserva a decisão estratégica da Central de Eventos:

- não haverá análise humana de eventos em escala;
- o sistema deve normalizar automaticamente;
- payloads incompletos devem ser bloqueados por validação;
- eventos expirados devem ser detectados automaticamente;
- dados normalizados podem alimentar a política de automação em etapas futuras.

## O que esta versão não faz

Esta versão não faz:

- migration;
- Supabase;
- escrita no banco;
- criação de rota;
- fetch externo;
- chamada HTTP;
- crawler;
- scraping ativo;
- leitura de sitemap;
- integração real com API de ticketeria;
- armazenamento de token;
- OAuth;
- criação de evento real;
- publicação automática real;
- análise humana de evento;
- alteração de `/events`;
- alteração de `/event/[event_slug]`;
- alteração de dashboard;
- alteração de login;
- alteração de SSR;
- alteração de middleware;
- alteração de auth;
- alteração visual.

## Relação com versões anteriores

- v4.8.38 criou a política de automação sem análise humana.
- v4.8.39 criou o adaptador local para futuras APIs de ticketerias.
- v4.8.40 cria o normalizador local para transformar payloads externos variados em sinal interno padronizado.

## Papel dentro da Central de Eventos

Esta versão aproxima o projeto de um pipeline real:

fonte externa futura → payload bruto → normalização → adaptador de fonte → política de automação.

Esse pipeline ainda é local, sem API real, mas já prepara o caminho para integrações autorizadas futuras.