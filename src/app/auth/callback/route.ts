// src/app/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getSafeInternalNextPath } from "@/lib/navigation/safeInternalNextPath";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flow = request.nextUrl.searchParams.get("flow");
  const nextPath =
    getSafeInternalNextPath(request.nextUrl.searchParams.get("next")) ||
    "/onboarding";

  const loginErrorUrl = new URL("/login", request.nextUrl.origin);
  loginErrorUrl.searchParams.set(
    "auth_error",
    flow === "signup" ? "email_confirmation_failed" : "callback_failed"
  );
  loginErrorUrl.searchParams.set("next", nextPath);

  if (!code) {
    return NextResponse.redirect(loginErrorUrl);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginErrorUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}
