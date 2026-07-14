export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_VERSION =
  "v4.8.89-event-ticket-commercial-migration-adjustment-plan-safe" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_BASE_VERSION =
  "v4.8.88-event-ticket-commercial-migration-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_SHA256 =
  "60456C95D3D220CA224F329B1B5F0ACDF83F6883591988C7198014CD1E20603A" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT_SHA256 =
  "B2CA2791D41E38697754FD29BBA1DED0E1DD7F0EB4603A377E5689E53526BA62" as const;

export type EventTicketCommercialMigrationAdjustmentPlanDecision =
  | "adjustment_plan_ready"
  | "blocked";

export type EventTicketCommercialMigrationAdjustmentSeverity =
  | "critical"
  | "high"
  | "medium";

export type EventTicketCommercialMigrationAdjustmentCategory =
  | "governance"
  | "lifecycle"
  | "authorization"
  | "audit"
  | "privacy"
  | "retention"
  | "backfill"
  | "referential_integrity"
  | "commercial_finance"
  | "url_security"
  | "database_compatibility"
  | "conversion_integrity";

export type EventTicketCommercialMigrationAdjustmentPhase = {
  phaseKey: string;
  order: number;
  title: string;
  objective: string;
  adjustmentKeys: string[];
  exitCriteria: string[];
};

export type EventTicketCommercialMigrationAdjustmentItem = {
  adjustmentKey: string;
  phaseKey: string;
  sequence: number;
  severity: EventTicketCommercialMigrationAdjustmentSeverity;
  category: EventTicketCommercialMigrationAdjustmentCategory;
  title: string;
  problem: string;
  risk: string;
  databaseObjects: string[];
  sqlStrategy: string[];
  dependsOnAdjustmentKeys: string[];
  externalPrerequisiteKeys: string[];
  acceptanceTests: string[];
  doneWhen: string;
};

export type EventTicketCommercialMigrationAdjustmentPrerequisite = {
  prerequisiteKey: string;
  title: string;
  requiredEvidence: string;
  requiredBeforePhaseKey: string;
};

export type EventTicketCommercialMigrationAdjustmentPlan = {
  version: typeof EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_VERSION;
  baseVersion:
    typeof EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_BASE_VERSION;
  reviewedStructuralReviewSha256:
    typeof EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_SHA256;
  reviewedDraftSha256: typeof EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT_SHA256;
  decision: EventTicketCommercialMigrationAdjustmentPlanDecision;
  decisionReason: string;
  phases: EventTicketCommercialMigrationAdjustmentPhase[];
  adjustments: EventTicketCommercialMigrationAdjustmentItem[];
  externalPrerequisites: EventTicketCommercialMigrationAdjustmentPrerequisite[];
  nextAllowedArtifact: "corrected_migration_draft_safe";
  promotionToExecutableMigrationAllowed: false;
  reviewedDraftChanged: false;
  executableMigrationCreated: false;
  sqlMovedToSupabaseMigrations: false;
  supabaseOperationPerformed: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
  publicEventPageChanged: false;
};

export type EventTicketCommercialMigrationAdjustmentPlanRequest = {
  requestDraftMutation?: boolean | null;
  requestExecutableMigration?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
};

export type EventTicketCommercialMigrationAdjustmentPlanState =
  | "adjustment_plan_ready"
  | "blocked_draft_mutation_requested"
  | "blocked_executable_migration_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested";

export type EventTicketCommercialMigrationAdjustmentPlanDecisionResult = {
  ok: boolean;
  state: EventTicketCommercialMigrationAdjustmentPlanState;
  reason: string;
  plan: EventTicketCommercialMigrationAdjustmentPlan;
  reviewedDraftChanged: false;
  executableMigrationCreated: false;
  supabaseOperationPerformed: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
};

