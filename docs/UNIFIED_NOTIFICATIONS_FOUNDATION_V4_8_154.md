# MHIDAS / USECLUBBERS — Fundação Unificada de Notificações

## Versão candidata

- Versão: `v4.8.154-unified-notifications-foundation-safe`
- Base obrigatória: `v4.8.153-dashboard-notifications-hardening-safe`
- Commit-base: `abff6f7c1eb7532703c9468b29633bbcc09b2951`
- Migration: `supabase/migrations/20260806125000_unified_notifications_foundation.sql`

## Objetivo

Criar a fundação transversal da plataforma de notificações sem substituir a central atual e sem ativar push.

A migration adiciona:

1. Registro governado de tipos de notificação.
2. Prioridades `critical`, `transactional`, `social` e `discovery`.
3. Canais `in_app`, `push`, `badge` e `digest` como contrato arquitetural.
4. Eventos de domínio únicos.
5. Destinatários por evento.
6. Ledger de entregas por canal.
7. Espelhamento transacional dos geradores atuais.
8. Backfill dos registros históricos existentes.
9. Idempotência e detecção de colisão.
10. Expiração, cancelamento e invalidação compatíveis.
11. RLS fechado e ACL sem acesso direto para `anon` ou `authenticated`.
12. Self-check estrutural, de segurança e de paridade.

## Compatibilidade preservada

A migration não altera o contrato público de:

- `public.social_notifications`;
- `public.mhidas_create_social_notification(...)`;
- `public.mhidas_set_social_notifications_state_by_source(...)`;
- `/api/notifications`;
- `DashboardNotificationsPanel.tsx`;
- geradores de tribos, caronas, encontros, follows e conexões.

Os geradores continuam escrevendo em `social_notifications`. Um trigger interno espelha cada inclusão, atualização ou remoção para a fundação unificada na mesma transação.

## Tipos registrados nesta versão

A migration registra os 32 tipos atualmente existentes:

- 12 de tribos;
- 7 de caronas;
- 7 de encontros;
- 6 de follows e conexões profissionais.

Todos permanecem com os canais efetivos `in_app` e `badge`. O enum contém `push`, mas nenhuma entrega push é criada nesta versão.

## Estruturas criadas

- `public.notification_type_registry`
- `public.notification_events`
- `public.notification_recipients`
- `public.notification_deliveries`

## Explicitamente fora do escopo

- PWA;
- manifest;
- Service Worker;
- VAPID;
- `push_subscriptions`;
- preferências e consentimento;
- horários silenciosos;
- fila e worker;
- tentativas externas;
- Web Push real;
- Firebase;
- OneSignal;
- Serwist;
- Workbox;
- Realtime;
- acesso a database, staging ou production durante a instalação local.

## Regras de segurança

- Tabelas novas com RLS habilitado e sem policies públicas.
- Nenhum privilégio direto para `anon` ou `authenticated`.
- Funções internas sem `EXECUTE` para clientes e sem exposição para `service_role` quando não necessário.
- Payload continua usando a allowlist da fundação V4.8.147.
- URLs continuam internas.
- Tipos desconhecidos falham de forma fechada.
- Colisão de chave de evento interrompe a transação.
- Auto-notificação continua proibida pela origem atual e é verificada no self-check.

## Aplicação

A instalação local adiciona somente os dois arquivos do pacote. Ela não aplica a migration em nenhum banco.

A aplicação em staging exigirá uma macroetapa separada, autorização explícita, projeto exato e testes isolados. Produção permanece proibida.
