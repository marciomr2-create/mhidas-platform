# EVENT TICKET COMMERCIAL PERSISTENCE CONTRACT

## Versão

`v4.8.85-event-ticket-commercial-persistence-contract-safe`

## Objetivo

Esta versão transforma a governança comercial aprovada na `v4.8.84` em um contrato formal de persistência.

Ela define como os dados de ingressos deverão ser armazenados futuramente, sem criar tabelas, sem gerar migration, sem executar operações no Supabase e sem ativar links públicos.

O contrato preserva a separação entre:

- referência oficial do evento;
- solicitação de parceria;
- canal comercial monetizado;
- auditoria comercial;
- clique atribuído;
- sinal de compra;
- comunicação oficial;
- projeção pública resolvida.

## Escopo desta versão

A versão cria somente:

- contrato TypeScript de persistência;
- blueprints das entidades;
- relacionamentos;
- políticas futuras de leitura e escrita;
- regras de compatibilidade com estruturas existentes;
- plano local de persistência sem efeitos colaterais;
- self-test das invariantes;
- documentação técnica.

A versão não cria:

- migration;
- tabela;
- coluna;
- política RLS real;
- rota;
- formulário;
- painel de parceiro;
- integração com ticketeira;
- botão público;
- escrita no banco;
- publicação de link.

---

# 1. Princípio central

O banco futuro não deve armazenar todos os conceitos de ingressos no mesmo registro.

Um evento verdadeiro não equivale a uma parceria.

Uma solicitação aprovada não equivale a um canal ativo.

Um clique não equivale a uma compra.

Uma compra autodeclarada não equivale a receita confirmada.

Uma comunicação oficial não concede autorização comercial.

Por isso, cada domínio possui entidade, estado, permissão, retenção e auditoria próprios.

---

# 2. Identidade canônica obrigatória

O `canonical_event_id` é a identidade obrigatória para qualquer operação pública ou monetizada.

Ele deve referenciar:

`canonical_events.id`

O canal comercial não pode ser ativado usando apenas:

- nome;
- slug;
- `event_group_id`;
- URL de ticketeira;
- ID externo;
- `ticket_url` técnico.

A solicitação de parceria pode ser recebida antes do vínculo canônico, mas não pode ser aprovada enquanto o evento não estiver associado ao catálogo canônico.

---

# 3. Entidades de persistência

## 3.1 Referência oficial do evento

### Armazenamento proposto

Reutilizar:

`canonical_event_sources`

Não é recomendado criar uma segunda tabela duplicando a procedência já armazenada.

A tabela existente deverá ser estendida futuramente com informações de elegibilidade da referência:

- `reference_status`;
- domínio normalizado;
- confiança;
- data de validação;
- papel do validador;
- chave de idempotência;
- data de atualização.

### Estados

- `candidate`;
- `validated`;
- `rejected`;
- `stale`.

### Regra pública

Somente uma referência:

- validada;
- HTTPS;
- não expirada;
- compatível com o evento canônico;
- proveniente de fonte confiável;

poderá gerar o botão:

**Ver evento oficial**

Essa referência nunca se transforma automaticamente em canal comercial.

---

## 3.2 Solicitação de parceria

### Tabela futura proposta

`event_ticket_partnership_requests`

### Responsabilidade

Guardar a proposta enviada por agência, produtora, artista, label, club, evento ou ticketeira.

### Estados exclusivos da solicitação

- `pending`;
- `needs_info`;
- `approved`;
- `rejected`;
- `withdrawn`.

Os estados abaixo não pertencem à solicitação:

- `active`;
- `paused`;
- `expired`;
- `revoked`.

Esses estados pertencem ao canal comercial.

### Regra de autorização

O parceiro pode:

- criar uma solicitação;
- complementar informações;
- retirar a própria solicitação;
- consultar o próprio histórico.

O parceiro não pode:

