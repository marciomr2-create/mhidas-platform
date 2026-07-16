# EVENT TICKET COMMERCIAL MIGRATION — SEVENTH CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.108-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-safe`

## Base

- revisão: `v4.8.107-event-ticket-commercial-migration-sixth-corrected-adjusted-draft-structural-review-safe`;
- commit base: `59acd04661103ad699e35ccd62ebd4614dce35b8`;
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SIXTH_CORRECTED_ADJUSTED_DRAFT.sql`;
- SHA256 do SQL anterior: `F55552F8ED23DC6BB529B090250CD7DD5631CBB6808CE890BB29B219B54A9360`.

## Decisão

`seventh_corrected_adjusted_draft_ready_for_eighth_structural_review`

O novo rascunho permanece protegido, fora de `supabase/migrations`, com guarda incondicional e `ROLLBACK` final.

## Mudança estrutural principal

A v4.8.108 não concatena as camadas corretivas anteriores. Ela reconstrói o contrato comercial a partir do schema-base e declara cada tabela, coluna, constraint e índice uma única vez.

## Correções da matriz v4.8.107

1. DDL de retenção normalizado, sem redeclaração de colunas ou índice.
2. Contrato dimensional único para retenção.
3. Escopos e alvos de recibos incluem `credential_context_mutation` e `credential_context`.
4. Emissão de contexto usa identidade determinística antes da reserva.
5. Autoridade de idempotência inclui `principal_namespace`.
6. Oito regras de minimização são materializadas.
7. O batch resolve policies separadas para recibos e auditoria.
8. Falhas são convertidas em resultado terminal sem `RAISE` após a marcação do recibo.
9. RPCs administrativas consultam o recibo antes do estado mutável.
10. Consumo de contexto valida operação, target, status, integração e credencial do recibo.

## Resultado estático

- instruções PostgreSQL reconhecidas pelo lexer: `106`;
- ajustes corrigidos: `10`;
- críticos: `6`;
- altos: `4`;
- DDL normalizado: `True`;
- regras de minimização materializadas: `8`;
- promoção permitida: `False`.

## Limites

- não executa migration;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa canal comercial;
- não altera página pública;
- não substitui nem modifica o SQL v4.8.106.

## Próxima etapa

Realizar revisão estrutural independente da v4.8.108 antes de qualquer promoção para migration executável.
