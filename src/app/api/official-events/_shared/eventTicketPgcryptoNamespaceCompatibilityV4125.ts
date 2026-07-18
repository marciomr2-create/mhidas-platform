export const eventTicketPgcryptoNamespaceCompatibilityV4125 = {
  version:
    "v4.8.125-event-ticket-pgcrypto-namespace-compatibility-safe",
  baseVersion:
    "v4.8.124-event-ticket-security-prerequisites-fail-closed-safe",
  baseCommit: "99b75c0c26185c82f5d4fc3086287778f93197fa",
  decision:
    "pgcrypto_namespace_compatibility_created_and_isolated_validated",
  compatibilityMigrationVersion: "20260717145950",
  compatibilityMigrationPath:
    "supabase/migrations/20260717145950_event_ticket_pgcrypto_namespace_compatibility.sql",
  prerequisiteMigrationVersion: "20260717145900",
  commercialMigrationVersion: "20260717150000",
  commercialMigrationGitBlob:
    "2be3597b5c51f2ad69bcfd43f26acdd113b40c62",
  commercialMigrationModified: false,
  supportedPgcryptoSchemas: ["public", "extensions"],
  compatibilityAdapterCountWhenRequired: 2,
  directAdapterExecutionRevoked: true,
  isolatedDatabaseCount: 2,
  publicSchemaScenarioPassed: true,
  extensionsSchemaScenarioPassed: true,
  unchangedCommercialMigrationApplied: true,
  failClosedContractsPreserved: true,
  stagingDatabaseWritePerformed: false,
  productionDatabaseWritePerformed: false,
  stagingRetryAllowed: true,
  productionPromotionAllowed: false,
} as const;

export type EventTicketPgcryptoNamespaceCompatibilityV4125 =
  typeof eventTicketPgcryptoNamespaceCompatibilityV4125;

export function isEventTicketPgcryptoNamespaceCompatibilityV4125Safe(
  contract: EventTicketPgcryptoNamespaceCompatibilityV4125 =
    eventTicketPgcryptoNamespaceCompatibilityV4125,
): boolean {
  return contract.decision ===
      "pgcrypto_namespace_compatibility_created_and_isolated_validated"
    && contract.compatibilityMigrationVersion === "20260717145950"
    && !contract.commercialMigrationModified
    && contract.supportedPgcryptoSchemas.length === 2
    && contract.compatibilityAdapterCountWhenRequired === 2
    && contract.directAdapterExecutionRevoked
    && contract.isolatedDatabaseCount === 2
    && contract.publicSchemaScenarioPassed
    && contract.extensionsSchemaScenarioPassed
    && contract.unchangedCommercialMigrationApplied
    && contract.failClosedContractsPreserved
    && !contract.stagingDatabaseWritePerformed
    && !contract.productionDatabaseWritePerformed
    && contract.stagingRetryAllowed
    && !contract.productionPromotionAllowed;
}
