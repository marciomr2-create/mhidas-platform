// src/app/api/official-events/orchestrator/production-preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  parseOfficialEventSearchInput,
  validateOfficialEventSearchInput,
} from "@/app/api/official-events/_shared/resolverSearchInput";
import { getOfficialEventProviderRegistry } from "@/app/api/official-events/_shared/providerRegistry";
import { type OfficialEventProvider } from "@/app/api/official-events/_shared/resolverTypes";
import { getOfficialEventProviderAdapters } from "@/app/api/official-events/_shared/providerAdapterFactory";
import { runOfficialEventProviderOrchestrator } from "@/app/api/official-events/_shared/providerOrchestrator";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function parseRequestedProviders(searchParams: URLSearchParams): OfficialEventProvider[] {
  const registry = getOfficialEventProviderRegistry();
  const allowedProviders = new Set(registry.map((item) => item.provider));
  const rawProviders = String(searchParams.get("providers") || "").trim();

  if (!rawProviders) {
    return registry.map((item) => item.provider);
  }

  const providers = rawProviders
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider): provider is OfficialEventProvider =>
      allowedProviders.has(provider as OfficialEventProvider)
    );

  return providers.length ? providers : registry.map((item) => item.provider);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const input = parseOfficialEventSearchInput(searchParams);
  const validation = validateOfficialEventSearchInput(input);
  const providers = parseRequestedProviders(searchParams);

  if (!validation.ok) {
    return NextResponse.json({
      ok: false,
      scope: "official-event-orchestrator-production-preview",
      message: validation.message,
      input,
      providers,
      result: null,
    });
  }

  const result = await runOfficialEventProviderOrchestrator({
    input,
    adapters: getOfficialEventProviderAdapters({
      mode: "production",
    }),
    options: {
      providers,
      requestId: "production-preview",
    },
  });

  return NextResponse.json({
    ok: result.ok,
    scope: "official-event-orchestrator-production-preview",
    message:
      "Official event provider orchestrator production preview executed without real external API calls.",
    result,
  });
}
