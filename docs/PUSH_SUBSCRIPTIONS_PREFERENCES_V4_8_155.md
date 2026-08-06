# V4.8.155 — Push subscriptions e preferências

## Objetivo

Adicionar a fundação segura para que um usuário autenticado possa preparar um navegador ou dispositivo para Web Push, com consentimento explícito e sem alterar o funcionamento atual da Central de Notificações.

## Escopo entregue

- `public.notification_preferences`
  - preferência global `push_enabled`, desativada por padrão;
  - campos governados para horários silenciosos e categorias futuras;
  - acesso direto bloqueado para `anon` e `authenticated`.

- `public.notification_push_subscriptions`
  - uma assinatura por endpoint de navegador/dispositivo;
  - suporte a múltiplos dispositivos por usuário;
  - estado `active`, `revoked`, `invalidated` ou `expired`;
  - armazenamento de `endpoint`, `p256dh`, segredo `auth`, expiração, user agent e fingerprint da chave pública VAPID;
  - a chave privada VAPID nunca é armazenada nessa tabela.

- RPCs autenticadas
  - `mhidas_get_notification_push_settings(text)`;
  - `mhidas_upsert_notification_push_subscription(text,text,text,bigint,text,text)`;
  - `mhidas_revoke_notification_push_subscription(text)`.

- API
  - `GET /api/notifications/push` — configuração pública segura e preferência;
  - `POST /api/notifications/push` — consulta de endpoint ou registro/renovação;
  - `DELETE /api/notifications/push` — revogação do dispositivo atual.

- Navegador
  - `public/mhidas-push-sw.js` dedicado a `push`, `notificationclick` e `pushsubscriptionchange`;
  - sem interceptação de `fetch`, cache offline ou alteração de navegação;
  - `src/app/manifest.ts` com identidade PWA básica;
  - controle “Notificações no celular” dentro da Central de Notificações.

## Segurança

- consentimento solicitado apenas após ação direta do usuário;
- autenticação confirmada no servidor com `supabase.auth.getUser()`;
- tabelas sem políticas de acesso direto e com privilégios removidos de `anon` e `authenticated`;
- operações do cliente somente por RPCs `security definer` com `auth.uid()` obrigatório;
- endpoint limitado a HTTPS e validado no cliente, API e banco;
- chaves da assinatura validadas como Base64URL;
- troca de usuário no mesmo navegador transfere o endpoint somente após nova ativação explícita;
- a preferência do usuário anterior é recalculada quando um endpoint muda de conta;
- nenhuma chave privada, `service_role` ou segredo é exposto ao navegador.

## Variável necessária

```text
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=<chave pública VAPID Base64URL>
```

A aplicação continua compilando quando essa variável não existe. Nesse caso, a interface informa que o ambiente ainda não está configurado e não permite criar subscriptions.

Variáveis reservadas para a próxima versão, ainda não utilizadas:

```text
WEB_PUSH_VAPID_PRIVATE_KEY=<segredo somente no servidor>
WEB_PUSH_VAPID_SUBJECT=mailto:<contato técnico válido>
```

## Exclusões deliberadas

A V4.8.155 não:

- envia notificações reais;
- adiciona `push` aos 32 tipos atuais;
- cria entregas `push` em `notification_deliveries`;
- implementa dispatcher, fila, tentativas ou retries;
- usa a chave privada VAPID;
- altera middleware, autenticação, SSR ou rotas públicas existentes;
- acessa staging ou produção durante a instalação local.

## Compatibilidade com V4.8.154

- `social_notifications` permanece como contrato da Central atual;
- `notification_type_registry`, `notification_events`, `notification_recipients` e `notification_deliveries` permanecem intactas;
- os 32 tipos continuam somente com `in_app` e `badge`;
- nenhuma entrega `push` é criada nesta versão.

## Próxima versão

A V4.8.156 deverá implementar:

- dependência de envio Web Push no servidor;
- uso seguro da chave privada VAPID;
- criação governada das entregas `push`;
- dispatcher com claim concorrente, retries e idempotência;
- registro de tentativas e invalidação de endpoints expirados;
- teste controlado exclusivamente no staging antes de qualquer decisão sobre produção.
