# V4.8.165-B — Grafo Social Clubber Independente

## Objetivo

Separar definitivamente o domínio social do Perfil Clubber do domínio do Perfil Profissional.

Um mesmo `user_id` pode possuir as duas identidades, mas as relações sociais não são compartilhadas.

## Perfil Clubber

A fundação possui três estruturas próprias:

### `clubber_follows`

Relação unilateral.

Exemplo:

- Ana segue Carlos.
- Carlos não precisa seguir Ana.

Essa estrutura suportará a futura notificação:

`Perfil Clubber · Novo seguidor`

Unfollow permanece silencioso por padrão.

### `clubber_connections`

Relação bilateral com ciclo:

- `pending`
- `accepted`
- `declined`
- `cancelled`

Essa relação representa amizade/conexão social no Perfil Clubber.

Ela é diferente de `professional_connections`.

### `clubber_relationship_controls`

Controles próprios do Perfil Clubber:

- `blocked`
- `suspended`

Nenhum controle profissional é reutilizado.

## Regra de isolamento

É proibido usar para o Perfil Clubber:

- `professional_follows`
- `professional_connections`
- `professional_relationship_controls`

Da mesma forma, o Perfil Profissional não deverá consultar as tabelas Clubber.

## Regra de conexão

Uma solicitação Clubber somente pode ser criada quando:

- o usuário alvo possui Perfil Clubber;
- existe card ativo e publicado;
- `open_to_networking` está ativo;
- não existe bloqueio ou suspensão entre as partes.

## Integridade do ciclo

Apenas o destinatário pode:

- aceitar;
- recusar.

Apenas o solicitante pode:

- cancelar uma solicitação pendente.

Depois de aceita, qualquer uma das duas pessoas pode encerrar a conexão.

Estados finais permanecem como histórico e uma futura nova solicitação é permitida.

## NFC futuro

O handshake NFC deverá criar ou propor relação exclusivamente no grafo correspondente ao modo utilizado.

Exemplo:

- NFC em modo Clubber → `clubber_connections`;
- NFC em modo Profissional → `professional_connections`.

Nunca converter uma relação de um modo automaticamente para o outro.

## Notificações

Esta etapa B1 ainda não cria produtores.

A próxima etapa deverá criar tipos próprios como:

- `clubber_follow.created`
- `clubber_connection.requested`
- `clubber_connection.accepted`
- `clubber_connection.declined`
- `clubber_connection.cancelled`
- `clubber_connection.ended`

Todos deverão apresentar explicitamente `Perfil Clubber`.

## UI/API

A UI atual de `/clubbers` ainda será desacoplada em etapa posterior.

Ela deverá deixar de chamar `/api/network/connections` e passar a usar uma rota exclusivamente Clubber.

## Fora do escopo desta etapa

B1 não:

- acessa banco;
- aplica migration;
- altera Produção;
- altera Staging;
- modifica `professional_connections`;
- modifica `professional_follows`;
- modifica UI;
- modifica API;
- envia Push;
- cria notificação de teste.