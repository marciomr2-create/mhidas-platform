# Event Multi Source Review Contract

Versão: v4.8.36-event-multi-source-review-contract

## Objetivo

Esta versão cria um contrato local de revisão administrativa para transformar a decisão multi-fonte em uma orientação operacional segura.

A evolução permanece técnica, local e em memória.

## Arquivos criados

`src/app/api/official-events/_shared/eventMultiSourceReviewContract.ts`

`docs/EVENT_MULTI_SOURCE_REVIEW_CONTRACT.md`

## O que a v4.8.36 adiciona

A versão cria uma camada intermediária entre:

1. a matriz de decisão multi-fonte;
2. uma futura fila administrativa de revisão.

Ela não cria tela, rota, banco ou integração real.

## Contratos de revisão

A função `resolveEventMultiSourceReviewContract()` transforma uma decisão em um contrato com:

- `contract_key`;
- `review_lane`;
- `admin_action`;
- `manual_review_allowed`;
- `requires_human_decision`;
- `automatic_publication_allowed`;
- `automatic_publication_blocked`;
- `safety_notes`.

## Mapeamento operacional

### Fontes prontas para revisão

Quando a decisão é `ready_for_manual_review`:

- contrato: `manual_review_queue`;
- lane: `normal_manual_review`;
- ação admin: `review_candidate`;
- revisão manual permitida;
- publicação automática bloqueada.

### Fontes mistas

Quando a decisão é `mixed_manual_review`:

- contrato: `priority_manual_review_queue`;
- lane: `high_priority_manual_review`;
- ação admin: `review_conflicting_sources`;
- revisão manual permitida;
- publicação automática bloqueada.

### Fontes bloqueadas

Quando a decisão é `blocked_from_review`:

- contrato: `blocked_queue`;
- lane: `blocked_review`;
- ação admin: `keep_blocked`;
- revisão manual normal não permitida;
- publicação automática bloqueada.

### Triagem manual

Quando a decisão é `requires_manual_triage`:

- contrato: `manual_triage_queue`;
- lane: `manual_triage`;
- ação admin: `triage_candidate`;
- revisão manual permitida;
- publicação automática bloqueada.

## Regra permanente

A publicação automática continua bloqueada em todos os contratos:

- `automatic_publication_allowed` sempre é `false`;
- `automatic_publication_blocked` sempre é `true`;
- `requires_human_decision` sempre é `true`.

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
- v4.8.36 cria o contrato local de revisão administrativa.

## Papel dentro da Central de Eventos

Esta versão prepara a Central de Eventos para uma futura experiência administrativa.

Ela separa quatro camadas:

1. fontes de eventos;
2. qualidade consolidada das fontes;
3. decisão operacional;
4. contrato de revisão administrativa.

Essa separação reduz risco, preserva o bloqueio de publicação automática e facilita uma futura integração com painel admin sem misturar regras de domínio com visual ou banco.