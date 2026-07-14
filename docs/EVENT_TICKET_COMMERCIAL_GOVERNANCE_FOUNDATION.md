# EVENT TICKET COMMERCIAL GOVERNANCE FOUNDATION

## Versão

`v4.8.84-event-ticket-commercial-governance-foundation-safe`

## Objetivo

Esta fundação congela as regras estratégicas e técnicas do ecossistema de ingressos da USECLUBBERS antes da criação de tabelas, rotas de escrita, formulários administrativos ou botões públicos.

O princípio central é que um evento oficial, uma referência oficial, uma solicitação de parceria, um canal monetizado, uma comunicação oficial e um sinal de compra são objetos independentes.

Nenhum desses objetos pode conceder automaticamente as permissões do outro.

## Escopo desta versão

A versão cria somente:

- um contrato TypeScript compartilhado;
- máquinas de estado independentes;
- matriz de permissões por papel;
- regras de decisão pública dos botões;
- classificação dos sinais de compra;
- governança das comunicações oficiais;
- self-test das invariantes críticas;
- documentação estratégica e técnica.

A versão não cria:

- tabela;
- migration;
- formulário;
- painel de parceiro;
- rota de escrita;
- atualização de banco;
- link público de compra;
- integração com ticketeira;
- rastreamento real;
- campanha real;
- alteração da página pública.

## 1. Domínios independentes

### 1.1 Referência oficial do evento

A referência oficial comprova que o evento existe e apoia a validação de nome, data, cidade, local, organizador, imagem e lineup.

Ela pode vir de uma fonte confiável, incluindo:

- ticketeira oficial;
- site oficial do evento;
- site oficial da produtora;
- site oficial do club;
- perfil social oficial;
- fonte nacional confiável;
- cadastro manual do administrador.

A automação pode descobrir e validar uma referência quando confiança e autoridade forem altas.

A referência validada pode gerar o botão:

**Ver evento oficial**

Esse botão não presume comissão, parceria ou venda atribuída.

### 1.2 Solicitação de parceria comercial

O parceiro pode solicitar uma parceria e enviar informações comerciais.

A solicitação pode conter:

- evento;
- data e cidade;
- link atual de venda;
- ticketeira;
- contato comercial;
- tipo de parceria;
- desconto ou benefício;
- observações.

A solicitação nunca cria ou ativa automaticamente um canal monetizado.

### 1.3 Canal comercial monetizado

O canal comercial é o objeto controlado pela USECLUBBERS para gerar ou mensurar receita.

Ele pode envolver:

- comissão percentual;
- comissão fixa;
- participação em taxa de serviço;
- campanha fixa;
- modelo híbrido;
- licenciamento;
- campanha sem remuneração direta, quando estrategicamente aprovada.

Somente o administrador da USECLUBBERS pode:

- criar o canal definitivo;
- autorizar;
- ativar;
- pausar;
- reativar;
- revogar.

Mesmo quando a origem dos dados for um parceiro, contrato ou API, os atores de criação, autorização e ativação do canal definitivo devem ser administradores da USECLUBBERS.

### 1.4 Sinal de compra do Clubber

O botão **Já comprei meu ingresso** registra uma declaração do usuário.

Ele não comprova receita e não equivale a conversão confirmada.

O sistema separa:

- interesse;
- clique em link comercial;
- compra autodeclarada;
- conversão atribuída;
- conversão confirmada.

### 1.5 Comunicação oficial

Comunicações oficiais são separadas do canal comercial.

Um parceiro verificado pode enviar conteúdos como:

- lançamento musical;
- atualização de lineup;
- mudança de horário;
- aviso de local;
- after oficial;
- conteúdo exclusivo;
- chamada para comunidade.

Comunicações comerciais de ingresso, como pré-venda, desconto, troca de lote e código promocional, exigem parceria comercial ativa.

Toda publicação continua sujeita à aprovação e publicação administrativa.