export type EventTicketCommercialMigrationAdjustmentPlanSelfTestResult = {
  ok: boolean;
  version: typeof EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_VERSION;
  checks: Record<string, boolean>;
  failedChecks: string[];
  checkCount: number;
  decision: EventTicketCommercialMigrationAdjustmentPlanDecision;
  phaseCount: number;
  adjustmentCount: number;
  criticalAdjustmentCount: number;
  externalPrerequisiteCount: number;
  acceptanceTestCount: number;
  promotionToExecutableMigrationAllowed: false;
  reviewedDraftChanged: false;
  executableMigrationCreated: false;
  supabaseOperationPerformed: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
};

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PHASES: EventTicketCommercialMigrationAdjustmentPhase[] =
[
  {
    "phaseKey": "contract_and_schema_preflight",
    "order": 1,
    "title": "Congelar contratos externos e o preflight exato do schema",
    "objective": "Eliminar decisões em aberto e impedir que a futura correção mascare drift ou invente entidades não aprovadas.",
    "adjustmentKeys": [
      "exact_schema_preflight_without_drift_masking",
      "verified_partner_registry_foreign_key",
      "financial_field_matrix"
    ],
    "exitCriteria": [
      "Inventário e assinatura do schema de produção aprovados.",
      "Contrato do registro verificado de parceiros congelado.",
      "Matriz financeira aprovada por jurídico e comercial."
    ]
  },
  {
    "phaseKey": "transactional_admin_boundary",
    "order": 2,
    "title": "Criar a fronteira administrativa transacional",
    "objective": "Concentrar autorização, idempotência, concorrência, auditoria e readback em uma única transação protegida.",
    "adjustmentKeys": [
      "transactional_admin_mutation_rpc",
      "optimistic_concurrency_expected_version"
    ],
    "exitCriteria": [
      "RPC SECURITY DEFINER com search_path fixo e grants mínimos definido.",
      "expected_lock_version obrigatório e conflito verificável.",
      "Contexto do ator e mutação executados na mesma transação."
    ]
  },
  {
    "phaseKey": "partner_request_governance",
    "order": 3,
    "title": "Fechar governança de solicitações de parceiros",
    "objective": "Garantir identidade verificada, máquina de estados, auditoria e consistência entre solicitação, evento e canal.",
    "adjustmentKeys": [
      "request_lifecycle_guard_and_audit",
      "request_channel_cross_entity_consistency"
    ],
    "exitCriteria": [
      "Transições e atores permitidos definidos para cada status.",
      "Aprovação de solicitação não ativa canal.",
      "source_request_id só referencia solicitação aprovada do mesmo evento."
    ]
  },
  {
    "phaseKey": "active_channel_integrity",
    "order": 4,
    "title": "Blindar o lifecycle do canal comercial ativo",
    "objective": "Impedir alteração material sem nova autorização e permitir expiração e troca atômica sem janela inválida.",
    "adjustmentKeys": [
      "freeze_sensitive_active_channel_fields",
      "expiry_and_atomic_channel_cutover"
    ],
    "exitCriteria": [
      "Campos sensíveis imutáveis enquanto o canal permanecer active.",
      "Expiração idempotente e auditada definida.",
      "Cutover encerra o anterior e ativa o sucessor atomicamente."
    ]
  },
  {
    "phaseKey": "official_reference_and_url_security",
    "order": 5,
    "title": "Fechar integridade de referência oficial e segurança de URL",
    "objective": "Vincular domínio declarado ao destino real e impedir SSRF, host privado, porta indevida ou redirect não autorizado.",
    "adjustmentKeys": [
      "official_reference_url_domain_integrity",
      "commercial_url_public_network_validation"
    ],
    "exitCriteria": [
      "reference_domain corresponde ao hostname normalizado de source_url.",
      "Mudança de source_url rebaixa a validação oficial.",
      "Política de URL pública segura cobre DNS, porta e redirects."
    ]
  },
  {
    "phaseKey": "conversion_and_privacy_integrity",
    "order": 6,
    "title": "Tornar sinais, conversões e dados pseudonimizados estruturalmente seguros",
    "objective": "Preservar a linhagem factual e impedir promoção, replay, colisão de namespace ou armazenamento bruto indevido.",
    "adjustmentKeys": [
      "immutable_purchase_signal_lineage",
      "conversion_channel_and_provider_namespace",
      "hash_format_and_metadata_privacy_guards"
    ],
    "exitCriteria": [
      "signal_type e evidência são imutáveis.",
      "Conversão confirmada é novo fato com canal e namespace confiável.",
      "Hashes versionados e metadata por allowlist rejeitam dados sensíveis."
    ]
  },
  {
    "phaseKey": "communication_and_audit_coverage",
    "order": 7,
    "title": "Completar lifecycle editorial e cobertura de auditoria",
    "objective": "Registrar todas as decisões comerciais e editoriais relevantes sem expor URLs, segredos ou termos brutos.",
    "adjustmentKeys": [
      "communication_lifecycle_evidence",
      "audit_coverage_and_consistency"
    ],
    "exitCriteria": [
      "Comunicações possuem máquina de estados, atores e timestamps completos.",
      "Solicitações, canais, comunicações, conversões, correções e limpeza são auditados.",
      "Snapshots usam hashes e redações seguras."
    ]
  },
  {
    "phaseKey": "retention_enforcement",
    "order": 8,
    "title": "Implantar retenção antes de habilitar tracking",
    "objective": "Converter datas declarativas em limpeza idempotente, auditada e recuperável.",
    "adjustmentKeys": [
      "retention_and_cleanup_enforcement"
    ],
    "exitCriteria": [
      "Prazos por tipo de dado possuem base jurídica aprovada.",
      "Job idempotente de anonimização ou exclusão definido.",
      "Falha, retomada, auditoria e prova de execução possuem testes."
    ]
  },
  {
    "phaseKey": "backfill_reconciliation",
    "order": 9,
    "title": "Executar backfill somente com reconciliação fechada",
    "objective": "Garantir classificação total, contagens exatas e nenhuma omissão silenciosa de dados legados.",
    "adjustmentKeys": [
      "backfill_reconciliation_and_no_silent_skip"
    ],
    "exitCriteria": [
      "Relatório de elegibilidade e rejeição cobre todas as linhas.",
      "Contagens antes e depois fecham por status e destino.",
      "Canal draft preserva vínculo com solicitação normalizada quando aplicável."
    ]
  }
];

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENTS: EventTicketCommercialMigrationAdjustmentItem[] =
[
  {
    "adjustmentKey": "exact_schema_preflight_without_drift_masking",
    "phaseKey": "contract_and_schema_preflight",
    "sequence": 1,
    "severity": "critical",
    "category": "database_compatibility",
    "title": "Substituir tolerância silenciosa por preflight exato",
    "problem": "IF NOT EXISTS e CREATE OR REPLACE podem aceitar objetos parciais ou assinaturas incompatíveis.",
    "risk": "A migration pode concluir sobre um schema divergente sem criar todas as garantias planejadas.",
    "databaseObjects": [
      "pg_catalog",
      "canonical_event_sources",
      "funções, triggers, constraints e índices comerciais"
    ],
    "sqlStrategy": [
      "Inventariar tipo, nulabilidade, defaults, constraints, índices, funções, triggers, RLS e grants.",
      "Comparar assinaturas com um manifesto aprovado e falhar em qualquer divergência.",
      "Criar objetos com nomes versionados sem sobrescrever funções desconhecidas."
    ],
    "dependsOnAdjustmentKeys": [],
    "externalPrerequisiteKeys": [
      "fresh_production_schema_inventory"
    ],
    "acceptanceTests": [
      "Objeto incompatível pré-existente aborta antes de DDL.",
      "Objeto ausente segue para criação planejada.",
      "Assinaturas aprovadas produzem relatório determinístico."
    ],
    "doneWhen": "O preflight falha fechado e o manifesto do schema aprovado acompanha a futura correção."
  },
  {
    "adjustmentKey": "verified_partner_registry_foreign_key",
    "phaseKey": "contract_and_schema_preflight",
    "sequence": 2,
    "severity": "critical",
    "category": "authorization",
    "title": "Definir registro verificado e vínculo de parceiros",
    "problem": "partner_id não possui foreign key, ownership nem prova de vínculo do usuário remetente.",
    "risk": "Solicitações e comunicações podem atribuir identidade a um parceiro não verificado.",
    "databaseObjects": [
      "registro de parceiros a aprovar",
      "event_ticket_partnership_requests",
      "partner_official_communications"
    ],
    "sqlStrategy": [
      "Congelar entidade, chave primária, status, papéis e desativação do parceiro.",
      "Adicionar foreign keys e regras de ownership sem permitir publicação direta.",
      "Separar usuário representante, parceiro e autorização comercial."
    ],
    "dependsOnAdjustmentKeys": [
      "exact_schema_preflight_without_drift_masking"
    ],
    "externalPrerequisiteKeys": [
      "verified_partner_registry_contract"
    ],
    "acceptanceTests": [
      "partner_id inexistente é rejeitado.",
      "Usuário sem vínculo não envia em nome do parceiro.",
      "Parceiro desativado não cria nova solicitação."
    ],
    "doneWhen": "A entidade verificada e suas foreign keys estão aprovadas sem conceder poder de ativação ao parceiro."
  },
  {
    "adjustmentKey": "financial_field_matrix",
    "phaseKey": "contract_and_schema_preflight",
    "sequence": 3,
    "severity": "critical",
    "category": "commercial_finance",
    "title": "Congelar e aplicar matriz financeira mutuamente exclusiva",
    "problem": "Os modelos atuais aceitam combinações de percentual, valor fixo e moeda semanticamente incoerentes.",
    "risk": "Termos inválidos podem alimentar relatórios, atribuição ou pagamento incorreto.",
    "databaseObjects": [
      "event_ticket_commercial_channels"
    ],
    "sqlStrategy": [
      "Definir matriz por remuneration_model com campos obrigatórios, proibidos e limites.",
      "Exigir moeda quando houver valor monetário e precisão aprovada.",
      "Versionar termos financeiros e registrar hash seguro no audit log."
    ],
    "dependsOnAdjustmentKeys": [
      "exact_schema_preflight_without_drift_masking"
    ],
    "externalPrerequisiteKeys": [],
    "acceptanceTests": [
      "Cada modelo aceita somente sua combinação válida.",
      "Campo financeiro proibido causa rejeição.",
      "Mudança financeira em canal ativo é rejeitada."
    ],
    "doneWhen": "Jurídico e comercial aprovam a matriz e todos os checks positivos e negativos passam."
  },
  {
    "adjustmentKey": "transactional_admin_mutation_rpc",
    "phaseKey": "transactional_admin_boundary",
    "sequence": 4,
    "severity": "critical",
    "category": "authorization",
    "title": "Criar RPC administrativa transacional e auditada",
    "problem": "SET LOCAL, autorização, mutação e auditoria não estão garantidos na mesma transação por escrita comum via PostgREST.",
    "risk": "Triggers podem operar sem contexto confiável ou a auditoria pode divergir da mutação.",
    "databaseObjects": [
      "mhidas_admin_mutate_event_ticket_commercial_channel_v1",
      "event_ticket_commercial_channels",
      "event_ticket_commercial_audit_log"
    ],
    "sqlStrategy": [
      "Criar função SECURITY DEFINER com search_path fixo e EXECUTE revogado por padrão.",
      "Validar admin real, confirmação, motivo, correlação e idempotência.",
      "Configurar contexto local, executar uma mutação, auditar e reler na mesma transação."
    ],
    "dependsOnAdjustmentKeys": [
      "exact_schema_preflight_without_drift_masking",
      "financial_field_matrix"
    ],
    "externalPrerequisiteKeys": [
      "admin_authorization_rpc_contract"
    ],
    "acceptanceTests": [
      "Ator não admin é rejeitado.",
      "Retry com mesma idempotency_key retorna o mesmo resultado.",
      "Falha de auditoria reverte a mutação."
    ],
    "doneWhen": "A única superfície de lifecycle comercial é a RPC protegida com readback e uma linha afetada."
  },
  {
    "adjustmentKey": "optimistic_concurrency_expected_version",
    "phaseKey": "transactional_admin_boundary",
    "sequence": 5,
    "severity": "high",
    "category": "lifecycle",
    "title": "Exigir expected_lock_version em toda mutação material",
    "problem": "lock_version incrementa, mas o banco não exige que o chamador prove qual versão leu.",
    "risk": "Decisões concorrentes podem sobrescrever alterações sem conflito explícito.",
    "databaseObjects": [
      "event_ticket_commercial_channels",
      "mhidas_admin_mutate_event_ticket_commercial_channel_v1"
    ],
    "sqlStrategy": [
      "Receber expected_lock_version obrigatório.",
      "Atualizar por channel_id e lock_version exatos.",
      "Retornar conflito quando nenhuma linha corresponder e nunca tratar como sucesso."
    ],
    "dependsOnAdjustmentKeys": [
      "transactional_admin_mutation_rpc"
    ],
    "externalPrerequisiteKeys": [
      "admin_authorization_rpc_contract"
    ],
    "acceptanceTests": [
      "Versão correta atualiza uma linha.",
      "Versão obsoleta retorna conflito.",
      "Duas mutações concorrentes não vencem simultaneamente."
    ],
    "doneWhen": "Nenhuma atualização material ignora a versão esperada."
  },
  {
    "adjustmentKey": "request_lifecycle_guard_and_audit",
    "phaseKey": "partner_request_governance",
    "sequence": 6,
    "severity": "critical",
    "category": "lifecycle",
    "title": "Definir máquina de estados e auditoria das solicitações",
    "problem": "A tabela permite status, mas não impõe transições, atores, evidências ou trilha integral.",
    "risk": "Parceiros ou processos internos podem saltar estados ou aprovar sem evidência suficiente.",
    "databaseObjects": [
      "event_ticket_partnership_requests",
      "event_ticket_commercial_audit_log",
      "guard/RPC de solicitações"
    ],
    "sqlStrategy": [
      "Definir transições pending, needs_info, approved, rejected e withdrawn.",
      "Restringir aprovação e rejeição ao admin; permitir retirada somente ao representante válido.",
      "Auditar cada transição com ator, motivo, correlação e versão."
    ],
    "dependsOnAdjustmentKeys": [
      "verified_partner_registry_foreign_key",
      "transactional_admin_mutation_rpc"
    ],
    "externalPrerequisiteKeys": [
      "verified_partner_registry_contract",
      "admin_authorization_rpc_contract"
    ],
    "acceptanceTests": [
      "Parceiro não aprova a própria solicitação.",
      "Transição inválida é rejeitada.",
      "Aprovação registra evidência e não ativa canal."
    ],
    "doneWhen": "Toda transição aceita está documentada, autorizada e auditada."
  },
  {
    "adjustmentKey": "request_channel_cross_entity_consistency",
    "phaseKey": "partner_request_governance",
    "sequence": 7,
    "severity": "critical",
    "category": "referential_integrity",
    "title": "Garantir consistência entre solicitação, evento e canal",
    "problem": "source_request_id pode apontar para solicitação de outro evento, status inadequado ou origem incompatível.",
    "risk": "Um canal pode herdar autorização comercial que não pertence ao evento ou não foi aprovada.",
    "databaseObjects": [
      "event_ticket_partnership_requests",
      "event_ticket_commercial_channels",
      "RPC de canal"
    ],
    "sqlStrategy": [
      "Validar mesma canonical_event_id na RPC e em guard defensivo.",
      "Exigir request_status approved quando source_origin for approved_partner_request.",
      "Proibir source_request_id incompatível com outras origens."
    ],
    "dependsOnAdjustmentKeys": [
      "request_lifecycle_guard_and_audit",
      "transactional_admin_mutation_rpc"
    ],
    "externalPrerequisiteKeys": [],
    "acceptanceTests": [
      "Solicitação de outro evento é rejeitada.",
      "Solicitação pending não origina canal.",
      "Origem manual não aceita source_request_id indevido."
    ],
    "doneWhen": "Nenhum canal persiste referência cruzada inconsistente."
  },
  {
    "adjustmentKey": "freeze_sensitive_active_channel_fields",
    "phaseKey": "active_channel_integrity",
    "sequence": 8,
    "severity": "critical",
    "category": "governance",
    "title": "Congelar campos sensíveis enquanto o canal estiver ativo",
    "problem": "Um UPDATE pode manter channel_status active e trocar URL, domínio, tracking, segredo, remuneração, autorização ou vigência.",
    "risk": "O destino ou acordo comercial pode mudar sem nova autorização e sem nova ativação.",
    "databaseObjects": [
      "event_ticket_commercial_channels",
      "mhidas_event_ticket_commercial_channel_guard"
    ],
    "sqlStrategy": [
      "Definir allowlist mínima de campos operacionais mutáveis em active.",
      "Rejeitar alterações materiais OLD active para NEW active.",
      "Exigir pausa e novo draft ou cutover para qualquer mudança sensível."
    ],
    "dependsOnAdjustmentKeys": [
      "transactional_admin_mutation_rpc",
      "optimistic_concurrency_expected_version",
      "financial_field_matrix"
    ],
    "externalPrerequisiteKeys": [],
    "acceptanceTests": [
      "Troca de commercial_url em active é rejeitada.",
      "Troca de remuneração em active é rejeitada.",
      "Novo draft autorizado pode ser ativado pelo cutover."
    ],
    "doneWhen": "Todos os campos sensíveis possuem teste negativo e caminho seguro de substituição."
  },
  {
    "adjustmentKey": "expiry_and_atomic_channel_cutover",
    "phaseKey": "active_channel_integrity",
    "sequence": 9,
    "severity": "critical",
    "category": "lifecycle",
    "title": "Implementar expiração auditada e troca atômica de canal",
    "problem": "Canal vencido pode permanecer active e ocupar a unicidade, impedindo um sucessor.",
    "risk": "O botão pode resolver acordo vencido ou falhar na ativação do próximo canal.",
    "databaseObjects": [
      "event_ticket_commercial_channels",
      "job de expiração",
      "RPC de cutover",
      "event_ticket_commercial_audit_log"
    ],
    "sqlStrategy": [
      "Definir status expired, expired_at e ator system/automation auditado.",
      "Resolver publicamente apenas vigência válida mesmo antes do job.",
      "Encerrar o anterior e ativar o sucessor na mesma transação e sob lock."
    ],
    "dependsOnAdjustmentKeys": [
      "freeze_sensitive_active_channel_fields",
      "optimistic_concurrency_expected_version"
    ],
    "externalPrerequisiteKeys": [],
    "acceptanceTests": [
      "Canal vencido não resolve publicamente.",
      "Job repetido é idempotente.",
      "Cutover nunca deixa dois active nem janela intermediária inválida."
    ],
    "doneWhen": "Expiração e substituição possuem operação atômica, auditoria e teste de concorrência."
  },
  {
    "adjustmentKey": "official_reference_url_domain_integrity",
    "phaseKey": "official_reference_and_url_security",
    "sequence": 10,
    "severity": "critical",
    "category": "url_security",
    "title": "Vincular reference_domain ao hostname real de source_url",
    "problem": "A referência validada não prova que o domínio declarado corresponde à URL atual nem perde validação após drift.",
    "risk": "Uma referência oficial pode mudar de destino preservando estado validated.",
    "databaseObjects": [
      "canonical_event_sources",
      "guard de referência oficial"
    ],
    "sqlStrategy": [
      "Normalizar hostname sem credenciais, porta ou ponto final.",
      "Comparar reference_domain com source_url e política de subdomínio aprovada.",
      "Ao alterar source_url, rebaixar validated para candidate/stale e exigir nova validação."
    ],
    "dependsOnAdjustmentKeys": [
      "exact_schema_preflight_without_drift_masking"
    ],
    "externalPrerequisiteKeys": [
      "canonical_source_grant_regression"
    ],
    "acceptanceTests": [
      "Domínio divergente é rejeitado.",
      "Mudança da URL rebaixa o status.",
      "Grants públicos existentes não são ampliados."
    ],
    "doneWhen": "Toda referência validada prova coerência entre URL, domínio e estado."
  },
  {
    "adjustmentKey": "commercial_url_public_network_validation",
    "phaseKey": "official_reference_and_url_security",
    "sequence": 11,
    "severity": "critical",
    "category": "url_security",
    "title": "Aplicar política completa de URL pública segura",
    "problem": "Regex HTTPS não bloqueia porta não padrão, IP privado, DNS local, credenciais ou redirects para outro domínio.",
    "risk": "O redirecionador futuro pode realizar SSRF ou enviar o usuário a destino não autorizado.",
    "databaseObjects": [
      "event_ticket_commercial_channels",
      "serviço server-only de validação e redirect"
    ],
    "sqlStrategy": [
      "Persistir apenas URL já validada pelo serviço server-only e hash da validação.",
      "Permitir HTTPS porta 443, host público e domínio final autorizado.",
      "Bloquear localhost, IP literal privado, DNS privado, credenciais e redirect fora da allowlist."
    ],
    "dependsOnAdjustmentKeys": [
      "transactional_admin_mutation_rpc",
      "freeze_sensitive_active_channel_fields"
    ],
    "externalPrerequisiteKeys": [
      "secret_manager_contract"
    ],
    "acceptanceTests": [
      "localhost, RFC1918, link-local e porta não 443 são rejeitados.",
      "Redirect para domínio diferente é rejeitado.",
      "Timeout ou DNS inconsistente falha fechado."
    ],
    "doneWhen": "A mesma política segura é aplicada no cadastro, revalidação e redirecionamento."
  },
  {
    "adjustmentKey": "immutable_purchase_signal_lineage",
    "phaseKey": "conversion_and_privacy_integrity",
    "sequence": 12,
    "severity": "critical",
    "category": "conversion_integrity",
    "title": "Preservar sinais de compra como fatos imutáveis",
    "problem": "UPDATE pode transformar self_declared_purchase no mesmo registro em confirmed_conversion.",
    "risk": "A distinção entre intenção, atribuição e receita confirmada pode ser apagada retroativamente.",
    "databaseObjects": [
      "event_ticket_purchase_signals",
      "guard append-only/compensatório"
    ],
    "sqlStrategy": [
      "Tornar signal_type, evidence_source e evidência imutáveis.",
      "Criar confirmação como novo registro vinculado ao sinal anterior.",
      "Corrigir por evento compensatório auditado e bloquear DELETE físico."
    ],
    "dependsOnAdjustmentKeys": [
      "exact_schema_preflight_without_drift_masking"
    ],
    "externalPrerequisiteKeys": [
      "trusted_conversion_signature_contract"
    ],
    "acceptanceTests": [
      "Autodeclaração não pode ser promovida por UPDATE.",
      "Confirmação cria novo fato com lineage.",
      "Correção preserva o registro original."
    ],
    "doneWhen": "A história factual é append-only e toda derivação possui vínculo explícito."
  },
  {
    "adjustmentKey": "conversion_channel_and_provider_namespace",
    "phaseKey": "conversion_and_privacy_integrity",
    "sequence": 13,
    "severity": "critical",
    "category": "conversion_integrity",
    "title": "Exigir canal, namespace e replay protection nas conversões",
    "problem": "Conversão atribuída ou confirmada pode não ter channel_id e o hash externo é global sem namespace do provedor.",
    "risk": "Vendas podem ser atribuídas sem canal monetizado ou colidir entre integrações.",
    "databaseObjects": [
      "event_ticket_purchase_signals",
      "integração confiável de conversão"
    ],
    "sqlStrategy": [
      "Exigir channel_id para attributed_conversion e confirmed_conversion.",
      "Compor unicidade por provider_namespace, hash_version e transaction_hash.",
      "Validar assinatura, timestamp, nonce e idempotência antes da inserção."
    ],
    "dependsOnAdjustmentKeys": [
      "immutable_purchase_signal_lineage",
      "transactional_admin_mutation_rpc"
    ],
    "externalPrerequisiteKeys": [
      "trusted_conversion_signature_contract"
    ],
    "acceptanceTests": [
      "Conversão sem canal é rejeitada.",
      "Mesmo ID em namespaces distintos não colide.",
      "Replay com mesmo nonce ou idempotency_key não duplica."
    ],
    "doneWhen": "Toda conversão confiável identifica canal, provedor, algoritmo e prova antirreplay."
  },
  {
    "adjustmentKey": "hash_format_and_metadata_privacy_guards",
    "phaseKey": "conversion_and_privacy_integrity",
    "sequence": 14,
    "severity": "critical",
    "category": "privacy",
    "title": "Validar hashes e restringir metadata por allowlist",
    "problem": "Campos de hash aceitam texto arbitrário e metadata pode armazenar IP, URL, segredo, transação ou dado pessoal bruto.",
    "risk": "A minimização prometida pode ser violada mesmo sem coluna explicitamente sensível.",
    "databaseObjects": [
      "event_ticket_click_attributions",
      "event_ticket_purchase_signals",
      "event_ticket_commercial_audit_log"
    ],
    "sqlStrategy": [
      "Registrar hash_algorithm e hash_version e validar tamanho/alfabeto.",
      "Definir schemas de metadata por tipo de registro.",
      "Rejeitar chaves e padrões sensíveis nas rotas e no banco defensivo."
    ],
    "dependsOnAdjustmentKeys": [
      "conversion_channel_and_provider_namespace"
    ],
    "externalPrerequisiteKeys": [
      "secret_manager_contract"
    ],
    "acceptanceTests": [
      "Hash fora do formato é rejeitado.",
      "Metadata com ip, raw_url, secret ou transaction_id é rejeitada.",
      "Payload permitido permanece serializável e mínimo."
    ],
    "doneWhen": "Nenhum campo pseudonimizado ou JSON aceita valor bruto fora da allowlist."
  },
  {
    "adjustmentKey": "communication_lifecycle_evidence",
    "phaseKey": "communication_and_audit_coverage",
    "sequence": 15,
    "severity": "high",
    "category": "governance",
    "title": "Completar lifecycle e evidência das comunicações oficiais",
    "problem": "Faltam transições completas, atores, approved_at, published_at, pausa, expiração e vínculo obrigatório ao evento/canal quando comercial.",
    "risk": "Uma comunicação pode ser publicada sem aprovação editorial suficiente ou sem contexto comercial válido.",
    "databaseObjects": [
      "partner_official_communications",
      "guard/RPC de comunicação"
    ],
    "sqlStrategy": [
      "Definir draft, submitted, approved, published, paused, expired e rejected.",
      "Manter publicação exclusiva do admin e parceiro apenas como remetente/submissor.",
      "Exigir evento e canal ativo/autorizado para comunicação comercial de ingresso."
    ],
    "dependsOnAdjustmentKeys": [
      "request_lifecycle_guard_and_audit",
      "expiry_and_atomic_channel_cutover"
    ],
    "externalPrerequisiteKeys": [
      "verified_partner_registry_contract",
      "admin_authorization_rpc_contract"
    ],
    "acceptanceTests": [
      "Parceiro não publica diretamente.",
      "Comunicação comercial sem evento/canal é rejeitada.",
      "Pausa e expiração registram ator, motivo e timestamp."
    ],
    "doneWhen": "Toda comunicação publicada possui cadeia editorial e contexto canônico auditáveis."
  },
  {
    "adjustmentKey": "audit_coverage_and_consistency",
    "phaseKey": "communication_and_audit_coverage",
    "sequence": 16,
    "severity": "high",
    "category": "audit",
    "title": "Ampliar auditoria para todos os lifecycles",
    "problem": "A auditoria automática cobre principalmente canais e não garante coerência cruzada nem hashes dos termos sensíveis.",
    "risk": "Decisões, conversões, correções ou limpezas podem ficar sem trilha suficiente.",
    "databaseObjects": [
      "event_ticket_commercial_audit_log",
      "solicitações, canais, comunicações, sinais e jobs"
    ],
    "sqlStrategy": [
      "Padronizar eventos de auditoria append-only por lifecycle.",
      "Registrar identidade canônica, versão, ação, ator, motivo, correlação e hashes redigidos.",
      "Validar que request_id, channel_id e canonical_event_id pertencem ao mesmo contexto."
    ],
    "dependsOnAdjustmentKeys": [
      "transactional_admin_mutation_rpc",
      "request_lifecycle_guard_and_audit",
      "communication_lifecycle_evidence",
      "immutable_purchase_signal_lineage"
    ],
    "externalPrerequisiteKeys": [],
    "acceptanceTests": [
      "Cada transição material gera exatamente um evento auditável.",
      "Falha ao auditar reverte a operação.",
      "Snapshot não contém URL, segredo ou termo bruto."
    ],
    "doneWhen": "A matriz de ações e alvos possui cobertura integral e consistência canônica."
  },
  {
    "adjustmentKey": "retention_and_cleanup_enforcement",
    "phaseKey": "retention_enforcement",
    "sequence": 17,
    "severity": "critical",
    "category": "retention",
    "title": "Executar retenção e limpeza antes do tracking",
    "problem": "retention_expires_at não executa anonimização, exclusão, auditoria ou prova de cumprimento.",
    "risk": "Dados pseudonimizados e pessoais podem permanecer além do prazo aprovado.",
    "databaseObjects": [
      "event_ticket_click_attributions",
      "event_ticket_purchase_signals",
      "job de retenção",
      "event_ticket_commercial_audit_log"
    ],
    "sqlStrategy": [
      "Definir ação por tipo de dado: anonimizar, agregar ou excluir.",
      "Criar job idempotente com lote, checkpoint, retry e lock.",
      "Auditar contagens e falhas sem copiar dados removidos para o log."
    ],
    "dependsOnAdjustmentKeys": [
      "hash_format_and_metadata_privacy_guards",
      "audit_coverage_and_consistency"
    ],
    "externalPrerequisiteKeys": [
      "retention_legal_basis_and_job"
    ],
    "acceptanceTests": [
      "Registro expirado recebe a ação correta.",
      "Reexecução não duplica nem falha.",
      "Interrupção retoma do checkpoint e mantém contagens."
    ],
    "doneWhen": "O tracking continua bloqueado até job, política e prova de execução estarem aprovados."
  },
  {
    "adjustmentKey": "backfill_reconciliation_and_no_silent_skip",
    "phaseKey": "backfill_reconciliation",
    "sequence": 18,
    "severity": "critical",
    "category": "backfill",
    "title": "Tornar o backfill total, reconciliável e bloqueante",
    "problem": "Filtros atuais podem omitir solicitações ou vínculos antigos sem falhar e sem fechar contagens.",
    "risk": "Dados comerciais podem desaparecer, ficar órfãos ou perder a origem histórica.",
    "databaseObjects": [
      "partner_ticket_requests legado",
      "event_ticket_intents",
      "event_ticket_partnership_requests",
      "event_ticket_commercial_channels",
      "event_ticket_purchase_signals"
    ],
    "sqlStrategy": [
      "Materializar relatório de elegibilidade, classificação e rejeição antes dos inserts.",
      "Falhar se qualquer linha não estiver classificada ou mapeada.",
      "Comparar contagens por origem/status e vincular canal draft à solicitação normalizada."
    ],
    "dependsOnAdjustmentKeys": [
      "request_channel_cross_entity_consistency",
      "immutable_purchase_signal_lineage",
      "exact_schema_preflight_without_drift_masking"
    ],
    "externalPrerequisiteKeys": [
      "backup_and_legacy_counts",
      "canonical_mapping_artifact"
    ],
    "acceptanceTests": [
      "Linha sem mapeamento aborta o backfill.",
      "Contagens de origem, inseridos, rejeitados e já existentes fecham.",
      "ticket_acquired gera somente self_declared_purchase."
    ],
    "doneWhen": "Nenhuma linha é omitida silenciosamente e o relatório final fecha em zero pendências."
  }
];

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PREREQUISITES: EventTicketCommercialMigrationAdjustmentPrerequisite[] =
[
  {
    "prerequisiteKey": "fresh_production_schema_inventory",
    "title": "Inventário atual e assinatura do schema de produção",
    "requiredEvidence": "Dump estrutural sem dados, hashes e catálogo de objetos/grants no momento do preflight.",
    "requiredBeforePhaseKey": "contract_and_schema_preflight"
  },
  {
    "prerequisiteKey": "backup_and_legacy_counts",
    "title": "Backup testado e contagens legadas",
    "requiredEvidence": "Backup restaurável e contagens por tabela/status usadas na reconciliação.",
    "requiredBeforePhaseKey": "backfill_reconciliation"
  },
  {
    "prerequisiteKey": "canonical_mapping_artifact",
    "title": "Mapeamento aprovado para canonical_event_id",
    "requiredEvidence": "Artefato versionado e sem ambiguidades para event_group_id e registros legados.",
    "requiredBeforePhaseKey": "backfill_reconciliation"
  },
  {
    "prerequisiteKey": "verified_partner_registry_contract",
    "title": "Contrato do registro verificado de parceiros",
    "requiredEvidence": "Entidade, ownership, papéis, status e política de desativação aprovados.",
    "requiredBeforePhaseKey": "contract_and_schema_preflight"
  },
  {
    "prerequisiteKey": "secret_manager_contract",
    "title": "Contrato do gerenciador de segredos",
    "requiredEvidence": "Formato de referências opacas, rotação, revogação e acesso server-only definidos.",
    "requiredBeforePhaseKey": "official_reference_and_url_security"
  },
  {
    "prerequisiteKey": "retention_legal_basis_and_job",
    "title": "Base jurídica, prazos e execução da retenção",
    "requiredEvidence": "Matriz por dado, ação, prazo, responsável, job e prova de execução aprovados.",
    "requiredBeforePhaseKey": "retention_enforcement"
  },
  {
    "prerequisiteKey": "admin_authorization_rpc_contract",
    "title": "Predicado administrativo e contrato da RPC",
    "requiredEvidence": "Fonte de verdade do admin, confirmação, idempotência, motivo, correlação e grants.",
    "requiredBeforePhaseKey": "transactional_admin_boundary"
  },
  {
    "prerequisiteKey": "trusted_conversion_signature_contract",
    "title": "Assinatura e replay protection da conversão confiável",
    "requiredEvidence": "Provedor, namespace, assinatura, timestamp, nonce, hash e rotação definidos.",
    "requiredBeforePhaseKey": "conversion_and_privacy_integrity"
  },
  {
    "prerequisiteKey": "canonical_source_grant_regression",
    "title": "Regressão dos grants de canonical_event_sources",
    "requiredEvidence": "Teste que prova ausência de ampliação de acesso após novas colunas e guards.",
    "requiredBeforePhaseKey": "official_reference_and_url_security"
  },
  {
    "prerequisiteKey": "disposable_database_validation",
    "title": "Validação completa em banco descartável",
    "requiredEvidence": "Apply, testes positivos/negativos, concorrência, backfill, rollback e diff final do schema.",
    "requiredBeforePhaseKey": "backfill_reconciliation"
  }
];

