# REVISÃO ESTRUTURAL DA MIGRATION COMERCIAL DE INGRESSOS

## Versão

`v4.8.88-event-ticket-commercial-migration-structural-review-safe`

## Base revisada

- versão-base: `v4.8.87-event-ticket-commercial-migration-draft-safe`
- commit-base: `39909dc3664a14091b374b729e2d82c678412589`
- SQL revisado: `docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT.sql`
- SHA-256 do SQL: `B2CA2791D41E38697754FD29BBA1DED0E1DD7F0EB4603A377E5689E53526BA62`

## Decisão

**`needs_adjustment`**

O rascunho da `v4.8.87` preserva corretamente as principais separações estratégicas e contém boas barreiras contra execução acidental. Entretanto, ele ainda não pode ser promovido para uma migration executável.

A revisão encontrou lacunas críticas em:

- lifecycle comercial;
- autorização transacional;
- integridade entre solicitação, evento e canal;
- expiração e troca de canal;
- proteção de URLs;
- sinais de compra e conversão;
- privacidade dos hashes e metadata;
- regras financeiras;
- auditoria;
- backfill;
- retenção;
- compatibilidade exata com o schema de produção.

Nesta versão, o SQL revisado não foi alterado.

---

# 1. Escopo e método

A revisão comparou o rascunho SQL com:

- governança comercial da `v4.8.84`;
- contrato de persistência da `v4.8.85`;
- plano físico da `v4.8.86`;
- migrations existentes relacionadas a eventos, monetização, RLS, funções e triggers;
- estrutura atual de `canonical_events`, `canonical_event_sources`, `event_groups`, `partner_ticket_requests` e `event_ticket_intents`.

A revisão foi estrutural e estática.

Ela não executou o SQL, não conectou ao Supabase e não validou o schema real de produção. A validação em banco descartável permanece obrigatória antes de qualquer migration real.

---

# 2. Controles aprovados

Foram aprovados 17 controles do rascunho:

1. SQL fora de `supabase/migrations`;
2. guarda incondicional antes de DDL e DML;
3. transação encerrada com `ROLLBACK`;
4. referência oficial separada do canal monetizado;
5. solicitação separada do canal definitivo;
6. índice parcial para um canal `active` por evento;
7. canais legados rebaixados para `draft`;
8. `ticket_url` legado tratado apenas como referência candidata;
9. `ticket_acquired` tratado somente como compra autodeclarada;
10. clique separado de compra e receita;
11. intenção de exigir evidência confiável para conversão confirmada;
12. auditoria comercial projetada como append-only;
13. RLS e privilégios deny-by-default para clientes;
14. ausência de view pública no banco;
15. URL comercial bruta restrita ao servidor;
16. mapeamento canônico explícito antes do backfill;
17. ativação pública mantida em versão futura separada.

Esses controles devem ser preservados nas correções.

---

# 3. Ajustes obrigatórios

## 3.1 Congelar campos sensíveis do canal ativo

O trigger atual aceita atualizações mantendo o mesmo status.

Assim, um canal `active` poderia ter alterados:

- `commercial_url`;
- `authorized_domain`;
- método de rastreamento;
- referência de segredo;
- modelo de remuneração;
- comissão;
- referência de autorização;
- vigência.

Essa alteração ocorreria sem nova autorização ou ativação.

### Correção obrigatória

Enquanto o canal estiver `active`, campos comerciais sensíveis devem ser imutáveis.

Mudanças devem exigir:

- pausa;
- novo `draft`;
- nova autorização;
- nova ativação;

ou a criação de um novo canal com troca atômica.

## 3.2 Criar um RPC administrativo transacional

Os triggers dependem de:

- `mhidas.commercial_actor_role`;
- `mhidas.commercial_actor_user_id`;
- `mhidas.commercial_operation_reason`;
- `mhidas.commercial_correlation_id`.

Uma atualização comum via PostgREST não garante `SET LOCAL` e mutação na mesma transação.

### Correção obrigatória

Definir um RPC único que:

1. valide o admin real;
2. receba confirmação e idempotência;
3. configure o contexto local;
4. valide a versão esperada;
5. execute a mutação;
6. grave auditoria;
7. releia o resultado;
8. confirme exatamente uma linha afetada.

## 3.3 Proteger o lifecycle das solicitações

A tabela de solicitações possui valores permitidos, mas não possui:

