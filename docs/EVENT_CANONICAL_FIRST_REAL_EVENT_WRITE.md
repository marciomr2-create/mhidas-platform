# v4.8.61 — Event Canonical First Real Event Write

## Objetivo

Registrar o primeiro write real controlado de um evento canônico no MHIDAS/USECLUBBERS.

Esta versão documenta o primeiro evento real gravado na base canônica usando a rota administrativa protegida:

- `POST /api/official-events/canonical/admin/write`

O write real foi executado somente depois de:

- `readback-db` antes;
- dry-run forte aprovado;
- confirmação explícita do administrador;
- payload real revisado;
- execução controlada com `dryRun=false`, `confirmWrite=true` e `confirmationPhrase="CONFIRM_CANONICAL_EVENT_WRITE"`.

## Escopo

Esta versão é documental.

Não houve alteração de código, rota, tela, migration, SSR, middleware, autenticação ou feature social.

Arquivo criado:

- `docs/EVENT_CANONICAL_FIRST_REAL_EVENT_WRITE.md`

## Base anterior

Versão estável anterior:

- `v4.8.60-event-canonical-first-controlled-write-preflight`

Commit anterior:

- `7fa1abc`

A versão anterior documentou o preflight aprovado sem write real.

## Evento real gravado

Evento:

- `ADRIATIQUE Present X São Paulo`

Slug canônico:

- `adriatique-present-x-sao-paulo-2026-09-26`

Data e hora:

- `2026-09-26T14:00:00-03:00`

Local:

- `Vale do Anhangabaú`

Cidade/Estado:

- `São Paulo/SP`

País:

- `BR`

Fonte principal:

- `https://www.ingresse.com/xsaopaulo/`

Fonte secundária/admin:

- `https://x.com/beonenter`

Provider principal:

- `ingresse`

External event id principal:

- `xsaopaulo`

## Preflight real antes do write

Antes do write real, foi executado:

- `GET /api/official-events/canonical/admin/readback-db?eventSlug=adriatique-present-x-sao-paulo-2026-09-26`

Resultado observado:

- `ok=true`
- `mode=readback_db_audit`
- `database_write_performed=false`
- `supabase_operation_performed=true`
- `supabase_read_performed=true`
- `db_read_error=null`
- `matched_count.canonical_events=0`
- `matched_count.canonical_event_sources=0`
- `matched_count.canonical_event_search_documents=0`
- `matched_count.canonical_event_feature_feeds=0`

Conclusão:

- O evento ainda não existia na base canônica pelo slug testado.
- Nenhum write foi executado durante o readback.
- A auditoria read-only estava operacional antes do write real.

## Dry-run forte aprovado

Antes do write real, a rota administrativa de write foi testada em dry-run com o mesmo evento real.

Resultado observado:

- `ok=true`
- `mode=dry_run`
- `wroteChanges=false`
- `recommendedAction=confirm_create_canonical_event`
- `confirmationState=ready_for_admin_confirmation`
- `admin_can_confirm=true`
- `confidence_score=100`
- `duplicate_risk_score=0`
- `source_evidence_count=2`
- `strong_evidence_count=2`
- `plausible_existing_match_count=0`
- `database_write_performed=false`
- `supabase_operation_performed=false`

Conclusão:

- O guard administrativo aprovou o candidato para confirmação.
- O candidato não apresentou duplicidade conhecida.
- O dry-run não executou operação de escrita.

## Primeira tentativa de write real

Foi feita uma primeira tentativa de write real com `adminUserId` textual:

- `local-admin-first-real-event-v4.8.61`

Resultado:

- HTTP `409 Conflict`
- `mode=write`
- `wroteChanges=false`
- `canonicalEventId=null`
- `database_write_performed=false`
- `supabase_operation_performed=false`
- erro: `invalid input syntax for type uuid: "local-admin-first-real-event-v4.8.61"`

Conclusão:

- A tentativa foi bloqueada com segurança.
- Nenhum evento canônico foi criado nessa tentativa.
- O erro ocorreu porque algum campo de auditoria do banco espera UUID.
- A estratégia foi corrigida para `adminUserId=null`.

## Write real executado com sucesso

Após corrigir o payload para `adminUserId=null`, o write real foi executado com:

- `dryRun=false`
- `confirmWrite=true`
- `confirmationPhrase="CONFIRM_CANONICAL_EVENT_WRITE"`

Resultado observado:

- HTTP `200 OK`
- `ok=true`
- `mode=write`
- `message=Canonical event write completed.`
- `wroteChanges=true`
- `canonicalEventId=23be9989-5412-4a03-94e5-d73d4aab98d9`
- `database_write_performed=true`
- `supabase_operation_performed=true`
- `error=null`

