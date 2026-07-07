# Event Source Decision Pipeline Foundation

Versão: v4.8.42-event-source-decision-pipeline-foundation

## Objetivo

Esta versão conecta localmente as peças criadas nas versões anteriores em um pipeline de decisão.

O pipeline representa o caminho conceitual completo:

payload externo
→ normalização
→ adaptador de API de ticketeria
→ fallback automático de fonte
→ política de automação

A versão não faz integração real com nenhuma API.

## Arquivos criados

`src/app/api/official-events/_shared/eventSourceDecisionPipeline.ts`

`src/app/api/official-events/_shared/eventSourceDecisionPipelineSample.ts`

`docs/EVENT_SOURCE_DECISION_PIPELINE_FOUNDATION.md`

## Relação com versões anteriores

- v4.8.38 criou a política de automação sem análise humana.
- v4.8.39 criou o adaptador local para futuras APIs autorizadas de ticketerias.
- v4.8.40 criou o normalizador local de payloads externos.
- v4.8.41 criou a hierarquia correta: API autorizada primeiro, sinais adjacentes como fallback.
- v4.8.42 conecta essas peças em um pipeline local.

## Ordem correta do pipeline

### 1. API autorizada de ticketeria tem prioridade

Quando a API autorizada existe, está disponível, responde com dados completos e gera confiança suficiente, ela é usada como fonte principal.

### 2. Payload bruto é normalizado

Antes de entrar no adaptador de API, o payload bruto passa pelo normalizador.

O normalizador transforma formatos variados em um sinal interno padronizado.

### 3. Adaptador de API alimenta a política de fallback

Se o payload normalizado estiver completo, o adaptador converte o sinal da API em entrada compatível com a política de automação.

### 4. Fallback automático entra quando necessário

Se a API estiver ausente, pendente, indisponível, incompleta ou insuficiente, o sistema usa sinais adjacentes como fallback.

### 5. Política de automação decide o caminho seguro

O resultado final pode ser:

- candidato vindo da API principal;
- candidato vindo de fallback adjacente;
- acumulação de sinais;
- descoberta apenas;
- bloqueio por conflito;
- bloqueio por validação;
- bloqueio por fonte primária;
- descarte por política;
- ausência de sinal útil.

## O que a v4.8.42 adiciona

A versão adiciona uma função local:

`resolveEventSourceDecisionPipeline`

Essa função:

1. recebe o status da API primária;
2. normaliza o payload primário quando ele existe;
3. decide se o payload pode virar entrada do adaptador de ticketeria;
4. rebaixa API autorizada com payload incompleto para `incomplete_response`;
5. cria a entrada da política de fallback;
6. resolve a decisão final;
7. mantém flags de segurança desligando publicação real e análise humana.

## Estados simulados na amostra

A amostra valida seis cenários:

1. API autorizada com payload completo usa fonte primária;
2. API autorizada com payload incompleto usa fallback adjacente forte;
3. API pendente usa fallback em acumulação;
4. API não configurada usa fonte editorial apenas como descoberta;
5. API indisponível com conflito adjacente bloqueia;
6. API primária bloqueada interrompe o pipeline.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 6;
- `valid_sample_case_count` igual a 6;
- `invalid_sample_case_count` igual a 0;
- `primary_ticketing_api_has_priority` igual a `true`;
- `adjacent_sources_are_fallback` igual a `true`;
- `external_request_performed` igual a `false`;
- `human_event_analysis_required` igual a `false`;
- `real_auto_publish_enabled` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `all_sample_cases_valid` igual a `true`.

## Segurança

A versão mantém:

- nenhuma chamada HTTP;
- nenhum OAuth;
- nenhum token;
- nenhum crawler;
- nenhum scraping;
- nenhuma escrita no banco;
- nenhuma publicação automática real;
- nenhuma análise humana em escala.

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

Esta versão transforma a arquitetura conceitual em um pipeline local reutilizável.

O USECLUBBERS passa a ter um caminho técnico claro para quando as APIs forem autorizadas, mas também um caminho seguro para operar antes disso usando fallback automático por sinais adjacentes.