- criar o canal definitivo;
- ativar;
- pausar;
- revogar;
- alterar comissão aprovada;
- substituir a URL pública.

### Idempotência

Cada envio deverá possuir uma chave do cliente ou da rota para evitar solicitações duplicadas.

---

## 3.3 Canal comercial monetizado

### Tabela futura proposta

`event_ticket_commercial_channels`

### Responsabilidade

Guardar o canal monetizado definitivo, controlado pelo administrador USECLUBBERS.

### Estados

- `draft`;
- `authorized`;
- `active`;
- `paused`;
- `expired`;
- `revoked`.

### Controle exclusivo

Somente o administrador USECLUBBERS poderá:

- criar;
- autorizar;
- ativar;
- reativar;
- pausar;
- expirar;
- revogar.

A origem dos dados pode ser uma solicitação do parceiro, contrato ou API, mas a criação e as transições do registro definitivo permanecem administrativas.

### Campos comerciais

O contrato prevê:

- ticketeira;
- domínio autorizado;
- URL comercial;
- método de rastreamento;
- parâmetro;
- cupom;
- afiliado;
- modelo de remuneração;
- comissão percentual;
- comissão fixa;
- moeda;
- documento de autorização;
- vigência;
- prioridade pública;
- texto de transparência;
- responsáveis administrativos;
- timestamps;
- versão para concorrência otimista;
- chave de idempotência.

### Regra de publicação

O canal poderá aparecer publicamente somente quando:

- estiver `active`;
- estiver dentro da vigência;
- possuir `canonical_event_id`;
- possuir URL HTTPS;
- o domínio coincidir com o domínio autorizado;
- existir comprovação comercial;
- a criação, autorização e ativação forem administrativas;
- não houver conflito entre canais públicos;
- o resolvedor público aprovar a saída.

### Revogação

O canal revogado não será apagado.

A revogação é terminal e preserva:

- negociação;
- histórico;
- responsáveis;
- conversões atribuídas;
- auditoria;
- defesa jurídica e comercial.

### Quantidade de canais

A estrutura poderá guardar histórico de vários canais, mas a primeira implementação pública deverá permitir no máximo um canal `active` por evento.

Isso evita:

- ambiguidade;
- disputa de prioridade;
- dois botões concorrentes;
- atribuição incorreta;
- conflito comercial.

---

## 3.4 Auditoria comercial

### Tabela futura proposta

`event_ticket_commercial_audit_log`

### Característica

A tabela será append-only.

Ela não poderá receber:

- update;
- delete;
- sobrescrita do histórico.

### Eventos auditáveis

- criação;
- revisão;
- autorização;
- ativação;
- reativação;
- pausa;
- expiração;
- revogação;
- alteração de URL;
- alteração de comissão;
- alteração de vigência;
- troca de ticketeira;
- correção de atribuição.

### Dados obrigatórios

- evento canônico;
- canal ou solicitação;
- ação;
- ator;
- estado anterior;
- estado posterior;
- snapshots redigidos;
- justificativa;
- ID de correlação;
- chave de idempotência;
- timestamp.

Segredos de rastreamento e dados pessoais desnecessários não devem aparecer nos snapshots.

---

## 3.5 Cliques atribuídos

### Tabela futura proposta

`event_ticket_click_attributions`

### Responsabilidade

Registrar a saída pelo botão monetizado.

Um clique comprova somente que o usuário abriu o canal.

Ele não comprova:

- compra;
- pagamento;
- receita;
- presença;
- comissão devida.

### Caminho seguro

O botão público deverá apontar para uma rota interna de redirecionamento.

Essa rota:

1. resolve novamente o canal ativo;
2. valida a vigência;
3. registra a atribuição;
4. gera correlação;
5. redireciona para o destino autorizado.

### Privacidade

O contrato proíbe o armazenamento de IP bruto.

Poderão ser utilizados:

