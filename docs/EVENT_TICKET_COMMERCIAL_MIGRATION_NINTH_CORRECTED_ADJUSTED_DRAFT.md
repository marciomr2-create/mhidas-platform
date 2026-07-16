# EVENT TICKET COMMERCIAL MIGRATION — NINTH CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.112-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-safe`

## Base

- revisão: `v4.8.111-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-structural-review-safe`;
- commit base: `76d6ab1be7b5c715316d33fd9251d003f9782ecc`;
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_EIGHTH_CORRECTED_ADJUSTED_DRAFT.sql`;
- SHA256 do SQL anterior: `F93476685C4DE2E99A32B2D232A95AD60F6681C5791467D04C6E9A572D79DBEB`.

## Decisão

`ninth_corrected_adjusted_draft_ready_for_tenth_structural_review`

O rascunho continua protegido, fora de `supabase/migrations`, com guarda incondicional e `ROLLBACK` final.

## Correções diretas da matriz v4.8.111

1. O resolvedor de retenção é `VOLATILE`, compatível com `FOR SHARE` e com a estratégia concorrente de ativação.
2. O contexto de credencial usa HMAC, audience, operação, nonce, payload hash e token reapresentado no consumo único.
3. Canal comercial somente é autorizado e ativado por RPC administrativa atômica vinculada ao request aprovado, parceiro, integração, credencial e scope.
4. A retenção alcança recibos, auditoria, sinais, cliques, contextos, comunicações e rejeições de backfill.
5. `result_id` do recibo é minimizado junto com todos os identificadores correlacionáveis.
6. JSON usa contratos allowlist recursivos, limites de profundidade, tamanho e inspeção de valores.
7. Integração ativa e credencial corrente são fechadas por índice parcial e constraint triggers diferíveis.
8. Conversões attributed→confirmed e correções usam supersessão semântica, idempotente e concorrente.
9. Prova URL e fallback oficial exigem autoridade, manifesto, frescor e política comercial.
10. O preflight inventaria funções, policies, triggers, índices e grants legados por família e falha fechado.

## Resultado estático

- instruções PostgreSQL analisadas pelo parser: `113`;
- ajustes corrigidos: `10`;
- críticos: `6`;
- altos: `4`;
- famílias de retenção: `7`;
- regras de minimização materializadas: `44`;
- promoção permitida: `False`.

## Limites

- não executa migration;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa canal comercial;
- não altera página pública;
- não modifica o SQL v4.8.110.

## Próxima etapa

Realizar revisão estrutural independente da v4.8.112 antes de qualquer promoção para migration executável.
