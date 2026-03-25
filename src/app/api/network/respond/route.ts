import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type RespondAction = "accept" | "decline";

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => null);
    const connectionId = String(body?.connectionId || "").trim();
    const action = String(body?.action || "").trim() as RespondAction;

    if (!connectionId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_CONNECTION_ID" },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json(
        { ok: false, code: "INVALID_ACTION" },
        { status: 400 }
      );
    }

    const { data: relation, error: relationError } = await supabase
      .from("professional_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (relationError || !relation) {
      return NextResponse.json(
        { ok: false, code: "CONNECTION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (relation.target_user_id !== user.id) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (relation.status !== "pending") {
      return NextResponse.json(
        { ok: false, code: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    const nextStatus = action === "accept" ? "accepted" : "declined";

    const { data: updated, error: updateError } = await supabase
      .from("professional_connections")
      .update({
        status: nextStatus,
        responded_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, code: "UPDATE_ERROR", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      relation: updated,
    });
  } catch (error) {
    console.error("[network/respond] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}