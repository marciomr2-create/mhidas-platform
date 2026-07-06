# Event JSON-LD Normalizer Foundation

Versão: v4.8.20-event-jsonld-normalizer-foundation

## Objetivo

Esta versão cria a fundação do normalizador de JSON-LD para eventos dentro do MHIDAS / USECLUBBERS.

O objetivo é transformar payloads JSON-LD já fornecidos para a aplicação em candidatos brutos compatíveis com o contrato de ingestão criado na v4.8.19.

## O que é JSON-LD

JSON-LD é um formato de dados estruturados usado por páginas públicas para descrever entidades como eventos, locais, organizações, artistas e ofertas de ingresso.

Muitas páginas oficiais podem expor objetos compatíveis com `schema.org/Event`, incluindo dados como:

- nome do evento;
- descrição;
- data de início;
- data de término;
- venue;
- endereço;
- cidade;
- estado;
- país;
- organizador;
- imagem;
- URL oficial;
- oferta ou link de ingresso.

## O que a v4.8.20 entrega

A v4.8.20 adiciona o arquivo:

`src/app/api/official-events/_shared/eventJsonLdNormalizer.ts`

Ele contém funções puras para:

- identificar objetos JSON-LD do tipo `Event`;
- percorrer payloads com arrays e `@graph`;
- extrair campos relevantes;
- criar `EventIngestionRawCandidate`;
- gerar candidatos normalizados usando `normalizeEventIngestionRawCandidate`;
- preservar `input_format` como `json_ld`;
- preservar publicação automática sempre fora desta etapa.

## O que a v4.8.20 não faz

Esta versão não faz:

- fetch externo;
- crawler;
- leitura de sitemap;
- scraping de páginas;
- escrita no Supabase;
- criação de evento real;
- publicação automática;
- deduplicação;
- ranking;
- confirmação;
- moderação;
- alteração de rotas públicas;
- alteração de dashboard;
- alteração de SSR;
- alteração de middleware;
- alteração de auth;
- alteração visual.

## Papel dentro da Central de Eventos

Esta fundação prepara um dos caminhos de ingestão da Central de Eventos:

1. uma página pública expõe JSON-LD;
2. uma etapa futura coleta esse JSON-LD;
3. este normalizador converte o payload em candidato bruto;
4. o contrato de ingestão valida e normaliza o candidato;
5. etapas futuras poderão revisar, deduplicar, ranquear e confirmar o evento.

Nesta versão, o processo termina na transformação em candidato bruto/normalizado em memória.

## Confiança padrão

Por segurança, quando nenhum metadado de fonte é fornecido, o normalizador assume:

- `input_format`: `json_ld`;
- `actor_type`: `editorial_source`;
- `trust_tier`: `discovery`;
- `authority_scope`: `discovery_only`.

Isso evita que um JSON-LD encontrado em página pública seja tratado automaticamente como confirmação oficial.

## Próximas evoluções possíveis

Evoluções futuras podem ser feitas em versões separadas:

1. teste unitário simples com payload JSON-LD local;
2. adaptador de página pública sem fetch real;
3. extrator de JSON-LD a partir de HTML já recebido;
4. leitura controlada de sitemap;
5. vínculo com `event_sources`;
6. pipeline interno de revisão;
7. submissão de organizador;
8. sugestão comunitária de evento.