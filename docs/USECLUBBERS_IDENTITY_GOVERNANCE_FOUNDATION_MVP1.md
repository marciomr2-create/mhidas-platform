# USECLUBBERS — MVP-1 Identity & Governance Foundation

Status: DESIGN CONGELADO PARA IMPLEMENTACAO
Date: 2026-09-04
Scope: Conta USECLUBBERS universal, Identidade Clubber, Universos oficiais e Verification & Governance.

## 1. Principio central

A Conta USECLUBBERS representa quem acessa o sistema.

Ela nao e, por si so, uma identidade publica.

Uma conta pode:
- possuir uma Identidade Clubber;
- administrar um Universo Artista;
- administrar um Universo Club;
- administrar um Universo Festival;
- administrar uma Organizacao;
- participar de equipes de administracao de mais de uma entidade.

## 2. Entrada no cadastro

A tela de cadastro deve perguntar:

"Como voce faz parte da cena?"

Opcoes:
- Clubber
- Artista / DJ / Projeto musical
- Club / Venue
- Festival
- Organizacao / Parceiro

A escolha e um INTENTO DE ENTRADA, nao uma permissao e nao uma verificacao.

Para Artista, Club, Festival e Organizacao:
- exibir que perfis oficiais passam por verificacao;
- recomendar e-mail profissional vinculado ao dominio oficial, quando existir;
- explicar que e-mail corporativo pode agilizar a analise, mas nao substitui verificacao;
- oferecer "Criar" e "Reivindicar perfil existente".

## 3. E-mail e verificacao

E-mail confirmado:
- prova apenas o controle daquele endereco de e-mail.

Perfil verificado:
- confirma a relacao legitima entre a conta/equipe e a identidade oficial.

Mensagens de verificacao:
- fonte da verdade: Central de Verificacao dentro da Conta USECLUBBERS;
- avisos importantes: e-mails oficiais USECLUBBERS;
- documentos sensiveis nunca devem ser solicitados por e-mail pessoal, rede social ou canal nao oficial.

## 4. Tipos oficiais

entity_type:
- artist
- club
- festival
- organization

organization_type:
- producer
- promoter
- agency
- ticketing
- brand
- partner
- other

"Parceiro" e uma relacao comercial/status de uma organizacao, nao uma identidade separada.

## 5. Namespace publico universal

O @ deve ser unico em toda a plataforma.

Nao pode haver o mesmo @ em:
- Identidade Clubber;
- Artista;
- Club;
- Festival;
- Organizacao.

A arquitetura deve introduzir um registro central de handles publicos, sem destruir a compatibilidade atual de cards.slug e card_slug_history.

## 6. Entidades e equipes

official_entities:
- entity_id
- entity_type
- organization_type
- display_name
- public_handle
- lifecycle_status
- verification_status
- created_by_user_id
- created_at
- updated_at

entity_memberships:
- entity_id
- user_id
- role
- status
- invited_by_user_id
- created_at
- updated_at

Roles:
- owner
- admin
- editor
- communications
- event_manager
- viewer

## 7. Verification & Governance

entity_verification_requests:
- request_id
- request_kind: create | claim
- requester_user_id
- entity_id opcional
- requested_entity_type
- requested_organization_type
- requested_display_name
- requested_handle
- source_catalog_kind opcional
- source_catalog_key opcional
- contact_email
- professional_email_domain
- email_signal_status
- status
- submitted_at
- reviewed_by_user_id
- reviewed_at
- decision_reason
- created_at
- updated_at

Estados:
- draft
- submitted
- in_review
- more_info_required
- approved
- rejected
- withdrawn
- suspended
- revoked

## 8. Evidencias

entity_verification_evidence:
- request_id
- evidence_type
- value_text ou URL
- review_status
- metadata segura
- timestamps

Tipos iniciais:
- official_website
- professional_email
- domain_ownership
- instagram
- spotify
- youtube
- booking_agency
- business_registry
- representative_authorization
- other

