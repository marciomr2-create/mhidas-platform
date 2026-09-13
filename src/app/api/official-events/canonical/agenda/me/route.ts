import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ROUTE_VERSION =
  "v4.8.184-mvp2-social-agenda-me-foundation";

const ALLOWED_ACTIONS = ["save", "remove"] as const;

type AgendaAction = (typeof ALLOWED_ACTIONS)[number];

type AgendaPayload = {
  action?: unknown;
  canonical_event_id?: unknown;
  set_id?: unknown;
};

function normalizeText(
  value: unknown,
  maxLength = 200
): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isAgendaAction(
  value: string
): value is AgendaAction {
  return ALLOWED_ACTIONS.includes(
    value as AgendaAction
  );
}

function jsonNoStore(
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, {
    status,
  });

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}

function errorResponse(
  message: string,
  status: number
) {
  return jsonNoStore(
    {
      ok: false,
      version: ROUTE_VERSION,
      scope: "canonical-event-agenda-me",
      message,
      database_write_performed: false,
    },
    status
  );
}

async function requireUser() {
  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : user,
  };
}

export async function GET(
  request: NextRequest
) {
  const { supabase, user } =
    await requireUser();

  if (!user) {
    return errorResponse(
      "Authentication required.",
      401
    );
  }

  const canonicalEventId = normalizeText(
    request.nextUrl.searchParams.get(
      "canonicalEventId"
    ),
    64
  );

  if (
    !canonicalEventId ||
    !isUuidLike(canonicalEventId)
  ) {
    return errorResponse(
      "Valid canonicalEventId is required.",
      400
    );
  }

  const { data, error } = await supabase
    .from("clubber_event_agenda_items")
    .select(
      "agenda_item_id,user_id,canonical_event_id,set_id,status,created_at,updated_at"
    )
    .eq("user_id", user.id)
    .eq(
      "canonical_event_id",
      canonicalEventId
    )
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    return errorResponse(
      "Could not load personal event agenda.",
      500
    );
  }

  const items = data ?? [];

  const savedSetIds = items
    .filter(
      (item) => item.status === "saved"
    )
    .map((item) => item.set_id);

  const removedCount = items.filter(
    (item) => item.status === "removed"
  ).length;

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "canonical-event-agenda-me",
    mode: "read",
    database_write_performed: false,
    canonical_event_id: canonicalEventId,
    viewer_user_id: user.id,
    items,
    saved_set_ids: savedSetIds,
    summary: {
      item_count: items.length,
      saved_count: savedSetIds.length,
      removed_count: removedCount,
    },
  });
}

