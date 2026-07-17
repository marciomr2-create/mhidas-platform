# Migração comercial de ingressos executável — v4.8.123

## Decisão

`executable_migration_created_and_isolated_validated`

A v4.8.123 converte o SQL protegido e aprovado na v4.8.122 em uma migration real do Supabase, sem executar qualquer operação no Supabase e sem escrever em staging ou produção.

## Artefato executável

- Caminho: `supabase/migrations/20260717150000_event_ticket_commercial_governance.sql`
- SHA256: `CC340082A3DB78350269074078129C346755D110991E240C316663E969415ADF`
- Fonte protegida: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_FOURTEENTH_RUNTIME_CORRECTED_DRAFT.sql`
- SHA256 da fonte: `D6292E37EFC430E5D94D073F560C5B37066203C2E74C5D948BF46CA78E2FE4C1`
- Instruções PostgreSQL: `149`

## Derivação controlada

A migration foi produzida mecanicamente a partir do SQL corrigido que passou nos 10 checks reais da v4.8.122:

1. preservação integral do SQL-fonte;
2. remoção exclusiva do guard incondicional de rascunho;
3. substituição exclusiva do `ROLLBACK` final por `COMMIT`;
4. inclusão de cabeçalho de procedência;
5. normalização dos comentários de decisão para refletir o artefato executável;
6. nenhuma alteração funcional adicional.

## Validação obrigatória antes da publicação

O runner da v4.8.123 aplica esta migration em PostgreSQL 16 isolado e exige:

- criação completa do DDL e compilação dos corpos PL/pgSQL;
- rollback transacional sem objetos persistentes;
- constraints, triggers, RLS e grants;
- rotação de credencial e lifecycle do contexto;
- ativação, substituição e resolução de canais comerciais;
- idempotência e concorrência dos purchase signals;
- concorrência por família e orçamento global de retenção;
- backfill, checksum, cutover e rollback;
- contratos terminais dos recibos;
- aplicação equivalente em um segundo banco novo.

## Segurança operacional

- Nenhuma operação Supabase é executada nesta versão.
- Nenhum banco de staging ou produção é alterado.
- O arquivo protegido da v4.8.122 permanece inalterado.
- A promoção para staging é liberada somente após a publicação desta versão.
- A promoção para produção continua bloqueada até aplicação e validação controladas em staging.

## Próximo passo único

Aplicar a migration em staging com backup, inventário prévio, logs integrais e gate de rollback. Não reabrir requisitos nem retornar ao ciclo de revisão documental.
