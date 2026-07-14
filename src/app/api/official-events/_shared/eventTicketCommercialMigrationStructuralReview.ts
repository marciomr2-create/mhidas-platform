export const EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_VERSION =
  "v4.8.88-event-ticket-commercial-migration-structural-review-safe" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_BASE_VERSION =
  "v4.8.87-event-ticket-commercial-migration-draft-safe" as const;

export const EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT_SHA256 =
  "B2CA2791D41E38697754FD29BBA1DED0E1DD7F0EB4603A377E5689E53526BA62" as const;

export type EventTicketCommercialMigrationReviewDecision =
  | "blocked"
  | "needs_adjustment"
  | "ready_for_migration_file_draft";

export type EventTicketCommercialMigrationReviewSeverity =
  | "critical"
  | "high"
  | "medium";

export type EventTicketCommercialMigrationReviewCategory =
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

export type EventTicketCommercialMigrationApprovedControl = {
  controlKey: string;
  title: string;
  evidence: string;
};

export type EventTicketCommercialMigrationRequiredAdjustment = {
  adjustmentKey: string;
  severity: EventTicketCommercialMigrationReviewSeverity;
  category: EventTicketCommercialMigrationReviewCategory;
  title: string;
  evidence: string;
  risk: string;
  requiredChange: string;
  blocksPromotion: true;
};

export type EventTicketCommercialMigrationExternalPrerequisite = {
  prerequisiteKey: string;
  title: string;
  requiredEvidence: string;
  blocksPromotion: true;
};

export type EventTicketCommercialMigrationStructuralReview = {
  version: typeof EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_VERSION;
  baseVersion:
    typeof EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_BASE_VERSION;
  reviewedDraftPath: "docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT.sql";
  reviewedDraftSha256: typeof EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT_SHA256;
  decision: EventTicketCommercialMigrationReviewDecision;
  decisionReason: string;
  approvedControls: EventTicketCommercialMigrationApprovedControl[];
  requiredAdjustments: EventTicketCommercialMigrationRequiredAdjustment[];
  externalPrerequisites: EventTicketCommercialMigrationExternalPrerequisite[];
  reviewedDraftChanged: false;
  executableMigrationCreated: false;
  sqlMovedToSupabaseMigrations: false;
  supabaseOperationPerformed: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
  publicEventPageChanged: false;
};

export type EventTicketCommercialMigrationStructuralReviewRequest = {
  requestExecutableMigration?: boolean | null;
  requestDatabaseWrite?: boolean | null;
  requestPublicActivation?: boolean | null;
  requestDraftMutation?: boolean | null;
};

export type EventTicketCommercialMigrationStructuralReviewState =
  | "review_ready"
  | "blocked_executable_migration_requested"
  | "blocked_database_write_requested"
  | "blocked_public_activation_requested"
  | "blocked_draft_mutation_requested";

export type EventTicketCommercialMigrationStructuralReviewDecisionResult = {
  ok: boolean;
  state: EventTicketCommercialMigrationStructuralReviewState;
  reason: string;
  review: EventTicketCommercialMigrationStructuralReview;
  executableMigrationCreated: false;
  supabaseOperationPerformed: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
};

export type EventTicketCommercialMigrationStructuralReviewSelfTestResult = {
  ok: boolean;
  version: typeof EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_VERSION;
  checks: Record<string, boolean>;
  failedChecks: string[];
  checkCount: number;
  decision: EventTicketCommercialMigrationReviewDecision;
  approvedControlCount: number;
  requiredAdjustmentCount: number;
  externalPrerequisiteCount: number;
  reviewedDraftChanged: false;
  executableMigrationCreated: false;
  supabaseOperationPerformed: false;
  databaseWritePerformed: false;
  publicTicketLinkActivated: false;
};

