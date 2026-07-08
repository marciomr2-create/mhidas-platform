# Event Canonical Schema Real Migration

Versao: v4.8.53-event-canonical-schema-real-migration

## Objetivo

Esta versao cria o arquivo de migration real para o schema canonico de eventos.

Esta etapa A apenas cria o arquivo de migration e os artefatos de validacao.

Ela nao aplica Supabase.

Ela nao escreve no banco.

A aplicacao real deve ocorrer em etapa separada, apos revisao do arquivo criado.

## Backup obrigatorio confirmado

Backup usado como referencia:

`backups\pre-v4.8.53-event-canonical-schema-real-migration-20260708-142607`

Schema:

`schema-public-before-v4.8.53.sql`

Hash:

`F8C87AA61179C99FB03566D795BF890D79D24A6EA9CB5C1F9831E5F0704EDB49`

Dados:

`data-public-before-v4.8.53.sql`

Hash:

`B0713FF2580DAA1C573732E4D774CDC6776ACE962763D448614AB67214A268FA`

Manifesto:

`backup-manifest-v4.8.53.json`

Hash:

`8D1084A644E6A02479B7980BC64E3394B2B88C8C4F01679B03763CEBB1282F4F`

## Migration criada

`supabase/migrations/20260708120000_event_canonical_schema_v4_8_53.sql`

## Tabelas propostas

A migration cria:

- `canonical_events`;
- `canonical_event_sources`;
- `canonical_event_search_documents`;
- `canonical_event_feature_feeds`.

## Papel no piloto real

O `canonical_event_id` passa a ser a identidade estavel do evento para:

- pagina de evento;
- ticket intent;
- check-in;
- carona;
- encontros;
- conexoes;
- radar social;
- busca/autocomplete.

## Ticketerias

As ticketerias nao entram como dependencia imediata do piloto de 20 dias.

O schema prepara campos para o caminho de ate 60 dias:

- `provider_key`;
- `external_event_id`;
- `source_url`;
- `source_kind`;
- `authority_score`;
- `source_payload_summary`;
- `last_seen_at`;
- `integration_status`;
- `ingestion_mode`.

## RLS

A migration habilita RLS nas quatro tabelas.

Ela cria apenas politicas de leitura controlada.

Ela nao cria politicas publicas de escrita.

Escritas devem ocorrer futuramente por caminhos server-side admin/service-role controlados.

## O que esta etapa A nao faz

Esta etapa A nao faz:

- Supabase apply;
- escrita no banco;
- seed de evento real;
- alteracao de rota;
- alteracao visual;
- alteracao de auth;
- alteracao de middleware;
- integracao real com ticketeria;
- scraping;
- publicacao automatica.

## Proxima etapa

Depois da etapa A aprovada, a proxima etapa deve ser a aplicacao real controlada:

`ETAPA B — apply Supabase + pos-validacao`

Somente depois do apply e validacao a versao deve seguir para commit, tag e push.