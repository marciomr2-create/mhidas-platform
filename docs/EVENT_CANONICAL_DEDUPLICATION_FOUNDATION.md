# Event Canonical Deduplication Foundation

Versão: v4.8.43-event-canonical-deduplication-foundation

## Objetivo

Esta versão cria a fundação para tratar um evento 100% validado como registro canônico interno.

Um evento canônico interno passa a ser uma fonte direta para buscas internas do USECLUBBERS, sem depender de nova consulta externa para confirmar sua existência.

## Arquivos criados

`src/app/api/official-events/_shared/eventCanonicalDeduplication.ts`

`src/app/api/official-events/_shared/eventCanonicalDeduplicationSample.ts`

`docs/EVENT_CANONICAL_DEDUPLICATION_FOUNDATION.md`

## Conceito central

A regra estratégica é:

evento 100% validado
→ registro canônico interno
→ fonte direta para busca interna
→ referência para deduplicação
→ base para autocomplete, check-in, ticket intent, caronas e encontros

O evento validado não vira uma nova fonte externa.

Ele vira um registro interno confiável, com rastro de origem preservado.

## Por que esta camada é necessária

Um mesmo evento pode aparecer por várias fontes:

- API autorizada de ticketeria;
- site oficial do evento;
- site oficial do venue;
- site oficial da produtora;
- calendário oficial do artista;
- página pública de ingresso;
- post oficial;
- fonte editorial;
- sinal de comunidade.

Sem deduplicação canônica, o sistema poderia criar vários eventos para a mesma ocorrência real.

Esta versão prepara o sistema para decidir se um novo sinal deve:

1. ser anexado ao evento canônico existente;
2. virar sinal complementar;
3. virar novo candidato canônico;
4. aguardar mais sinais de identidade;
5. ser bloqueado por conflito;
6. ser descartado por baixa validação.

## Estados criados

### `attach_to_existing_canonical`

O novo sinal bate diretamente com um evento canônico existente.

Exemplos:

- mesmo ID externo;
- mesma URL oficial;
- mesma URL de ingresso.

### `attach_complementary_signal`

O novo sinal não é uma duplicata direta, mas é forte o suficiente para complementar um evento canônico existente.

Exemplo:

- mesmo nome;
- mesma data;
- mesmo venue;
- mesma cidade;
- fonte oficial diferente.

### `create_new_canonical_candidate`

O evento é 100% validado e não bate com nenhum evento canônico existente.

Ele pode virar novo registro canônico interno.

### `needs_more_identity_signals`

O evento ainda não tem identidade mínima suficiente.

Exemplos:

- sem data;
- sem local;
- sem URL;
- sem ID externo;
- sem nome confiável.

### `blocked_by_identity_conflict`

O evento parece ser o mesmo, mas há conflito crítico.

Exemplo:

- mesmo nome;
- mesmo venue;
- mesma cidade;
- data diferente.

### `discarded_unvalidated_candidate`

O evento não é 100% validado e também não bate com evento canônico existente.

Ele não deve virar fonte direta de busca interna.

## Identidade mínima

Para um candidato ser avaliado como canônico, ele precisa conter:

- nome do evento;
- data;
- local ou cidade;
- URL oficial, URL de ingresso ou ID externo.

Sem esses dados, o evento fica em acumulação de sinais.

## Busca interna

Um evento canônico pode alimentar:

- busca interna;
- autocomplete;
- páginas de evento;
- check-in;
- ticket intent;
- caronas;
- encontros;
- radar social.

Mas antes disso ele precisa existir como registro canônico interno.

Esta versão ainda não grava esse registro no banco.

## Rastro de origem

Todo evento canônico deve preservar rastro de origem.

Exemplos de origem:

- API autorizada da ticketeria;
- site oficial;
- venue oficial;
- produtora oficial;
- calendário oficial de artista;
- página pública de ticket;
- post oficial;
- fonte editorial;
- sinal de comunidade.

Esse rastro permite explicar por que o evento foi considerado válido.

## Relação com versões anteriores

- v4.8.38 criou a política de automação sem análise humana.
- v4.8.39 criou o adaptador local para futuras APIs autorizadas de ticketerias.
- v4.8.40 criou o normalizador local de payloads externos.
- v4.8.41 criou a hierarquia correta: API autorizada primeiro e fallback adjacente depois.
- v4.8.42 conectou normalização, adaptador, fallback e política em pipeline local.
- v4.8.43 cria a fundação para deduplicar e transformar evento validado em registro canônico interno.

## Amostra local

A amostra valida seis cenários:

1. mesmo ID externo anexando ao canônico existente;
2. forte similaridade anexando sinal complementar;
3. novo evento 100% validado virando candidato canônico;
4. evento sem data aguardando mais identidade;
5. mesma identidade com data conflitante bloqueando;
6. candidato não validado sendo descartado.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 6;
- `valid_sample_case_count` igual a 6;
- `invalid_sample_case_count` igual a 0;
- `canonical_events_are_internal_search_sources` igual a `true`;
- `source_trace_should_be_preserved` igual a `true`;
- `canonical_record_required_before_public_search` igual a `true`;
- `external_request_performed` igual a `false`;
- `database_write_performed` igual a `false`;
- `human_event_analysis_required` igual a `false`;
- `real_auto_publish_enabled` igual a `false`;
- `real_auto_publish_allowed` igual a `false`;
- `all_sample_cases_valid` igual a `true`.

## Segurança

Esta versão mantém:

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

Esta versão prepara a Central de Eventos para ter memória própria.

Quando um evento é validado com segurança, ele deixa de depender apenas das fontes externas e passa a existir como entidade confiável dentro do USECLUBBERS.

Esse registro canônico interno será a base para busca, deduplicação, autocomplete e funcionalidades sociais do evento.