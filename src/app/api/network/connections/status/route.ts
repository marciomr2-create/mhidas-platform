// src/app/api/network/connections/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type ConnectionState =
  | "self"
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "connected"
  | "declined"
  | "cancelled"
  | "suspended"
  | "blocked";

type ControlStatus = "suspended" | "blocked";

type RelationshipControlRow = {
  id: string;
  owner_user_id: string;
  target_user_id: string;
  status: ControlStatus;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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
    const targetUserId = String(searchParams.get("targetUserId") || "").trim();

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
        control: null,
      });
    }

    const { data: controlRows, error: controlError } = await supabase
      .from("professional_relationship_controls")
      .select("id, owner_user_id, target_user_id, status")
      .or(
        `and(owner_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(owner_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
      );

    if (controlError) {
      console.error("[api/network/connections/status] control select error:", controlError);
      return NextResponse.json(
        { ok: false, code: "CONTROL_SELECT_ERROR", message: controlError.message },
        { status: 500 }
      );
    }

    const controls = (controlRows ?? []) as RelationshipControlRow[];

    const blockedControl =
      controls.find((row) => row.status === "blocked") ?? null;

    if (blockedControl) {
      return NextResponse.json({
        ok: true,
        state: "blocked" satisfies ConnectionState,
        relation: null,
        control: blockedControl,
      });
    }

    const suspendedControl =
      controls.find((row) => row.status === "suspended") ?? null;

    if (suspendedControl) {
      return NextResponse.json({
        ok: true,
        state: "suspended" satisfies ConnectionState,
        relation: null,
        control: suspendedControl,
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
      console.error("[api/network/connections/status] select error:", error);
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
        control: null,
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
      state =
        relation.requester_user_id === user.id
          ? "outgoing_pending"
          : "incoming_pending";
    } else if (relation.status === "declined") {
      state = "declined";
    } else if (relation.status === "cancelled") {
      state = "cancelled";
    }

    return NextResponse.json({
      ok: true,
      state,
      relation,
      control: null,
    });
  } catch (error) {
    console.error("[api/network/connections/status] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}