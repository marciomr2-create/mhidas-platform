// src/app/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

function getSafeNextPath(value: string | null): string {
  if (value === "/onboarding") return "/onboarding";
  if (value === "/dashboard") return "/dashboard";
  if (value === "/dashboard/cards") return "/dashboard/cards";
  return "/onboarding";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?auth_error=callback_failed", request.nextUrl.origin)
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?auth_error=callback_failed", request.nextUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}