export const EVENT_TICKET_COMMERCIAL_MIGRATION_APPROVED_CONTROLS: EventTicketCommercialMigrationApprovedControl[] = [
  {
    controlKey: "draft_outside_migration_directory",
    title: "Rascunho mantido fora do diretório executável",
    evidence:
      "O SQL está em docs/sql e não em supabase/migrations.",
  },
  {
    controlKey: "unconditional_execution_guard",
    title: "Guarda incondicional antes de DDL e DML",
    evidence:
      "O primeiro bloco operacional lança exceção antes da criação de objetos.",
  },
  {
    controlKey: "transaction_forced_rollback",
    title: "Transação termina em ROLLBACK",
    evidence:
      "O rascunho não contém COMMIT e encerra com ROLLBACK.",
  },
  {
    controlKey: "official_reference_separated",
    title: "Referência oficial separada do canal monetizado",
    evidence:
      "canonical_event_sources permanece procedência; canais comerciais usam tabela própria.",
  },
  {
    controlKey: "request_channel_separation",
    title: "Solicitação de parceria separada do canal definitivo",
    evidence:
      "event_ticket_partnership_requests e event_ticket_commercial_channels possuem ciclos distintos.",
  },
  {
    controlKey: "one_active_channel_index",
    title: "Unicidade parcial de canal ativo",
    evidence:
      "Existe índice único parcial por canonical_event_id quando channel_status = active.",
  },
  {
    controlKey: "legacy_channel_downgraded",
    title: "Canal legado nunca preserva ativação pública",
    evidence:
      "O backfill proposto cria apenas canais draft.",
  },
  {
    controlKey: "legacy_ticket_url_reference_only",
    title: "ticket_url legado permanece apenas referência candidata",
    evidence:
      "O rascunho não converte canonical_events.ticket_url em canal comercial.",
  },
  {
    controlKey: "self_declared_purchase_separated",
    title: "Compra autodeclarada não vira conversão confirmada",
    evidence:
      "ticket_acquired é projetado somente como self_declared_purchase.",
  },
  {
    controlKey: "click_not_purchase",
    title: "Clique separado de compra e receita",
    evidence:
      "A tabela de cliques não contém valor financeiro nem confirmação de venda.",
  },
  {
    controlKey: "confirmed_conversion_guard_intent",
    title: "Conversão confirmada exige evidência confiável",
    evidence:
      "O trigger proposto exige hash de transação, ator confiável e confirmação.",
  },
  {
    controlKey: "append_only_audit_intent",
    title: "Auditoria comercial projetada como append-only",
    evidence:
      "UPDATE e DELETE são bloqueados no audit log.",
  },
  {
    controlKey: "deny_by_default_client_access",
    title: "Acesso direto de clientes negado por padrão",
    evidence:
      "As seis tabelas novas usam RLS forçada, revogação de privilégios e nenhuma policy de cliente.",
  },
  {
    controlKey: "no_public_database_view",
    title: "Nenhuma view pública criada",
    evidence:
      "A projeção pública futura permanece restrita a resolvedor de servidor.",
  },
  {
    controlKey: "raw_commercial_url_server_only",
    title: "Destino comercial bruto classificado como servidor",
    evidence:
      "O desenho público prevê somente redirecionamento interno USECLUBBERS.",
  },
  {
    controlKey: "explicit_canonical_mapping_required",
    title: "Backfill exige mapeamento canônico explícito",
    evidence:
      "Fuzzy matching dentro da migration é bloqueado.",
  },
  {
    controlKey: "public_activation_separate_release",
    title: "Ativação pública mantida em versão separada",
    evidence:
      "O rascunho não cria botão, rota pública ou canal ativo.",
  },
];

