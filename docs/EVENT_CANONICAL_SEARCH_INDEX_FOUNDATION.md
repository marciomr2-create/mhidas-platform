# Event Canonical Search Index Foundation

Versão: v4.8.44-event-canonical-search-index-foundation

## Objetivo

Esta versão cria a fundação para transformar um evento canônico interno em documento local de busca.

A regra estratégica é:

evento 100% validado
→ registro canônico interno
→ documento padronizado de busca interna
→ autocomplete
→ base futura para check-in, ticket intent, caronas e encontros

Esta versão ainda não grava nada no banco.

## Arquivos criados

`src/app/api/official-events/_shared/eventCanonicalSearchIndex.ts`

`src/app/api/official-events/_shared/eventCanonicalSearchIndexSample.ts`

`docs/EVENT_CANONICAL_SEARCH_INDEX_FOUNDATION.md`

## Conceito central

Um evento validado não deve depender de nova consulta externa para aparecer em buscas internas.

Depois que ele vira registro canônico interno, o sistema pode gerar um documento local de busca com:

- ID canônico;
- título de busca;
- título normalizado;
- data;
- venue;
- cidade;
- estado;
- país;
- URL oficial;
- URL de ingresso;
- slug seed;
- tokens de busca;
- resumo do rastro de origem;
- score de ranking;
- escopos de disponibilidade.

## Escopos de disponibilidade

A camada define escopos de uso:

### `internal_search`

Permite que o evento seja usado pela busca interna do USECLUBBERS.

### `autocomplete`

Permite que o evento apareça em sugestões/autocomplete.

### `event_features`

Permite que o evento alimente features como:

- check-in;
- ticket intent;
- caronas;
- encontros;
- radar social.

### `public_search`

Reservado para busca pública futura.

Por segurança, busca pública fica desligada por padrão.

### `blocked`

Indica que o evento não pode virar documento de busca.

## Estados criados

### `index_validated_canonical_direct_search`

Evento canônico 100% validado pode virar documento direto de busca interna.

### `index_canonical_candidate_internal_only`

Evento 100% validado, mas ainda como candidato canônico, pode alimentar busca interna/autocomplete sem busca pública.

### `index_existing_canonical_reference`

Registro canônico já existente pode reconstruir documento local de busca.

### `index_autocomplete_hold`

Sinal complementar deve ser preservado como rastro, mas não vira documento próprio.

### `blocked_missing_canonical_identity`

Evento sem identidade mínima não pode virar busca.

### `blocked_unvalidated_signal`

Sinal não validado não pode virar fonte direta de busca.

### `blocked_by_status`

Sinal bloqueado não pode virar busca.

## Identidade mínima para busca

Para gerar documento local de busca, o evento precisa ter:

- nome;
- data;
- local ou cidade;
- referência canônica, ID externo, URL oficial ou URL de ingresso.

Sem isso, a camada bloqueia a indexação.

## Rastro de origem

O documento de busca preserva resumo do rastro de origem:

- quantidade de fontes;
- fonte mais forte;
- providers envolvidos;
- IDs externos;
- URLs de origem;
- maior score de autoridade.

O objetivo é manter explicabilidade: o sistema sabe por que aquele evento existe.

## Relação com versões anteriores

- v4.8.38 criou a política de automação sem análise humana.
- v4.8.39 criou o adaptador local para futuras APIs autorizadas de ticketerias.
- v4.8.40 criou o normalizador local de payloads externos.
- v4.8.41 criou API autorizada primeiro e fallback adjacente depois.
- v4.8.42 conectou normalização, adaptador, fallback e política em pipeline local.
- v4.8.43 criou a fundação canônica/deduplicação.
- v4.8.44 transforma o registro canônico em documento local de busca.

## Amostra local

A amostra valida seis cenários:

1. evento canônico validado alimentando busca interna e features;
2. candidato canônico validado alimentando busca interna sem busca pública;
3. referência canônica existente reconstruindo documento de busca;
4. sinal complementar preservado apenas como rastro;
5. evento sem data bloqueado;
6. sinal não validado bloqueado como fonte direta de busca.

## Resultado esperado da amostra

A amostra deve consolidar:

- `sample_case_count` igual a 6;
- `valid_sample_case_count` igual a 6;
- `invalid_sample_case_count` igual a 0;
- `canonical_event_required_before_indexing` igual a `true`;
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

Esta versão prepara a Central de Eventos para ter busca própria baseada em eventos canônicos internos.

O USECLUBBERS passa a ter um contrato local para transformar eventos validados em documentos de busca, sem depender de busca externa repetida e sem criar duplicatas.