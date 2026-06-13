// src/app/api/professional-follows/status/route.ts
// v4.5.1-public-pro-follow-button
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type FollowState =
  | "signed_out"
  | "self"
  | "not_following"
  | "following"
  | "blocked"
  | "suspended";

type ControlStatus = "suspended" | "blocked";

type RelationshipControlRow = {
  id: string;
  owner_user_id: string;
  target_user_id: string;
  status: ControlStatus;
};

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
    rows: (data ?? []) as RelationshipControlRow[],
    error,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const targetUserId = String(searchParams.get("targetUserId") || "").trim();

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_TARGET_USER_ID" },
        { status: 400 }
      );
    }

    if (authError || !user) {
      return NextResponse.json({
        ok: true,
        state: "signed_out" satisfies FollowState,
        follow: null,
      });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({
        ok: true,
        state: "self" satisfies FollowState,
        follow: null,
      });
    }

    const { rows: controls, error: controlError } = await getRelationshipControls(
      supabase,
      user.id,
      targetUserId
    );

    if (controlError) {
      console.error("[api/professional-follows/status] control select error:", controlError);
      return NextResponse.json(
        { ok: false, code: "CONTROL_SELECT_ERROR", message: controlError.message },
        { status: 500 }
      );
    }

    const blockedControl = controls.find((row) => row.status === "blocked") ?? null;

    if (blockedControl) {
      return NextResponse.json({
        ok: true,
        state: "blocked" satisfies FollowState,
        follow: null,
        control: blockedControl,
      });
    }

    const suspendedControl = controls.find((row) => row.status === "suspended") ?? null;

    if (suspendedControl) {
      return NextResponse.json({
        ok: true,
        state: "suspended" satisfies FollowState,
        follow: null,
        control: suspendedControl,
      });
    }

    const { data: follow, error: followError } = await supabase
      .from("professional_follows")
      .select("id, follower_user_id, followed_user_id, created_at")
      .eq("follower_user_id", user.id)
      .eq("followed_user_id", targetUserId)
      .maybeSingle();

    if (followError) {
      console.error("[api/professional-follows/status] follow select error:", followError);
      return NextResponse.json(
        { ok: false, code: "FOLLOW_SELECT_ERROR", message: followError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      state: follow
        ? ("following" satisfies FollowState)
        : ("not_following" satisfies FollowState),
      follow: follow ?? null,
      control: null,
    });
  } catch (error) {
    console.error("[api/professional-follows/status] unexpected error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
