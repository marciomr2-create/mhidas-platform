# Plano físico do schema comercial de ingressos

Versão: `v4.8.86-event-ticket-commercial-schema-plan-safe`

## 1. Objetivo

Este documento converte a governança aprovada na `v4.8.84` e o contrato de persistência publicado na `v4.8.85` em um plano físico de banco de dados.

A versão continua estritamente documental e tipada. Ela não cria migration SQL, não altera o Supabase, não grava dados, não ativa links e não modifica a página pública do evento.

O plano protege a separação entre:

- referência oficial usada para confirmar que o evento existe;
- solicitação comercial enviada por parceiro;
- canal monetizado administrado exclusivamente pelo USECLUBBERS;
- clique de saída;
- compra autodeclarada;
- conversão atribuída ou confirmada;
- comunicação oficial do parceiro;
- projeção pública segura.

## 2. Resultado do planejamento

O primeiro schema físico deverá possuir:

- uma extensão aditiva da tabela existente `canonical_event_sources`;
- seis tabelas comerciais novas;
- uma projeção lógica produzida por rota de servidor;
- nenhum objeto público de banco na primeira implantação.

### 2.1 Extensão existente

`canonical_event_sources`

A tabela continuará sendo a fonte de verdade da procedência oficial. Não será criada outra tabela para duplicar URL, provider, identificador externo ou autoridade.

Serão planejados campos adicionais para:

- status da referência;
- domínio normalizado;
- confiança;
- indicação de descoberta automática;
- data e ator da validação;
- controle de atualização.

A identidade idempotente continuará sendo a restrição já existente:

`unique (canonical_event_id, source_key)`

O plano não adiciona uma segunda coluna de idempotência para a mesma finalidade.

### 2.2 Tabelas novas

1. `event_ticket_partnership_requests`
2. `event_ticket_commercial_channels`
3. `event_ticket_commercial_audit_log`
4. `event_ticket_click_attributions`
5. `event_ticket_purchase_signals`
6. `partner_official_communications`

### 2.3 Projeção pública

`resolved_public_event_ticket_channel`

Na primeira implantação, esse nome representa um contrato lógico de resposta produzido por uma rota protegida do servidor. Não será criada view pública nem função `SECURITY DEFINER` nesta etapa inicial.

Essa decisão reduz o risco de:

- contornar RLS por meio de view;
- expor comissão;
- expor autorização comercial;
- expor credenciais de rastreamento;
- retornar o link comercial bruto;
- usar acidentalmente o `ticket_url` legado.

## 3. Referência oficial do evento

A referência oficial permanece em `canonical_event_sources`.

### Campos planejados

- `reference_status` — `candidate`, `validated`, `rejected` ou `stale`;
- `reference_domain` — hostname HTTPS normalizado;
- `confidence_score` — confiança de 0 a 100;
- `discovered_automatically`;
- `validated_at`;
- `validated_by_role` — `automation` ou `useclubbers_admin`;
- `validated_by_user_id`;
- `updated_at`.

### Regras

- somente referência validada poderá alimentar `Ver evento oficial`;
- referência rejeitada ou desatualizada não produzirá saída pública;
- referência oficial nunca vira canal monetizado automaticamente;
- `canonical_events.ticket_url` e `official_event_candidates.ticket_url` são apenas evidências técnicas;
- nenhuma dessas URLs poderá alimentar `Comprar ingresso`.

## 4. Solicitações de parceria

A tabela `event_ticket_partnership_requests` receberá propostas enviadas por agências, eventos, artistas, labels, clubs, produtores ou ticketeiras.

A solicitação poderá existir antes de o evento ser associado a um `canonical_event_id`. Por isso, o plano inclui snapshots de:

- nome do evento;
- data;
- cidade;
- estado;
- local;
- slug informado;
- parceiro;
- URL atual de venda;
- benefício proposto;
- contatos comerciais.

### Estados

- `pending`;
- `needs_info`;
- `approved`;
- `rejected`;
- `withdrawn`.

A solicitação não utiliza `active`, `paused`, `expired` ou `revoked`. Esses estados pertencem ao canal comercial.

### Regras

- parceiro envia por rota protegida;
- parceiro não grava diretamente na tabela;
- aprovação exige evento canônico e admin revisor;
- solicitação aprovada não cria link público;
- dados de contato não entram em projeções públicas;
- a futura identidade `partner_id` continuará opcional até existir um registro oficial de parceiros.

