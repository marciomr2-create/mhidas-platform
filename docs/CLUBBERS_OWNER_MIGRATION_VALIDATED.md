# Clubbers Owner Migration Validated

## Versao base antes da migracao

- v4.7.9-clubbers-advanced-profile-baseline-doc
- Commit base: 84afaf0
- Repositorio estava limpo antes da migracao.

## Objetivo

Recuperar o acesso de dono ao Perfil Clubbers avancado sem apagar dados ja validados.

Card avancado validado:

- Label: Teste 2
- Slug: slug-teste-unico-2026-b
- Card ID: df538c7f-8a3d-4aba-9c73-07e173aaf970

## Backups privados criados antes

Foram criados backups locais privados antes da alteracao de dados:

- backups/clubbers-data-v4.7.8-before-owner-fix/
- backups/clubbers-data-v4.7.9-before-owner-migration/

Esses backups contem dados sensiveis e nao devem ser publicados no GitHub.

## Dry-run

Antes da migracao, foi executado dry-run somente leitura.

Resultado:

- Card avancado existia uma vez.
- Card avancado mantinha o slug esperado.
- Card avancado ainda estava no user antigo.
- Card simples existia uma vez.
- Card simples estava no usuario correto.
- club_profiles antigo tinha 1 perfil avancado.
- club_profiles correto tinha 0.
- club_profile_artists antigo tinha 12 artistas.
- club_profile_artists correto tinha 0.
- social_links Club/Both antigos no card simples tinham 3 registros.
- social_links Pro corretos no card simples tinham 2 registros.
- check-ins antigos no card simples tinham 5 registros.
- check-ins corretos tinham 0.
- check-ins do card avancado tinham 0.

Resultado do dry-run:

- Seguro para preparar e executar a migracao.

## Migracao executada

A migracao foi executada no Supabase SQL Editor uma unica vez.

O SQL executado fez:

1. Transferiu ownership do card avancado para o usuario correto.
2. Migrou o Club Profile avancado para o usuario correto.
3. Migrou 12 artistas Clubbers para o usuario correto.
4. Migrou 3 links Club/Both antigos para o card avancado.
5. Migrou 5 check-ins antigos para o card avancado.
6. Preservou links Pro do card simples.
7. Nao apagou professional_profiles.

## Validacao pos-migracao

Validacao somente leitura confirmou:

- Card avancado continua existindo.
- Card avancado manteve o slug.
- Card avancado agora pertence ao usuario correto.
- Card simples continua existindo.
- Card simples continua no usuario correto.
- club_profiles antigo ficou 0.
- club_profiles correto ficou 1.
- artistas antigos ficaram 0.
- artistas corretos ficaram 12.
- links Club/Both foram para o card avancado.
- links Club/Both antigos sairam do card simples.
- links Pro do card simples foram preservados.
- check-ins foram para o card avancado.
- check-ins antigos sairam do card simples.
- professional_profiles antigo nao foi apagado.
- professional_profiles correto nao foi apagado.

Resultado:

- MIGRACAO VALIDADA COM SUCESSO.

## Validacao visual

Validado visualmente em localhost:

Card avancado como dono:

- URL: http://localhost:3000/slug-teste-unico-2026-b?mode=club
- Toolbar de dono apareceu.
- Botoes de dono apareceram.
- Conteudo avancado permaneceu preenchido.

Card avancado publico:

- URL: http://localhost:3000/slug-teste-unico-2026-b?mode=club&view=public
- Toolbar de dono nao apareceu.
- Conteudo avancado permaneceu preenchido.

QR / NFC:

- URL: http://localhost:3000/api/qr/slug-teste-unico-2026-b?mode=club
- QR abriu corretamente.

## Observacao arquitetural

O Club Profile atual ainda e lido por user_id, nao por card_id.

Consequencia:

- Se o mesmo usuario tiver mais de um card Clubbers, os cards podem exibir o mesmo conteudo Clubbers.
- Isso nao invalida a migracao.
- Se o produto precisar de varios perfis Clubbers diferentes para o mesmo usuario, sera necessario evoluir a modelagem para associar club_profiles e dados relacionados a card_id.

## Estado final

- Card avancado Teste 2 voltou a ser editavel pela conta correta.
- Dados avancados foram preservados.
- QR funciona.
- Modo publico funciona sem toolbar.
- Links Pro do card simples foram preservados.
- Nenhuma alteracao de codigo funcional foi feita nesta migracao.
