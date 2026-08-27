# MHIDAS / USECLUBBERS — Visual Standard Lock V1

## Regra de produto

A identidade visual é separada por modo e não pode ser improvisada por componente.

### Base compartilhada

- Fundo principal: `#050505`
- Card escuro: `#0E0E0E`
- Card secundário: `#111111`
- Texto principal: `#F8FAFC`
- Texto secundário: `#CBD5E1`
- Bordas: `rgba(255,255,255,0.10)`

### Clubber

- Ação/sinal discreto: `#2A8694`
- Ação forte discreta: `#247C88`

O teal do Clubber não pode dominar superfícies grandes. É proibido usá-lo como glow/sombra dominante, halo de página, card inteiro ou gradiente de fundo predominante.

### Profissional / Pro

- Azul profissional: `#1D4ED8`
- Azul premium profundo: `#0F172A`
- Indigo discreto: `#4F46E5`

Clubber e Pro não podem misturar seus tokens de identidade.

## Regra de implementação

1. Componentes novos devem consumir os tokens CSS oficiais.
2. Novas cores de marca hardcoded não são permitidas.
3. Glows verdes dominantes são proibidos.
4. Superfícies grandes verdes são proibidas.
5. O gate `npm run visual:guard` usa um baseline de dívida existente e falha se surgir qualquer nova violação.
6. Durante a recuperação visual, o baseline só pode diminuir. Ao final da recuperação, o gate deve migrar para modo estrito sem dívida.
7. Cores semânticas de erro, alerta e sucesso são uma camada separada da identidade de marca e devem ser tokenizadas antes de novos usos.
## Regra de cápsulas

Texto informativo que não executa ação não pode ser apresentado em cápsula/pill.

- Nomes, funções, cidades, datas, categorias, contadores e metadados: texto simples.
- Status informativo: texto simples.
- Cápsulas ficam restritas a controles interativos reais: botões, filtros, seletores, toggles ou ações.
- Avatares, fotos circulares e pequenos dots gráficos não são considerados cápsulas.