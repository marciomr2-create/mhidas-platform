# Clubbers Advanced Profile Baseline

## Versao de referencia

Base estavel atual:

- v4.7.8-club-owner-toolbar-instagram-style-flow
- Commit: 215384d
- Status esperado: working tree clean

## Contexto

O Perfil Clubbers avancado existe e nao deve ser tratado como tela nova ou rascunho.

A experiencia avancada ja contem:

- Hero visual Clubbers
- Foto do perfil Clubbers
- Tagline
- Playlist / streaming
- Artistas de referencia
- Clubes favoritos
- Festivais e festas
- Ultimos eventos
- Proximos eventos
- Conexoes para proximo evento
- Carona colaborativa
- Ponto de encontro
- Ticket social / preparo para evento
- Canais Clubbers
- QR / NFC
- Modo publico
- Modo dono
- Perfil Pro separado

## Card avancado de referencia

Card visualmente avancado:

- Label: Teste 2
- Slug: slug-teste-unico-2026-b
- Card ID: df538c7f-8a3d-4aba-9c73-07e173aaf970

Observacao importante:

O card avancado esta visualmente preenchido, mas atualmente os controles de dono nao aparecem para o usuario logado correto porque os dados estao associados a um user_id antigo/especifico.

## Usuario logado correto de referencia

Usuario usado pelo card com toolbar de dono funcionando:

- Card: Primeiro Card Teste
- Slug: meu-slug-teste-123-premium
- User ID: 09f5c5a3-793c-4b86-abc4-39605dc02048

## Problema identificado

O card avancado Teste 2 possui dados Clubbers importantes ligados ao user_id atual do proprio card avancado.

Nao migrar nem alterar ownership sem planejamento, porque mudar apenas cards.user_id pode fazer os controles aparecerem, mas tambem pode quebrar a leitura de dados associados, como:

- club_profiles
- club_profile_artists
- social_links
- professional_profiles
- dados visuais e de evento

## Backup privado criado

Antes de qualquer correcao de owner/user_id, foi criado backup local privado em:

backups/clubbers-data-v4.7.8-before-owner-fix/

Arquivos:

- clubbers-data-backup.json
- README.txt

Esse backup contem dados sensiveis e nao deve ser publicado no GitHub.

## Regra de protecao

Antes de qualquer alteracao futura no Perfil Clubbers avancado:

1. Confirmar `git status --short` limpo.
2. Abrir URL real no navegador.
3. Validar visualmente o estado atual.
4. Fazer backup antes de mexer em banco ou dados.
5. Alterar apenas um ponto por vez.
6. Rodar build.
7. Reabrir as URLs reais.
8. Validar com print.
9. Fazer commit/tag somente apos validacao.

## URLs locais de validacao

Card avancado:

- http://localhost:3000/slug-teste-unico-2026-b?mode=club
- http://localhost:3000/slug-teste-unico-2026-b?mode=club&view=public
- http://localhost:3000/api/qr/slug-teste-unico-2026-b?mode=club
- http://localhost:3000/pro/slug-teste-unico-2026-b

Card com dono atual reconhecido:

- http://localhost:3000/meu-slug-teste-123-premium?mode=club
- http://localhost:3000/meu-slug-teste-123-premium?mode=club&view=public
- http://localhost:3000/api/qr/meu-slug-teste-123-premium?mode=club
- http://localhost:3000/pro/meu-slug-teste-123-premium

## Decisao tecnica

Nao corrigir o ownership do card avancado diretamente sem antes escolher entre:

- permissao temporaria controlada para editar o card avancado;
- migracao completa e planejada dos dados para o user_id correto;
- criacao de novo card oficial preenchido a partir do baseline validado.

A escolha deve preservar os dados ja validados.
