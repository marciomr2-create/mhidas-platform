import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type PatchAction = "accept" | "decline" | "cancel";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_TARGET_USER_ID" },
        { status: 400 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { ok: false, code: "SELF_CONNECTION_NOT_ALLOWED" },
        { status: 400 }
      );
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("professional_connections")
      .select("id, requester_user_id, target_user_id, status, responded_at, created_at")
      .or(
        `and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    if (existingError) {
      console.error("[api/network/connections][POST] existing select error:", existingError);
      return NextResponse.json(
        { ok: false, code: "EXISTING_SELECT_ERROR", message: existingError.message },
        { status: 500 }
      );
    }

    const existingAccepted = existingRows?.find((row) => row.status === "accepted");
    if (existingAccepted) {
      return NextResponse.json(
        { ok: false, code: "ALREADY_CONNECTED" },
        { status: 409 }
      );
    }

    const existingPending = existingRows?.find((row) => row.status === "pending");
    if (existingPending) {
      if (existingPending.requester_user_id === user.id) {
        return NextResponse.json(
          { ok: false, code: "REQUEST_ALREADY_SENT" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { ok: false, code: "INCOMING_REQUEST_EXISTS" },
        { status: 409 }
      );
    }

    const reusableRow = existingRows?.find(
      (row) => row.status === "declined" || row.status === "cancelled"
    );

    if (reusableRow) {
      const { data: updatedRows, error: updateError } = await supabase
        .from("professional_connections")
        .update({
          requester_user_id: user.id,
          target_user_id: targetUserId,
          status: "pending",
          responded_at: null,
          created_at: new Date().toISOString(),
        })
        .eq("id", reusableRow.id)
        .select("id, requester_user_id, target_user_id, status, responded_at, created_at");

      if (updateError) {
        console.error("[api/network/connections][POST] reusable update error:", updateError);
        return NextResponse.json(
          { ok: false, code: "REUSABLE_UPDATE_ERROR", message: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        action: "created",
        relation: updatedRows?.[0] ?? null,
      });
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from("professional_connections")
      .insert({
        requester_user_id: user.id,
        target_user_id: targetUserId,
        status: "pending",
      })
      .select("id, requester_user_id, target_user_id, status, responded_at, created_at");

    if (insertError) {
      console.error("[api/network/connections][POST] insert error:", insertError);
      return NextResponse.json(
        { ok: false, code: "INSERT_ERROR", message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "created",
      relation: insertedRows?.[0] ?? null,
    });
  } catch (error) {
    console.error("[api/network/connections][POST] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

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
    const counterpartUserId = String(body?.counterpartUserId || "").trim();
    const action = body?.action as PatchAction | undefined;

    if (!counterpartUserId || !action) {
      return NextResponse.json(
        { ok: false, code: "MISSING_PAYLOAD" },
        { status: 400 }
      );
    }

    if (counterpartUserId === user.id) {
      return NextResponse.json(
        { ok: false, code: "INVALID_COUNTERPART" },
        { status: 400 }
      );
    }

    if (action === "accept" || action === "decline") {
      const nextStatus = action === "accept" ? "accepted" : "declined";

      const { data: updatedRows, error: updateError } = await supabase
        .from("professional_connections")
        .update({
          status: nextStatus,
          responded_at: new Date().toISOString(),
        })
        .eq("requester_user_id", counterpartUserId)
        .eq("target_user_id", user.id)
        .eq("status", "pending")
        .select("id, requester_user_id, target_user_id, status, responded_at, created_at");

      if (updateError) {
        console.error("[api/network/connections][PATCH] accept/decline error:", updateError);
        return NextResponse.json(
          { ok: false, code: "UPDATE_ERROR", message: updateError.message },
          { status: 500 }
        );
      }

      if (!updatedRows || updatedRows.length === 0) {
        return NextResponse.json(
          { ok: false, code: "REQUEST_NOT_FOUND" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        action,
        relation: updatedRows[0],
      });
    }

    if (action === "cancel") {
      const { data: updatedRows, error: updateError } = await supabase
        .from("professional_connections")
        .update({
          status: "cancelled",
          responded_at: new Date().toISOString(),
        })
        .eq("requester_user_id", user.id)
        .eq("target_user_id", counterpartUserId)
        .eq("status", "pending")
        .select("id, requester_user_id, target_user_id, status, responded_at, created_at");

      if (updateError) {
        console.error("[api/network/connections][PATCH] cancel error:", updateError);
        return NextResponse.json(
          { ok: false, code: "CANCEL_ERROR", message: updateError.message },
          { status: 500 }
        );
      }

      if (!updatedRows || updatedRows.length === 0) {
        return NextResponse.json(
          { ok: false, code: "REQUEST_NOT_FOUND" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        action,
        relation: updatedRows[0],
      });
    }

    return NextResponse.json(
      { ok: false, code: "INVALID_ACTION" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[api/network/connections][PATCH] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}