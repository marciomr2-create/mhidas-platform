# Event Source Fallback Foundation

Versão: v4.8.41-event-source-fallback-foundation

## Objetivo

Esta versão cria a fundação da hierarquia correta de fontes para eventos oficiais.

A regra estratégica é:

1. APIs autorizadas de ticketerias têm prioridade.
2. Se a API não existir, ainda estiver pendente, estiver indisponível ou retornar dados insuficientes, o sistema usa sinais adjacentes como fallback automático.
3. Se os sinais adjacentes forem fortes e convergentes, o evento pode virar candidato seguro.
4. Se houver conflito, ausência de identidade mínima, evento expirado ou fonte bloqueada, o sistema bloqueia ou descarta automaticamente.
5. Não há análise humana em escala.
6. Publicação automática real continua desligada.

## Arquivos criados

`src/app/api/official-events/_shared/eventSourceFallbackPolicy.ts`

`src/app/api/official-events/_shared/eventSourceFallbackPolicySample.ts`

`docs/EVENT_SOURCE_FALLBACK_FOUNDATION.md`

## Hierarquia de fontes

### Fonte principal

A fonte principal é a API autorizada de ticketeria.

Exemplos futuros:

- Ingresse;
- Shotgun;
- Sympla;
- Ticketmaster;
- Eventbrite;
- Blueticket;
- Ticket360;
- GuicheWeb;
- outras APIs autorizadas.

Quando uma API autorizada está disponível, válida e com confiança suficiente, ela tem prioridade sobre sinais adjacentes.

### Fallback automático

Se a API principal não puder ser usada, o sistema entra em fallback automático por sinais adjacentes.

Motivos de fallback:

- API ainda não configurada;
- autorização pendente;
- API indisponível;
- resposta incompleta;
- confiança insuficiente;
- ausência temporária de integração autorizada.

## Sinais adjacentes

Sinais adjacentes não são o caminho principal.

Eles são fallback automático quando a fonte principal não está disponível ou não é suficiente.

Exemplos:

- site oficial do evento;
- site oficial do club ou venue;
- site oficial da produtora;
- calendário oficial do artista;
- página pública de ticket;
- post oficial de artista, produtora ou venue;
- fonte editorial;
- sinal de comunidade;
- fonte pública desconhecida.

## Estados automáticos

A camada define os seguintes estados:

### `primary_ticketing_api_candidate`

A API autorizada de ticketeria foi usada como fonte principal e gerou candidato seguro.

### `fallback_adjacent_candidate`

A API não pôde ser usada e sinais adjacentes fortes/convergentes geraram candidato seguro.

### `fallback_adjacent_signal_accumulation`

A API não pôde ser usada e os sinais adjacentes ainda precisam acumular mais força.

### `fallback_adjacent_discovery_only`

A API não pôde ser usada e a fonte adjacente serve apenas para descoberta.

### `blocked_by_primary_ticketing_api`

A fonte principal está bloqueada ou conflitante, então o sistema bloqueia o pipeline.

### `blocked_by_adjacent_conflict`

Fallback adjacente encontrou conflito crítico entre fontes.

### `blocked_by_adjacent_validation`

Fallback adjacente encontrou ausência de dados essenciais, fonte bloqueada ou erro de validação.

### `discarded_by_policy`

O evento é descartado por regra, por exemplo evento expirado.

### `no_usable_signal`

Não há API utilizável nem sinal adjacente útil.

## Dados mínimos

Para fallback adjacente alimentar a política de automação, o sistema exige:

- nome do evento;
- data do evento;
- local;
- cidade ou região;
- URL oficial ou URL de ingresso.

Se esses dados mínimos estiverem ausentes, o sistema bloqueia automaticamente.

## Relação com versões anteriores

- v4.8.38 criou a política de automação sem análise humana.
- v4.8.39 criou o adaptador local para futuras APIs autorizadas de ticketerias.
- v4.8.40 criou o normalizador local de payloads externos.
- v4.8.41 cria a hierarquia de fonte principal e fallback automático.

## Pipeline conceitual

A partir desta versão, o caminho correto passa a ser:

API autorizada de ticketeria disponível
→ adaptador de API de ticketeria
→ política de automação

Se a API não estiver disponível ou não for suficiente:

sinais adjacentes
→ fallback automático
→ política de automação

## Amostra local

A amostra valida sete cenários:

1. API autorizada usada como fonte principal;
2. autorização pendente usando fallback adjacente forte;
3. API indisponível usando fallback adjacente em acumulação;
4. API não configurada usando fonte editorial apenas como descoberta;
5. API incompleta com fallback adjacente bloqueado por conflito;
6. API indisponível com fallback adjacente bloqueado por identidade ausente;
7. API principal bloqueada interrompendo o pipeline.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 7;
- `valid_sample_case_count` igual a 7;
- `invalid_sample_case_count` igual a 0;
- `primary_ticketing_api_has_priority` igual a `true`;
- `adjacent_sources_are_fallback` igual a `true`;
- `external_request_performed` igual a `false`;
- `human_event_analysis_required` igual a `false`;
- `real_auto_publish_enabled` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `all_sample_cases_valid` igual a `true`.

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

## Papel dentro da Central de Eventos

Esta versão corrige a arquitetura para a realidade operacional do produto.

O USECLUBBERS deve tentar primeiro a fonte mais forte: API autorizada de ticketeria.

Enquanto essas APIs não estão disponíveis, o sistema não fica parado. Ele usa fallback automático por sinais adjacentes, com pesos, bloqueios e convergência, sem depender de análise humana em massa.