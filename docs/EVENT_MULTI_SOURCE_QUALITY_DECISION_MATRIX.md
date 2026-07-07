# Event Multi Source Quality Decision Matrix

Versão: v4.8.35-event-multi-source-quality-decision-matrix

## Objetivo

Esta versão cria uma matriz local de decisão para interpretar resumos de qualidade multi-fonte da Central de Eventos.

A evolução permanece técnica, local e em memória.

## Arquivos criados

`src/app/api/official-events/_shared/eventMultiSourceQualityDecisionMatrix.ts`

`docs/EVENT_MULTI_SOURCE_QUALITY_DECISION_MATRIX.md`

## O que a v4.8.35 consolida

A matriz define como interpretar cenários multi-fonte já validados nas versões anteriores.

Ela cobre quatro cenários:

1. múltiplas fontes prontas para revisão manual;
2. uma fonte pronta e uma fonte bloqueada;
3. todas as fontes bloqueadas;
4. nenhuma fonte disponível.

## Decisões esperadas

### Todas as fontes prontas

Quando existem fontes prontas e nenhuma fonte bloqueada:

- `decision_key` deve ser `ready_for_manual_review`;
- `decision_priority` deve ser `normal`;
- revisão manual deve ser permitida;
- publicação automática deve continuar bloqueada.

### Fonte pronta + fonte bloqueada

Quando existe pelo menos uma fonte pronta e pelo menos uma fonte bloqueada:

- `decision_key` deve ser `mixed_manual_review`;
- `decision_priority` deve ser `high`;
- revisão manual deve ser permitida;
- publicação automática deve continuar bloqueada.

### Todas as fontes bloqueadas

Quando todas as fontes estão bloqueadas:

- `decision_key` deve ser `blocked_from_review`;
- `decision_priority` deve ser `blocked`;
- revisão manual normal não deve ser permitida;
- publicação automática deve continuar bloqueada.

### Nenhuma fonte disponível

Quando não existe fonte disponível:

- `decision_key` deve ser `blocked_from_review`;
- `decision_priority` deve ser `blocked`;
- revisão manual normal não deve ser permitida;
- publicação automática deve continuar bloqueada.

## Regra permanente

A matriz mantém a regra de segurança das versões anteriores:

- `automatic_publication_allowed` sempre deve ser `false`;
- `automatic_publication_blocked` sempre deve ser `true`.

Mesmo quando o evento está pronto para revisão manual, isso não autoriza publicação automática.

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
- v4.8.35 cria a matriz local de decisão para transformar esses estados em decisões operacionais seguras.

## Papel dentro da Central de Eventos

Esta matriz prepara a Central de Eventos para uma futura camada administrativa de revisão.

Ela separa três conceitos:

1. qualidade consolidada das fontes;
2. decisão operacional de revisão;
3. bloqueio permanente de publicação automática.

Isso evita que sinais positivos de uma fonte sejam confundidos com permissão de publicação automática.