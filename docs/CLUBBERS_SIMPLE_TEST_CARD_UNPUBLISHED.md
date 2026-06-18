# Clubbers Simple Test Card Unpublished

## Contexto

Após a migração validada em `v4.8.0-clubbers-owner-migration-validated`, foi identificado que o card simples de teste continuava publicado.

Como o Club Profile atual ainda é lido por `user_id`, o card simples podia exibir o mesmo conteúdo Clubbers avançado do card principal do usuário.

## Card preservado como oficial/avançado

- Label: Teste 2
- Slug: slug-teste-unico-2026-b
- Card ID: df538c7f-8a3d-4aba-9c73-07e173aaf970
- Status final: active
- Publicação final: is_published = true

## Card simples despublicado

- Label: Primeiro Card Teste
- Slug: meu-slug-teste-123-premium
- Card ID: 18a6ed43-66fc-48de-825d-b2bb63d70fe6
- Status preservado: active
- Publicação final: is_published = false

## O que foi alterado

Somente o campo `is_published` do card simples foi alterado para `false`.

Não foram alterados:

- status
- slug
- user_id
- dados do card avançado
- club_profiles
- club_profile_artists
- social_links
- club_event_checkins
- professional_profiles

## Motivo técnico

A rota pública `/[slug]` abre cards publicados por `slug` e `is_published = true`.

Ao despublicar o card simples, ele deixa de aparecer publicamente, mas continua preservado no banco como registro histórico/de teste.

## Validação realizada

Validação via curl em localhost:

Card avançado:

- URL: http://localhost:3000/slug-teste-unico-2026-b?mode=club
- Resultado: HTTP/1.1 200 OK

Card simples:

- URL: http://localhost:3000/meu-slug-teste-123-premium?mode=club
- Resultado: HTTP/1.1 404 Not Found

Validação visual:

- Card simples abriu página 404.
- Card avançado continuou público e funcional.

## Estado final

- Card avançado permanece como Perfil Clubbers oficial validado.
- Card simples de teste foi retirado do público sem exclusão.
- Nenhum código funcional foi alterado.
