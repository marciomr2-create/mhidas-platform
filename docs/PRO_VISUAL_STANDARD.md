# Padrão Visual Pro — USECLUBBERS / MHIDAS

Versão de referência: `v4.5.5-pro-visual-standard`

Este documento consolida o padrão visual aprovado para o **Perfil Pro**. Ele deve guiar as próximas telas profissionais sem contaminar o visual Club, que tem outra energia e outra finalidade.

## 1. Princípio central

O Perfil Pro não é uma página de cadastro, nem uma rede social de vaidade. Ele é um **cartão profissional vivo**: rápido de entender, forte visualmente, direto para gerar confiança e facilitar contato.

A primeira impressão precisa responder em poucos segundos:

- Quem é este perfil?
- O que ele faz?
- O que ele procura?
- Como continuo a conversa?

## 2. Regra mobile-first

A maior parte do uso será mobile. Toda tela Pro deve ser desenhada primeiro para telas de 390px a 430px de largura e depois expandida para desktop.

Regras obrigatórias:

- Nada pode cortar no mobile.
- Textos longos devem quebrar naturalmente.
- Botões principais devem ter toque confortável.
- Foto, nome e atuação profissional aparecem antes de qualquer bloco secundário.
- Informações de baixa prioridade não devem competir com a identidade do perfil.

## 3. Hierarquia do Perfil Pro público

Ordem recomendada:

1. Nome público do perfil.
2. Botões de navegação do topo: voltar, experiência Clubber, Perfil profissional.
3. Card principal do perfil.
4. Cartão de visitas: o que faz, o que busca, temas profissionais.
5. Canais principais para continuar: e-mail, website, LinkedIn, Instagram profissional, marketplace, WhatsApp quando for ação principal.

## 4. Card principal do Perfil Pro

O card principal deve parecer um perfil profissional premium, não uma chamada publicitária.

Padrão aprovado:

- Foto forte e maior no mobile.
- Nome do perfil em destaque.
- Linha de atuação logo abaixo: `Empresário | tecnologia de software`.
- Empresa e cidade em linha secundária.
- Texto livre do próprio usuário com o que ele quer transmitir.
- Botões: `Seguindo`, `Conexão confirmada`, `Falar no WhatsApp`.

Evitar:

- Headline automática exagerada.
- Frases genéricas como “pronto para novas conversas”.
- Caixa solta de ilustração sem função.
- Métricas sociais públicas no início da rede.

## 5. Métricas sociais

Não mostrar no perfil público:

- Seguidores.
- Seguindo.
- Número bruto de conexões.

Motivo: como a rede Pro é nova e fechada, números pequenos podem passar baixa relevância. Estes dados devem continuar existindo no banco para ranking, reputação, dashboard interno e inteligência futura.

Público recomendado:

- `Perfil profissional ativo`.
- `Conexão profissional disponível`.
- `Canais profissionais disponíveis`.
- `Aberto a conversas profissionais`, quando fizer sentido.

## 6. Canais profissionais

Os canais são parte importante do cartão de visitas. Eles não devem ficar como bloco secundário fraco.

Padrão:

- Título: `Canais principais` ou `Canais para continuar`.
- Subtítulo curto: `Links oficiais e caminhos diretos para continuar a conversa.`
- Cards clicáveis com nome do canal, descrição curta e ação `Abrir`.
- Usar ícones oficiais apenas para marcas reconhecíveis: LinkedIn, Instagram, YouTube, WhatsApp.
- Não usar ícone genérico para e-mail ou website.

Evitar duplicidade:

- Se existe botão principal `Falar no WhatsApp`, não repetir WhatsApp em outros blocos.
- Se existe `E-mail profissional` em contato rápido, não repetir como canal adicional sem necessidade.

## 7. Botões Pro

Botões devem ter a mesma família visual:

- Altura mínima: 40px no mobile.
- Borda arredondada: 14px a 18px.
- Fonte forte, sem exagero.
- Fundo escuro translúcido para secundários.
- Azul/teal para ação positiva ou status confirmado.
- Gradiente azul/violeta apenas para botão de modo ativo ou ação principal.

Estados recomendados:

- `Seguir` / `Seguindo`.
- `Conectar` / `Conexão confirmada`.
- `Falar no WhatsApp`.
- `Abrir` para links externos.

## 8. Cores e atmosfera

O Pro usa uma estética premium escura com azul/ciano:

- Fundo base: quase preto.
- Cards: azul petróleo, slate escuro e gradiente azul/ciano.
- Bordas: azul/ciano com baixa opacidade.
- Texto principal: branco suave.
- Texto secundário: azul claro/cinza.
- Destaques: ciano/azul claro.

O Pro deve transmitir: confiança, tecnologia, profissionalismo, rede qualificada.

## 9. Diferença entre Pro e Club

Não copiar este padrão visual para o Club.

- Pro: profissional, limpo, premium, direto, confiança.
- Club: cultural, neon, energia, cena eletrônica, encontros, pertencimento.

Ambos podem compartilhar qualidade visual, mas não a mesma linguagem.

## 10. Aplicação gradual

A partir desta versão, aplicar este padrão em etapas:

1. Perfil Pro público — já aprovado como referência.
2. `/network` — usar linguagem parecida, mas mais compacta.
3. `/dashboard/network` — usar linguagem Pro, porém mais operacional.
4. `/dashboard/cards/[card_id]/pro` — manter edição funcional, mas com a mesma identidade.
5. Componentizar tokens e padrões comuns quando houver repetição suficiente.

## 11. Decisão de produto

Este padrão deve ser tratado como **referência visual do Perfil Pro** até nova revisão de marca.

Mudanças futuras devem preservar:

- Mobile-first.
- Foto forte.
- Nome como centro da identidade.
- Canais profissionais valorizados.
- Ausência de métricas sociais públicas brutas.
- Separação clara entre Pro e Club.
