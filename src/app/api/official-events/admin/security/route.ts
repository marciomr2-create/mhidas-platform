// src/app/api/official-events/admin/security/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type SecurityCheck = {
  key: string;
  ok: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function splitEnvList(value: unknown): string[] {
  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isAuthorized(request: NextRequest, searchParams: URLSearchParams): boolean {
  const configuredSecret = normalizeText(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET);

  if (!configuredSecret && !isProduction()) {
    return true;
  }

  if (!configuredSecret) {
    return false;
  }

  const headerSecret = normalizeText(request.headers.get("x-official-events-secret"));
  const querySecret = normalizeText(searchParams.get("secret"));

  return headerSecret === configuredSecret || querySecret === configuredSecret;
}

function buildChecks(): {
  checks: SecurityCheck[];
  summary: {
    isProduction: boolean;
    hasSupabaseUrl: boolean;
    hasSupabaseAnonKey: boolean;
    hasServiceRoleKey: boolean;
    hasResolverSecret: boolean;
    hasAdminEmails: boolean;
    hasAdminUserIds: boolean;
    adminAccessConfigured: boolean;
    localDevFallbackEnabled: boolean;
    productionReady: boolean;
    criticalCount: number;
    warningCount: number;
  };
} {
  const production = isProduction();

  const hasSupabaseUrl = Boolean(normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL));
  const hasSupabaseAnonKey = Boolean(normalizeText(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  const hasServiceRoleKey = Boolean(normalizeText(process.env.SUPABASE_SERVICE_ROLE_KEY));
  const hasResolverSecret = Boolean(normalizeText(process.env.OFFICIAL_EVENTS_RESOLVER_SECRET));
  const hasAdminEmails = splitEnvList(process.env.OFFICIAL_EVENTS_ADMIN_EMAILS).length > 0;
  const hasAdminUserIds = splitEnvList(process.env.OFFICIAL_EVENTS_ADMIN_USER_IDS).length > 0;
  const adminAccessConfigured = hasAdminEmails || hasAdminUserIds;
  const localDevFallbackEnabled = !production && !adminAccessConfigured;
  const productionReady =
    hasSupabaseUrl &&
    hasSupabaseAnonKey &&
    hasServiceRoleKey &&
    hasResolverSecret &&
    adminAccessConfigured;

  const checks: SecurityCheck[] = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      ok: hasSupabaseUrl,
      severity: hasSupabaseUrl ? "info" : "critical",
      message: hasSupabaseUrl
        ? "Supabase URL is configured."
        : "Supabase URL is missing.",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ok: hasSupabaseAnonKey,
      severity: hasSupabaseAnonKey ? "info" : "critical",
      message: hasSupabaseAnonKey
        ? "Supabase anon key is configured."
        : "Supabase anon key is missing.",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      ok: hasServiceRoleKey,
      severity: hasServiceRoleKey ? "info" : "critical",
      message: hasServiceRoleKey
        ? "Service role key is configured on the server."
        : "Service role key is missing.",
    },
    {
      key: "OFFICIAL_EVENTS_RESOLVER_SECRET",
      ok: hasResolverSecret,
      severity: hasResolverSecret ? "info" : production ? "critical" : "warning",
      message: hasResolverSecret
        ? "Resolver secret is configured."
        : "Resolver secret is missing. Local development fallback may work, but production must set it.",
    },
    {
      key: "OFFICIAL_EVENTS_ADMIN_EMAILS",
      ok: hasAdminEmails,
      severity: hasAdminEmails ? "info" : "warning",
      message: hasAdminEmails
        ? "Admin email allowlist is configured."
        : "Admin email allowlist is not configured.",
    },
    {
      key: "OFFICIAL_EVENTS_ADMIN_USER_IDS",
      ok: hasAdminUserIds,
      severity: hasAdminUserIds ? "info" : "warning",
      message: hasAdminUserIds
        ? "Admin user id allowlist is configured."
        : "Admin user id allowlist is not configured.",
    },
    {
      key: "ADMIN_ACCESS",
      ok: adminAccessConfigured,
      severity: adminAccessConfigured ? "info" : production ? "critical" : "warning",
      message: adminAccessConfigured
        ? "Admin access allowlist is configured."
        : "Admin access allowlist is missing. Set OFFICIAL_EVENTS_ADMIN_EMAILS or OFFICIAL_EVENTS_ADMIN_USER_IDS before production.",
    },
    {
      key: "LOCAL_DEV_FALLBACK",
      ok: !production || !localDevFallbackEnabled,
      severity: localDevFallbackEnabled ? "warning" : "info",
      message: localDevFallbackEnabled
        ? "Local development fallback is enabled because no admin allowlist is configured."
        : "Local development fallback is disabled or not needed.",
    },
  ];

  const criticalCount = checks.filter((check) => check.severity === "critical" && !check.ok).length;
  const warningCount = checks.filter((check) => check.severity === "warning").length;

  return {
    checks,
    summary: {
      isProduction: production,
      hasSupabaseUrl,
      hasSupabaseAnonKey,
      hasServiceRoleKey,
      hasResolverSecret,
      hasAdminEmails,
      hasAdminUserIds,
      adminAccessConfigured,
      localDevFallbackEnabled,
      productionReady,
      criticalCount,
      warningCount,
    },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!isAuthorized(request, searchParams)) {
    return NextResponse.json(
      {
        ok: false,
        scope: "official-event-admin-security",
        mode: "read_only",
        message: "Official event admin security check is not authorized.",
      },
      { status: 403 }
    );
  }

  const result = buildChecks();

  return NextResponse.json({
    ok: result.summary.criticalCount === 0,
    scope: "official-event-admin-security",
    mode: "read_only",
    message: result.summary.productionReady
      ? "Official event admin environment is production ready."
      : "Official event admin environment needs attention before production.",
    summary: result.summary,
    checks: result.checks,
    sensitiveValuesReturned: false,
  });
}