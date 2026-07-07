# Event Automation Policy Foundation

Versão: v4.8.38-event-automation-policy-foundation

## Objetivo

Esta versão cria a fundação local da política de automação de eventos oficiais do USECLUBBERS.

A direção estratégica desta camada é clara:

- não haverá análise humana de eventos em escala;
- o sistema deve validar eventos por regras objetivas;
- APIs autorizadas de ticketerias serão tratadas como fontes fortes no futuro;
- conflitos, erros, duplicatas e baixa confiança devem ser resolvidos por estados automáticos;
- publicação automática real continua desligada nesta fase.

## Arquivos criados

`src/app/api/official-events/_shared/eventAutomationPolicy.ts`

`src/app/api/official-events/_shared/eventAutomationPolicySample.ts`

`docs/EVENT_AUTOMATION_POLICY_FOUNDATION.md`

## O que a v4.8.38 adiciona

A versão adiciona uma política local para decidir o caminho automático de um candidato de evento.

Essa política trabalha com:

- autorização da fonte;
- papel da fonte;
- quantidade de fontes;
- sinais fortes;
- fonte oficial;
- fonte de ticketeria autorizada;
- conflitos críticos;
- erros de validação;
- duplicatas;
- evento expirado;
- identidade mínima do evento;
- confiança calculada.

## Estados automáticos

A política define os seguintes estados:

### `safe_auto_publish_candidate`

O evento tem sinais suficientes para ser considerado candidato seguro a publicação automática futura.

Nesta fase, ele ainda não publica de verdade, porque `real_auto_publish_enabled` permanece `false`.

### `needs_more_source_signals`

O evento tem algum sinal positivo, mas ainda não tem confiança suficiente.

O sistema deve aguardar mais fontes ou sinais mais fortes.

### `blocked_by_conflict`

O evento tem conflito crítico entre fontes.

O sistema bloqueia automaticamente até que sinais mais fortes e consistentes apareçam.

### `blocked_by_validation`

O evento tem erro de validação ou fonte bloqueada.

O sistema bloqueia automaticamente.

### `duplicate_candidate`

O evento parece duplicado.

O sistema deve seguir para resolução automática de duplicidade em uma camada futura.

### `discarded_by_policy`

O evento deve ser descartado por regra, por exemplo quando já expirou.

### `discovery_only`

A fonte ajuda a descobrir um evento, mas não tem força suficiente para publicar.

Exemplos: fonte editorial, sinal social, fonte pública não verificada ou fonte fraca.

## APIs de ticketerias no futuro

A política já considera o papel `authorized_ticketing_api`.

Esse caminho prepara o sistema para integrações futuras com APIs autorizadas de ticketerias, como:

- Ingresse;
- Shotgun;
- Sympla;
- Ticketmaster;
- Eventbrite;
- outras fontes autorizadas.

A v4.8.38 não faz integração real com nenhuma API.

Ela apenas prepara a decisão sistêmica para quando essas APIs forem autorizadas e conectadas.

## Sem análise humana

Esta versão remove a dependência conceitual de análise humana de eventos.

O modelo correto passa a ser:

1. o sistema recebe sinais de fontes;
2. o sistema calcula confiança;
3. o sistema valida identidade mínima;
4. o sistema bloqueia conflito, erro, duplicata ou fonte fraca;
5. o sistema marca candidato seguro quando os critérios forem fortes;
6. publicação automática real permanece desligada até uma etapa futura.

## Regra permanente desta fase

A política sempre retorna:

- `real_auto_publish_enabled` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `human_event_analysis_required` igual a `false`.

Isso significa que o sistema aprende a decidir automaticamente, mas ainda não publica eventos reais nesta versão.

## Amostra local

A amostra valida sete cenários:

1. API autorizada de ticketeria com sinais fortes;
2. fonte oficial que ainda precisa de mais sinais;
3. conflito crítico entre fontes;
4. erro de validação;
5. possível duplicata;
6. evento expirado;
7. fonte editorial usada apenas como descoberta.

Resultado esperado da amostra:

- `sample_case_count` igual a 7;
- `valid_sample_case_count` igual a 7;
- `invalid_sample_case_count` igual a 0;
- `all_sample_cases_valid` igual a `true`;
- `real_auto_publish_enabled` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `human_event_analysis_required` igual a `false`.

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

- v4.8.31 validou qualidade por fonte única.
- v4.8.32 criou fundação de consolidação multi-fonte.
- v4.8.33 validou múltiplas fontes prontas.
- v4.8.34 validou fonte pronta com fonte bloqueada.
- v4.8.35 criou matriz de decisão.
- v4.8.36 criou contrato de revisão administrativa.
- v4.8.37 validou caminhos administrativos locais.
- v4.8.38 corrige a direção estratégica para automação sistêmica sem análise humana.

## Papel dentro da Central de Eventos

Esta versão aproxima o projeto do modelo escalável correto.

O USECLUBBERS não deve depender de pessoas analisando milhares de eventos.

A Central de Eventos deve operar por:

- fontes confiáveis;
- APIs autorizadas;
- política de confiança;
- validação automática;
- bloqueios automáticos;
- descarte por regra;
- resolução futura de duplicatas;
- auditoria sistêmica;
- publicação automática real apenas quando a política estiver madura e ativada em etapa futura.