export const EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN: EventTicketCommercialMigrationAdjustmentPlan = {
  version: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_VERSION,
  baseVersion: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN_BASE_VERSION,
  reviewedStructuralReviewSha256:
    EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_SHA256,
  reviewedDraftSha256: EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT_SHA256,
  decision: "adjustment_plan_ready",
  decisionReason:
    "Os 18 bloqueadores da revisão estrutural foram convertidos em fases, dependências, estratégias e testes de aceitação. A promoção para migration executável continua bloqueada.",
  phases: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PHASES,
  adjustments: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENTS,
  externalPrerequisites:
    EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PREREQUISITES,
  nextAllowedArtifact: "corrected_migration_draft_safe",
  promotionToExecutableMigrationAllowed: false,
  reviewedDraftChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicTicketLinkActivated: false,
  publicEventPageChanged: false,
};

export function evaluateEventTicketCommercialMigrationAdjustmentPlan(
  request: EventTicketCommercialMigrationAdjustmentPlanRequest = {},
): EventTicketCommercialMigrationAdjustmentPlanDecisionResult {
  if (request.requestPublicActivation === true) {
    return {
      ok: false,
      state: "blocked_public_activation_requested",
      reason: "O plano não autoriza ativação pública de ingressos.",
      plan: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN,
      reviewedDraftChanged: false,
      executableMigrationCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
    };
  }

  if (request.requestDatabaseWrite === true) {
    return {
      ok: false,
      state: "blocked_database_write_requested",
      reason: "O plano é estático e não executa escrita no banco.",
      plan: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN,
      reviewedDraftChanged: false,
      executableMigrationCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
    };
  }

  if (request.requestExecutableMigration === true) {
    return {
      ok: false,
      state: "blocked_executable_migration_requested",
      reason: "A migration executável depende de rascunho corrigido, nova revisão e validação descartável.",
      plan: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN,
      reviewedDraftChanged: false,
      executableMigrationCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
    };
  }

  if (request.requestDraftMutation === true) {
    return {
      ok: false,
      state: "blocked_draft_mutation_requested",
      reason: "Esta versão documenta o plano e preserva o SQL da v4.8.87 sem alterações.",
      plan: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN,
      reviewedDraftChanged: false,
      executableMigrationCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
    };
  }

  return {
    ok: true,
    state: "adjustment_plan_ready",
    reason: "Plano pronto para orientar uma futura correção isolada do rascunho SQL.",
    plan: EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN,
    reviewedDraftChanged: false,
    executableMigrationCreated: false,
    supabaseOperationPerformed: false,
    databaseWritePerformed: false,
    publicTicketLinkActivated: false,
  };
}