- máquina de estados;
- matriz de atores;
- bloqueio de transições inválidas;
- trigger de auditoria;
- regra de retirada pelo parceiro;
- regra de aprovação exclusiva do admin.

### Correção obrigatória

Definir transições e evidências para:

- `pending`;
- `needs_info`;
- `approved`;
- `rejected`;
- `withdrawn`.

A aprovação não pode ativar canal.

## 3.4 Validar a relação solicitação–canal

O SQL atual não garante que `source_request_id`:

- pertence ao mesmo `canonical_event_id`;
- está `approved`;
- existe quando `source_origin = approved_partner_request`.

### Correção obrigatória

Criar validação cruzada no RPC/trigger.

## 3.5 Resolver expiração e troca de canal

O trigger do canal permite apenas ator `useclubbers_admin`.

Não existe:

- `expired_at`;
- ator de expiração;
- job de expiração;
- troca atômica de canal.

Um canal vencido que continue com status `active` ocupa o índice único e impede o sucessor.

### Correção obrigatória

Definir:

- transição auditada por `system`/`automation`;
- job idempotente;
- expiração lógica pelo resolvedor;
- operação atômica para encerrar o canal anterior e ativar o sucessor.

## 3.6 Aplicar concorrência otimista real

`lock_version` é incrementado, mas o banco não exige a versão esperada.

### Correção obrigatória

O RPC deverá receber `expected_lock_version` e atualizar somente quando a versão atual for idêntica.

Nenhuma linha afetada deve retornar conflito, não sucesso.

## 3.7 Definir o registro verificado de parceiros

`partner_id` ainda não possui:

- foreign key;
- entidade aprovada;
- ownership;
- vínculo entre usuário e parceiro;
- regra de desativação.

### Correção obrigatória

Congelar o registro de parceiros antes da migration real.

## 3.8 Vincular domínio e URL da referência oficial

A validação de `canonical_event_sources` não garante que:

`reference_domain`

corresponda ao hostname real de:

`source_url`

Também não rebaixa automaticamente uma referência quando `source_url` muda.

### Correção obrigatória

- normalizar o hostname;
- comparar domínio e URL;
- observar mudança de `source_url`;
- rebaixar `validated` para `candidate` ou `stale`;
- exigir nova validação.

## 3.9 Fechar a segurança da URL comercial

A regex atual não é suficiente para bloquear:

- porta não padrão;
- IP privado;
- hostname local;
- DNS privado;
- redirecionamento para outro domínio;
- SSRF.

### Correção obrigatória

Reutilizar a política segura já empregada na captura de imagens:

- HTTPS;
- porta 443;
- DNS público;
- bloqueio de hosts privados;
- redirecionamentos limitados;
- domínio final autorizado;
- timeout;
- nenhuma credencial na URL.

## 3.10 Tornar sinais de compra fatos imutáveis

O trigger atual permite `UPDATE`.

Assim, um registro `self_declared_purchase` poderia ser transformado no mesmo registro em `confirmed_conversion`.

Isso viola a separação aprovada.

### Correção obrigatória

- `signal_type` imutável;
- evidência imutável;
- conversão confirmada criada como novo fato;
- vínculo com sinal anterior;
- correção por evento compensatório auditado;
- bloqueio de exclusão física.

## 3.11 Exigir canal e namespace na conversão

Uma conversão atribuída ou confirmada pode existir sem `channel_id`.

O hash externo é único globalmente, mas o mesmo identificador pode ser reutilizado por ticketeiras diferentes.

### Correção obrigatória

- `channel_id` obrigatório para conversões atribuídas e confirmadas;
- namespace por provedor/canal;
- hash versionado;
- replay protection;
- idempotência da integração.

## 3.12 Proteger hashes e metadata

Campos com nome de hash aceitam texto arbitrário.

`metadata` também pode armazenar:

- IP bruto;
- URL bruta;
- segredo;
- transação original;
- dados pessoais desnecessários.

### Correção obrigatória

- formato de hash validado;
- algoritmo e versão registrados;
- allowlist de metadata;
- rejeição de chaves sensíveis;
- testes nas rotas;
- política de minimização.

A ausência de uma coluna chamada `ip_address` não é suficiente para afirmar que IP bruto está estruturalmente bloqueado.

## 3.13 Completar o lifecycle das comunicações

O guard atual não define todas as transições e evidências.

Faltam:

