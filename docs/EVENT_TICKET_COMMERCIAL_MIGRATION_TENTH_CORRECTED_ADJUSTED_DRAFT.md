# EVENT TICKET COMMERCIAL MIGRATION — TENTH CORRECTED ADJUSTED DRAFT

## Versao

`v4.8.114-event-ticket-commercial-migration-tenth-corrected-adjusted-draft-safe`

## Base

- revisao: `v4.8.113-event-ticket-commercial-migration-ninth-corrected-adjusted-draft-structural-review-safe`;
- commit base: `76d434cf49bb37105ef4386ab8712256336a6703`;
- SQL anterior preservado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_NINTH_CORRECTED_ADJUSTED_DRAFT.sql`;
- SHA256 do SQL anterior: `D8E4A96AEA9E02C6F8ED65821380714241082BD5C5D126220F2FCF282DDD7161`.

## Decisao

`tenth_corrected_adjusted_draft_ready_for_eleventh_structural_review`

O rascunho continua protegido, fora de `supabase/migrations`, com guarda incondicional e `ROLLBACK` final.

## Correcoes diretas da matriz v4.8.113

1. O preflight usa inventario fechado de objetos novos e allowlist explicita para os indices obrigatorios do schema-base.
2. A emissao de contexto verifica prova de posse da chave da credencial corrente por assinatura destacada, key ID, algoritmo e versao.
3. Contexto, recibo e operacao consumidora exigem o mesmo hash canonico do request.
4. A prova de URL assina destino, hostname, IPs, redirects, autoridade, versao e janela de validade.
5. O fallback oficial vincula URL, hostname normalizado, autoridade versionada e assinatura verificavel.
6. A retencao processa familias completas de sinais sob bloqueio transacional e preserva uma chave de familia imutavel.
7. Privilegios DML efetivos do `service_role` sao revogados nas tabelas comerciais; o boundary permitido permanece function-only.
8. Policies aposentadas exigem sucessora ativa compativel e continuam drenadas ate a conclusao das evidencias historicas.
9. Payloads assinados usam JSON canonico, domain separation e timestamps epoch independentes da sessao.
10. Recibos concluidos obedecem contratos fechados por operacao, status e versao de resultado.

## Resultado estatico

- instrucoes PostgreSQL segmentadas: `121`;
- ajustes corrigidos: `10`;
- criticos: `6`;
- altos: `4`;
- familias de retencao: `7`;
- regras de minimizacao materializadas: `44`;
- contratos de resultado materializados: `9`;
- promocao permitida: `False`.

## Pre-requisito externo explicito

A promocao futura exige uma implementacao independente e auditada de:

`public.mhidas_verify_detached_signature_v1(text,text,text,text)`

O preflight falha fechado quando esse verificador criptografico nao existe.

## Limites

- nao executa migration;
- nao acessa Supabase;
- nao escreve no banco;
- nao altera RLS real;
- nao ativa canal comercial;
- nao altera pagina publica;
- nao modifica o SQL v4.8.112;
- nao promove o rascunho.

## Proxima etapa

Realizar revisao estrutural independente da v4.8.114 antes de qualquer promocao para migration executavel.