- usuário autenticado, quando aplicável;
- chave pseudônima de sessão;
- hash de token;
- hash do destino;
- campanha;
- base legal;
- prazo de retenção.

---

## 3.6 Sinais de compra

### Tabela futura proposta

`event_ticket_purchase_signals`

### Tipos

- `interest`;
- `commercial_link_click`;
- `self_declared_purchase`;
- `attributed_conversion`;
- `confirmed_conversion`.

### Compra autodeclarada

O botão:

**Já comprei meu ingresso**

registra:

`self_declared_purchase`

Ele pode alimentar:

- radar social;
- caronas;
- encontros;
- próximos eventos;
- perfil;
- segmentação.

Ele não pode alimentar:

- receita confirmada;
- comissão reconhecida;
- relatório financeiro oficial.

### Conversão confirmada

Somente poderá existir quando houver:

- evidência confiável;
- webhook;
- postback;
- API de parceiro;
- relatório comercial validado;
- referência externa deduplicável;
- confirmação do mecanismo de atribuição.

A transação externa deve ser armazenada como referência protegida ou hash, evitando duplicidade e exposição desnecessária.

---

## 3.7 Comunicação oficial

### Tabela futura proposta

`partner_official_communications`

### Responsabilidade

Guardar avisos, benefícios e conteúdos enviados por parceiros oficiais.

### Estados

- `draft`;
- `submitted`;
- `needs_review`;
- `approved`;
- `published`;
- `paused`;
- `expired`;
- `rejected`.

### Separação comercial

Uma comunicação editorial pode existir sem parceria de ingressos, desde que o parceiro seja verificado e a comunicação seja aprovada.

Comunicações como:

- desconto;
- pré-venda;
- troca de lote;
- código promocional;

exigem um canal comercial ativo.

Mesmo nesse caso, a comunicação não concede autorização ao canal. Ela apenas utiliza uma parceria previamente autorizada.

---

## 3.8 Projeção pública resolvida

### Nome conceitual

`resolved_public_event_ticket_channel`

A projeção pode ser implementada futuramente como:

- view;
- função;
- resolvedor server-side;
- resposta de API protegida.

Ela não é fonte de verdade.

### Campos públicos permitidos

- evento canônico;
- tipo de ação;
- texto do botão;
- URL resolvida;
- indicação de monetização;
- transparência;
- referência opaca do canal;
- versão da decisão;
- data da resolução.

### Campos proibidos no público

- comissão;
- valor fixo;
- documento de autorização;
- contato comercial;
- chave secreta;
- nota administrativa;
- snapshots de auditoria;
- credenciais de integração.

### Prioridade

1. canal comercial ativo e válido;
2. referência oficial validada;
3. canal indisponível.

Os resultados públicos serão:

- **Comprar ingresso**;
- **Ver evento oficial**;
- **Canal de vendas a confirmar**.

O `ticket_url` técnico não participa da decisão monetizada.

---

# 4. Compatibilidade com estruturas existentes

## 4.1 `canonical_event_sources`

Será reutilizada como base de procedência da referência oficial.

A evolução futura deverá ser aditiva, evitando duplicar fonte, URL e autoridade em outra tabela.

## 4.2 `canonical_events.official_url`

Pode originar uma referência oficial candidata ou validada.

Não pode originar canal monetizado automaticamente.

## 4.3 `canonical_events.ticket_url`

É um campo técnico legado.

Pode auxiliar descoberta ou validação.

Não pode gerar o botão **Comprar ingresso**.

## 4.4 `official_event_candidates.ticket_url`

É informação descoberta por provider.

Pode apoiar a validação, mas não é autorização comercial.

## 4.5 `event_groups.official_url`

Permanece como compatibilidade temporária enquanto a leitura pública canônica é consolidada.

## 4.6 Campos `event_groups.partner_ticket_*`

A migration antiga criou campos comerciais embutidos em `event_groups`.

Esses campos podem servir como fonte para uma futura migração controlada, mas não devem permanecer como fonte de verdade definitiva.

