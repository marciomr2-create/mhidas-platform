# V4.8.156 — Dispatcher, tentativas e envio push controlado

Base obrigatória: `v4.8.155-push-subscriptions-preferences-safe`

## Objetivo

Adicionar o backend de entrega Web Push sem scheduler automático e sem alterar os canais padrão do registry.

## Componentes

- `notification_push_jobs`: um job idempotente por `notification_deliveries.delivery_id`.
- `notification_push_attempts`: uma tentativa sanitizada por job, subscription e ciclo de tentativa.
- claim concorrente com `FOR UPDATE SKIP LOCKED`.
- recuperação de lock stale.
- retry bounded com backoff.
- dispatcher Node.js server-only com `web-push`.
- rota interna protegida por `PUSH_DISPATCHER_SECRET`.
- revogação de subscription em HTTP 404/410.
- atualização agregada do ledger `notification_deliveries`.

## Segurança

Nunca são persistidos em `notification_push_attempts`:

- endpoint completo;
- `p256dh`;
- auth secret;
- VAPID private key;
- payload privado.

O dispatcher usa somente variáveis server-side para segredos.

## Variáveis de ambiente

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `PUSH_DISPATCHER_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`VAPID_PRIVATE_KEY`, `PUSH_DISPATCHER_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` nunca devem usar prefixo `NEXT_PUBLIC_`.

## Dependências fixadas pelo instalador

- `web-push@3.6.7`
- `@types/web-push@3.6.4`

## Comportamento deliberadamente ausente

A V4.8.156 não:

- cria scheduler;
- cria cron;
- cria subscription automaticamente;
- cria notification ou delivery de teste na migration;
- altera os 32 `default_channels` existentes;
- acessa produção;
- executa envio durante migration ou instalação.

## Payload desta versão

Para reduzir acoplamento ao schema histórico da central, o transporte envia payload mínimo:

- título: `USECLUBBERS`;
- corpo: `Você tem uma nova notificação.`;
- clique: `/dashboard`.

A central continua sendo a fonte histórica. Uma evolução posterior pode enriquecer o conteúdo por tipo sem alterar o mecanismo de fila/tentativas.

## Teste futuro de staging

Somente após autorização específica:

1. aplicar a migration no projeto de staging autorizado;
2. configurar as variáveis seguras no ambiente de staging;
3. usar um único usuário de teste;
4. confirmar preference e subscription ativas;
5. criar/reutilizar uma notification controlada;
6. criar uma delivery `push` única;
7. enfileirar um único job;
8. executar o dispatcher uma vez;
9. validar tentativa, recebimento, clique e ledger;
10. executar novamente e confirmar ausência de duplicidade.

Produção permanece proibida até autorização explícita e específica.


## Revisão R5

A migration foi alinhada ao schema real do staging: `notification_deliveries.delivery_id`, `notification_deliveries.recipient_id`, `notification_recipients.recipient_id`, `notification_recipients.recipient_user_id` e `notification_push_subscriptions.subscription_id`. Nenhum canal padrão foi alterado e nenhum dado de teste é criado.
