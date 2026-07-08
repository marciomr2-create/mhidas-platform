# Event Canonical Catalog Discovery Requirements

Versao: v4.8.54-event-canonical-admin-confirmation-guard

## Visao de produto

O USECLUBBERS vai alem de conectar pessoas.

O produto deve evoluir para ser o buscador canonico da cena eletronica brasileira.

O catalogo deve cobrir:

- eventos de musica eletronica;
- clubs;
- baladas;
- festivais;
- experiencias oficiais;
- eventos por artista;
- eventos por venue;
- eventos por cidade;
- eventos por estado;
- eventos por data;
- eventos por vertentes.

## Regra central

Toda descoberta deve retornar eventos canonicos.

A busca nao deve retornar texto solto como destino final.

Toda busca deve convergir para:

`canonical_event_id`

## Portas de entrada de busca

O clubber podera descobrir eventos por:

- nome do evento;
- nome do artista;
- club ou venue;
- data;
- cidade;
- estado;
- vertentes;
- festival;
- balada;
- produtora;
- fonte oficial;
- ticketeria, quando integrada.

## Resultado correto da busca

Cada resultado deve conter pelo menos:

- `canonical_event_id`;
- titulo do evento;
- slug canonico;
- data;
- cidade;
- estado;
- venue;
- fontes resumidas;
- features habilitadas;
- status de validacao.

## Resultado inseguro

Se nao houver match seguro, o sistema nao deve liberar interacao social.

O sistema deve criar ou orientar uma pendencia de validacao.

Exemplos bloqueados:

- evento nao encontrado;
- dois eventos parecidos;
- mesmo nome em datas diferentes;
- mesma data em venues diferentes;
- fonte fraca;
- candidato sem identidade suficiente;
- texto digitado livremente.

## Estrutura evolutiva

A estrutura atual da v4.8.53 ja criou:

- `canonical_events`;
- `canonical_event_sources`;
- `canonical_event_search_documents`;
- `canonical_event_feature_feeds`.

A evolucao futura pode criar entidades adicionais:

- `canonical_artists`;
- `canonical_venues`;
- `canonical_music_genres`;
- `canonical_event_artists`;
- `canonical_event_genres`;
- `canonical_event_venue_links`.

Essas entidades nao devem ser criadas antes da necessidade operacional, mas a arquitetura deve permanecer preparada para elas.

## Relacao com features sociais

As features sociais nao podem operar fora do catalogo canonico.

Devem depender de `canonical_event_id`:

- ticket intent;
- check-in;
- carona;
- encontros;
- conexoes;
- radar social.

A frase tecnica e:

Toda descoberta, selecao e interacao social deve convergir para um `canonical_event_id` validado.

## Ponto de seguranca

O app nao deve permitir que clubbers criem eventos sociais soltos.

O clubber entra em um evento validado existente.

Se o evento ainda nao existir no catalogo, ele pode sugerir o evento para validacao, mas nao deve abrir interacoes sociais ate a validacao segura.