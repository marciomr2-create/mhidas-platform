# Event Multi Source Review Contract Sample

Versão: v4.8.37-event-multi-source-review-contract-sample

## Objetivo

Esta versão cria uma amostra local para validar o contrato de revisão administrativa multi-fonte criado na v4.8.36.

A evolução permanece técnica, local e em memória.

## Arquivos criados

`src/app/api/official-events/_shared/eventMultiSourceReviewContractSample.ts`

`docs/EVENT_MULTI_SOURCE_REVIEW_CONTRACT_SAMPLE.md`

## O que a v4.8.37 valida

A amostra executa quatro cenários locais:

1. todas as fontes prontas para revisão;
2. uma fonte pronta e uma fonte bloqueada;
3. todas as fontes bloqueadas;
4. estado desconhecido exigindo triagem manual.

Cada cenário gera um contrato administrativo esperado.

## Cenários validados

### Todas as fontes prontas

Resultado esperado:

- `contract_key`: `manual_review_queue`;
- `review_lane`: `normal_manual_review`;
- `admin_action`: `review_candidate`;
- revisão manual permitida;
- publicação automática bloqueada.

### Fonte pronta + fonte bloqueada

Resultado esperado:

- `contract_key`: `priority_manual_review_queue`;
- `review_lane`: `high_priority_manual_review`;
- `admin_action`: `review_conflicting_sources`;
- revisão manual permitida;
- publicação automática bloqueada.

### Todas as fontes bloqueadas

Resultado esperado:

- `contract_key`: `blocked_queue`;
- `review_lane`: `blocked_review`;
- `admin_action`: `keep_blocked`;
- revisão manual normal não permitida;
- publicação automática bloqueada.

### Estado desconhecido com fonte disponível

Resultado esperado:

- `contract_key`: `manual_triage_queue`;
- `review_lane`: `manual_triage`;
- `admin_action`: `triage_candidate`;
- revisão manual permitida;
- publicação automática bloqueada.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 4;
- `valid_sample_case_count` igual a 4;
- `invalid_sample_case_count` igual a 0;
- `all_sample_cases_valid` igual a `true`;
- `requires_human_decision` igual a `true`;
- `automatic_publication_allowed` igual a `false`;
- `automatic_publication_blocked` igual a `true`.

## Regra permanente

Nenhum cenário libera publicação automática.

Mesmo em casos prontos para revisão manual, a amostra mantém:

- decisão humana obrigatória;
- publicação automática desativada;
- publicação automática bloqueada.

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

## Relação com versões anteriores

- v4.8.31 validou o resumo de qualidade por fonte única.
- v4.8.32 criou a fundação de consolidação multi-fonte.
- v4.8.33 validou duas fontes prontas para revisão manual.
- v4.8.34 validou o cenário misto com uma fonte pronta e uma fonte bloqueada.
- v4.8.35 criou a matriz local de decisão.
- v4.8.36 criou o contrato local de revisão administrativa.
- v4.8.37 valida o contrato administrativo com uma amostra local cobrindo quatro caminhos.

## Papel dentro da Central de Eventos

Esta versão aumenta a confiabilidade da futura fila administrativa de revisão.

Ela prova, sem alterar rotas ou banco, que o sistema já consegue transformar estados multi-fonte em contratos operacionais consistentes para revisão humana.