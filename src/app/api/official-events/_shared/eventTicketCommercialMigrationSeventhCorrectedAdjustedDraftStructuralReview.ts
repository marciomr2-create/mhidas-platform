export type SeventhCorrectedDraftStructuralSeverity = "critical" | "high";

export type SeventhCorrectedDraftStructuralFinding = {
  key: string;
  severity: SeventhCorrectedDraftStructuralSeverity;
  status: "required";
  title: string;
  evidence: string;
  requiredCorrection: string;
};

export type SeventhCorrectedDraftRemediationPhase = {
  phase: string;
  name: string;
  findingKeys: readonly string[];
  acceptanceTests: number;
};

export const SEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS = [
  {
    key: "current_credential_version_is_not_authoritative",
    severity: "critical",
    status: "required",
    title: "A credencial corrente da integração não é autoridade operacional",
    evidence: "As RPCs de emissão de contexto e gravação de sinal aceitam qualquer credencial com status active. Elas não exigem current_credential_version_id = p_credential_version_id e não bloqueiam a integração/credencial durante a validação. Uma credencial antiga ainda ativa pode continuar operando após rotação ou mudança concorrente de status.",
    requiredCorrection: "Exigir a versão corrente ativa em todas as operações confiáveis, bloquear as linhas durante a autorização e tornar atômica a rotação entre current_credential_version_id e o status das versões.",
  },
  {
    key: "public_channel_ignores_partner_and_integration_lifecycle",
    severity: "critical",
    status: "required",
    title: "O canal público ignora o lifecycle do parceiro e da integração",
    evidence: "O resolver público seleciona somente event_ticket_commercial_channels por status e prova URL. Ele não verifica commercial_partners.partner_status, event_ticket_trusted_integrations.integration_status nem o escopo ativo da integração. Um canal pode continuar público após suspensão do parceiro ou da integração.",
    requiredCorrection: "Resolver o canal em snapshot único com partner verified, integration active, credential current e scope ativo; pausar/revogar canais de forma atômica nas transições terminais.",
  },
  {
    key: "url_proof_nullable_hostname_and_unbounded_health_age",
    severity: "critical",
    status: "required",
    title: "A prova de URL permite hostname nulo e health check indefinidamente antigo",
    evidence: "A constraint chama uma função STRICT com destination_hostname nulo; o resultado NULL faz o CHECK passar no PostgreSQL. O freshness helper apenas impede timestamps futuros e não impõe idade máxima ao last_health_checked_at.",
    requiredCorrection: "Exigir hostname e todos os artefatos de prova como NOT NULL para estado validated, validar porta/DNS/redirects de forma fail-closed e impor janela máxima de health check.",
  },
  {
    key: "purchase_signal_semantic_relations_are_not_bound",
    severity: "critical",
    status: "required",
    title: "Evento, canal, clique e transação do sinal não estão semanticamente vinculados",
    evidence: "A RPC de sinal valida o scope da integração para o evento, mas não comprova que channel_id pertence ao mesmo evento/integração nem que click_id pertence ao mesmo canal/evento. Conversões atribuídas ou confirmadas também podem ser gravadas sem external_transaction_hash.",
    requiredCorrection: "Bloquear e validar canal e clique no mesmo snapshot, usar constraints compostas quando possível e exigir transação externa única para attributed_conversion e confirmed_conversion.",
  },
  {
    key: "receipt_terminal_states_can_be_reused_as_pending_work",
    severity: "critical",
    status: "required",
    title: "Recibos failed ou não concluídos podem ser reutilizados como trabalho pendente",
    evidence: "Os writers tratam apenas receipt_status completed. Um recibo failed retornado pela reserva segue novamente para mutação, enquanto complete_operation_receipt retorna silenciosamente o estado existente quando não consegue atualizar pending. A função pode reportar sucesso com recibo ainda failed.",
    requiredCorrection: "Definir máquina de estados fechada: completed retorna replay; failed retorna falha terminal ou exige nova chave; pending concorrente deve aguardar/recusar; complete/fail devem falhar se a transição esperada não ocorrer.",
  },
  {
    key: "retention_minimization_and_policy_authority_are_incomplete",
    severity: "critical",
    status: "required",
    title: "Minimização preserva identificadores brutos e policies ainda são fornecidas pelo chamador",
    evidence: "O batch grava hashes, mas mantém target_id, principal_id, integration_id e credential_version_id brutos em recibos/auditoria. As RPCs de contexto, sinal e administração recebem IDs de policy do chamador sem resolver status, purpose, jurisdiction e evidence_class no servidor.",
    requiredCorrection: "Resolver policies ativas no servidor por classe/jurisdição, substituir ou separar identificadores brutos conforme a matriz legal e validar cobertura completa de minimização antes de processar.",
  },
  {
    key: "public_resolver_returns_ciphertext_and_drops_official_url",
    severity: "high",
    status: "required",
    title: "O resolver público retorna ciphertext e não devolve a URL oficial",
    evidence: "A função pública expõe destination_url_ciphertext como destino do canal comercial. No fallback official_reference, ela detecta canonical_event_sources.source_url, mas a coluna retornada continua sendo c.destination_url_ciphertext e fica nula.",
    requiredCorrection: "Retornar apenas token de redirect opaco ou URL pública autorizada por boundary seguro; no fallback, devolver a referência oficial validada sem expor ciphertext.",
  },
  {
    key: "partner_status_mutation_has_no_valid_transition_contract",
    severity: "high",
    status: "required",
    title: "A mutação de parceiro não possui matriz válida de transições",
    evidence: "A RPC aceita qualquer próximo status permitido pela tabela. A transição para verified não preenche verified_by_admin_user_id/verified_at e falha na constraint; transições de suspensão/deativação não cascata ou auditam integrações, scopes e canais afetados.",
    requiredCorrection: "Implementar matriz de origem/destino, preencher evidências de verificação e executar cascatas auditadas por objeto com expected_lock_version.",
  },
  {
    key: "rls_read_policies_have_no_table_select_grants",
    severity: "high",
    status: "required",
    title: "As policies de leitura não são alcançáveis pelos papéis declarados",
    evidence: "O SQL cria policies SELECT para authenticated e depois revoga todos os privilégios de tabela de authenticated, sem GRANT SELECT correspondente. RLS não concede privilégio; as policies ficam inoperantes.",
    requiredCorrection: "Definir explicitamente quais tabelas possuem leitura direta, conceder somente SELECT necessário e manter o restante acessível exclusivamente por RPCs seguras.",
  },
  {
    key: "base_preflight_is_not_schema_exact",
    severity: "high",
    status: "required",
    title: "O preflight não comprova o schema-base exato",
    evidence: "O preflight confirma apenas existência de algumas relações e funções e ausência de três tabelas-alvo. Não valida colunas, tipos, PKs/FKs, extensões, papéis, auth.uid(), objetos-alvo restantes ou drift de funções/policies.",
    requiredCorrection: "Gerar inventário fechado de dependências e objetos-alvo, validar assinaturas e tipos antes do primeiro DDL e abortar com relatório completo de drift.",
  },
] as const satisfies readonly SeventhCorrectedDraftStructuralFinding[];