Uma comunicação oficial nunca concede autorização comercial por si só.

## 2. Matriz de permissões

### Administrador USECLUBBERS

Pode:

- validar ou rejeitar referência oficial;
- revisar solicitações;
- pedir informações;
- aprovar ou rejeitar parceria;
- criar canal comercial;
- autorizar canal;
- ativar canal;
- pausar canal;
- revogar canal;
- revisar comunicação;
- publicar comunicação;
- pausar comunicação.

### Parceiro

Pode:

- enviar referência oficial;
- enviar solicitação de parceria;
- retirar solicitação ainda não finalizada;
- enviar comunicação oficial.

Não pode:

- aprovar sua própria solicitação;
- criar o canal comercial definitivo;
- autorizar canal;
- ativar link público;
- pausar ou reativar canal;
- revogar canal;
- publicar comunicação diretamente.

### Automação

Pode:

- descobrir referência oficial;
- validar referência com alta confiança e autoridade.

Não pode:

- criar parceria comercial;
- ativar canal monetizado;
- publicar comunicação comercial.

### Sistema

O sistema pode calcular estado efetivo, como expiração por data, sem assumir permissão comercial de administrador.

## 3. Estados da referência oficial

- `candidate`: referência encontrada, ainda não validada;
- `validated`: referência confiável e auditável;
- `rejected`: referência rejeitada;
- `stale`: referência antiga ou desatualizada.

Para aparecer como **Ver evento oficial**, a referência deve:

- estar vinculada ao evento canônico;
- possuir URL HTTPS pública;
- estar em `validated`;
- ter confiança mínima de 90;
- ter autoridade mínima de 90;
- registrar data e ator da validação.

## 4. Estados da solicitação de parceria

- `pending`;
- `needs_info`;
- `approved`;
- `rejected`;
- `withdrawn`.

Transições permitidas:

- `pending` → `needs_info`, `approved`, `rejected` ou `withdrawn`;
- `needs_info` → `pending`, `approved`, `rejected` ou `withdrawn`.

Os estados finais não possuem transição de saída.

Uma solicitação `approved` continua sendo apenas uma solicitação aprovada. Ela não é um canal ativo.

## 5. Estados do canal comercial

- `draft`;
- `authorized`;
- `active`;
- `paused`;
- `expired`;
- `revoked`.

Transições permitidas:

- `draft` → `authorized` ou `revoked`;
- `authorized` → `active`, `paused`, `expired` ou `revoked`;
- `active` → `paused`, `expired` ou `revoked`;
- `paused` → `active`, `expired` ou `revoked`;
- `expired` → `authorized` ou `revoked`;
- `revoked` não possui transição de saída.

A interface pode usar o termo “remover”, mas tecnicamente o canal deve ser revogado e preservado para auditoria.

Somente um administrador pode realizar essas transições.

## 6. Requisitos para o botão Comprar ingresso

O botão **Comprar ingresso** somente é elegível quando:

- existe um canal comercial específico;
- o canal pertence ao evento canônico correto;
- a ticketeira está identificada;
- a URL usa HTTPS;
- o domínio corresponde ao domínio autorizado;
- o canal foi criado por administrador;
- o canal foi autorizado por administrador;
- o canal foi ativado por administrador;
- existe referência documental de autorização;
- a janela comercial está vigente;
- o estado efetivo é `active`;
- o método de atribuição é compatível com o modelo de remuneração;
- os dados financeiros obrigatórios estão presentes.

O `ticket_url` técnico ou um link descoberto automaticamente nunca é utilizado como canal monetizado.

## 7. Prioridade pública dos botões

### Canal comercial ativo

Mostrar:

**Comprar ingresso**

O link vem exclusivamente do canal controlado pelo administrador.

Quando houver remuneração, a fundação prevê a transparência:

