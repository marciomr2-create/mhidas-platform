// src/app/auth/recovery-complete/route.ts

import { NextResponse } from "next/server";

const RECOVERY_COOKIE = "uc_password_recovery";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(RECOVERY_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
