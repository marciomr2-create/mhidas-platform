export type TenthCorrectedDraftStructuralSeverity = "critical" | "high";

export type TenthCorrectedDraftStructuralFinding = {
  readonly key: string;
  readonly severity: TenthCorrectedDraftStructuralSeverity;
  readonly status: "required";
  readonly title: string;
  readonly evidence: string;
  readonly requiredCorrection: string;
};

export type TenthCorrectedDraftRemediationPhase = {
  readonly phase: string;
  readonly name: string;
  readonly findingKeys: readonly string[];
  readonly acceptanceTests: number;
};

export const TENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "retention_lineage_columns_declared_on_wrong_table",
    severity: "critical",
    status: "required",
    title: "As colunas de lineage e drenagem de retencao foram declaradas na tabela errada",
    evidence: "`event_ticket_retention_policy_versions` usa `superseded_by_policy_version_id` no CHECK, cria FK sobre essa coluna e depois atualiza tambem `retirement_drain_completed_at`, mas nenhuma das duas colunas existe nessa tabela. Ambas aparecem indevidamente em `event_ticket_trusted_integrations`. O DDL falha ainda na criacao da tabela de policies.",
    requiredCorrection: "Mover as duas colunas para `event_ticket_retention_policy_versions`, remover os campos espurios de integrations e executar parsing mais teste PostgreSQL real do DDL completo antes da proxima publicacao.",
  },
  {
    key: "active_retention_policy_bootstrap_is_absent",
    severity: "critical",
    status: "required",
    title: "O schema novo nao possui caminho governado para ativar as policies iniciais",
    evidence: "As sete policies materializadas entram como `draft`. Todas as RPCs operacionais exigem policy `active`, mas nao existe RPC de aprovacao/ativacao inicial e o DML das tabelas foi revogado de `authenticated` e `service_role`. Uma instalacao nova fica sem emitir recibos, contextos, sinais ou executar retencao sem SQL ad hoc do owner.",
    requiredCorrection: "Criar bootstrap receipt-first para aprovar e ativar exatamente uma policy por dimensao, com auditoria, lock_version, manifest/rules completos e teste de instalacao limpa que prove as sete resolucoes ativas.",
  },
  {
    key: "nullable_admin_authorization_predicates_fail_open",
    severity: "critical",
    status: "required",
    title: "As RPCs administrativas tratam resultado NULL de autorizacao como acesso permitido",
    evidence: "As quatro RPCs administrativas usam `if not mhidas_is_useclubbers_admin_v1(auth.uid()) then`. Em PL/pgSQL, `NOT NULL` permanece NULL e o bloco `IF` nao executa; portanto um veredito de autorizacao nulo nao e negado em funcoes `SECURITY DEFINER`.",
    requiredCorrection: "Trocar todos os gates por `IF ... IS DISTINCT FROM TRUE` ou `IS NOT TRUE`, exigir `auth.uid()` nao nulo e adicionar testes sob roles/JWT ausentes, invalidos e parcialmente resolvidos.",
  },
  {
    key: "nullable_credential_proof_predicates_fail_open",
    severity: "critical",
    status: "required",
    title: "A prova dupla da credencial nao e fail-closed para valores NULL",
    evidence: "A chave do emissor e validada com `sha256(p_issuer_service_key) <> hash`; com entrada NULL a condicao vira NULL e nao bloqueia. A assinatura usa `if not mhidas_verify_detached_signature_v1(...)`; se o verificador retornar NULL, a emissao tambem prossegue.",
    requiredCorrection: "Exigir entradas nao nulas, comparar a chave com `IS DISTINCT FROM` e aceitar assinatura somente quando o verificador retornar exatamente TRUE. Testar NULL, key id desconhecido, algoritmo divergente e backend de verificacao indisponivel.",
  },
  {
    key: "commercial_url_proof_activation_is_nullable_fail_open",
    severity: "critical",
    status: "required",
    title: "A ativacao comercial pode aceitar prova URL incompleta por semantica ternaria",
    evidence: "A RPC usa `if not mhidas_ticket_url_proof_is_fresh_v8(...)`. A funcao SQL pode retornar NULL quando hostname, timestamps, health hash, validator version, resolved host ou redirect hash forem NULL. O CHECK de canal ativo nao exige todos esses campos, entao `NOT NULL` nao dispara a excecao e o estado pode ser marcado como ativo.",
    requiredCorrection: "Fazer a funcao retornar `coalesce(resultado,false)`, usar `IS NOT TRUE` no boundary e tornar todos os componentes assinados obrigatorios no CHECK de estado ativo, incluindo ordem temporal coerente.",
  },
  {
    key: "active_channel_is_not_redeemable_or_time_bound",
    severity: "critical",
    status: "required",
    title: "Um canal pode ficar ativo sem destino recuperavel e sem inicio de validade",
    evidence: "`destination_url_ciphertext` e `valid_from` sao opcionais; o CHECK de canal ativo nao os exige e a RPC de ativacao nao os valida nem inicializa. O resolver publico exige `valid_from <= now()`, logo um canal ativado com NULL fica invisivel, e sem ciphertext o redirect nao consegue recuperar o destino mesmo com hash/prova validos.",
    requiredCorrection: "Exigir ciphertext, hash, hostname e `valid_from` no estado ativo; validar coerencia com a prova assinada; inicializar/limpar timestamps de lifecycle de forma atomica e testar a redencao real pelo token.",
  },
  {
    key: "purchase_signal_correction_chain_is_blocked_by_unique_index",
    severity: "high",
    status: "required",
    title: "O indice de transacao impede uma segunda correcao na mesma familia",
    evidence: "O indice unico cobre `(integration_id, external_transaction_hash, signal_type)` enquanto `signal_status <> 'tombstoned'`, portanto inclui linhas `superseded`. A RPC insere a nova correcao antes de superseder a anterior; uma segunda correcao conflita com a primeira e continuaria conflitando mesmo depois de marcada `superseded`.",
    requiredCorrection: "Modelar unicidade apenas do estado corrente, por exemplo predicate `signal_status = recorded`, ou introduzir sequence/version por familia. Atualizar predecessor e inserir sucessor sob constraints diferiveis e testes concorrentes de cadeias longas.",
  },
  {
    key: "retention_policy_rules_are_not_execution_authority",
    severity: "high",
    status: "required",
    title: "A matriz de minimizacao e contada, mas nao governa o executor",
    evidence: "O batch apenas exige `count(*) = 44` e executa UPDATEs hardcoded. Ele nao consulta `retention_action`, `minimization_action`, `source_field` ou namespaces durante a aplicacao. A troca de policy verifica apenas status e dimensoes, sem validar matriz, manifest ou compatibilidade de acao.",
    requiredCorrection: "Validar a matriz exata por policy e executar um plano versionado/allowlisted derivado dela, ou declarar o codigo como contrato versionado imutavel e conferir hash completo. Bloquear ativacao de replacement incompleto.",
  },
  {
    key: "expired_active_credential_contexts_are_never_closed",
    severity: "high",
    status: "required",
    title: "Contextos expirados sem consumo permanecem ativos e fora da retencao",
    evidence: "O consumo rejeita `expires_at <= now()`, mas nao muda `context_status` para `expired`. O batch de retencao seleciona somente `context_status <> 'active'`. Nao existe outro UPDATE que feche automaticamente contextos ativos vencidos, deixando hashes e vinculos retidos indefinidamente.",
    requiredCorrection: "Adicionar transicao receipt-first ou etapa inicial do batch que marque expirados sob lock, preencha `expired_at`/lifecycle receipt e permita minimizacao apos o prazo. Testar expiracao concorrente com consumo e rotacao.",
  },
  {
    key: "legacy_privileged_routine_bypass_inventory_is_incomplete",
    severity: "high",
    status: "required",
    title: "O preflight nao fecha funcoes antigas concedidas ao service_role",
    evidence: "A busca de funcoes cobre apenas uma lista exata das versoes novas. A verificacao de grants inesperados considera `PUBLIC`, `anon` e `authenticated`, mas omite `service_role`. Funcoes SECURITY DEFINER antigas, views ou wrappers ainda executaveis pelo service_role podem sobreviver e contornar receipts, RLS e lifecycle.",
    requiredCorrection: "Inventariar por prefixo e assinatura todas as routines/views/triggers legadas, incluir grants efetivos e memberships do service_role e usar allowlist fechada. O preflight deve falhar diante de qualquer caminho privilegiado nao autorizado.",
  }
] as const satisfies readonly TenthCorrectedDraftStructuralFinding[];

