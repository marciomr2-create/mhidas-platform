# Event Canonical Admin Write Service

Versao: v4.8.55-event-canonical-admin-write-service

## Objetivo

Esta versao cria o servico server-side isolado para preparar e executar a escrita controlada do evento canonico.

O servico usa o guard da v4.8.54 antes de qualquer escrita.

Ele prepara ou grava, quando chamado por uma rota futura autorizada:

- `canonical_events`;
- `canonical_event_sources`;
- `canonical_event_search_documents`;
- `canonical_event_feature_feeds`.

## Escopo desta versao

Esta versao cria apenas o servico compartilhado e uma amostra local de dry-run.

Ela nao cria endpoint.

Ela nao chama Supabase durante a instalacao.

Ela nao altera runtime de rota existente.

Ela nao altera pagina visual.

Ela nao altera `/event/[event_slug]`.

Ela nao altera ticket intent, check-in, caronas, encontros ou radar.

## Regras preservadas

O admin nao escolhe entre opcoes ambiguas.

O motor deve entregar uma proposta segura.

Toda confirmacao deve convergir para um unico `canonical_event_id`.

Toda descoberta futura deve nascer com documento de busca.

Toda feature social futura deve depender de feature gates por evento canonico.

Texto livre de evento nao deve abrir interacao social.

## Funcionamento

O servico trabalha em dois modos:

1. `dry_run`
   - monta plano;
   - executa o guard;
   - gera payloads;
   - nao escreve no banco.

2. `write`
   - exige `admin_can_confirm = true`;
   - grava ou atualiza `canonical_events`;
   - registra fontes em `canonical_event_sources`;
   - cria/atualiza `canonical_event_search_documents`;
   - cria/atualiza `canonical_event_feature_feeds`.

## Tabelas alvo

### canonical_events

Guarda a identidade oficial interna do evento.

### canonical_event_sources

Guarda as fontes que sustentam a validacao.

### canonical_event_search_documents

Guarda o documento de busca do catalogo.

### canonical_event_feature_feeds

Guarda a politica de features do evento.

As features previstas sao:

- `ticket_intent`;
- `check_in`;
- `rides`;
- `meetups`;
- `connections`;
- `social_radar`;
- `search_autocomplete`.

## Relacao com ticketerias

As ticketerias continuam preparadas para o ciclo de ate 60 dias.

O servico nao exige API de ticketeria agora.

Quando uma fonte vier de ticketeria publica, ela pode entrar como `ticketing_public_page`.

Quando uma API autorizada existir no futuro, a fonte podera entrar como `ticketing_api`, mantendo o status preparado.

## O que falta depois desta versao

A proxima evolucao deve criar uma rota admin minima e controlada que:

1. valida autorizacao;
2. carrega o candidato;
3. monta a requisicao do write service;
4. roda dry-run por padrao;
5. permite write somente com confirmacao explicita;
6. retorna `canonical_event_id`;
7. nao altera ainda as features sociais.

Somente depois disso as rotas de evento e as features sociais devem passar a consumir `canonical_event_id`.