export const SEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX = [
  { phase: "R1", name: "current_credential_version_is_not_authoritative", findingKeys: ["current_credential_version_is_not_authoritative"], acceptanceTests: 5 },
  { phase: "R2", name: "public_channel_ignores_partner_and_integration_lifecycle", findingKeys: ["public_channel_ignores_partner_and_integration_lifecycle"], acceptanceTests: 5 },
  { phase: "R3", name: "url_proof_nullable_hostname_and_unbounded_health_age", findingKeys: ["url_proof_nullable_hostname_and_unbounded_health_age"], acceptanceTests: 5 },
  { phase: "R4", name: "purchase_signal_semantic_relations_are_not_bound", findingKeys: ["purchase_signal_semantic_relations_are_not_bound"], acceptanceTests: 5 },
  { phase: "R5", name: "receipt_terminal_states_can_be_reused_as_pending_work", findingKeys: ["receipt_terminal_states_can_be_reused_as_pending_work"], acceptanceTests: 5 },
  { phase: "R6", name: "retention_minimization_and_policy_authority_are_incomplete", findingKeys: ["retention_minimization_and_policy_authority_are_incomplete"], acceptanceTests: 5 },
  { phase: "R7", name: "public_resolver_returns_ciphertext_and_drops_official_url", findingKeys: ["public_resolver_returns_ciphertext_and_drops_official_url"], acceptanceTests: 5 },
  { phase: "R8", name: "partner_status_mutation_has_no_valid_transition_contract", findingKeys: ["partner_status_mutation_has_no_valid_transition_contract"], acceptanceTests: 5 },
  { phase: "R9", name: "rls_read_policies_have_no_table_select_grants", findingKeys: ["rls_read_policies_have_no_table_select_grants"], acceptanceTests: 5 },
  { phase: "R10", name: "base_preflight_is_not_schema_exact", findingKeys: ["base_preflight_is_not_schema_exact"], acceptanceTests: 5 },
] as const satisfies readonly SeventhCorrectedDraftRemediationPhase[];

