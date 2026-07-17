# EVENT TICKET COMMERCIAL MIGRATION — THIRTEENTH CORRECTED ADJUSTED DRAFT

## Versao

`v4.8.120-event-ticket-commercial-migration-thirteenth-corrected-adjusted-draft-safe`

## Base

- versao: `v4.8.119-event-ticket-commercial-migration-twelfth-corrected-adjusted-draft-structural-review-safe`
- commit: `0f3be74158fc7edb1e8626c6b3d0d21f7722ca7e`
- matriz aplicada: `v4.8.119`;
- SQL v4.8.118 preservado: `True`.

## Decisao

`thirteenth_corrected_adjusted_draft_ready_for_fourteenth_structural_review`

O SQL permanece protegido fora de `supabase/migrations`, com guard incondicional e `ROLLBACK` final. Nenhuma operacao Supabase ou escrita no banco foi executada.

## Resultado

- instrucoes PostgreSQL segmentadas: `148`;
- ajustes corrigidos: `10`;
- criticos: `6`;
- altos: `4`;
- policies ativas de retencao: `7`;
- regras de minimizacao: `44`;
- contratos de resultado: `9`;
- contratos do executor de retencao: `7`;
- promocao permitida: `False`.

## Correcoes materializadas

1. A tabela de rejeicoes de backfill agora precede qualquer foreign key que a referencia.
2. O trigger de invariantes de credencial e criado somente depois das duas tabelas dependentes.
3. Escrita e retencao de familias de sinais compartilham advisory lock; a familia inteira e bloqueada e revalidada sem `SKIP LOCKED` parcial.
4. Provas de URL e fonte oficial usam verificador hash-aware e assinam autoridade, key id, algoritmo, key hash e manifest.
5. Contexto de credencial vincula token, expiracao, assinatura e payload na identidade deterministica e no recibo idempotente.
6. Consumo do contexto compara fingerprint e todos os snapshots da attestation corrente.
7. O hash canonico do envelope comercial e recomputado, comparado e incluido na prova assinada.
8. O executor usa orcamento global real, incluindo expiracao de contextos, e registra tentativas, locks, alteracoes e bloqueios.
9. O backfill materializa itens, rejeicoes, checksums e checkpoint de cutover para as tres fontes permitidas.
10. A ativacao valida `FOUND` antes do advisory lock e reconsulta o canal sob o lock.

## Validacoes internas

- parser PostgreSQL `pglast`: aprovado;
- splitter lexical: `148` statements;
- ordem de tabelas e funcoes dependentes validada;
- hashes SHA256 e manifesto;
- escopo exato de tres arquivos;
- TypeScript e build obrigatorios antes do commit;
- staging exato, tag anotada, push e validacao remota;
- rollback seguro para SQL ignorado e arquivos nao rastreados.

## Limites

- dry-run em PostgreSQL real e clone representativo continua externo;
- nenhuma pagina publica, SSR, auth, middleware ou banco foi alterado;
- promocao permanece bloqueada.

## Proxima evolucao

Revisao estrutural independente do SQL v4.8.120 com matriz de remediacao embutida.