export const EVENT_TICKET_COMMERCIAL_MIGRATION_REQUIRED_ADJUSTMENTS: EventTicketCommercialMigrationRequiredAdjustment[] = [
  {
    adjustmentKey: "freeze_sensitive_active_channel_fields",
    severity: "critical",
    category: "lifecycle",
    title: "Impedir alteração sensível enquanto o canal permanece ativo",
    evidence:
      "O trigger aceita UPDATE com o mesmo status e não congela URL, domínio, rastreamento, remuneração ou autorização.",
    risk:
      "Um destino ou acordo comercial pode ser trocado sem nova autorização, pausa ou ativação.",
    requiredChange:
      "Definir campos sensíveis imutáveis em active e exigir pausa, novo draft ou novo canal com reautorização para qualquer mudança comercial.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "transactional_admin_mutation_rpc",
    severity: "critical",
    category: "authorization",
    title: "Congelar um RPC transacional para o contexto administrativo",
    evidence:
      "Os triggers dependem de current_setting, mas uma atualização PostgREST comum não consegue executar SET LOCAL e mutação na mesma transação.",
    risk:
      "A rota futura pode não conseguir satisfazer o contrato do trigger ou pode separar autorização e escrita em transações distintas.",
    requiredChange:
      "Criar e revisar um RPC transacional único que valide o admin, configure o contexto local, aplique concorrência otimista, execute a mutação e confirme a auditoria.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "request_lifecycle_guard_and_audit",
    severity: "critical",
    category: "governance",
    title: "Adicionar máquina de estados e auditoria às solicitações",
    evidence:
      "event_ticket_partnership_requests possui checks de valores, mas não possui trigger de transição, matriz de ator ou auditoria automática.",
    risk:
      "Uma rota de servidor mal implementada pode aprovar, rejeitar ou reabrir solicitações sem o papel correto e sem histórico.",
    requiredChange:
      "Definir transições, permissões de parceiro/admin, campos de evidência e auditoria append-only para cada revisão.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "request_channel_cross_entity_consistency",
    severity: "critical",
    category: "referential_integrity",
    title: "Garantir consistência entre solicitação e canal",
    evidence:
      "source_request_id pode apontar para solicitação de outro evento, não aprovada ou permanecer nulo com source_origin approved_partner_request.",
    risk:
      "Um canal monetizado pode ser atribuído à solicitação errada ou aparentar aprovação inexistente.",
    requiredChange:
      "Validar mesma canonical_event_id, request_status approved e obrigatoriedade de source_request_id quando a origem for approved_partner_request.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "expiry_and_atomic_channel_cutover",
    severity: "critical",
    category: "lifecycle",
    title: "Definir expiração automática e troca atômica de canal",
    evidence:
      "O guard aceita apenas useclubbers_admin, não há expired_at e um canal vencido que permaneça active bloqueia o índice único para um sucessor.",
    risk:
      "O canal pode permanecer tecnicamente ativo após o fim da vigência e impedir a ativação do próximo acordo.",
    requiredChange:
      "Definir ator system/automation auditado, job ou RPC de expiração e operação atômica de encerramento/ativação do canal sucessor.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "optimistic_concurrency_expected_version",
    severity: "high",
    category: "lifecycle",
    title: "Aplicar concorrência otimista verificável",
    evidence:
      "lock_version é incrementado pelo trigger, mas o banco não exige expected_lock_version fornecido pelo chamador.",
    risk:
      "Duas decisões administrativas concorrentes podem sobrescrever campos antes da detecção na aplicação.",
    requiredChange:
      "O RPC deve receber a versão esperada, atualizar com predicado exato e falhar quando nenhuma linha corresponder.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "verified_partner_registry_foreign_key",
    severity: "critical",
    category: "authorization",
    title: "Resolver o registro verificado de parceiros",
    evidence:
      "partner_id é UUID sem foreign key, ownership ou prova de vínculo do usuário remetente.",
    risk:
      "Solicitações e comunicações podem declarar identidade de parceiro não verificada.",
    requiredChange:
      "Aprovar a entidade de parceiros, a foreign key, os papéis, ownership e regras de desativação antes da migration real.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "official_reference_url_domain_integrity",
    severity: "critical",
    category: "url_security",
    title: "Vincular reference_domain ao source_url e detectar drift",
    evidence:
      "A constraint exige HTTPS e domínio preenchido, mas não compara o domínio com source_url; o trigger de updated_at não observa mudanças em source_url.",
    risk:
      "Uma referência validada pode mudar de destino ou manter domínio divergente sem perder o estado validated.",
    requiredChange:
      "Adicionar guard de hostname normalizado, incluir source_url na detecção de drift e rebaixar a referência para candidate/stale após alteração.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "commercial_url_public_network_validation",
    severity: "critical",
    category: "url_security",
    title: "Fechar política de URL, porta, DNS e redirecionamento",
    evidence:
      "A regex valida HTTPS e hostname textual, mas não bloqueia porta não padrão, IP privado, DNS local ou redirecionamento para domínio não autorizado.",
    risk:
      "O futuro redirecionamento pode aceitar SSRF, destino interno ou desvio do domínio comercial aprovado.",
    requiredChange:
      "Reutilizar política de URL pública segura, permitir somente porta 443, validar DNS público, limitar redirects e exigir domínio final autorizado.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "immutable_purchase_signal_lineage",
    severity: "critical",
    category: "conversion_integrity",
    title: "Preservar sinais de compra como fatos imutáveis",
    evidence:
      "O trigger permite UPDATE e não impede transformar self_declared_purchase em confirmed_conversion.",
    risk:
      "Uma autodeclaração pode ser convertida no mesmo registro em receita confirmada, apagando a distinção histórica.",
    requiredChange:
      "Tornar signal_type e evidência imutáveis, criar conversões como novos registros vinculados e definir correção por evento compensatório auditado.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "conversion_channel_and_provider_namespace",
    severity: "critical",
    category: "conversion_integrity",
    title: "Exigir atribuição e namespace para conversões",
    evidence:
      "Conversões podem existir sem channel_id e o hash de transação é único globalmente sem namespace da ticketeira ou canal.",
    risk:
      "Vendas podem ser confirmadas sem canal monetizado ou colidir entre provedores que reutilizam identificadores.",
    requiredChange:
      "Exigir channel_id para attributed/confirmed conversion e usar identidade composta ou hash com namespace verificável do provedor/canal.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "hash_format_and_metadata_privacy_guards",
    severity: "critical",
    category: "privacy",
    title: "Impedir dados brutos em campos de hash e metadata",
    evidence:
      "Campos pseudonimizados aceitam qualquer texto e metadata pode receber IP, URL, segredo ou transação bruta.",
    risk:
      "A proibição de IP bruto e segredos não está garantida estruturalmente.",
    requiredChange:
      "Exigir formato e versão de hash, allowlist de metadata, rejeitar chaves sensíveis e testar serialização das rotas.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "communication_lifecycle_evidence",
    severity: "high",
    category: "governance",
    title: "Completar lifecycle e evidências das comunicações",
    evidence:
      "O guard verifica parte da publicação, mas não define transições, approved_at, published_at, pausa/expiração nem approved_by obrigatório.",
    risk:
      "Uma comunicação pode saltar estados ou ser publicada sem histórico editorial suficiente.",
    requiredChange:
      "Definir máquina de estados, timestamps, atores, evento obrigatório para comunicação de ingresso e auditoria de cada transição.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "financial_field_matrix",
    severity: "critical",
    category: "commercial_finance",
    title: "Corrigir a matriz de remuneração",
    evidence:
      "service_fee_share usa campo fixo, hybrid pode ter valor fixo sem moeda e fixed_campaign/licensing podem carregar comissões sem bloqueio.",
    risk:
      "Termos financeiros inconsistentes podem ser persistidos e produzir relatórios ou pagamentos incorretos.",
    requiredChange:
      "Congelar com jurídico/comercial a semântica de cada modelo e implementar checks mutuamente exclusivos, moeda obrigatória e precisão aprovada.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "audit_coverage_and_consistency",
    severity: "high",
    category: "audit",
    title: "Ampliar cobertura e consistência da auditoria",
    evidence:
      "A auditoria automática cobre canais, mas não solicitações ou comunicações; snapshots não preservam hashes de URL/termos e não validam coerência entre evento, canal e solicitação.",
    risk:
      "Decisões comerciais e alterações materiais podem ficar sem trilha suficiente.",
    requiredChange:
      "Auditar todos os lifecycles, registrar hashes/redações dos termos sensíveis e validar a identidade canônica cruzada.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "backfill_reconciliation_and_no_silent_skip",
    severity: "critical",
    category: "backfill",
    title: "Impedir omissão silenciosa no backfill",
    evidence:
      "Solicitações aprovadas sem mapeamento ou revisão podem ser filtradas sem falha; não há asserts de contagem e canais legados de partner_request não recebem source_request_id.",
    risk:
      "Dados comerciais podem desaparecer, ficar órfãos ou perder a relação com a solicitação original.",
    requiredChange:
      "Gerar relatório de elegibilidade, bloquear qualquer linha não reconciliada, comparar contagens antes/depois e ligar canal draft à solicitação normalizada correta.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "exact_schema_preflight_without_drift_masking",
    severity: "critical",
    category: "database_compatibility",
    title: "Substituir tolerância silenciosa por preflight exato",
    evidence:
      "IF NOT EXISTS e CREATE OR REPLACE podem ocultar objetos parciais, tipos incompatíveis ou funções preexistentes.",
    risk:
      "A migration pode concluir sobre um schema divergente sem aplicar todas as constraints previstas.",
    requiredChange:
      "Exigir inventário/hash de produção e falhar quando objetos já existirem fora da assinatura aprovada; usar nomes/versionamento sem sobrescrita silenciosa.",
    blocksPromotion: true,
  },
  {
    adjustmentKey: "retention_and_cleanup_enforcement",
    severity: "critical",
    category: "retention",
    title: "Implementar retenção antes de qualquer rastreamento",
    evidence:
      "O schema armazena datas de retenção, mas não cria job, deleção/anomização auditada ou prova de execução.",
    risk:
      "Dados pseudonimizados e pessoais podem permanecer além do prazo declarado.",
    requiredChange:
      "Aprovar prazos por tipo de sinal, implementar job idempotente, auditoria de limpeza e teste de recuperação antes de habilitar cliques.",
    blocksPromotion: true,
  },
];

