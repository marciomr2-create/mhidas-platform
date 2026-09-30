import { NextRequest, NextResponse } from "next/server";

import {
  NFC_GUEST_SESSION_COOKIE,
  hashNfcGuestSessionSecret,
  isValidNfcGuestSessionSecret,
} from "@/lib/clubberEncounters/nfcGuestSession";
import {
  buildOnboardingPath,
  getSafeInternalNextPath,
  getSafePostOnboardingPath,
} from "@/lib/navigation/safeInternalNextPath";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type ClaimRow = {
  claim_id: string;
  encounter_id: string | null;
  state: string;
};

function redirectNoStore(url: URL) {
  const response = NextResponse.redirect(url, 302);

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  return response;
}

function clearGuestSessionCookie(
  response: NextResponse
) {
  response.cookies.set(
    NFC_GUEST_SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV !== "development",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    }
  );
}

function getOnboardingReturnTo(
  nextPath: string
): string {
  const direct =
    getSafePostOnboardingPath(nextPath);

  if (direct) {
    return direct;
  }

  try {
    const parsed = new URL(
      nextPath,
      "https://useclubbers.local"
    );

    return getSafePostOnboardingPath(
      parsed.searchParams.get("return_to")
    );
  } catch {
    return "";
  }
}

export async function GET(
  request: NextRequest
) {
  const nextPath =
    getSafeInternalNextPath(
      request.nextUrl.searchParams.get("next")
    ) || "/dashboard";

  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    const loginUrl = new URL(
      "/login",
      request.nextUrl.origin
    );

    loginUrl.searchParams.set(
      "next",
      nextPath
    );

    return redirectNoStore(loginUrl);
  }

  const guestSessionSecret =
    request.cookies.get(
      NFC_GUEST_SESSION_COOKIE
    )?.value ?? "";

  if (!guestSessionSecret) {
    return redirectNoStore(
      new URL(
        nextPath,
        request.nextUrl.origin
      )
    );
  }

  if (
    !isValidNfcGuestSessionSecret(
      guestSessionSecret
    )
  ) {
    const response = redirectNoStore(
      new URL(
        nextPath,
        request.nextUrl.origin
      )
    );

    clearGuestSessionCookie(response);

    return response;
  }

  try {
    const guestSessionHash =
      hashNfcGuestSessionSecret(
        guestSessionSecret
      );

    const { data, error } =
      await supabase.rpc(
        "mhidas_claim_nfc_encounters_v1",
        {
          p_guest_session_hash:
            guestSessionHash,
        }
      );

    if (error) {
      return redirectNoStore(
        new URL(
          nextPath,
          request.nextUrl.origin
        )
      );
    }

    const rows = Array.isArray(data)
      ? (data as ClaimRow[])
      : [];

    const states = rows.map((row) =>
      String(row.state || "")
        .trim()
        .toLowerCase()
    );

    const profileRequired =
      states.some(
        (state) => state === "claimed"
      );

    const finalStatesOnly =
      states.every(
        (state) =>
          state === "confirmed" ||
          state === "invalidated"
      );

    const shouldClearCookie =
      rows.length === 0 ||
      (
        !profileRequired &&
        finalStatesOnly
      );

    const destination =
      profileRequired
        ? buildOnboardingPath(
            getOnboardingReturnTo(
              nextPath
            )
          )
        : nextPath;

    const response = redirectNoStore(
      new URL(
        destination,
        request.nextUrl.origin
      )
    );

    if (shouldClearCookie) {
      clearGuestSessionCookie(response);
    }

    return response;
  } catch {
    /*
     * A falha do claim não pode impedir
     * o usuário de continuar o fluxo.
     * O cookie é preservado para nova tentativa.
     */
    return redirectNoStore(
      new URL(
        nextPath,
        request.nextUrl.origin
      )
    );
  }
}