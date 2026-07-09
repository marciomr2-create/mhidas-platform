# Event Canonical Admin Write Route

Versao: v4.8.56-event-canonical-admin-write-route

## Objetivo

Esta versao cria uma rota admin minima para usar o servico de escrita canonica criado na v4.8.55.

A rota fica em:

`src/app/api/official-events/canonical/admin/write/route.ts`

## Regra principal

A rota executa dry-run por padrao.

Escrita real no banco so acontece quando todos os criterios abaixo forem verdadeiros:

- `dryRun=false`;
- `confirmWrite=true`;
- `confirmationPhrase="CONFIRM_CANONICAL_EVENT_WRITE"`;
- a requisicao estiver autorizada;
- o write service retornar `admin_can_confirm=true`.

Se qualquer criterio de confirmacao explicita estiver ausente, a rota executa dry-run e nao escreve no banco.

## Autorizacao

A rota segue o padrao admin ja usado em official events:

- `OFFICIAL_EVENTS_RESOLVER_SECRET`;
- header `x-official-events-secret`;
- querystring `secret`.

## O que a rota faz

No metodo `GET`, retorna capacidades da rota.

No metodo `POST`, recebe uma requisicao compativel com `EventCanonicalAdminWriteServiceRequest`.

A rota valida minimamente:

- existencia do objeto `event`;
- `event.event_name`;
- `event.starts_at`;
- `sourceEvidence` com pelo menos uma fonte.

Depois disso, a seguranca de negocio fica com o guard e o write service.

## O que esta versao nao faz

Esta versao nao cria migration.

Esta versao nao altera telas.

Esta versao nao altera `/event/[event_slug]`.

Esta versao nao altera ticket intent.

Esta versao nao altera check-in.

Esta versao nao altera caronas.

Esta versao nao altera encontros.

Esta versao nao altera radar social.

Esta versao nao conecta automaticamente clubbers ao evento canonico.

## Tabelas que podem ser escritas em modo write confirmado

Quando chamada em modo write confirmado e aprovada pelo guard, a rota pode escrever via service role em:

- `canonical_events`;
- `canonical_event_sources`;
- `canonical_event_search_documents`;
- `canonical_event_feature_feeds`.

## Motivo da barreira de confirmacao

A barreira tripla evita escrita acidental.

O admin ou automacao precisa pedir escrita explicitamente e informar a frase exata:

`CONFIRM_CANONICAL_EVENT_WRITE`

Sem isso, a rota responde com dry-run.

## Proxima etapa recomendada

Depois desta rota, a proxima evolucao deve criar um fluxo controlado de teste real com um candidato seguro, ainda sem ligar features sociais.

Somente depois devem ser criadas as amarracoes progressivas:

1. `/event/[event_slug]` para `canonical_event_id`;
2. ticket intent para `canonical_event_id`;
3. check-in para `canonical_event_id`;
4. caronas e encontros para `canonical_event_id`;
5. radar social para `canonical_event_id`.