# V4.8.165-B4 — Notificações Sociais do Perfil Clubber

## Objetivo

Criar produtores de notificações exclusivos do Perfil Clubber.

Nenhum evento desta camada usa:

- `professional_follows`
- `professional_connections`
- `professional_relationship_controls`

## Tipos

### `clubber_follow.created`

Canal:

- in-app
- badge

Push não é padrão.

Unfollow não gera nova notificação.

---

### `clubber_connection.requested`

Canal:

- in-app
- badge
- push

Motivo: existe ação pendente do destinatário.

---

### `clubber_connection.accepted`

Canal:

- in-app
- badge
- push

Motivo: encerra uma solicitação pendente e cria uma relação social útil.

---

### `clubber_connection.declined`

Canal:

- in-app
- badge

Sem Push por política anti-ruído.

---

### `clubber_connection.cancelled`

Canal:

- in-app
- badge

Sem Push por política anti-ruído.

---

### `clubber_connection.ended`

Canal:

- in-app
- badge

Sem Push por política anti-ruído.

## Identidade

Todos os payloads gerados por esta camada incluem:

`profile_mode = clubber`

O texto visível também identifica explicitamente:

`Perfil Clubber`

## Deep link

As notificações sociais apontam para o Perfil Clubber da pessoa que executou a ação:

`/[slug]?mode=club`

## Isolamento

Bloqueios e suspensões são avaliados exclusivamente no domínio correspondente ao `profile_mode`.

Uma relação ou bloqueio do Perfil Profissional não deve alterar o comportamento social do Perfil Clubber.

## Idempotência

As chaves são vinculadas ao ID da relação:

- `clubber_follow:<id>:created`
- `clubber_connection:<id>:requested`
- `clubber_connection:<id>:accepted`
- `clubber_connection:<id>:declined`
- `clubber_connection:<id>:cancelled`
- `clubber_connection:<id>:ended`

## Próxima etapa

Depois da validação dos produtores, a UI e API de `/clubbers` devem deixar de reutilizar `/api/network/connections` e `professional_connections`.

Isso será feito somente após a camada de dados e notificações estar validada.