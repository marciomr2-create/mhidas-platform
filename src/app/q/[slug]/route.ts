import { NextRequest, NextResponse } from "next/server";

import {
  QR_GUEST_SESSION_COOKIE,
  getQrGuestSessionCookieOptions,
  recordQrGuestPending,
} from "@/lib/clubberEncounters/qrGuestSession";
import { createPublicClient } from "@/utils/supabase/public";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function redirectProfile(
  request: NextRequest,
  slug: string
) {
  const response = NextResponse.redirect(
    new URL(
      `/${encodeURIComponent(slug)}?mode=club`,
      request.nextUrl.origin
    ),
    302
  );

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  return response;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await ctx.params;

  const slug = String(rawSlug || "")
    .trim()
    .toLowerCase();

  if (!slug) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404 }
    );
  }

  const publicSupabase = createPublicClient();

  const { data: card } = await publicSupabase
    .from("cards")
    .select("slug, is_published")
    .eq("slug", slug)
    .single();

  if (!card?.slug || !card.is_published) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404 }
    );
  }

  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    try {
      await supabase.rpc(
        "mhidas_record_qr_encounter_v1",
        { p_slug: card.slug }
      );
    } catch {}

    return redirectProfile(request, card.slug);
  }

  let guestSecret = "";

  try {
    const currentSecret =
      request.cookies.get(
        QR_GUEST_SESSION_COOKIE
      )?.value ?? null;

    const pending = await recordQrGuestPending({
      slug: card.slug,
      currentSecret,
    });

    guestSecret = pending.secret;
  } catch {}

  const response =
    redirectProfile(request, card.slug);

  if (guestSecret) {
    response.cookies.set(
      QR_GUEST_SESSION_COOKIE,
      guestSecret,
      getQrGuestSessionCookieOptions()
    );
  }

  return response;
}