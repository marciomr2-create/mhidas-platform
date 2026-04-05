// src/app/api/network/connections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type PatchAction = "accept" | "decline" | "cancel";
type ControlStatus = "suspended" | "blocked";

type RelationshipControlRow = {
  id: string;
  owner_user_id: string;
  target_user_id: string;
  status: ControlStatus;
};

async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

async function getRelationshipControls(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  currentUserId: string,
  targetUserId: string
) {
  const { data, error } = await supabase
    .from("professional_relationship_controls")
    .select("id, owner_user_id, target_user_id, status")
    .or(
      `and(owner_user_id.eq.${currentUserId},target_user_id.eq.${targetUserId}),and(owner_user_id.eq.${targetUserId},target_user_id.eq.${currentUserId})`
    );

  return {
    rows: ((data ?? []) as RelationshipControlRow[]),
    error,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const targetUserId = String(body?.targetUserId || "").trim();

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_TARGET_USER_ID" },
        { status: 400 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { ok: false, code: "INVALID_TARGET" },
        { status: 400 }
      );
    }

    const { rows: controls, error: controlError } = await getRelationshipControls(
      supabase,
      user.id,
      targetUserId
    );

    if (controlError) {
      return NextResponse.json(
        { ok: false, code: "CONTROL_SELECT_ERROR", message: controlError.message },
        { status: 500 }
      );
    }

    if (controls.some((row) => row.status === "blocked")) {
      return NextResponse.json(
        { ok: false, code: "RELATIONSHIP_BLOCKED" },
        { status: 403 }
      );
    }

    if (controls.some((row) => row.status === "suspended")) {
      return NextResponse.json(
        { ok: false, code: "RELATIONSHIP_SUSPENDED" },
        { status: 403 }
      );
    }

    const { data: rows, error: selectError } = await supabase
      .from("professional_connections")
      .select("*")
      .or(
        `and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    if (selectError) {
      return NextResponse.json(
        { ok: false, code: "SELECT_ERROR", message: selectError.message },
        { status: 500 }
      );
    }

    const relation = rows?.[0];

    if (!relation) {
      const { data, error } = await supabase
        .from("professional_connections")
        .insert({
          requester_user_id: user.id,
          target_user_id: targetUserId,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, code: "INSERT_ERROR", message: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        state: "outgoing_pending",
        relation: data,
      });
    }

    if (relation.status === "accepted") {
      return NextResponse.json({
        ok: false,
        code: "ALREADY_CONNECTED",
      });
    }

    if (relation.status === "pending") {
      if (relation.requester_user_id === user.id) {
        return NextResponse.json({
          ok: false,
          code: "REQUEST_ALREADY_SENT",
        });
      }

      return NextResponse.json({
        ok: false,
        code: "INCOMING_REQUEST_EXISTS",
      });
    }

    const { data, error } = await supabase
      .from("professional_connections")
      .insert({
        requester_user_id: user.id,
        target_user_id: targetUserId,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "INSERT_ERROR", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      state: "outgoing_pending",
      relation: data,
    });
  } catch (error) {
    console.error("[connections POST] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const counterpartUserId = String(body?.counterpartUserId || "").trim();
    const action = String(body?.action || "").trim() as PatchAction;

    if (!counterpartUserId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_COUNTERPART_USER_ID" },
        { status: 400 }
      );
    }

    if (!action || !["accept", "decline", "cancel"].includes(action)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_ACTION" },
        { status: 400 }
      );
    }

    if (counterpartUserId === user.id) {
      return NextResponse.json(
        { ok: false, code: "INVALID_TARGET" },
        { status: 400 }
      );
    }

    const { rows: controls, error: controlError } = await getRelationshipControls(
      supabase,
      user.id,
      counterpartUserId
    );

    if (controlError) {
      return NextResponse.json(
        { ok: false, code: "CONTROL_SELECT_ERROR", message: controlError.message },
        { status: 500 }
      );
    }

    if (action === "accept" && controls.some((row) => row.status === "blocked")) {
      return NextResponse.json(
        { ok: false, code: "RELATIONSHIP_BLOCKED" },
        { status: 403 }
      );
    }

    if (action === "accept" && controls.some((row) => row.status === "suspended")) {
      return NextResponse.json(
        { ok: false, code: "RELATIONSHIP_SUSPENDED" },
        { status: 403 }
      );
    }

    const { data: rows, error: selectError } = await supabase
      .from("professional_connections")
      .select("*")
      .or(
        `and(requester_user_id.eq.${user.id},target_user_id.eq.${counterpartUserId}),and(requester_user_id.eq.${counterpartUserId},target_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    if (selectError) {
      return NextResponse.json(
        { ok: false, code: "SELECT_ERROR", message: selectError.message },
        { status: 500 }
      );
    }

    const relation = rows?.[0];

    if (!relation) {
      return NextResponse.json(
        { ok: false, code: "RELATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    let newStatus = relation.status;

    if (action === "accept") newStatus = "accepted";
    if (action === "decline") newStatus = "declined";
    if (action === "cancel") newStatus = "cancelled";

    const { data, error } = await supabase
      .from("professional_connections")
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
      })
      .eq("id", relation.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "UPDATE_ERROR", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      state: newStatus,
      relation: data,
    });
  } catch (error) {
    console.error("[connections PATCH] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}