**A USECLUBBERS poderá receber remuneração pelas vendas realizadas por este canal, sem alteração no preço informado pela ticketeira.**

### Sem canal comercial ativo, mas com referência oficial válida

Mostrar:

**Ver evento oficial**

O link é informativo e não monetizado.

### Sem canal comercial e sem referência segura

Mostrar:

**Canal de vendas a confirmar**

**Aguardando o envio de um link autorizado pelo evento ou pela ticketeira.**

### Canal pausado, expirado ou revogado

O sistema não mostra **Comprar ingresso**.

Quando houver referência oficial validada, retorna para **Ver evento oficial**.

## 8. Sinais de compra e métricas

### `interest`

Indica interesse inicial.

### `commercial_link_click`

Indica que o Clubber abriu o canal comercial.

Não comprova compra.

### `self_declared_purchase`

Indica que o Clubber declarou ter comprado.

Não comprova atribuição nem receita.

### `attributed_conversion`

Indica que existe vínculo de campanha, cupom ou relatório com a USECLUBBERS.

Pode ainda depender de confirmação externa.

### `confirmed_conversion`

Exige:

- identificador externo de transação;
- evidência confiável por postback, webhook ou API do parceiro.

Somente esse estado pode ser reportado como receita confirmada pela fundação.

## 9. Comunicação oficial e pertencimento

Estados:

- `draft`;
- `submitted`;
- `needs_review`;
- `approved`;
- `published`;
- `paused`;
- `expired`;
- `rejected`.

O parceiro pode enviar a comunicação, mas não publicá-la diretamente.

A publicação exige:

- parceiro verificado;
- aprovação editorial do admin;
- publicação pelo admin;
- janela de publicação vigente.

Conteúdos editoriais podem existir sem parceria de ingressos.

Conteúdos comerciais de ingresso exigem parceria comercial ativa.

## 10. Invariantes congeladas

A fundação possui self-test para provar que:

1. referência oficial validada pode ser exibida;
2. canal controlado pelo admin pode ser elegível;
3. canal comercial ativo tem prioridade sobre a referência;
4. sem canal comercial, a referência oficial é usada;
5. canal pausado retorna para a referência;
6. `ticket_url` legado nunca é usado;
7. solicitação aprovada não cria nem ativa canal;
8. parceiro não ativa canal;
9. parceiro não pausa canal;
10. parceiro não revoga canal;
11. admin pode ativar;
12. compra autodeclarada não é conversão confirmada;
13. conversão confirmada exige evidência confiável;
14. comunicação editorial é independente de parceria de ingressos;
15. desconto de ingresso exige parceria comercial ativa;
16. parceiro nunca publica diretamente;
17. canal revogado não pode voltar a ativo;
18. parceiro não executa transição do canal;
19. admin pode executar a transição `authorized` → `active`.

## 11. Entidades futuras recomendadas

A implementação futura deve evitar concentrar tudo em `official_events.metadata`.

Entidades recomendadas:

- `official_event_references`;
- `event_ticket_partnership_requests`;
- `event_ticket_commercial_channels`;
- `event_ticket_commercial_audit_log`;
- `event_ticket_click_attributions`;
- `event_ticket_purchase_signals`;
- `partner_official_communications`.

Essas tabelas não são criadas nesta versão.

## 12. Ordem de implementação futura

A sequência segura recomendada é:

1. fundação de governança;
2. plano de schema;
3. migration em rascunho;
4. revisão estrutural;
5. migration real isolada;
6. leitura administrativa;
7. solicitação de parceiro;
8. escrita administrativa protegida;
9. auditoria comercial;
10. resolvedor público dos botões;
11. rastreamento de clique;
12. sinal de compra do Clubber;
13. atribuição e confirmação de conversão;
14. comunicação oficial.

## 13. Regra estratégica final

**Parceiro comunica e solicita. Admin governa e monetiza. Clubber recebe informação, segurança, benefício e pertencimento.**
