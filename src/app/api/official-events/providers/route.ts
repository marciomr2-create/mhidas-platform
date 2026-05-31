// src/app/api/official-events/providers/route.ts

import { NextResponse } from "next/server";
import {
  getOfficialEventProviderRegistry,
  getOfficialEventProvidersRequiringPartnership,
  getOfficialEventProvidersByStatus,
} from "@/app/api/official-events/_shared/providerRegistry";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const providers = getOfficialEventProviderRegistry();
  const activeProviders = getOfficialEventProvidersByStatus("active");
  const plannedProviders = getOfficialEventProvidersByStatus("planned");
  const researchRequiredProviders =
    getOfficialEventProvidersByStatus("research_required");
  const partnershipRequiredProviders =
    getOfficialEventProvidersRequiringPartnership();

  return NextResponse.json({
    ok: true,
    scope: "official-event-providers",
    count: providers.length,
    summary: {
      activeCount: activeProviders.length,
      plannedCount: plannedProviders.length,
      researchRequiredCount: researchRequiredProviders.length,
      partnershipRequiredCount: partnershipRequiredProviders.length,
    },
    providers,
  });
}