Cada registro migrado deverá:

- ser relacionado ao evento canônico;
- ter domínio revalidado;
- ter autorização revisada;
- gerar canal formal;
- gerar auditoria;
- manter histórico;
- não ser ativado automaticamente.

## 4.7 `partner_ticket_requests`

A tabela existente mistura estados da solicitação e do canal.

Uma migração futura deverá separar:

- solicitação aprovada;
- canal ativo, pausado ou expirado.

Valores `active`, `paused` e `expired` não devem ser copiados como estados da solicitação nova.

## 4.8 `event_ticket_intents`

Continua útil para:

- interesse;
- desejo de ingresso;
- ingresso autodeclarado;
- cancelamento;
- check-in.

O valor `ticket_acquired` deve ser interpretado como autodeclaração.

Ele não se transforma em `confirmed_conversion`.

---

# 5. Permissões futuras

## Admin USECLUBBERS

Pode:

- revisar solicitações;
- criar canal;
- autorizar;
- ativar;
- pausar;
- reativar;
- revogar;
- corrigir;
- auditar;
- publicar comunicação;
- reconhecer conversão mediante evidência.

## Parceiro

Pode:

- enviar referência;
- solicitar parceria;
- complementar solicitação;
- retirar solicitação;
- enviar comunicação;
- acompanhar os próprios registros.

Não pode:

- escrever diretamente na tabela comercial;
- ativar link;
- pausar;
- revogar;
- mudar comissão;
- publicar comunicação diretamente.

## Automação

Pode:

- descobrir referência;
- validar referência de alta confiança;
- marcar referência como stale;
- sugerir atualização.

Não pode:

- criar canal monetizado;
- ativar;
- alterar comissão;
- reconhecer receita.

## Clubber

Pode:

- registrar interesse;
- declarar que comprou;
- acessar o botão resolvido;
- alimentar sua jornada social.

Não pode:

- criar conversão confirmada;
- alterar atribuição;
- escrever em canal comercial.

## Integração confiável

Pode registrar conversão somente por rota assinada e com:

- evidência;
- idempotência;
- transação externa;
- origem verificável;
- auditoria.

---

# 6. RLS futura

A regra padrão será negar acesso direto às tabelas comerciais.

## Leitura pública

Permitida somente por projeção resolvida.

## Canal comercial

- `anon`: sem select direto;
- `authenticated`: sem select direto;
- parceiro: sem insert ou update direto;
- automação: sem write;
- admin: write somente por rota protegida;
- service role: somente em operações controladas.

## Solicitação

O parceiro poderá consultar sua própria solicitação por política ou rota segura.

A revisão administrativa continua protegida.

## Sinal de compra

O usuário poderá consultar e criar apenas sinais próprios permitidos.

`confirmed_conversion` nunca poderá ser criado diretamente pelo Clubber.

## Auditoria

Somente append pelo backend autorizado.

Nenhuma role cliente poderá atualizar ou excluir.

---

# 7. Idempotência e concorrência

Toda futura escrita deverá possuir chave de idempotência.

Ela será obrigatória para:

- solicitação;
- canal;
- auditoria;
- clique;
- sinal;
- comunicação;
- integração externa.

O canal deverá utilizar:

- `updated_at`;
- `lock_version`;
- comparação de estado esperado;
- releitura posterior.

Isso evita:

- ativação duplicada;
- duas pausas concorrentes;
- substituição silenciosa de URL;
- perda de comissão;
- auditoria divergente.

---

# 8. Expiração e revogação

## Expiração

Pode ocorrer automaticamente quando a vigência terminar.

A automação poderá alterar o estado para `expired` por uma operação de sistema auditada.

## Pausa

É reversível e exige ação administrativa.

## Revogação

É terminal.

O canal não pode sair de `revoked`.

Uma nova parceria deve criar um novo canal, mantendo o histórico anterior.

