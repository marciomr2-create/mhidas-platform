# EVENT TICKET COMMERCIAL MIGRATION — EIGHTH CORRECTED ADJUSTED DRAFT

## Versão

`v4.8.110-event-ticket-commercial-migration-eighth-corrected-adjusted-draft-safe`

## Base

- revisão: `v4.8.109-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-structural-review-safe`;
- commit base: `ef5d7ba3403178e7ef4c0f33bb74f6750506fc99`;
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_ADJUSTED_DRAFT.sql`;
- SHA256 do SQL anterior: `102DB5CF994DC82D35B6C13236906F0E0B2C7986BD95EFDFB5AEC20BB17485E6`.

## Decisão

`eighth_corrected_adjusted_draft_ready_for_ninth_structural_review`

O novo rascunho continua protegido, fora de `supabase/migrations`, com guarda incondicional e `ROLLBACK` final.

## Correções da matriz v4.8.109

1. A versão corrente da credencial passa a ser a única autoridade operacional e a rotação ganha RPC atômica.
2. A resolução pública exige parceiro verificado, integração ativa, credencial corrente ativa e scope válido.
3. A prova URL fecha hostname nulo, evidências incompletas e health check com idade superior a quinze minutos.
4. Evento, canal, clique, integração e transação ficam vinculados por FKs compostas, locks e checks.
5. Recibos passam a ter estados terminais fechados; `failed` e `pending` não são reutilizados.
6. Policies são resolvidas no servidor por finalidade, jurisdição e classe; 17 regras minimizam identificadores brutos.
7. O resolver público retorna token opaco de redirect ou URL oficial HTTPS, nunca ciphertext.
8. O lifecycle de parceiro usa matriz de transições e cascata auditada para integrações, scopes e canais.
9. As cinco tabelas com policies de leitura recebem `GRANT SELECT` mínimo e explícito.
10. O preflight usa inventário fechado da superfície de dependências, roles, extensão e objetos-alvo.

## Resultado estático

- instruções PostgreSQL reconhecidas pelo lexer: `119`;
- ajustes corrigidos: `10`;
- críticos: `6`;
- altos: `4`;
- regras de minimização materializadas: `17`;
- promoção permitida: `False`.

## Limites

- não executa migration;
- não acessa Supabase;
- não escreve no banco;
- não altera RLS real;
- não ativa canal comercial;
- não altera página pública;
- não modifica o SQL v4.8.108.

## Próxima etapa

Realizar revisão estrutural independente da v4.8.110 antes de qualquer promoção para migration executável.
