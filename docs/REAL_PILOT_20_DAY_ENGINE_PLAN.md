# Real Pilot 20 Day Engine Plan

Versao: v4.8.52-real-pilot-readiness-audit

## Meta

Concluir o motor de eventos validos para piloto real controlado em ate 20 dias.

A meta nao e automacao nacional.

A meta e:

evento real validado
→ evento canonico
→ `canonical_event_id`
→ pagina de evento
→ ticket intent
→ check-in
→ carona
→ encontros
→ conexoes
→ radar social
→ smoke test
→ release candidate.

## Dia 1 a 2 — Auditoria e congelamento

Entregavel:

`v4.8.52-real-pilot-readiness-audit`

Objetivo:

- confirmar escopo de 20 dias;
- separar ticketerias para ciclo de 60 dias;
- mapear dependencias criticas;
- impedir novas features fora do caminho critico.

## Dia 3 a 5 — Schema real do motor canonico

Entregavel recomendado:

`v4.8.53-event-canonical-schema-real-migration`

Objetivo:

- aplicar tabelas canonicas reais;
- definir RLS;
- validar backup;
- validar rollback;
- validar pos-migration;
- manter provider/ticketeria preparados para o futuro.

Tabelas:

- `canonical_events`;
- `canonical_event_sources`;
- `canonical_event_search_documents`;
- `canonical_event_feature_feeds`.

## Dia 6 a 8 — Admin confirma evento valido

Entregavel recomendado:

`v4.8.54-event-canonical-admin-confirmation`

Objetivo:

- confirmar evento manualmente;
- registrar fontes;
- criar ou atualizar evento canonico;
- habilitar features por evento.

## Dia 9 a 10 — Pagina de evento ligada ao canonico

Entregavel recomendado:

`v4.8.55-event-page-canonical-binding`

Objetivo:

- `/event/[event_slug]` passa a resolver `canonical_event_id`;
- fallback seguro para evento nao validado;
- pagina nao fragmenta dados.

## Dia 11 a 12 — Ticket intent e check-in canonicos

Entregavel recomendado:

`v4.8.56-event-intent-checkin-canonical-binding`

Objetivo:

- ticket intent depende de `canonical_event_id`;
- check-in depende de `canonical_event_id`;
- validar evento ativo/futuro;
- bloquear evento invalido.

## Dia 13 a 15 — Carona e encontros canonicos

Entregavel recomendado:

`v4.8.57-rides-meetups-canonical-event-binding`

Objetivo:

- carona usa `canonical_event_id`;
- encontros usam `canonical_event_id`;
- listas aparecem apenas para o mesmo evento validado;
- feature gate controla disponibilidade.

## Dia 16 a 17 — Conexoes e radar canonicos

Entregavel recomendado:

`v4.8.58-event-social-radar-canonical-binding`

Objetivo:

- radar social usa `canonical_event_id`;
- conexoes do evento usam contexto canonico;
- status self/outgoing/incoming/connected preservado;
- evitar mistura entre eventos duplicados.

## Dia 18 — Evento piloto real

Entregavel recomendado:

`v4.8.59-real-pilot-event-seed-and-smoke-prep`

Objetivo:

- cadastrar 1 ou 2 eventos reais;
- registrar fontes;
- habilitar features;
- preparar clubbers reais de teste.

## Dia 19 — Smoke test ponta a ponta

Testar:

- login;
- perfil Club;
- perfil Pro;
- abrir evento;
- marcar ingresso;
- check-in;
- ver participantes;
- pedir carona;
- criar encontro;
- conectar com clubber;
- ver network;
- admin revisar evento.

## Dia 20 — Release candidate para socios

Entregavel recomendado:

`v4.8.60-real-pilot-release-candidate`

Objetivo:

- build final;
- tag final;
- working tree clean;
- roteiro de demo;
- escopo pronto;
- escopo pos-piloto separado.

## Regra para ticketerias

As ticketerias entram assim:

- preparadas no schema agora;
- nao obrigatorias para piloto de 20 dias;
- integradas por API autorizada no ciclo de ate 60 dias;
- sem scraping forçado;
- sem tokens expostos;
- sem publicacao automatica ampla no inicio.

## Definicao de pronto para socios

O app esta pronto para apresentar aos socios quando:

1. existe evento real validado;
2. existe `canonical_event_id`;
3. pagina do evento abre sem erro;
4. clubber interage com o evento;
5. ticket intent funciona;
6. check-in funciona ou esta controlado por janela/localizacao;
7. carona/encontros dependem do evento valido;
8. conexoes/radar dependem do evento valido;
9. admin controla evento;
10. build passa;
11. repositorio esta limpo;
12. tag release candidate existe.