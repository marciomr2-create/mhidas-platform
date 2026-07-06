# Event JSON-LD Normalizer Sample Test

Versão: v4.8.21-event-jsonld-normalizer-sample-test

## Objetivo

Esta versão adiciona uma amostra local para validar a fundação criada na v4.8.20.

A amostra usa um payload JSON-LD fictício de evento eletrônico e prova que o normalizador consegue gerar:

- candidato bruto de ingestão;
- candidato normalizado;
- resumo seguro com campos principais;
- validação sem publicação automática.

## Arquivo criado

`src/app/api/official-events/_shared/eventJsonLdNormalizerSample.ts`

## O que a amostra valida

A amostra verifica o fluxo em memória:

1. payload JSON-LD fictício;
2. leitura do objeto `Event`;
3. extração de nome, descrição, datas, local, endereço, cidade, estado e país;
4. extração de organizador;
5. extração de URL oficial;
6. extração de link de ingresso;
7. geração de candidato bruto;
8. normalização pelo contrato de ingestão da v4.8.19;
9. resumo do primeiro candidato normalizado.

## Resultado esperado

A amostra deve retornar um resumo com:

- `event_object_count`;
- `raw_candidate_count`;
- `normalized_candidate_count`;
- dados do primeiro candidato;
- nível de confiança;
- lista de códigos de validação;
- indicador de aptidão para revisão;
- publicação automática sempre falsa.

## Segurança

Esta versão não faz:

- migration;
- chamada externa;
- crawler;
- leitura de sitemap;
- scraping;
- Supabase;
- escrita no banco;
- criação de rota;
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

## Papel na evolução da Central de Eventos

A v4.8.21 não adiciona produto visível ao usuário final.

Ela apenas cria uma amostra técnica para reduzir risco antes de versões futuras que poderão adicionar:

1. testes automatizados;
2. extração de JSON-LD a partir de HTML já recebido;
3. adaptação de páginas públicas;
4. vínculo com `event_sources`;
5. pipeline de revisão de candidatos;
6. submissão por organizador;
7. sugestão comunitária por Clubbers.