export async function POST(
  request: NextRequest
) {
  const { supabase, user } =
    await requireUser();

  if (!user) {
    return errorResponse(
      "Authentication required.",
      401
    );
  }

  let payload: AgendaPayload;

  try {
    payload =
      (await request.json()) as AgendaPayload;
  } catch {
    return errorResponse(
      "Invalid JSON body.",
      400
    );
  }

  const action = normalizeText(
    payload.action,
    24
  );

  const canonicalEventId = normalizeText(
    payload.canonical_event_id,
    64
  );

  const setId = normalizeText(
    payload.set_id,
    64
  );

  if (!isAgendaAction(action)) {
    return errorResponse(
      "Invalid agenda action.",
      400
    );
  }

  if (
    !canonicalEventId ||
    !isUuidLike(canonicalEventId)
  ) {
    return errorResponse(
      "Valid canonical_event_id is required.",
      400
    );
  }

  if (!setId || !isUuidLike(setId)) {
    return errorResponse(
      "Valid set_id is required.",
      400
    );
  }

  const {
    data: existingItem,
    error: existingError,
  } = await supabase
    .from("clubber_event_agenda_items")
    .select(
      "agenda_item_id,canonical_event_id,set_id,status"
    )
    .eq("user_id", user.id)
    .eq("set_id", setId)
    .maybeSingle();

  if (existingError) {
    return errorResponse(
      "Could not inspect personal agenda item.",
      500
    );
  }

  if (
    existingItem &&
    existingItem.canonical_event_id !==
      canonicalEventId
  ) {
    return errorResponse(
      "Agenda item does not belong to this event.",
      409
    );
  }

  if (action === "remove") {
    if (
      !existingItem ||
      existingItem.status === "removed"
    ) {
      return jsonNoStore({
        ok: true,
        version: ROUTE_VERSION,
        scope: "canonical-event-agenda-me",
        mode: "remove",
        canonical_event_id:
          canonicalEventId,
        set_id: setId,
        status: "removed",
        changed: false,
        database_write_performed: false,
      });
    }

    const {
      data: updatedItem,
      error: updateError,
    } = await supabase
      .from("clubber_event_agenda_items")
      .update({
        status: "removed",
      })
      .eq(
        "agenda_item_id",
        existingItem.agenda_item_id
      )
      .eq("user_id", user.id)
      .select(
        "agenda_item_id,canonical_event_id,set_id,status,created_at,updated_at"
      )
      .single();

    if (updateError) {
      return errorResponse(
        "Could not remove set from personal agenda.",
        500
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "canonical-event-agenda-me",
      mode: "remove",
      canonical_event_id:
        canonicalEventId,
      set_id: setId,
      status: "removed",
      changed: true,
      database_write_performed: true,
      item: updatedItem,
    });
  }

  const {
    data: officialSet,
    error: setError,
  } = await supabase
    .from("canonical_event_sets")
    .select(
      "set_id,canonical_event_id,publication_status,lifecycle_status"
    )
    .eq("set_id", setId)
    .eq(
      "canonical_event_id",
      canonicalEventId
    )
    .eq(
      "publication_status",
      "published"
    )
    .maybeSingle();

  if (setError) {
    return errorResponse(
      "Could not validate official set.",
      500
    );
  }

  if (!officialSet) {
    return errorResponse(
      "Published official set not found.",
      404
    );
  }

  if (
    officialSet.lifecycle_status ===
    "cancelled"
  ) {
    return errorResponse(
      "Cancelled set cannot be added to the agenda.",
      409
    );
  }

  if (
    existingItem?.status === "saved"
  ) {
    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "canonical-event-agenda-me",
      mode: "save",
      canonical_event_id:
        canonicalEventId,
      set_id: setId,
      status: "saved",
      changed: false,
      database_write_performed: false,
    });
  }

  if (existingItem) {
    const {
      data: restoredItem,
      error: restoreError,
    } = await supabase
      .from("clubber_event_agenda_items")
      .update({
        status: "saved",
      })
      .eq(
        "agenda_item_id",
        existingItem.agenda_item_id
      )
      .eq("user_id", user.id)
      .select(
        "agenda_item_id,canonical_event_id,set_id,status,created_at,updated_at"
      )
      .single();

    if (restoreError) {
      return errorResponse(
        "Could not restore set to personal agenda.",
        500
      );
    }

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "canonical-event-agenda-me",
      mode: "save",
      canonical_event_id:
        canonicalEventId,
      set_id: setId,
      status: "saved",
      changed: true,
      database_write_performed: true,
      item: restoredItem,
    });
  }

  const {
    data: createdItem,
    error: insertError,
  } = await supabase
    .from("clubber_event_agenda_items")
    .insert({
      user_id: user.id,
      canonical_event_id:
        canonicalEventId,
      set_id: setId,
      status: "saved",
    })
    .select(
      "agenda_item_id,canonical_event_id,set_id,status,created_at,updated_at"
    )
    .single();

  if (insertError) {
    return errorResponse(
      "Could not add set to personal agenda.",
      500
    );
  }

  return jsonNoStore({
    ok: true,
    version: ROUTE_VERSION,
    scope: "canonical-event-agenda-me",
    mode: "save",
    canonical_event_id:
      canonicalEventId,
    set_id: setId,
    status: "saved",
    changed: true,
    database_write_performed: true,
    item: createdItem,
  });
}