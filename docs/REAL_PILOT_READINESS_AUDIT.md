# Real Pilot Readiness Audit

Versao: v4.8.52-real-pilot-readiness-audit

## Objetivo

Esta versao congela a estrategia operacional para concluir o USECLUBBERS para piloto real.

A decisao central e:

- motor de eventos validos deve ficar operacional para piloto real em ate 20 dias;
- ticketerias devem ter o caminho tecnico preparado;
- APIs de ticketerias nao entram como dependencia imediata do piloto;
- integracoes autorizadas de ticketerias entram no ciclo de ate 60 dias.

## Regra de ouro

O USECLUBBERS nao pode depender das ticketerias para iniciar testes reais.

O motor proprio de eventos canonicos precisa funcionar primeiro.

As ticketerias entram como fontes de autoridade, nao como cerebro do app.

## Escopo dos 20 dias

O escopo dos 20 dias e:

1. schema real de eventos canonicos;
2. RLS seguro;
3. evento validado com `canonical_event_id`;
4. admin/manual validation para confirmar evento real;
5. pagina `/event/[event_slug]` ligada ao evento canonico;
6. ticket intent ligado ao evento canonico;
7. check-in ligado ao evento canonico;
8. feature gates por evento validado;
9. carona ligada ao evento canonico;
10. encontros ligados ao evento canonico;
11. conexoes e radar ligados ao evento canonico;
12. busca/autocomplete usando eventos validos;
13. smoke test ponta a ponta;
14. release candidate para socios.

## Escopo das ticketerias em ate 60 dias

As ticketerias devem ficar preparadas por schema e contrato, mas nao bloqueiam o piloto.

Devem ser previstos:

- `provider_key`;
- `external_event_id`;
- `external_url`;
- `source_kind`;
- `authority_score`;
- `source_payload_summary`;
- `last_seen_at`;
- `integration_status`;
- `ingestion_mode`.

As APIs autorizadas entram progressivamente apos o piloto estar funcionando com validacao manual/admin.

## Caminho imediato de validacao

Para o piloto, o evento pode ser validado por:

- site oficial do evento;
- pagina publica oficial da ticketeria;
- site oficial do venue;
- site oficial da produtora;
- fonte oficial do artista;
- confirmacao manual admin;
- registro de fontes fortes.

Nao precisa de API ativa da ticketeria no primeiro ciclo.

## Bloqueadores reais

Os bloqueadores reais para piloto sao:

- ausencia de `canonical_event_id`;
- features sociais usando slug solto;
- ticket intent sem evento canonico;
- check-in sem evento canonico;
- carona/encontros sem evento canonico;
- radar social fragmentado por evento duplicado;
- ausencia de feature gate;
- ausencia de admin para confirmar evento;
- ausencia de smoke test real.

## Nao bloqueia o piloto de 20 dias

Nao bloqueiam o piloto:

- integracao completa com todas as ticketerias;
- automacao total de publicacao;
- cobertura nacional de eventos;
- analytics comercial avancado;
- app mobile nativo;
- dashboard final para produtores.

## Estado desta versao

Esta versao e apenas auditoria.

Ela nao altera runtime.

Ela nao cria rota.

Ela nao aplica Supabase.

Ela nao escreve no banco.

Ela nao altera visual.

Ela nao faz chamada externa.

## Saida esperada

A saida esperada desta auditoria e confirmar que o proximo passo nao e documentacao adicional.

O proximo passo deve ser:

`v4.8.53-event-canonical-schema-real-migration`

Essa versao devera tratar backup, migration real, RLS, rollback e validacao pos-migration.