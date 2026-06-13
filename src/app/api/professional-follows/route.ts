// src/app/api/professional-follows/route.ts
// v4.5.1-public-pro-follow-button
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type FollowState = "not_following" | "following";

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

async function readTargetUserId(request: NextRequest): Promise<string> {
  const fromQuery = String(new URL(request.url).searchParams.get("targetUserId") || "").trim();
  if (fromQuery) return fromQuery;

  const body = await request.json().catch(() => null);
  return String(body?.targetUserId || "").trim();
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
    rows: (data ?? []) as RelationshipControlRow[],
    error,
  };
}

async function assertCanFollowTarget(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  currentUserId: string,
  targetUserId: string
): Promise<NextResponse | null> {
  if (!targetUserId) {
    return NextResponse.json(
      { ok: false, code: "MISSING_TARGET_USER_ID" },
      { status: 400 }
    );
  }

  if (targetUserId === currentUserId) {
    return NextResponse.json(
      { ok: false, code: "INVALID_TARGET" },
      { status: 400 }
    );
  }

  const { rows: controls, error: controlError } = await getRelationshipControls(
    supabase,
    currentUserId,
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

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("professional_profiles")
    .select("user_id, visible_in_network")
    .eq("user_id", targetUserId)
    .eq("visible_in_network", true)
    .maybeSingle();

  if (targetProfileError) {
    return NextResponse.json(
      { ok: false, code: "TARGET_PROFILE_SELECT_ERROR", message: targetProfileError.message },
      { status: 500 }
    );
  }

  if (!targetProfile) {
    return NextResponse.json(
      { ok: false, code: "TARGET_PROFILE_NOT_AVAILABLE" },
      { status: 404 }
    );
  }

  return null;
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

    const targetUserId = await readTargetUserId(request);
    const guardResponse = await assertCanFollowTarget(supabase, user.id, targetUserId);

    if (guardResponse) return guardResponse;

    const { data, error } = await supabase
      .from("professional_follows")
      .insert({
        follower_user_id: user.id,
        followed_user_id: targetUserId,
      })
      .select("id, follower_user_id, followed_user_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({
          ok: true,
          state: "following" satisfies FollowState,
          follow: null,
        });
      }

      return NextResponse.json(
        { ok: false, code: "INSERT_ERROR", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      state: "following" satisfies FollowState,
      follow: data,
    });
  } catch (error) {
    console.error("[api/professional-follows] unexpected POST error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const targetUserId = await readTargetUserId(request);

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_TARGET_USER_ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("professional_follows")
      .delete()
      .eq("follower_user_id", user.id)
      .eq("followed_user_id", targetUserId);

    if (error) {
      return NextResponse.json(
        { ok: false, code: "DELETE_ERROR", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      state: "not_following" satisfies FollowState,
    });
  } catch (error) {
    console.error("[api/professional-follows] unexpected DELETE error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
