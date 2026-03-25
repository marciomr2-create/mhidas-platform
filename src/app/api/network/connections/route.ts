import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type PatchAction = "accept" | "decline" | "cancel";

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const targetUserId = String(body?.targetUserId || "").trim();
    const action = String(body?.action || "").trim() as PatchAction;

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_TARGET_USER_ID" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { ok: false, code: "MISSING_ACTION" },
        { status: 400 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { ok: false, code: "INVALID_TARGET" },
        { status: 400 }
      );
    }

    // BUSCA RELAÇÃO EXISTENTE
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

    // === CRIAR CONEXÃO ===
    if (!relation) {
      if (action !== "accept") {
        return NextResponse.json({
          ok: true,
          state: "none",
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
    }

    // === UPDATE STATUS ===
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
    console.error("[connections] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}