- `approved_at`;
- `published_at`;
- timestamps de pausa e expiração;
- approved_by obrigatório;
- auditoria de transição;
- evento obrigatório para comunicação comercial de ingressos.

### Correção obrigatória

Criar máquina de estados completa e manter publicação exclusiva do admin.

## 3.14 Corrigir a matriz financeira

O check atual permite inconsistências:

- `service_fee_share` exige valor fixo;
- `hybrid` pode possuir valor fixo sem moeda;
- `fixed_campaign` e `licensing` podem carregar comissões sem bloqueio;
- não há matriz mutuamente exclusiva.

### Correção obrigatória

Jurídico e comercial devem congelar a semântica de cada modelo antes do SQL final.

## 3.15 Ampliar a auditoria

A auditoria automática cobre somente o canal.

Não cobre integralmente:

- solicitação;
- comunicação;
- conversão;
- correções;
- limpeza por retenção.

Os snapshots também não guardam hashes dos termos sensíveis alterados.

### Correção obrigatória

Auditar todos os lifecycles e preservar:

- hash do destino;
- hash dos termos comerciais;
- identidade canônica;
- ação;
- ator;
- motivo;
- correlação;
- versão.

Sem expor segredo bruto.

## 3.16 Tornar o backfill reconciliável

O backfill pode filtrar solicitações antigas aprovadas sem gerar erro.

Também faltam:

- contagens esperadas;
- contagens inseridas;
- relatório de rejeitados;
- reconciliação por status;
- ligação entre canal `draft` e solicitação normalizada.

### Correção obrigatória

Nenhuma linha pode ser omitida silenciosamente.

A migration deve falhar se:

- uma linha não estiver classificada;
- um mapeamento estiver ausente;
- a contagem não fechar;
- a relação solicitação–canal não puder ser reconstruída.

## 3.17 Não mascarar drift do schema

Uso amplo de:

- `IF NOT EXISTS`;
- `CREATE OR REPLACE`;

pode esconder objetos parciais ou incompatíveis.

### Correção obrigatória

A migration real deve exigir inventário exato e falhar diante de qualquer objeto pré-existente fora do hash aprovado.

## 3.18 Implementar retenção antes do tracking

Datas de retenção não executam limpeza.

### Correção obrigatória

Antes de registrar cliques:

- política aprovada;
- job idempotente;
- anonimização ou exclusão;
- auditoria do job;
- teste de falha e retomada;
- prova de execução.

---

# 4. Pré-requisitos externos

A promoção continua bloqueada até existirem:

1. inventário e hash atual do schema de produção;
2. backup testado e contagens legadas;
3. mapeamento aprovado de `event_group_id` para `canonical_event_id`;
4. registro verificado de parceiros;
5. contrato do gerenciador de segredos;
6. política jurídica de retenção e job;
7. RPC transacional e predicado real de admin;
8. assinatura e replay protection das conversões;
9. teste de regressão dos grants de `canonical_event_sources`;
10. execução completa em banco descartável, incluindo rollback.

---

# 5. Classificação de prontidão

## Decisão atual

`needs_adjustment`

## Significado

O rascunho não foi rejeitado.

Ele constitui uma base útil e preserva as decisões estratégicas centrais. Porém, precisa de uma nova revisão do próprio SQL antes de poder ser considerado candidato a migration executável.

## Promoção permitida agora

Não.

## Próxima entrega recomendada

Uma versão separada deve corrigir o rascunho, mantendo-o em `docs/sql` e ainda protegido contra execução.

Somente após nova revisão estrutural, validação em banco descartável e fechamento dos pré-requisitos poderá ser criada uma migration real em `supabase/migrations`.

---

# 6. Estado técnico desta versão

A `v4.8.88`:

- não altera o SQL da `v4.8.87`;
- não cria migration executável;
- não move arquivo para `supabase/migrations`;
- não conecta ao Supabase;
- não executa DDL ou DML;
- não cria tabela;
- não aplica RLS;
- não ativa link;
- não altera a página pública.

Flags:

- `review_decision=needs_adjustment`
- `approved_controls=17`
- `required_adjustments=18`
- `external_prerequisites=10`
- `reviewed_draft_changed=False`
- `executable_migration_created=False`
- `sql_moved_to_supabase_migrations=False`
- `supabase_operation_performed=False`
- `database_write_performed=False`
- `ticket_link_activated=False`
- `public_event_page_changed=False`
