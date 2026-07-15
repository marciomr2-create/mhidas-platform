# EVENT TICKET COMMERCIAL MIGRATION — SECOND CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.96-event-ticket-commercial-migration-second-corrected-adjusted-draft-safe`

## Base

- versão: `v4.8.95-event-ticket-commercial-corrected-draft-third-adjustment-plan-safe`
- commit: `ec0994a67f30f08aaca35cd813e88115e1dcd2cf`
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_CORRECTED_ADJUSTED_DRAFT.sql`
- SHA256 do SQL anterior: `4DC566C2B3259DEC30498BC4BD3FF77AA9B52AA0D9A9F8B65013DD81B15CFECE`

## Decisão

`second_corrected_adjusted_draft_ready_for_third_structural_review`

A versão cria um novo rascunho SQL completo e protegido. O SQL da v4.8.93 não é alterado. A promoção permanece bloqueada até nova revisão estrutural independente e fechamento das dependências externas.

## Correções aplicadas

1. RPC versionada de validação de URL com execução exclusiva por `service_role`.
2. `GRANT SELECT` alinhado às policies RLS existentes.
3. validação obrigatória de evento, canal e usuário do `click_id`.
4. política de retenção ativa resolvida no servidor e prazo derivado da política.
5. recibo operacional como autoridade de idempotência e `receipt_id` persistido no sinal.
6. recibos de comunicações sem evento usam o parceiro como alvo não nulo.
7. registro versionado de integrações confiáveis e escopo por canal/evento.
8. matriz fail-closed de ator, tipo de sinal e fonte de evidência.
9. `confirmed_conversion` exige parent `attributed_conversion` com lineage coerente.
10. freshness de URL rejeita relógio futuro e exige hash de health check.

## Objetos adicionais do rascunho

- `event_ticket_trusted_integrations`;
- `event_ticket_trusted_integration_channels`;
- dimensões de finalidade, jurisdição e classe de evidência na política de retenção;
- `receipt_id`, `integration_id` e `evidence_matrix_version` nos sinais;
- RPCs versionadas `v3` para URL, comunicações, sinais e resolução pública.

## Validações do artefato

- instruções PostgreSQL analisadas: `207`;
- correções registradas: `10`;
- correções críticas: `7`;
- correções altas: `3`;
- guarda incondicional antes do primeiro DDL: `True`;
- término em `ROLLBACK`: `True`;
- `CREATE OR REPLACE`: `False`;
- DDL com `IF NOT EXISTS`: `False`;
- SQL em `supabase/migrations`: `False`;
- promoção permitida: `False`.

## Dependências externas ainda abertas

1. inventário fresco do schema de produção;
2. contrato definitivo de autorização administrativa;
3. onboarding verificado de parceiros;
4. semântica financeira comercial;
5. validador server-side de URLs;
6. registro real de namespaces e credenciais de provedores;
7. base legal, retenção e anonimização;
8. mapeamento do legado;
9. backup, dry-run e reconciliação;
10. testes paralelos de concorrência e falhas.

## Limites

- não executa migration;
- não acessa Supabase;
- não escreve no banco;
- não cria objetos reais;
- não altera RLS real;
- não ativa link comercial;
- não altera a página pública;
- não move SQL para `supabase/migrations`;
- não altera o SQL da v4.8.93.

## Próxima decisão permitida

Executar uma terceira revisão estrutural independente deste novo rascunho. Nenhuma promoção para migration executável é permitida nesta versão.
