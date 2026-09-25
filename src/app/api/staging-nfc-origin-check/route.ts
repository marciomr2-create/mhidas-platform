import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EXPECTED_ORIGIN =
  "https://mhidas-platform-git-staging-mvp2-qr-nfc-c4-deep-technology1.vercel.app";

export async function GET() {
  const raw = process.env.MHIDAS_NFC_CANONICAL_ORIGIN;
  const variablePresent =
    typeof raw === "string" && raw.trim().length > 0;

  let validHttpsOrigin = false;
  let expectedOriginMatch = false;

  if (variablePresent) {
    try {
      const url = new URL(raw!.trim());

      validHttpsOrigin =
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash;

      expectedOriginMatch =
        validHttpsOrigin &&
        url.origin === EXPECTED_ORIGIN;
    } catch {
      validHttpsOrigin = false;
      expectedOriginMatch = false;
    }
  }

  const ok =
    variablePresent &&
    validHttpsOrigin &&
    expectedOriginMatch;

  return NextResponse.json(
    {
      ok,
      variable_present: variablePresent,
      valid_https_origin: validHttpsOrigin,
      expected_origin_match: expectedOriginMatch,
      secrets_returned: false,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}