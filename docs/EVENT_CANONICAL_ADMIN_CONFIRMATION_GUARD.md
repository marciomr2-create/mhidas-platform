# Event Canonical Admin Confirmation Guard

Versao: v4.8.54-event-canonical-admin-confirmation-guard

## Objetivo

Esta versao cria o guard de confirmacao canonica de eventos.

A regra principal e:

O admin nao escolhe entre opcoes ambiguas.

O motor deve qualificar a identidade do evento, detectar conflitos, avaliar evidencias e liberar apenas uma proposta segura para confirmacao.

## Problema que esta versao resolve

O USECLUBBERS nao pode correr o risco de conectar clubbers a eventos diferentes que parecem ser o mesmo evento.

O sistema nao deve permitir que interacoes sociais sejam abertas por:

- nome digitado livremente;
- slug solto;
- candidato ambiguo;
- evento duplicado;
- fonte isolada sem confianca;
- escolha manual entre varias alternativas parecidas.

Todas as interacoes futuras devem convergir para:

`canonical_event_id`

## Papel correto do admin

O admin nao e o responsavel por adivinhar qual evento esta correto.

O admin e o validador final de uma proposta ja qualificada pelo motor.

O admin pode:

- confirmar uma proposta segura;
- rejeitar uma proposta;
- pedir mais evidencia;
- adicionar fonte;
- mandar reprocessar;
- bloquear conflito.

O admin nao deve:

- escolher no olho entre varias opcoes parecidas;
- confirmar evento sem identidade minima;
- liberar feature social sem `canonical_event_id`;
- liberar evento baseado apenas em texto livre.

## Estados de seguranca

Confirmacao permitida:

- `ready_for_admin_confirmation`

Confirmacao bloqueada ou em espera:

- `hold_missing_schema`;
- `hold_missing_required_identity`;
- `hold_missing_strong_evidence`;
- `hold_missing_search_document`;
- `hold_missing_feature_gates`;
- `blocked_ambiguous_identity`;
- `blocked_duplicate_conflict`;
- `blocked_free_text_event_interaction`;
- `blocked_admin_manual_ambiguous_choice`;
- `blocked_social_feature_fragmentation_risk`;
- `blocked_ticketing_dependency_misclassified`.

## Condicoes para confirmar

O motor so deve liberar confirmacao quando houver:

1. schema canonico real pronto;
2. identidade minima do evento;
3. evidencia oficial ou revisao admin forte;
4. uma unica identidade canonica segura;
5. nenhum conflito critico de duplicidade;
6. documento de busca preparado;
7. feature gates preparados;
8. ausencia de dependencia imediata de API de ticketeria;
9. ausencia de interacao social antes de `canonical_event_id`.

## Documento de busca

A confirmacao do evento deve preparar tambem:

`canonical_event_search_documents`

Isso e essencial porque o USECLUBBERS sera buscador/catalogo oficial da cena eletronica brasileira.

O evento confirmado deve poder ser encontrado por:

- nome do evento;
- nome do artista;
- club ou venue;
- data;
- cidade;
- estado;
- vertentes;
- festival;
- balada;
- fontes oficiais.

## Feature gates

A confirmacao deve preparar tambem:

`canonical_event_feature_feeds`

As features previstas sao:

- `ticket_intent`;
- `check_in`;
- `rides`;
- `meetups`;
- `connections`;
- `social_radar`;
- `search_autocomplete`.

Mesmo que uma feature fique desligada inicialmente, ela precisa existir como politica do evento.

## Ticketerias

As ticketerias continuam preparadas para o ciclo de ate 60 dias.

A confirmacao canonica nao deve depender agora de API autorizada da ticketeria.

Fontes publicas oficiais de ticketeria podem ser usadas como evidencia.

APIs autorizadas entram depois, sem bloquear o piloto de 20 dias.

## O que esta versao nao faz

Esta versao nao faz:

- escrita no banco;
- Supabase operation;
- criacao de rota;
- alteracao visual;
- alteracao em auth;
- alteracao em middleware;
- alteracao na pagina `/event/[event_slug]`;
- alteracao em ticket intent;
- alteracao em check-in;
- alteracao em carona;
- alteracao em encontros;
- alteracao em conexoes/radar;
- integracao real com ticketeria.

## Proxima etapa

Depois desta fundacao, a proxima etapa deve criar o caminho server-side controlado que usa este guard para gravar com seguranca em:

- `canonical_events`;
- `canonical_event_sources`;
- `canonical_event_search_documents`;
- `canonical_event_feature_feeds`.

Somente depois as rotas e features sociais devem passar a consumir `canonical_event_id`.