---

# 9. Privacidade e retenção

O contrato exige minimização de dados.

Não armazenar:

- IP bruto;
- credenciais em texto aberto;
- payload completo da ticketeira sem necessidade;
- dados de pagamento;
- número completo do cartão;
- dados pessoais sem finalidade.

Devem existir políticas de:

- retenção;
- anonimização;
- expiração;
- acesso;
- exportação;
- auditoria;
- base legal.

Chaves sensíveis devem usar:

- secret manager;
- criptografia;
- hash;
- tokenização.

---

# 10. Plano local sem efeitos colaterais

O arquivo TypeScript fornece um planejador que valida:

- ator;
- caminho de escrita;
- entidade;
- identidade canônica;
- status;
- evidência;
- idempotência;
- uso de legado;
- pedido de migration;
- pedido de escrita;
- pedido de ativação pública.

Nesta versão, qualquer tentativa de:

- migration real;
- escrita real;
- ativação pública;
- acesso direto à tabela;
- canal criado por parceiro;
- conversão confirmada sem evidência;
- uso do `ticket_url` legado;

é bloqueada.

O planejador retorna apenas um contrato local.

---

# 11. Invariantes obrigatórias

1. Referência oficial nunca se torna canal monetizado automaticamente.
2. Solicitação aprovada nunca publica link.
3. Parceiro nunca controla o ciclo do canal definitivo.
4. Somente admin cria e altera o canal monetizado.
5. `canonical_event_id` é obrigatório antes da ativação.
6. `ticket_url` técnico nunca alimenta o botão monetizado.
7. Canal público precisa estar ativo e vigente.
8. O primeiro modelo público permite no máximo um canal ativo por evento.
9. Canal revogado nunca é apagado ou reativado.
10. Toda mutação comercial gera auditoria append-only.
11. Clique não é compra.
12. Compra autodeclarada não é conversão confirmada.
13. Conversão confirmada exige evidência confiável.
14. Comunicação oficial não concede autorização comercial.
15. Parceiro envia comunicação; admin publica.
16. Dados financeiros e segredos não são públicos.
17. IP bruto não é armazenado.
18. Toda escrita futura exige idempotência.
19. A leitura pública usa somente o resolvedor.
20. Estruturas legadas são fontes de migração, não autoridade comercial final.

---

# 12. Próximas etapas seguras

Após a validação deste contrato, a sequência recomendada é:

1. plano de schema das novas tabelas;
2. mapeamento detalhado dos dados legados;
3. desenho de RLS;
4. migration draft sem aplicação;
5. revisão estrutural;
6. preflight de migration;
7. migration real controlada;
8. rotas administrativas;
9. painel de solicitações;
10. painel do canal comercial;
11. resolvedor público em modo sombra;
12. ativação controlada do primeiro canal;
13. atribuição de cliques;
14. integração de conversões.

Nenhuma dessas etapas deve ser agrupada em uma única evolução.

---

# 13. Estado técnico desta versão

- arquivos de projeto criados: 2;
- migration criada: não;
- Supabase acessado: não;
- banco alterado: não;
- formulário criado: não;
- página pública alterada: não;
- link comercial ativado: não;
- política atual de ingressos alterada: não;
- contrato de persistência: definido;
- compatibilidade legada: documentada;
- self-test: obrigatório;
- rollback: remoção dos dois arquivos em caso de falha.

---

# 14. Conclusão

A monetização de ingressos passa a possuir uma arquitetura própria, sem depender de campos técnicos de descoberta e sem permitir publicação automática por parceiros.

A persistência futura será baseada em:

- identidade canônica;
- separação de responsabilidades;
- controle administrativo;
- idempotência;
- auditoria;
- evidência de conversão;
- privacidade;
- projeção pública mínima.

Essa estrutura protege a receita, a negociação, a confiança do Clubber e o posicionamento estratégico da USECLUBBERS.