## 9. Documentos privados

entity_verification_documents:
- request_id
- document_type
- storage_bucket
- storage_object_path
- original_filename
- mime_type
- file_size_bytes
- sha256
- uploaded_by_user_id
- review_status
- timestamps

Regra:
- o arquivo nao fica na tabela;
- somente metadata e caminho;
- bucket privado;
- sem URL publica permanente;
- upload/download por rota server-side e URL assinada temporaria;
- acesso apenas ao solicitante autorizado e equipe de verificacao.

## 10. Administracao interna

O adaptador atual mhidas_is_useclubbers_admin_v1() e fail-closed e retorna false.

Portanto a verificacao precisa de autoridade real separada:

platform_admin_memberships:
- user_id
- role
- status
- granted_by_user_id
- created_at
- revoked_at

Roles iniciais:
- verification_reviewer
- verification_admin
- platform_admin

Nenhum cliente autenticado pode conceder a si mesmo esses papeis.

## 11. Auditoria

entity_verification_audit_log:
- audit_id
- request_id
- entity_id opcional
- actor_user_id opcional
- actor_kind
- action
- previous_status
- new_status
- reason
- metadata segura
- created_at

O log deve ser append-only e controlado no servidor.

## 12. Notificacoes

Reutilizar o sistema unificado existente.

Tipos previstos:
- entity_verification.submitted
- entity_verification.in_review
- entity_verification.more_info_required
- entity_verification.approved
- entity_verification.rejected
- entity_verification.suspended
- entity_verification.revoked

A fundacao atual possui canais:
- in_app
- push
- badge
- digest

Ela NAO possui canal email.

Portanto e-mail oficial de verificacao deve nascer como camada transacional separada, com outbox/auditoria e dispatcher server-side, ate que email seja incorporado formalmente ao delivery ledger.

## 13. E-mail transacional

verification_email_outbox:
- email_id
- request_id
- recipient_user_id
- template_key
- recipient_email
- status
- idempotency_key
- available_at
- sent_at
- failed_at
- provider_message_id
- last_error_code
- created_at
- updated_at

Nunca armazenar senha, token de login ou documento no payload de e-mail.

## 14. Claim

Fluxo:
Conta USECLUBBERS
-> localizar entidade existente
-> "Reivindicar este perfil"
-> abrir verification_request request_kind=claim
-> enviar evidencias/documentos
-> revisao
-> aprovacao
-> criar membership owner/admin
-> entidade passa a ser administravel
-> se elegivel, recebe status verificado

## 15. Criacao

Fluxo:
Conta USECLUBBERS
-> escolher Artista / Club / Festival / Organizacao
-> criar verification_request request_kind=create
-> verificar duplicidade antes de criar entidade oficial
-> enviar evidencias/documentos
-> revisao
-> aprovacao
-> criar entidade oficial
-> criar membership
-> reservar @ universal
-> publicar somente conforme regras do Universo

## 16. Relacao com Clubber

Identidade Clubber continua pessoal.

Entidades oficiais nao fazem amizade.

- Clubber <-> Clubber: conexoes sociais
- Clubber -> Artista/Club/Festival/Organizacao: seguir, acompanhar, participar ou relacionar-se por contexto
- uma pessoa pode ser Clubber e tambem administrar entidades oficiais

## 17. Ordem de implementacao

R8A — schema foundation local, sem aplicar banco
R8B — revisao de migration e RLS
R8C — aplicar somente em STAGING
R8D — cadastro universal + escolha de entrada
R8E — email confirmation UX + corporate email guidance
R8F — account start router
R8G — Central de Verificacao do solicitante
R8H — rotas server-side de documentos privados
R8I — painel interno de verificacao
R8J — notificacoes + email outbox
R8K — claim/create end-to-end
R8L — testes reais em STAGING

Production somente apos aprovacao explicita.