export const EVENT_TICKET_COMMERCIAL_MIGRATION_EXTERNAL_PREREQUISITES: EventTicketCommercialMigrationExternalPrerequisite[] = [
  {
    prerequisiteKey: "fresh_production_schema_inventory",
    title: "Inventário atual do schema de produção",
    requiredEvidence:
      "Dump, hash e comparação automática com todas as tabelas, funções, triggers, policies, grants e extensões afetadas.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "backup_and_legacy_counts",
    title: "Backup e contagens legadas",
    requiredEvidence:
      "Backup testado, contagens por status e relatório de restauração das tabelas legadas.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "canonical_mapping_artifact",
    title: "Mapeamento event_group_id para canonical_event_id",
    requiredEvidence:
      "Artefato explícito, revisado, assinado por admin e protegido por hash, sem fuzzy matching na migration.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "verified_partner_registry_contract",
    title: "Contrato do registro verificado de parceiros",
    requiredEvidence:
      "Tabela fonte, ownership, papéis, foreign keys e política de desativação aprovados.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "secret_manager_contract",
    title: "Contrato do gerenciador de segredos",
    requiredEvidence:
      "Formato permitido para tracking_secret_ref e prova de que segredos brutos nunca entram no banco.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "retention_legal_basis_and_job",
    title: "Política de retenção e base legal",
    requiredEvidence:
      "Prazos por entidade, base de tratamento, job de limpeza e testes aprovados.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "admin_authorization_rpc_contract",
    title: "Predicado administrativo e RPC transacional",
    requiredEvidence:
      "Autorização real do admin, assinatura da função, contexto local, concorrência e auditoria na mesma transação.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "trusted_conversion_signature_contract",
    title: "Assinatura e replay protection de conversões",
    requiredEvidence:
      "Verificação de assinatura, timestamp, nonce/idempotência, namespace da transação e rotação de chaves.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "canonical_source_grant_regression",
    title: "Regressão dos grants de canonical_event_sources",
    requiredEvidence:
      "Inventário de consultas existentes e teste de que a allowlist de colunas não quebra fluxos autenticados.",
    blocksPromotion: true,
  },
  {
    prerequisiteKey: "disposable_database_validation",
    title: "Validação em banco descartável",
    requiredEvidence:
      "Parse/execução sem guarda em ambiente descartável, testes de constraints, triggers, RLS, concorrência, backfill e rollback.",
    blocksPromotion: true,
  },
];

