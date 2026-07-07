# Event Ticketing API Source Adapter

Versão: v4.8.39-event-ticketing-api-source-adapter

## Objetivo

Esta versão cria um adaptador local para futuras APIs autorizadas de ticketerias.

A evolução prepara o USECLUBBERS para receber sinais de provedores como Ingresse, Shotgun, Sympla, Ticketmaster, Eventbrite, Blueticket, Ticket360, GuicheWeb e outras fontes autorizadas.

A versão não faz integração real com nenhuma API.

## Arquivos criados

`src/app/api/official-events/_shared/eventTicketingApiSourceAdapter.ts`

`src/app/api/official-events/_shared/eventTicketingApiSourceAdapterSample.ts`

`docs/EVENT_TICKETING_API_SOURCE_ADAPTER.md`

## O que a v4.8.39 adiciona

A versão adiciona uma camada que transforma um sinal bruto de futura API de ticketeria em entrada compatível com a política de automação criada na v4.8.38.

O adaptador calcula:

- autorização da fonte;
- papel da fonte;
- identidade mínima do evento;
- sinais fortes do evento;
- contagem de fontes relacionadas;
- contagem de fontes oficiais relacionadas;
- contagem de venues verificadas relacionadas;
- conflitos críticos;
- erros de validação;
- duplicatas possíveis;
- decisão automática pela política de automação.

## APIs autorizadas no futuro

O adaptador considera como fonte mais forte o caso em que:

- a ticketeria está autorizada;
- o acesso é por API oficial;
- a fonte é uma provedora oficial de ingressos;
- os dados mínimos do evento estão completos;
- não existem conflitos críticos;
- não existem erros de validação;
- não existe duplicata já detectada.

Mesmo nesses casos, a publicação automática real continua desligada nesta fase.

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

## Estados validados pela amostra

A amostra valida seis cenários:

1. API autorizada com candidato seguro;
2. autorização pendente aguardando mais sinais;
3. fonte bloqueada por política de validação;
4. API autorizada com erro de validação;
5. API autorizada com conflito crítico;
6. API autorizada com possível duplicata.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 6;
- `valid_sample_case_count` igual a 6;
- `invalid_sample_case_count` igual a 0;
- `external_request_performed` igual a `false`;
- `oauth_token_required_for_sample` igual a `false`;
- `human_event_analysis_required` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `all_sample_cases_valid` igual a `true`.

## Sem análise humana

Esta versão preserva a decisão estratégica definida para a Central de Eventos:

- não haverá análise humana de eventos em escala;
- o sistema deve validar automaticamente;
- conflitos devem bloquear automaticamente;
- erros devem bloquear automaticamente;
- duplicatas devem seguir para resolução automática futura;
- candidatos seguros podem ser identificados pelo sistema;
- publicação automática real continua desligada até uma etapa futura.

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

- v4.8.38 criou a fundação da política de automação sem análise humana.
- v4.8.39 prepara o primeiro adaptador local para futuras fontes autorizadas de ticketerias.

## Papel dentro da Central de Eventos

Esta versão aproxima o projeto da integração real com provedores de ingressos, mas mantém o ambiente seguro.

Quando houver autorização de uma ticketeria, o sistema já terá um caminho para transformar o sinal bruto da API em decisão automática de política.