## 5. Canal comercial monetizado

A tabela `event_ticket_commercial_channels` será a única fonte definitiva para o botão `Comprar ingresso`.

### Estados

- `draft`;
- `authorized`;
- `active`;
- `paused`;
- `expired`;
- `revoked`.

### Controle

Somente o admin USECLUBBERS poderá:

- criar;
- autorizar;
- ativar;
- pausar;
- reativar;
- expirar;
- revogar.

A origem pode ser uma solicitação do parceiro, um contrato, uma API de submissão ou um cadastro administrativo. A origem nunca transfere o controle do ciclo comercial ao parceiro.

### Unicidade pública

O primeiro modelo terá um índice único parcial:

`canonical_event_id WHERE channel_status = 'active'`

Assim, cada evento terá no máximo um canal ativo. Canais futuros ou alternativos permanecem em `draft` ou `authorized` até a ativação administrativa.

### Vigência

Além do status `active`, o resolvedor verificará:

- início da autorização;
- término da autorização;
- domínio autorizado;
- correspondência do domínio com o destino;
- ausência de conflito;
- integridade da auditoria.

### Link público

O banco armazenará a URL comercial somente em área de servidor. O público não receberá essa URL diretamente.

O botão `Comprar ingresso` deverá apontar para uma rota interna do USECLUBBERS. Essa rota:

1. valida novamente o canal;
2. registra atribuição mínima;
3. gera ou valida token de redirecionamento;
4. resolve a URL comercial no servidor;
5. redireciona o Clubber.

Isso preserva atribuição, auditoria e proteção dos parâmetros comerciais.

### Segredos

Credenciais, chaves privadas, tokens de integração e segredos de parceiros não serão armazenados em `metadata` nem em coluna pública.

O plano usa `tracking_secret_ref`, uma referência a um futuro mecanismo de segredos. A migration real ficará bloqueada até esse mecanismo ser aprovado.

## 6. Auditoria comercial

`event_ticket_commercial_audit_log` será append-only.

Cada mudança do canal deverá registrar, na mesma transação:

- evento;
- canal;
- solicitação de origem, quando houver;
- ação;
- ator;
- estado anterior;
- estado posterior;
- snapshots redigidos;
- justificativa;
- correlação;
- chave de idempotência;
- data.

Um trigger deverá rejeitar toda tentativa de `UPDATE` ou `DELETE`, inclusive por caminhos de serviço.

Snapshots não poderão guardar:

- URL comercial bruta;
- referência de segredo;
- comissão detalhada sem necessidade;
- contatos pessoais;
- transação externa bruta.

## 7. Cliques atribuídos

`event_ticket_click_attributions` registrará saída comercial, não venda.

### Dados permitidos

- evento;
- canal;
- usuário autenticado, quando disponível;
- hash de sessão de curta duração;
- hash do token de redirecionamento;
- campanha;
- hash do destino;
- base de tratamento registrada;
- data do clique;
- data de expiração da retenção;
- metadata mínima e redigida.

### Dados proibidos

- IP bruto;
- URL comercial copiada integralmente;
- credencial de afiliado privada;
- afirmação automática de compra.

A ativação do rastreamento ficará bloqueada até existir rotina testada de exclusão ou anonimização.

## 8. Sinais de compra

`event_ticket_purchase_signals` separará:

- `interest`;
- `commercial_link_click`;
- `self_declared_purchase`;
- `attributed_conversion`;
- `confirmed_conversion`.

### Regras contábeis

- clique não é compra;
- `Já comprei meu ingresso` é autodeclaração;
- autodeclaração não confirma receita;
- conversão confirmada exige evidência confiável;
- somente conversão confirmada poderá conter comissão reconhecida;
- identificadores externos serão armazenados apenas como hash;
- integrações deverão possuir assinatura e proteção contra repetição.

O legado `event_ticket_intents.ticket_acquired` poderá gerar apenas `self_declared_purchase`, com chave de idempotência determinística.

## 9. Comunicações oficiais

`partner_official_communications` será independente do canal de ingressos.

Um parceiro oficial poderá enviar:

- lineup;
- mudança de horário;
- mudança de local;
- lançamento musical;
- conteúdo exclusivo;
- chamada para comunidade;
- after oficial;
- sorteio.

Comunicações comerciais de ingresso, como desconto, pré-venda, troca de lote e código promocional, exigirão canal comercial válido antes da publicação.

### Regra central

Comunicação oficial não concede autorização comercial.