export const EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW: EventTicketCommercialMigrationStructuralReview = {
  version: EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_VERSION,
  baseVersion:
    EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_BASE_VERSION,
  reviewedDraftPath:
    "docs/sql/EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT.sql",
  reviewedDraftSha256:
    EVENT_TICKET_COMMERCIAL_MIGRATION_DRAFT_SHA256,
  decision: "needs_adjustment",
  decisionReason:
    "O rascunho preserva as separações estratégicas e possui boas barreiras, mas ainda contém lacunas críticas de lifecycle, autorização transacional, integridade cruzada, privacidade, backfill, finanças e operação que impedem sua promoção.",
  approvedControls:
    EVENT_TICKET_COMMERCIAL_MIGRATION_APPROVED_CONTROLS,
  requiredAdjustments:
    EVENT_TICKET_COMMERCIAL_MIGRATION_REQUIRED_ADJUSTMENTS,
  externalPrerequisites:
    EVENT_TICKET_COMMERCIAL_MIGRATION_EXTERNAL_PREREQUISITES,
  reviewedDraftChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicTicketLinkActivated: false,
  publicEventPageChanged: false,
};

export function evaluateEventTicketCommercialMigrationStructuralReview(
  request: EventTicketCommercialMigrationStructuralReviewRequest = {},
): EventTicketCommercialMigrationStructuralReviewDecisionResult {
  if (request.requestDatabaseWrite === true) {
    return {
      ok: false,
      state: "blocked_database_write_requested",
      reason:
        "A revisão estrutural não permite operação no banco.",
      review: EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW,
      executableMigrationCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
    };
  }

  if (request.requestPublicActivation === true) {
    return {
      ok: false,
      state: "blocked_public_activation_requested",
      reason:
        "A revisão estrutural não permite ativação pública de ingressos.",
      review: EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW,
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
      reason:
        "A promoção está bloqueada enquanto ajustes obrigatórios e pré-requisitos permanecerem abertos.",
      review: EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW,
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
      reason:
        "Esta versão documenta a revisão e não altera o SQL da v4.8.87.",
      review: EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW,
      executableMigrationCreated: false,
      supabaseOperationPerformed: false,
      databaseWritePerformed: false,
      publicTicketLinkActivated: false,
    };
  }

  return {
    ok: true,
    state: "review_ready",
    reason:
      "Revisão estrutural disponível com decisão needs_adjustment e promoção bloqueada.",
    review: EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW,
    executableMigrationCreated: false,
    supabaseOperationPerformed: false,
    databaseWritePerformed: false,
    publicTicketLinkActivated: false,
  };
}

