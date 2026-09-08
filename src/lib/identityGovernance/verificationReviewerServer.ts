// src/lib/identityGovernance/verificationReviewerServer.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const VERIFICATION_AUTHORITY_ROLES = [
  "verification_reviewer",
  "verification_admin",
  "platform_admin",
] as const;

export type VerificationAuthorityRole =
  (typeof VERIFICATION_AUTHORITY_ROLES)[number];

export type VerificationAuthority = {
  role: VerificationAuthorityRole;
};

const ROLE_PRECEDENCE: VerificationAuthorityRole[] = [
  "platform_admin",
  "verification_admin",
  "verification_reviewer",
];

export function createIdentityGovernanceAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serverKey) {
    return null;
  }

  return createClient(url, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getVerificationAuthority(
  userId: string,
  adminClient: SupabaseClient | null = createIdentityGovernanceAdminClient()
): Promise<VerificationAuthority | null> {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId || !adminClient) {
    return null;
  }

  const { data, error } = await adminClient
    .from("platform_admin_memberships")
    .select("role,status")
    .eq("user_id", normalizedUserId)
    .eq("status", "active")
    .in("role", [...VERIFICATION_AUTHORITY_ROLES]);

  if (error) {
    throw new Error("VERIFICATION_AUTHORITY_READ_FAILED");
  }

  const roles = new Set(
    (data ?? [])
      .map((row) => String(row.role || "").trim())
      .filter(Boolean)
  );

  for (const role of ROLE_PRECEDENCE) {
    if (roles.has(role)) {
      return { role };
    }
  }

  return null;
}