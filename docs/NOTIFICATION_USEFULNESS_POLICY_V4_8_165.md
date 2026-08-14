# V4.8.165 — Política de utilidade das notificações

## Princípio central

Uma alteração de estado não é, por si só, motivo para notificar.

Toda notificação deve responder:

1. Em qual contexto aconteceu?
2. O que aconteceu?
3. Qual identidade está envolvida?
4. O usuário precisa fazer alguma coisa?

## Identidades

Um cadastro pode operar duas identidades sociais independentes:

- Perfil Clubber
- Perfil Profissional

Os textos e payloads devem identificar explicitamente o perfil correspondente.

## Push permitido nesta etapa

Push é elegível somente para:

- solicitação para entrar em tribo;
- entrada em tribo aprovada;
- remoção/bloqueio de tribo;
- cancelamento de tribo;
- solicitação de carona;
- carona aprovada;
- cancelamento de carona;
- solicitação de encontro;
- encontro aprovado;
- cancelamento de encontro;
- solicitação de conexão profissional;
- conexão profissional aceita.

## Sem Push por padrão

Permanecem somente in-app + badge:

- novo seguidor profissional;
- recusas sociais;
- cancelamento de solicitação pelo próprio solicitante;
- participante saindo;
- encerramentos administrativos;
- reabertura/arquivamento;
- conexão profissional recusada, cancelada ou encerrada.

## Perfil Clubber

Tribos, caronas e encontros pertencem ao contexto cultural/social Clubber.

Os novos textos usam explicitamente `Perfil Clubber`.

## Perfil Profissional

Follow e conexão profissional usam explicitamente `Perfil Profissional`.

Quando o contexto já fornece `actor_label`, o texto passa a citar a pessoa em vez de usar apenas "uma pessoa".

## Anti-spam

- ações feitas pelo próprio usuário não devem gerar confirmação redundante;
- eventos repetitivos devem ser agrupados quando possível;
- Push deve ser reservado para ação necessária ou informação operacional relevante;
- follow social de baixo risco permanece sem Push nesta etapa.

## NFC futuro

O simples toque NFC não notifica.

Quando uma troca offline for sincronizada e exigir confirmação, a futura notificação deverá conter:

- identidade usada: Clubber ou Profissional;
- pessoa encontrada;
- evento, quando conhecido;
- ação direta para confirmar a relação.

Exemplo:

`Perfil Clubber · Vocês se conheceram no Tomorrowland Brasil`

`Você trocou contato com Ana durante o evento. Quer confirmar a amizade no Perfil Clubber?`

## Fora do escopo desta etapa

Esta migration NÃO cria:

- grafo de seguidores Clubber;
- solicitações de follow Clubber;
- comunicação operacional de carona/encontro;
- mudança de horário/local;
- notificações de check-in;
- handshakes NFC;
- scheduler;
- chamada automática do dispatcher;
- qualquer dado de teste.