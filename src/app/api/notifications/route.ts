// src/app/api/notifications/route.ts
// MHIDAS / USECLUBBERS
// V4.8.151 - Central in-app notifications API.
// Scope: list, cursor pagination, unread count and read actions.
// No UI, badge, Realtime, push or production access.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
} as const;


type JsonRecord = Record<string, unknown>;

type NotificationRow = {
  notification_id: string;
  source_type: string;
  source_id: string;
  notification_type: string;
  title: string;
  summary: string | null;
  payload: JsonRecord;
  internal_url: string;
  read_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type NotificationCursor = {
  createdAt: string;
  notificationId: string;
};

type PatchAction = "mark_read" | "mark_all_read";

type PatchPayload = {
  action?: unknown;
  notificationId?: unknown;
};

function jsonResponse(
  body: JsonRecord,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function errorResponse(
  code: string,
  status: number
): NextResponse {
  return jsonResponse(
    {
      ok: false,
      code,
    },
    status
  );
}

function normalizeText(
  value: unknown,
  maxLength: number
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

function parseLimit(rawValue: string | null): number | null {
  if (rawValue === null || rawValue === "") {
    return DEFAULT_LIMIT;
  }

  if (!/^\d{1,3}$/.test(rawValue)) {
    return null;
  }

  const parsed = Number(rawValue);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_LIMIT
  ) {
    return null;
  }

  return parsed;
}

function parseUnreadOnly(
  rawValue: string | null
): boolean | null {
  if (rawValue === null || rawValue === "") {
    return false;
  }

  if (rawValue === "1" || rawValue === "true") {
    return true;
  }

  if (rawValue === "0" || rawValue === "false") {
    return false;
  }

  return null;
}

function isSafeInternalUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length < 2 || value.length > 500) {
    return false;
  }

  if (
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }

  if (!/^\/[A-Za-z0-9/_?&=.%#:@+~-]*$/.test(value)) {
    return false;
  }

  try {
    const parsed = new URL(value, "https://mhidas.invalid");

    return (
      parsed.origin === "https://mhidas.invalid" &&
      parsed.pathname.startsWith("/")
    );
  } catch {
    return false;
  }
}

function encodeCursor(
  row: Pick<
    NotificationRow,
    "created_at" | "notification_id"
  >
): string {
  const payload: [string, string] = [
    row.created_at,
    row.notification_id,
  ];

  return Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");
}

function decodeCursor(
  rawValue: string | null
): NotificationCursor | null {
  if (!rawValue) {
    return null;
  }

  if (
    rawValue.length > 512 ||
    !/^[A-Za-z0-9_-]+$/.test(rawValue)
  ) {
    throw new Error("INVALID_CURSOR");
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(
      Buffer.from(rawValue, "base64url").toString("utf8")
    );
  } catch {
    throw new Error("INVALID_CURSOR");
  }

  if (
    !Array.isArray(decoded) ||
    decoded.length !== 2
  ) {
    throw new Error("INVALID_CURSOR");
  }

  const createdAt = normalizeText(decoded[0], 64);
  const notificationId = normalizeText(decoded[1], 64);

  if (
    !createdAt ||
    Number.isNaN(Date.parse(createdAt)) ||
    !isUuidLike(notificationId)
  ) {
    throw new Error("INVALID_CURSOR");
  }

  return {
    createdAt,
    notificationId,
  };
}

function isPatchAction(
  value: string
): value is PatchAction {
  return (
    value === "mark_read" ||
    value === "mark_all_read"
  );
}

function mapNotification(row: NotificationRow) {
  const destinationAvailable = isSafeInternalUrl(
    row.internal_url
  );

  if (!destinationAvailable) {
    console.error(
      "[api/notifications] blocked unsafe internal destination:",
      row.notification_id
    );
  }

  return {
    id: row.notification_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    notificationType: row.notification_type,
    title: row.title,
    summary: row.summary,
    payload: row.payload ?? {},
    internalUrl: destinationAvailable
      ? row.internal_url
      : null,
    destinationAvailable,
    readAt: row.read_at,
    isRead: row.read_at !== null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

async function getAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    error,
  };
}

async function readUnreadCount(
  supabase: Awaited<
    ReturnType<typeof createServerSupabaseClient>
  >
): Promise<
  | {
      ok: true;
      count: number;
    }
  | {
      ok: false;
    }
> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "mhidas_get_social_notification_unread_count"
  );

  if (error) {
    console.error(
      "[api/notifications] unread count RPC error:",
      error
    );

    return {
      ok: false,
    };
  }

  const count = Number(data ?? 0);

  if (
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    console.error(
      "[api/notifications] invalid unread count result:",
      data
    );

    return {
      ok: false,
    };
  }

  return {
    ok: true,
    count,
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const {
      supabase,
      user,
      error: authError,
    } = await getAuthenticatedContext();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(request.url);

    const limit = parseLimit(
      searchParams.get("limit")
    );

    if (limit === null) {
      return errorResponse("INVALID_LIMIT", 400);
    }

    const unreadOnly = parseUnreadOnly(
      searchParams.get("unreadOnly")
    );

    if (unreadOnly === null) {
      return errorResponse(
        "INVALID_UNREAD_ONLY",
        400
      );
    }

    let cursor: NotificationCursor | null = null;

    try {
      cursor = decodeCursor(
        searchParams.get("cursor")
      );
    } catch {
      return errorResponse("INVALID_CURSOR", 400);
    }

    const {
      data,
      error: listError,
    } = await supabase.rpc(
      "mhidas_get_social_notifications_feed",
      {
        p_limit: limit + 1,
        p_unread_only: unreadOnly,
        p_cursor_created_at: cursor?.createdAt ?? null,
        p_cursor_notification_id:
          cursor?.notificationId ?? null,
      }
    );

    if (listError) {
      console.error(
        "[api/notifications] list error:",
        listError
      );

      return errorResponse(
        "NOTIFICATIONS_READ_FAILED",
        500
      );
    }

    const rows = (data ?? []) as unknown as NotificationRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore
      ? rows.slice(0, limit)
      : rows;

    const unreadResult = await readUnreadCount(
      supabase
    );

    if (!unreadResult.ok) {
      return errorResponse(
        "UNREAD_COUNT_FAILED",
        500
      );
    }

    const lastRow =
      hasMore && pageRows.length > 0
        ? pageRows[pageRows.length - 1]
        : null;

    return jsonResponse({
      ok: true,
      notifications: pageRows.map(
        mapNotification
      ),
      page: {
        limit,
        unreadOnly,
        hasMore,
        nextCursor: lastRow
          ? encodeCursor(lastRow)
          : null,
      },
      unreadCount: unreadResult.count,
    });
  } catch (error) {
    console.error(
      "[api/notifications] unexpected GET error:",
      error
    );

    return errorResponse("INTERNAL_ERROR", 500);
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const {
      supabase,
      user,
      error: authError,
    } = await getAuthenticatedContext();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", 401);
    }

    const body = (await request
      .json()
      .catch(() => null)) as PatchPayload | null;

    if (!body) {
      return errorResponse("INVALID_BODY", 400);
    }

    const action = normalizeText(
      body.action,
      32
    );

    if (!isPatchAction(action)) {
      return errorResponse("INVALID_ACTION", 400);
    }

    if (action === "mark_read") {
      const notificationId = normalizeText(
        body.notificationId,
        64
      );

      if (!isUuidLike(notificationId)) {
        return errorResponse(
          "INVALID_NOTIFICATION_ID",
          400
        );
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        "mhidas_mark_social_notification_read",
        {
          p_notification_id: notificationId,
        }
      );

      if (error) {
        console.error(
          "[api/notifications] mark read RPC error:",
          error
        );

        return errorResponse(
          "MARK_READ_FAILED",
          500
        );
      }

      if (data !== true) {
        return errorResponse(
          "NOTIFICATION_NOT_FOUND",
          404
        );
      }

      const unreadResult = await readUnreadCount(
        supabase
      );

      if (!unreadResult.ok) {
        return errorResponse(
          "UNREAD_COUNT_FAILED",
          500
        );
      }

      return jsonResponse({
        ok: true,
        action,
        notificationId,
        unreadCount: unreadResult.count,
      });
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "mhidas_mark_all_social_notifications_read"
    );

    if (error) {
      console.error(
        "[api/notifications] mark all read RPC error:",
        error
      );

      return errorResponse(
        "MARK_ALL_READ_FAILED",
        500
      );
    }

    const markedCount = Number(data ?? 0);

    if (
      !Number.isSafeInteger(markedCount) ||
      markedCount < 0
    ) {
      console.error(
        "[api/notifications] invalid mark all result:",
        data
      );

      return errorResponse(
        "MARK_ALL_READ_FAILED",
        500
      );
    }

    const unreadResult = await readUnreadCount(
      supabase
    );

    if (!unreadResult.ok) {
      return errorResponse(
        "UNREAD_COUNT_FAILED",
        500
      );
    }

    return jsonResponse({
      ok: true,
      action,
      markedCount,
      unreadCount: unreadResult.count,
    });
  } catch (error) {
    console.error(
      "[api/notifications] unexpected PATCH error:",
      error
    );

    return errorResponse("INTERNAL_ERROR", 500);
  }
}
