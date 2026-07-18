export const eventTicketSecurityPrerequisitesFailClosedV4124 = {
  version:
    "v4.8.124-event-ticket-security-prerequisites-fail-closed-safe",
  baseVersion:
    "v4.8.123-event-ticket-commercial-migration-executable-migration-safe",
  baseCommit: "60dc38d58b4383be546c97bdd81a42d03aa9b3f7",
  decision:
    "fail_closed_security_prerequisites_created_and_isolated_validated",
  prerequisiteMigrationPath:
    "supabase/migrations/20260717145900_event_ticket_security_prerequisites_fail_closed.sql",
  commercialMigrationPath:
    "supabase/migrations/20260717150000_event_ticket_commercial_governance.sql",
  commercialMigrationSha256:
    "CC340082A3DB78350269074078129C346755D110991E240C316663E969415ADF",
  prerequisiteFunctionCount: 4,
  isolatedDatabaseCount: 2,
  administratorAuthorizationEnabled: false,
  detachedSignatureVerificationEnabled: false,
  urlEnvelopeDecryptionEnabled: false,
  failClosedAuthorizationProved: true,
  failClosedSignatureRejectionProved: true,
  failClosedDecryptionErrorProved: true,
  directPrivilegesRestricted: true,
  unchangedCommercialMigrationApplied: true,
  stagingDatabaseWritePerformed: false,
  productionDatabaseWritePerformed: false,
  stagingSchemaInstallationAllowed: true,
  productionPromotionAllowed: false,
} as const;

export type EventTicketSecurityPrerequisitesFailClosedV4124 =
  typeof eventTicketSecurityPrerequisitesFailClosedV4124;

export function isEventTicketSecurityPrerequisitesFailClosedV4124Safe(
  contract: EventTicketSecurityPrerequisitesFailClosedV4124 =
    eventTicketSecurityPrerequisitesFailClosedV4124,
): boolean {
  return contract.decision ===
      "fail_closed_security_prerequisites_created_and_isolated_validated"
    && contract.prerequisiteFunctionCount === 4
    && contract.isolatedDatabaseCount === 2
    && !contract.administratorAuthorizationEnabled
    && !contract.detachedSignatureVerificationEnabled
    && !contract.urlEnvelopeDecryptionEnabled
    && contract.failClosedAuthorizationProved
    && contract.failClosedSignatureRejectionProved
    && contract.failClosedDecryptionErrorProved
    && contract.directPrivilegesRestricted
    && contract.unchangedCommercialMigrationApplied
    && !contract.stagingDatabaseWritePerformed
    && !contract.productionDatabaseWritePerformed
    && contract.stagingSchemaInstallationAllowed
    && !contract.productionPromotionAllowed;
}
