# Event Ingestion Contract

Versão: v4.8.19-event-ingestion-contract

## Objetivo

Este documento define a fundação técnica do contrato de ingestão de fontes de eventos do MHIDAS / USECLUBBERS.

A v4.8.19 não coleta eventos reais, não publica eventos, não confirma eventos automaticamente e não altera telas públicas. O objetivo é criar uma camada segura para receber sinais futuros de eventos vindos de APIs, páginas oficiais, feeds parceiros, organizadores e sugestões comunitárias.

## Entradas previstas

O contrato aceita os seguintes formatos de entrada:

- `api`: integração estruturada com fonte técnica ou parceira.
- `json_ld`: dados estruturados encontrados em páginas públicas.
- `sitemap`: descoberta por índice público de URLs.
- `public_page`: página pública oficial ou semi-oficial.
- `partner_feed`: feed enviado por parceiro.
- `organizer_submission`: submissão direta feita por organizador.
- `clubber_suggestion`: sugestão comunitária feita por Clubber.

## Fluxo conceitual

O fluxo futuro será:

1. uma fonte envia ou expõe um sinal bruto;
2. o sinal bruto é transformado em candidato bruto normalizado;
3. o candidato recebe avisos e erros de validação;
4. o candidato pode seguir para revisão, deduplicação, ranking e confirmação;
5. somente uma etapa posterior poderá transformar candidato em evento publicado.

Nesta versão, o fluxo para antes de qualquer escrita no banco.

## Níveis de confiança

O contrato separa os sinais por autoridade e confiança:

### Fonte oficial

Fonte com autoridade direta sobre o evento, como ticketeria oficial, club, venue, festival, produtora ou agência responsável. Pode indicar alto nível de confiança, mas ainda respeita as travas de publicação automática.

### Organizador verificado

Conta de organizador com validação futura dentro da plataforma. Pode criar sinais fortes sobre seus próprios eventos.

### Organizador não verificado

Conta ou submissão ainda sem validação suficiente. Pode sugerir eventos, mas não deve confirmar publicação sem validação adicional.

### Comunidade

Sugestões feitas por Clubbers. São úteis para descoberta, cobertura local e eventos independentes, mas não concedem selo oficial sozinhas.

### Fonte editorial

Fontes como PlayBPM e Bandsintown ajudam a descobrir eventos e sinais culturais. Elas não devem, sozinhas, transformar um evento em oficial.

## Regras de segurança da v4.8.19

A v4.8.19 preserva as seguintes travas:

- não cria migration;
- não altera `event_sources`;
- não altera `official_event_candidates`;
- não cria crawler real;
- não executa fetch externo;
- não escreve no Supabase;
- não cria `/events`;
- não altera `/event/[event_slug]`;
- não altera dashboard;
- não altera login;
- não altera middleware;
- não altera SSR;
- não altera auth;
- não altera visual público;
- não publica eventos automaticamente.

## Arquivo técnico

O contrato TypeScript está em:

`src/app/api/official-events/_shared/eventIngestionContract.ts`

Ele contém:

- tipos de formatos de entrada;
- tipos de atores de ingestão;
- níveis de confiança;
- estrutura de candidato bruto;
- estrutura de candidato normalizado;
- funções puras de normalização;
- funções puras de validação;
- resumo de validação.

## Próximas evoluções possíveis

Depois da v4.8.19, as próximas etapas podem ser feitas em versões separadas:

1. adaptador de ingestão manual para testes locais;
2. conversor de JSON-LD para candidato bruto;
3. vínculo controlado entre `event_sources` e candidatos;
4. painel interno de revisão;
5. submissão de organizador;
6. sugestão comunitária por Clubbers;
7. reivindicação de evento por organizador;
8. moderação por exceção.