export function runEventTicketCommercialMigrationStructuralReviewSelfTest(): EventTicketCommercialMigrationStructuralReviewSelfTestResult {
  const review = EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW;
  const defaultDecision =
    evaluateEventTicketCommercialMigrationStructuralReview();
  const executableDecision =
    evaluateEventTicketCommercialMigrationStructuralReview({
      requestExecutableMigration: true,
    });
  const writeDecision =
    evaluateEventTicketCommercialMigrationStructuralReview({
      requestDatabaseWrite: true,
    });
  const activationDecision =
    evaluateEventTicketCommercialMigrationStructuralReview({
      requestPublicActivation: true,
    });
  const mutationDecision =
    evaluateEventTicketCommercialMigrationStructuralReview({
      requestDraftMutation: true,
    });

  const adjustmentKeys = new Set(
    review.requiredAdjustments.map((item) => item.adjustmentKey),
  );
  const prerequisiteKeys = new Set(
    review.externalPrerequisites.map((item) => item.prerequisiteKey),
  );
  const approvedControlKeys = new Set(
    review.approvedControls.map((item) => item.controlKey),
  );

  const checks: Record<string, boolean> = {
    version_ok:
      review.version ===
      "v4.8.88-event-ticket-commercial-migration-structural-review-safe",
    base_version_ok:
      review.baseVersion ===
      "v4.8.87-event-ticket-commercial-migration-draft-safe",
    draft_hash_frozen:
      review.reviewedDraftSha256 ===
      "B2CA2791D41E38697754FD29BBA1DED0E1DD7F0EB4603A377E5689E53526BA62",
    decision_needs_adjustment: review.decision === "needs_adjustment",
    promotion_not_allowed:
      review.requiredAdjustments.every((item) => item.blocksPromotion),
    approved_controls_present: review.approvedControls.length === 17,
    required_adjustments_present: review.requiredAdjustments.length === 18,
    external_prerequisites_present: review.externalPrerequisites.length === 10,
    approved_control_keys_unique:
      approvedControlKeys.size === review.approvedControls.length,
    adjustment_keys_unique:
      adjustmentKeys.size === review.requiredAdjustments.length,
    prerequisite_keys_unique:
      prerequisiteKeys.size === review.externalPrerequisites.length,
    critical_adjustments_present:
      review.requiredAdjustments.filter((item) => item.severity === "critical")
        .length >= 12,
    active_sensitive_fields_blocker:
      adjustmentKeys.has("freeze_sensitive_active_channel_fields"),
    transactional_rpc_blocker:
      adjustmentKeys.has("transactional_admin_mutation_rpc"),
    request_lifecycle_blocker:
      adjustmentKeys.has("request_lifecycle_guard_and_audit"),
    cross_entity_consistency_blocker:
      adjustmentKeys.has("request_channel_cross_entity_consistency"),
    expiry_cutover_blocker:
      adjustmentKeys.has("expiry_and_atomic_channel_cutover"),
    concurrency_blocker:
      adjustmentKeys.has("optimistic_concurrency_expected_version"),
    partner_registry_blocker:
      adjustmentKeys.has("verified_partner_registry_foreign_key"),
    reference_domain_blocker:
      adjustmentKeys.has("official_reference_url_domain_integrity"),
    url_security_blocker:
      adjustmentKeys.has("commercial_url_public_network_validation"),
    immutable_signal_blocker:
      adjustmentKeys.has("immutable_purchase_signal_lineage"),
    conversion_namespace_blocker:
      adjustmentKeys.has("conversion_channel_and_provider_namespace"),
    privacy_guard_blocker:
      adjustmentKeys.has("hash_format_and_metadata_privacy_guards"),
    communication_lifecycle_blocker:
      adjustmentKeys.has("communication_lifecycle_evidence"),
    financial_matrix_blocker:
      adjustmentKeys.has("financial_field_matrix"),
    audit_coverage_blocker:
      adjustmentKeys.has("audit_coverage_and_consistency"),
    backfill_reconciliation_blocker:
      adjustmentKeys.has("backfill_reconciliation_and_no_silent_skip"),
    schema_preflight_blocker:
      adjustmentKeys.has("exact_schema_preflight_without_drift_masking"),
    retention_blocker:
      adjustmentKeys.has("retention_and_cleanup_enforcement"),
    schema_inventory_required:
      prerequisiteKeys.has("fresh_production_schema_inventory"),
    backup_required:
      prerequisiteKeys.has("backup_and_legacy_counts"),
    canonical_mapping_required:
      prerequisiteKeys.has("canonical_mapping_artifact"),
    secret_manager_required:
      prerequisiteKeys.has("secret_manager_contract"),
    trusted_conversion_contract_required:
      prerequisiteKeys.has("trusted_conversion_signature_contract"),
    disposable_database_validation_required:
      prerequisiteKeys.has("disposable_database_validation"),
    default_review_ready:
      defaultDecision.ok === true &&
      defaultDecision.state === "review_ready",
    executable_migration_blocked:
      executableDecision.ok === false &&
      executableDecision.state ===
        "blocked_executable_migration_requested",
    database_write_blocked:
      writeDecision.ok === false &&
      writeDecision.state === "blocked_database_write_requested",
    public_activation_blocked:
      activationDecision.ok === false &&
      activationDecision.state ===
        "blocked_public_activation_requested",
    draft_mutation_blocked:
      mutationDecision.ok === false &&
      mutationDecision.state === "blocked_draft_mutation_requested",
    draft_unchanged: review.reviewedDraftChanged === false,
    executable_migration_not_created:
      review.executableMigrationCreated === false,
    sql_not_moved:
      review.sqlMovedToSupabaseMigrations === false,
    no_supabase_operation:
      review.supabaseOperationPerformed === false,
    no_database_write: review.databaseWritePerformed === false,
    no_ticket_activation:
      review.publicTicketLinkActivated === false,
    public_page_unchanged: review.publicEventPageChanged === false,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return {
    ok: failedChecks.length === 0,
    version: EVENT_TICKET_COMMERCIAL_MIGRATION_STRUCTURAL_REVIEW_VERSION,
    checks,
    failedChecks,
    checkCount: Object.keys(checks).length,
    decision: review.decision,
    approvedControlCount: review.approvedControls.length,
    requiredAdjustmentCount: review.requiredAdjustments.length,
    externalPrerequisiteCount: review.externalPrerequisites.length,
    reviewedDraftChanged: false,
    executableMigrationCreated: false,
    supabaseOperationPerformed: false,
    databaseWritePerformed: false,
    publicTicketLinkActivated: false,
  };
}
