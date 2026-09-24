import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const staging = url.includes("snpvfsaixsekatnzrphu");
  const production = url.includes("hbowjouzsflvdnhozsxr");

  const binding =
    staging && !production
      ? "STAGING"
      : production && !staging
        ? "PRODUCTION"
        : "UNKNOWN";

  return NextResponse.json(
    {
      ok: binding === "STAGING",
      binding,
      staging_match: staging,
      production_match: production,
      secrets_returned: false,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}