export function runEventTicketCommercialMigrationAdjustmentPlanSelfTest(): EventTicketCommercialMigrationAdjustmentPlanSelfTestResult {
  const plan = EVENT_TICKET_COMMERCIAL_MIGRATION_ADJUSTMENT_PLAN;
  const phaseKeys = new Set(plan.phases.map((item) => item.phaseKey));
  const adjustmentKeys = new Set(
    plan.adjustments.map((item) => item.adjustmentKey),
  );
  const prerequisiteKeys = new Set(
    plan.externalPrerequisites.map((item) => item.prerequisiteKey),
  );
  const phaseOrders = new Set(plan.phases.map((item) => item.order));
  const sequences = new Set(plan.adjustments.map((item) => item.sequence));
  const acceptanceTestCount = plan.adjustments.reduce(
    (total, item) => total + item.acceptanceTests.length,
    0,
  );
  const criticalAdjustmentCount = plan.adjustments.filter(
    (item) => item.severity === "critical",
  ).length;
  const allDependenciesKnown = plan.adjustments.every((item) =>
    item.dependsOnAdjustmentKeys.every((key) => adjustmentKeys.has(key)),
  );
  const allPrerequisitesKnown = plan.adjustments.every((item) =>
    item.externalPrerequisiteKeys.every((key) => prerequisiteKeys.has(key)),
  );
  const allItemsInKnownPhase = plan.adjustments.every((item) =>
    phaseKeys.has(item.phaseKey),
  );
  const phaseCoverage = plan.phases.every(
    (phase) =>
      phase.adjustmentKeys.length > 0 &&
      phase.adjustmentKeys.every((key) => adjustmentKeys.has(key)),
  );
  const eachAdjustmentCoveredOnce = plan.adjustments.every(
    (item) =>
      plan.phases.filter((phase) =>
        phase.adjustmentKeys.includes(item.adjustmentKey),
      ).length === 1,
  );

  const defaultDecision =
    evaluateEventTicketCommercialMigrationAdjustmentPlan();
  const draftDecision = evaluateEventTicketCommercialMigrationAdjustmentPlan({
    requestDraftMutation: true,
  });
  const executableDecision =
    evaluateEventTicketCommercialMigrationAdjustmentPlan({
      requestExecutableMigration: true,
    });
  const writeDecision = evaluateEventTicketCommercialMigrationAdjustmentPlan({
    requestDatabaseWrite: true,
  });
  const activationDecision =
    evaluateEventTicketCommercialMigrationAdjustmentPlan({
      requestPublicActivation: true,
    });

  const checks: Record<string, boolean> = {
    version_ok:
      plan.version ===
      "v4.8.89-event-ticket-commercial-migration-adjustment-plan-safe",
    base_version_ok:
      plan.baseVersion ===
      "v4.8.88-event-ticket-commercial-migration-structural-review-safe",
    review_hash_frozen:
      plan.reviewedStructuralReviewSha256 ===
      "60456C95D3D220CA224F329B1B5F0ACDF83F6883591988C7198014CD1E20603A",
    draft_hash_frozen:
      plan.reviewedDraftSha256 ===
      "B2CA2791D41E38697754FD29BBA1DED0E1DD7F0EB4603A377E5689E53526BA62",
    decision_plan_ready: plan.decision === "adjustment_plan_ready",
    next_artifact_corrected_draft:
      plan.nextAllowedArtifact === "corrected_migration_draft_safe",
    phase_count_ok: plan.phases.length === 9,
    adjustment_count_ok: plan.adjustments.length === 18,
    prerequisite_count_ok: plan.externalPrerequisites.length === 10,
    critical_count_ok: criticalAdjustmentCount === 15,
    acceptance_test_count_ok: acceptanceTestCount === 54,
    phase_keys_unique: phaseKeys.size === plan.phases.length,
    adjustment_keys_unique: adjustmentKeys.size === plan.adjustments.length,
    prerequisite_keys_unique:
      prerequisiteKeys.size === plan.externalPrerequisites.length,
    phase_orders_unique: phaseOrders.size === plan.phases.length,
    phase_orders_contiguous:
      plan.phases.every((phase) => phase.order >= 1 && phase.order <= 9),
    sequences_unique: sequences.size === plan.adjustments.length,
    sequences_contiguous:
      plan.adjustments.every(
        (item) => item.sequence >= 1 && item.sequence <= 18,
      ),
    all_items_in_known_phase: allItemsInKnownPhase,
    all_dependencies_known: allDependenciesKnown,
    all_prerequisites_known: allPrerequisitesKnown,
    phase_coverage_complete: phaseCoverage,
    each_adjustment_covered_once: eachAdjustmentCoveredOnce,
    strategies_present:
      plan.adjustments.every((item) => item.sqlStrategy.length >= 3),
    objects_present:
      plan.adjustments.every((item) => item.databaseObjects.length >= 1),
    acceptance_tests_present:
      plan.adjustments.every((item) => item.acceptanceTests.length === 3),
    done_when_present:
      plan.adjustments.every((item) => item.doneWhen.length >= 20),
    exit_criteria_present:
      plan.phases.every((item) => item.exitCriteria.length === 3),
    prerequisite_phase_valid:
      plan.externalPrerequisites.every((item) =>
        phaseKeys.has(item.requiredBeforePhaseKey),
      ),
    exact_schema_preflight_present:
      adjustmentKeys.has("exact_schema_preflight_without_drift_masking"),
    partner_registry_present:
      adjustmentKeys.has("verified_partner_registry_foreign_key"),
    financial_matrix_present: adjustmentKeys.has("financial_field_matrix"),
    transactional_rpc_present:
      adjustmentKeys.has("transactional_admin_mutation_rpc"),
    optimistic_concurrency_present:
      adjustmentKeys.has("optimistic_concurrency_expected_version"),
    request_lifecycle_present:
      adjustmentKeys.has("request_lifecycle_guard_and_audit"),
    request_channel_consistency_present:
      adjustmentKeys.has("request_channel_cross_entity_consistency"),
    active_fields_freeze_present:
      adjustmentKeys.has("freeze_sensitive_active_channel_fields"),
    expiry_cutover_present:
      adjustmentKeys.has("expiry_and_atomic_channel_cutover"),
    reference_domain_present:
      adjustmentKeys.has("official_reference_url_domain_integrity"),
    public_url_policy_present:
      adjustmentKeys.has("commercial_url_public_network_validation"),
    immutable_signal_present:
      adjustmentKeys.has("immutable_purchase_signal_lineage"),
    conversion_namespace_present:
      adjustmentKeys.has("conversion_channel_and_provider_namespace"),
    privacy_guards_present:
      adjustmentKeys.has("hash_format_and_metadata_privacy_guards"),
    communication_lifecycle_present:
      adjustmentKeys.has("communication_lifecycle_evidence"),
    audit_coverage_present:
      adjustmentKeys.has("audit_coverage_and_consistency"),
    retention_present:
      adjustmentKeys.has("retention_and_cleanup_enforcement"),
    backfill_reconciliation_present:
      adjustmentKeys.has("backfill_reconciliation_and_no_silent_skip"),
    default_plan_ready:
      defaultDecision.ok === true &&
      defaultDecision.state === "adjustment_plan_ready",
    draft_mutation_blocked:
      draftDecision.ok === false &&
      draftDecision.state === "blocked_draft_mutation_requested",
    executable_migration_blocked:
      executableDecision.ok === false &&
      executableDecision.state ===
        "blocked_executable_migration_requested",
    database_write_blocked:
      writeDecision.ok === false &&
      writeDecision.state === "blocked_database_write_requested",
    public_activation_blocked:
      activationDecision.ok === false &&
      activationDecision.state === "blocked_public_activation_requested",
    promotion_blocked:
      plan.promotionToExecutableMigrationAllowed === false,
    reviewed_draft_unchanged: plan.reviewedDraftChanged === false,
    executable_migration_not_created:
      plan.executableMigrationCreated === false,
    sql_not_moved: plan.sqlMovedToSupabaseMigrations === false,
    no_supabase_operation: plan.supabaseOperationPerformed === false,
    no_database_write: plan.databaseWritePerformed === false,
    no_ticket_activation: plan.publicTicketLinkActivated === false,
    public_page_unchanged: plan.publicEventPageChanged === false,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);

  return {
    ok: failedChecks.length === 0,
    version: plan.version,
    checks,
    failedChecks,
    checkCount: Object.keys(checks).length,
    decision: plan.decision,
    phaseCount: plan.phases.length,
    adjustmentCount: plan.adjustments.length,
    criticalAdjustmentCount,
    externalPrerequisiteCount: plan.externalPrerequisites.length,
    acceptanceTestCount,
    promotionToExecutableMigrationAllowed: false,
    reviewedDraftChanged: false,
    executableMigrationCreated: false,
    supabaseOperationPerformed: false,
    databaseWritePerformed: false,
    publicTicketLinkActivated: false,
  };
}