export const TENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = [
  {
    phase: "R1",
    name: "retention_lineage_columns_declared_on_wrong_table",
    findingKeys: ["retention_lineage_columns_declared_on_wrong_table"],
    acceptanceTests: 5,
  },
  {
    phase: "R2",
    name: "active_retention_policy_bootstrap_is_absent",
    findingKeys: ["active_retention_policy_bootstrap_is_absent"],
    acceptanceTests: 5,
  },
  {
    phase: "R3",
    name: "nullable_admin_authorization_predicates_fail_open",
    findingKeys: ["nullable_admin_authorization_predicates_fail_open"],
    acceptanceTests: 5,
  },
  {
    phase: "R4",
    name: "nullable_credential_proof_predicates_fail_open",
    findingKeys: ["nullable_credential_proof_predicates_fail_open"],
    acceptanceTests: 5,
  },
  {
    phase: "R5",
    name: "commercial_url_proof_activation_is_nullable_fail_open",
    findingKeys: ["commercial_url_proof_activation_is_nullable_fail_open"],
    acceptanceTests: 5,
  },
  {
    phase: "R6",
    name: "active_channel_is_not_redeemable_or_time_bound",
    findingKeys: ["active_channel_is_not_redeemable_or_time_bound"],
    acceptanceTests: 5,
  },
  {
    phase: "R7",
    name: "purchase_signal_correction_chain_is_blocked_by_unique_index",
    findingKeys: ["purchase_signal_correction_chain_is_blocked_by_unique_index"],
    acceptanceTests: 5,
  },
  {
    phase: "R8",
    name: "retention_policy_rules_are_not_execution_authority",
    findingKeys: ["retention_policy_rules_are_not_execution_authority"],
    acceptanceTests: 5,
  },
  {
    phase: "R9",
    name: "expired_active_credential_contexts_are_never_closed",
    findingKeys: ["expired_active_credential_contexts_are_never_closed"],
    acceptanceTests: 5,
  },
  {
    phase: "R10",
    name: "legacy_privileged_routine_bypass_inventory_is_incomplete",
    findingKeys: ["legacy_privileged_routine_bypass_inventory_is_incomplete"],
    acceptanceTests: 5,
  }
] as const satisfies readonly TenthCorrectedDraftRemediationPhase[];

export const TENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_complete_production_schema_inventory",
  "effective_routine_view_trigger_grant_inventory",
  "non_nullable_signature_verifier_contract",
  "commercial_destination_encryption_and_redemption_contract",
  "retention_policy_bootstrap_and_approval_contract",
  "postgres_ddl_rls_concurrency_fk_and_idempotency_tests",
  "production_backup_and_rollback_plan",
  "representative_clone_dry_run",
  "performance_and_volume_tests",
  "independent_review_of_next_sql",
] as const;

const criticalCount = TENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = TENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = TENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.115-event-ticket-commercial-migration-tenth-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.114-event-ticket-commercial-migration-tenth-corrected-adjusted-draft-safe",
  baseCommit: "f8750bbab51265e99136636c22214eebeab626af",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: TENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: TENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: TENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: TENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationTenthCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(
    TENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key),
  );
  const matrixKeys = new Set(
    TENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys),
  );

  const checks = [
    TENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 10,
    findingKeys.size === 10,
    matrixKeys.size === 10,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 6,
    highCount === 4,
    TENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 10,
    acceptanceTests === 50,
    TENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_TENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