export const SEVENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES = [
  "fresh_production_schema_inventory",
  "admin_authorization_contract",
  "credential_verification_and_rotation_service",
  "commercial_financial_semantics",
  "provider_namespace_and_credentials_registry",
  "legal_retention_and_anonymization",
  "parallel_concurrency_and_failure_tests",
  "production_backup_and_rollback_plan",
  "performance_and_volume_tests",
  "independent_review_of_next_sql",
] as const;

const criticalCount = SEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "critical",
).length;

const highCount = SEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.filter(
  (item) => item.severity === "high",
).length;

const acceptanceTests = SEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.reduce(
  (total, phase) => total + phase.acceptanceTests,
  0,
);

export const EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW = {
  version: "v4.8.109-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-structural-review-safe",
  baseVersion: "v4.8.108-event-ticket-commercial-migration-seventh-corrected-adjusted-draft-safe",
  baseCommit: "5c6b65d3c7413854d99bf5086bb2f6ae1548be00",
  decision: "needs_adjustment_with_remediation_matrix",
  findings: SEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS,
  remediationMatrix: SEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX,
  requiredAdjustments: SEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length,
  criticalCount,
  highCount,
  acceptanceTests,
  externalPrerequisites: SEVENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length,
  reviewedSqlChanged: false,
  executableMigrationCreated: false,
  sqlMovedToSupabaseMigrations: false,
  supabaseOperationPerformed: false,
  databaseWritePerformed: false,
  publicEventPageChanged: false,
  separateAdjustmentPlanRequired: false,
  promotionToExecutableMigrationAllowed: false,
} as const;

export function selfTestEventTicketCommercialMigrationSeventhCorrectedDraftStructuralReview(): {
  ok: boolean;
  checks: readonly boolean[];
} {
  const findingKeys = new Set(
    SEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.map((item) => item.key),
  );
  const matrixKeys = new Set(
    SEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.flatMap((phase) => phase.findingKeys),
  );

  const checks = [
    SEVENTH_CORRECTED_DRAFT_STRUCTURAL_FINDINGS.length === 10,
    findingKeys.size === 10,
    matrixKeys.size === 10,
    [...findingKeys].every((key) => matrixKeys.has(key)),
    criticalCount === 6,
    highCount === 4,
    SEVENTH_CORRECTED_DRAFT_REMEDIATION_MATRIX.length === 10,
    acceptanceTests === 50,
    SEVENTH_CORRECTED_DRAFT_EXTERNAL_PREREQUISITES.length === 10,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.reviewedSqlChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.executableMigrationCreated === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.sqlMovedToSupabaseMigrations === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.supabaseOperationPerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.databaseWritePerformed === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.publicEventPageChanged === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.separateAdjustmentPlanRequired === false,
    EVENT_TICKET_COMMERCIAL_MIGRATION_SEVENTH_CORRECTED_DRAFT_STRUCTURAL_REVIEW.promotionToExecutableMigrationAllowed === false,
  ] as const;

  return { ok: checks.every(Boolean), checks };
}
