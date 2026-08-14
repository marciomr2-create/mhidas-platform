# V4.8.165 — Oferta de ingresso entre Clubbers

## Regra de produto

Existem dois fluxos independentes de ingresso.

### Venda oficial

A venda oficial acontece pelo link controlado pelo USECLUBBERS somente após acordo e autorização entre ticketeria, agência e administração.

Pré-venda, abertura de vendas, lote e comunicações comerciais pertencem a esse fluxo separado.

### Oferta por desistência

Quando um Clubber desiste do evento, sua jornada pode passar para `cancelled` e ele pode publicar o ingresso como disponível.

A oportunidade é enviada somente para quem:

- possui conexão Clubber aceita com o ofertante;
- marcou `wants_ticket`;
- procura ingresso para o mesmo evento;
- não está bloqueado ou suspenso no Perfil Clubber.

## Tipo

`clubber_ticket_offer.available`

## Canais

- in-app
- badge
- push

Push exige consentimento explícito.

## Apresentação

**Perfil Clubber · Ingresso disponível**

`Marcos disponibilizou um ingresso para Tomorrowland Brasil. Você marcou que está procurando ingresso.`

## Anti-spam

Alterar preço, quantidade, lote, observação ou método de transferência enquanto a oferta continua disponível não gera outro Push.

Uma nova notificação só nasce em uma nova transição para `available`.

## Invalidação

Quando a oferta deixa de estar disponível, a oportunidade anterior é invalidada.

## Identidade

O fluxo usa exclusivamente:

- `clubber_connections`
- `clubber_relationship_controls`

O fluxo não usa o grafo Profissional.

## Venda oficial

Notificações comerciais de ticketeria permanecem fora deste produtor e dependerão do fluxo administrativo autorizado do link oficial do USECLUBBERS.