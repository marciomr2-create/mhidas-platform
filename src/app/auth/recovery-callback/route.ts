// src/app/auth/recovery-callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import {
  buildForgotPasswordPath,
  buildPasswordResetPath,
  getSafeRecoveryReturnPath,
} from "@/lib/navigation/safeInternalNextPath";

const RECOVERY_COOKIE = "uc_password_recovery";
const RECOVERY_COOKIE_MAX_AGE_SECONDS = 10 * 60;

function forgotPasswordErrorUrl(
  request: NextRequest,
  returnTo: string
): URL {
  const url = new URL(
    buildForgotPasswordPath(returnTo),
    request.nextUrl.origin
  );
  url.searchParams.set("recovery_error", "invalid_or_expired");
  return url;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = getSafeRecoveryReturnPath(
    request.nextUrl.searchParams.get("return_to")
  );

  if (!code) {
    return NextResponse.redirect(
      forgotPasswordErrorUrl(request, returnTo)
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      forgotPasswordErrorUrl(request, returnTo)
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      forgotPasswordErrorUrl(request, returnTo)
    );
  }

  const resetUrl = new URL(
    buildPasswordResetPath(returnTo),
    request.nextUrl.origin
  );
  const response = NextResponse.redirect(resetUrl);

  response.cookies.set(RECOVERY_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: RECOVERY_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
