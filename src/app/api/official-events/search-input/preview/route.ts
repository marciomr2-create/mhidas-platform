// src/app/api/official-events/search-input/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  parseOfficialEventSearchInput,
  validateOfficialEventSearchInput,
} from "@/app/api/official-events/_shared/resolverSearchInput";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const input = parseOfficialEventSearchInput(searchParams);
  const validation = validateOfficialEventSearchInput(input);

  return NextResponse.json({
    ok: validation.ok,
    scope: "official-event-search-input-preview",
    message: validation.message,
    input,
  });
}
