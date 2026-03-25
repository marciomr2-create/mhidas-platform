import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type ConnectionState =
  | "self"
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "connected"
  | "declined"
  | "cancelled";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_TARGET_USER_ID" },
        { status: 400 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json({
        ok: true,
        state: "self" satisfies ConnectionState,
        relation: null,
      });
    }

    const { data: rows, error } = await supabase
      .from("professional_connections")
      .select("id, requester_user_id, target_user_id, status, responded_at, created_at")
      .or(
        `and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[connections/status] select error:", error);
      return NextResponse.json(
        { ok: false, code: "SELECT_ERROR", message: error.message },
        { status: 500 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        ok: true,
        state: "none" satisfies ConnectionState,
        relation: null,
      });
    }

    const relation =
      rows.find((row) => row.status === "accepted") ??
      rows.find((row) => row.status === "pending") ??
      rows[0];

    let state: ConnectionState = "none";

    if (relation.status === "accepted") {
      state = "connected";
    } else if (relation.status === "pending") {
      if (relation.requester_user_id === user.id) {
        state = "outgoing_pending";
      } else {
        state = "incoming_pending";
      }
    } else if (relation.status === "declined") {
      state = "declined";
    } else if (relation.status === "cancelled") {
      state = "cancelled";
    }

    return NextResponse.json({
      ok: true,
      state,
      relation,
    });
  } catch (error) {
    console.error("[connections/status] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}