Canonical event id criado:

- `23be9989-5412-4a03-94e5-d73d4aab98d9`

Conclusão:

- O primeiro evento real foi gravado com sucesso na base canônica.
- O write real foi executado uma única vez com confirmação explícita.
- A rota preservou as travas administrativas exigidas.

## Registros criados pelo write service

O retorno do write service indicou criação/vinculação dos seguintes objetos planejados:

### canonical_events

Evento criado:

- `id=23be9989-5412-4a03-94e5-d73d4aab98d9`
- `slug=adriatique-present-x-sao-paulo-2026-09-26`
- `event_name=ADRIATIQUE Present X São Paulo`
- `validation_status=validated`
- `validation_method=official_ticketing_public_page`
- `is_100_percent_validated=true`
- `source_confidence_score=100`

### canonical_event_sources

Fontes associadas ao evento canônico:

1. Ingresse

   - `source_key=ingresse_xsaopaulo_public_event_page`
   - `source_kind=ticketing_public_page`
   - `provider_key=ingresse`
   - `external_event_id=xsaopaulo`
   - `authority_score=100`

2. Be On Entertainment / revisão administrativa

   - `source_key=be_on_entertainment_x_public_profile_admin_review`
   - `source_kind=manual_admin_review`
   - `provider_key=be_on_entertainment`
   - `external_event_id=xsaopaulo-2026-09-26`
   - `authority_score=85`

### canonical_event_search_documents

Documento de busca planejado/criado para:

- `canonical_event_id=23be9989-5412-4a03-94e5-d73d4aab98d9`
- `canonical_slug=adriatique-present-x-sao-paulo-2026-09-26`
- `search_title=ADRIATIQUE Present X São Paulo - Vale do Anhangabaú - São Paulo - SP - 2026-09-26`
- `is_publicly_searchable=true`

### canonical_event_feature_feeds

Feature gates criados para o evento canônico, todos desativados:

- `ticket_intent`
- `check_in`
- `rides`
- `meetups`
- `connections`
- `social_radar`
- `search_autocomplete`

Importante:

- Nenhuma feature social foi ligada.
- Todos os feature gates permaneceram com `enabled=false`.
- O write criou a base para ativação futura controlada por `canonical_event_id`.

## Readback pós-write

Após o write real, foi executado novo readback:

- `GET /api/official-events/canonical/admin/readback-db?eventSlug=adriatique-present-x-sao-paulo-2026-09-26`

Resultado observado:

- HTTP `200 OK`
- `ok=false`
- `db_read_error=Unknown readback DB audit error.`
- `database_write_performed=false`
- `supabase_operation_performed=true`
- `supabase_read_performed=true`

Conclusão:

- O erro ocorreu na rota de auditoria `readback-db`, depois do write ter sido concluído.
- O write real já havia retornado `ok=true`, `wroteChanges=true`, `canonicalEventId` e `database_write_performed=true`.
- A próxima versão deve corrigir a auditoria pós-write da rota `readback-db`.

## Decisão técnica

A `v4.8.61` deve ser considerada concluída como o primeiro write real canônico bem-sucedido.

Ponto de atenção para a próxima versão:

- corrigir o erro genérico do `readback-db` pós-write;
- tornar o erro explícito;
- confirmar leitura por `canonical_event_id`;
- confirmar contagem real de `canonical_events`, `canonical_event_sources`, `canonical_event_search_documents` e `canonical_event_feature_feeds`.

## Próxima versão recomendada

Próxima versão:

- `v4.8.62-event-canonical-readback-db-post-write-fix`

Objetivo:

- corrigir a rota `readback-db` para auditar corretamente o evento recém-criado;
- consultar por `canonical_event_id=23be9989-5412-4a03-94e5-d73d4aab98d9`;
- preservar read-only;
- não executar novo write;
- não alterar feature social;
- não alterar tela pública.

## Garantias preservadas

Esta versão confirma que:

- O primeiro evento real foi criado com `canonical_event_id`.
- O write real exigiu confirmação explícita.
- A rota de write preservou as travas administrativas.
- A primeira tentativa inválida foi bloqueada sem gravar dados.
- O write bem-sucedido usou `adminUserId=null` para evitar UUID inválido.
- Nenhuma feature social foi ativada.
- Nenhuma tela pública foi alterada.
- Nenhuma migration foi criada.
- O próximo trabalho deve focar na auditoria read-only pós-write.