O parceiro envia. O admin revisa e publica. O parceiro nunca publica diretamente.

## 10. RLS e acesso

Todas as tabelas comerciais novas deverão operar com:

- RLS habilitada;
- RLS forçada;
- nenhuma permissão direta para `anon`;
- nenhuma permissão direta para `authenticated`;
- escrita apenas por rotas de servidor autorizadas;
- leitura pública apenas por projeções redigidas;
- leitura do parceiro apenas por rota que verifica propriedade;
- leitura administrativa apenas por rota protegida.

O plano não depende de acesso direto do navegador às tabelas.

`canonical_event_sources` já possui política de leitura autenticada para procedência não secreta. A extensão não adicionará dados comerciais confidenciais nessa tabela.

## 11. Migração do legado

Nenhum legado poderá preservar ativação pública automaticamente.

### `canonical_events.official_url`

Pode alimentar uma referência oficial candidata.

### `canonical_events.ticket_url`

Pode alimentar apenas referência candidata. Nunca canal comercial.

### `official_event_candidates.ticket_url`

Pode apoiar validação técnica. Nunca canal comercial.

### `event_groups.official_url`

Permanece como compatibilidade até reconciliação com as fontes canônicas.

### `partner_ticket_requests`

Mapeamento:

- `pending` → `pending`;
- `needs_info` → `needs_info`;
- `approved` → `approved`;
- `rejected` → `rejected`;
- `active` → `approved`;
- `paused` → `approved`;
- `expired` → `approved`.

Os estados antigos de canal não permanecerão dentro da solicitação.

### Campos `partner_ticket_*` de `event_groups`

Podem gerar apenas candidato de canal em `draft`. Mesmo um registro legado marcado como ativo deverá passar por nova revisão, autorização e ativação do admin.

### `event_ticket_intents.ticket_acquired`

Pode gerar somente `self_declared_purchase`.

## 12. Fases futuras de implantação

### Fase 1 — inventário e backup

- capturar schema real de produção;
- criar backup de schema e dados;
- contar registros;
- identificar duplicidades;
- produzir relatório dry-run.

### Fase 2 — schema aditivo

- estender `canonical_event_sources`;
- criar seis tabelas;
- criar chaves e índices;
- não migrar dados ainda.

### Fase 3 — segurança e integridade

- habilitar e forçar RLS;
- revogar acessos diretos;
- instalar triggers de ciclo, auditoria e conversão;
- testar tentativas proibidas.

### Fase 4 — backfill em sombra

- migrar referências candidatas;
- normalizar solicitações;
- criar canais somente em `draft`;
- migrar `ticket_acquired` como autodeclaração;
- não alterar a página pública.

### Fase 5 — rotas protegidas e admin em sombra

- rota do parceiro;
- revisão administrativa;
- ciclo do canal;
- resolvedor público em sombra;
- auditoria de idempotência e concorrência.

### Fase 6 — ativação pública separada

- piloto com um evento;
- canal ativo aprovado;
- redirecionamento interno;
- disclosure comercial;
- fallback para `Ver evento oficial`;
- rollback por pausa ou feature flag.

## 13. Bloqueadores antes da migration real

A migration SQL ainda não deve ser criada ou aplicada enquanto faltarem:

1. dump atualizado do schema de produção;
2. definição do registro oficial de parceiros ou decisão de manter `partner_id` sem FK;
3. mecanismo aprovado para segredos comerciais;
4. política e job de retenção;
5. predicado administrativo reutilizável;
6. contrato de assinatura e replay protection para conversões confirmadas.

## 14. Critérios para o próximo passo

A próxima evolução poderá preparar um rascunho de migration somente quando:

- este plano estiver publicado;
- os seis bloqueadores estiverem explicitamente tratados ou mantidos como impedimentos no rascunho;
- o schema real tiver sido capturado;
- o SQL for estritamente aditivo;
- não houver `DROP`, `TRUNCATE` ou ativação pública;
- o rollback estiver documentado;
- nenhuma URL legada puder virar link monetizado;
- todo canal migrado permanecer em `draft`.

## 15. Estado desta versão

A `v4.8.86`:

- cria apenas um arquivo TypeScript de planejamento;
- cria apenas esta documentação;
- não cria migration;
- não acessa o Supabase;
- não grava no banco;
- não cria view pública;
- não altera a página do evento;
- não ativa `Comprar ingresso`;
- preserva a política atual: `Canal de vendas a confirmar`.
