// src/app/api/official-events/canonical/agenda/route.ts

import { NextRequest, NextResponse } from "next/server";
import { readCanonicalEventAgenda } from "@/lib/events/canonicalEventAgendaRead";

export const dynamic = "force-dynamic";

const ROUTE_VERSION =
  "v4.8.183-mvp2-social-agenda-public-read-route";

function jsonNoStore(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const canonicalEventId =
    request.nextUrl.searchParams.get("canonicalEventId")?.trim() || "";

  if (!canonicalEventId) {
    return jsonNoStore(
      {
        ok: false,
        version: ROUTE_VERSION,
        error: "missing_canonical_event_id",
        database_write_performed: false,
      },
      400
    );
  }

  const agenda = await readCanonicalEventAgenda(canonicalEventId);

  if (!agenda.ok) {
    return jsonNoStore(
      {
        ok: false,
        version: ROUTE_VERSION,
        error: "agenda_unavailable",
        canonical_event_id: canonicalEventId,
        database_write_performed: false,
      },
      503
    );
  }

  return jsonNoStore(
    {
      ok: true,
      version: ROUTE_VERSION,
      mode: "canonical_event_official_agenda_read",
      database_write_performed: false,
      canonical_event_id: canonicalEventId,
      agenda,
    },
    200
  );
}