# Auditoria Patrimonial da Rota de Evento

## Base estável auditada

- Versão: `v4.8.1-clubbers-simple-test-card-unpublished`
- Commit: `22b1403`
- Rota dinâmica: `/event/[event_slug]`
- Evento validado: `/event/ame-club`
- Data da validação: 19/06/2026

## Objetivo

Registrar e proteger o núcleo de eventos já construído no USECLUBBERS.

Esta auditoria foi realizada somente em modo leitura, sem alteração de código, banco, autenticação, middleware, SSR ou estrutura do Supabase.

## Estrutura física preservada

A rota contém cinco arquivos principais, totalizando aproximadamente 5.305 linhas de código.

### `src/app/event/[event_slug]/page.tsx`

- Linhas: 1.410
- Tamanho: 43.269 bytes
- SHA-256: `7D0A28CA7C0FEC508365E26CEBF30B1E42EB936A3E493534E9889C6D4C8D7D53`

Responsabilidades: carregamento do evento, participantes reais, check-ins, perfis Clubbers, tribos dominantes, caronas, encontros, clima, preparação, URL oficial e composição da página pública.

### `src/app/event/[event_slug]/EventParticipantsFilter.tsx`

- Linhas: 2.707
- Tamanho: 78.191 bytes
- SHA-256: `325DF96B68FA0461B1829C74C9C5A40287396038A3415F6BD06320BA4C70F315`

Responsabilidades: radar social, filtros, clubbers próximos, conexões quentes, tribos em destaque, cálculo de afinidade, solicitação de conexão e participantes reais/demonstrativos.

Este arquivo é sensível e não deve ser substituído integralmente sem auditoria específica.

### `src/app/event/[event_slug]/RideMeetCards.tsx`

- Linhas: 589
- Tamanho: 15.632 bytes
- SHA-256: `1ED48C8485F8D6B8C97197AC47FCDECD4C85BEA8E18C94BC792880F8977D22F8`

Responsabilidades: carona compartilhada, oferta e procura, vagas, origem, destino, encontros combinados, ponto, horário e links para o Perfil Clubbers.

### `src/app/event/[event_slug]/TicketIntentButton.tsx`

- Linhas: 302
- Tamanho: 8.396 bytes
- SHA-256: `6526A36E015AC67ADE12E91EAB40F372ACE092887D18F590DB1C089D5ADF4116`

Responsabilidades: consulta e persistência da intenção de ingresso.

### `src/app/event/[event_slug]/ticket-intent-preview/page.tsx`

- Linhas: 297
- Tamanho: 9.193 bytes
- SHA-256: `C0F79B45D3E58598244865351D16D1AA22FFDCF41B9651628C88DD5BEE1A15CC`

Responsabilidades: pré-visualização interna do fluxo de ingresso e bloqueio explícito em produção.

## Fontes reais de dados

A página consulta:

- `cards`;
- `club_event_checkins`;
- `club_profiles`;
- `event_groups`.

## Formação dos participantes reais

Um usuário pode entrar no evento quando existe check-in ativo, evento em próximos eventos, carona vinculada ou encontro vinculado.

Somente cards ativos e publicados participam da composição pública.

## Evento principal

O conteúdo principal vem de `event_groups`: nome, slug, título, descrição, imagem, data, cidade, clima, preparação, URL oficial, status oficial, confiança e fonte oficial.

## Carona compartilhada

Campos de `club_profiles`:

- `ride_status`;
- `ride_event_name`;
- `ride_event_url`;
- `ride_origin`;
- `ride_destination`;
- `ride_seats`;
- `ride_notes`.

Estados: `offer`, `need`, `both`.

## Encontros combinados

Campos de `club_profiles`:

- `meet_status`;
- `meet_event_name`;
- `meet_event_url`;
- `meet_meeting_point`;
- `meet_time`;
- `meet_notes`.

Estados: `host`, `join`, `both`.

## Intenção de ingresso

Integrações:

- `GET /api/event-ticket-intents`;
- `POST /api/event-ticket-intents`.

Estados:

- `interested`;
- `wants_ticket`;
- `ticket_acquired`;
- `cancelled`;
- `checked_in`.

## Conexões do radar

Integrações:

- `GET /api/network/connections/status`;
- `POST /api/network/connections`.

## Tribos

As tribos são calculadas a partir dos gêneros favoritos. Grupos reconhecidos:

- Hard Techno Tribe;
- Techno Tribe;
- Progressive Family;
- Melodic Society;
- House Lovers;
- Deep House Circle;
- Festival Crew.

## Afinidade social

A pontuação considera mesmo evento, cidade, estado, região, tribo, gêneros compartilhados e compatibilidade existente.

Classificações:

- Conexão muito quente;
- Boa afinidade;
- Afinidade inicial.

## Sandbox social

Achado importante:

```ts
const DEV_SOCIAL_SANDBOX = true;
```

A composição atual é:

```text
participantes reais + MOCK_PARTICIPANTS
```

Não existe variável correspondente em `.env.local`.

Os mocks devem ser preservados como camada de desenvolvimento e apresentação. Futuramente o sandbox deverá ser controlado por ambiente ou preview.

## Blocos visuais preservados

- hero do evento;
- intenção de ingresso;
- antes de sair de casa;
- tribos dominantes;
- quem vai para este evento;
- clubbers próximos;
- conexões quentes;
- tribos em destaque;
- filtros sociais;
- radar de participantes;
- carona compartilhada;
- encontros combinados.

## Validação de execução

### Localhost

```text
http://localhost:3000/event/ame-club
```

Resultado:

```text
HTTP/1.1 200 OK
Cache-Control: no-store, must-revalidate
```

### Produção

```text
https://mhidas-platform.vercel.app/event/ame-club
```

A página continuou renderizando os principais blocos.

## Dados reais validados visualmente

O perfil real `Teste 2` foi exibido em carona e encontro.

### Carona

- cidade: Balneário Camboriú - SC;
- vagas: 2;
- origem: São Caetano do Sul;
- destino: ame club;
- status ativo.

### Encontro

- evento: ame club;
- ponto: entrada principal;
- horário: 23:30;
- status ativo.

## Classificação patrimonial

- Página dinâmica: real e integrada.
- Participantes: reais com sandbox demonstrativo adicional.
- Check-in: real e integrado.
- Tribos: calculadas pelo aplicativo.
- Afinidade: calculada pelo aplicativo.
- Network: real e integrado.
- Carona: real e integrada.
- Encontros: reais e integrados.
- Intenção de ingresso: real e persistente.
- Preview de ingresso: ferramenta interna protegida.
- Sandbox: demonstrativo e atualmente sempre ligado.

## Regras de preservação

Não realizar sem auditoria específica:

- reconstrução integral da página;
- substituição total de `EventParticipantsFilter.tsx`;
- exclusão de mocks;
- remoção de `RideMeetCards.tsx`;
- remoção do preview de ingresso;
- alteração das tabelas relacionadas;
- mudança de SSR, middleware ou autenticação;
- simplificação visual que remova funções existentes.

Toda evolução futura deverá ser mínima, reversível, validada por build e protegida por commit e tag.
