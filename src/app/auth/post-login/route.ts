import { NextRequest, NextResponse } from "next/server";

import {
  NFC_GUEST_SESSION_COOKIE,
  hashNfcGuestSessionSecret,
  isValidNfcGuestSessionSecret,
} from "@/lib/clubberEncounters/nfcGuestSession";
import {
  QR_GUEST_SESSION_COOKIE,
  hashQrGuestSessionSecret,
  isValidQrGuestSessionSecret,
} from "@/lib/clubberEncounters/qrGuestSession";
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

function clearGuestCookie(
  response: NextResponse,
  cookieName: string
) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
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

function getClaimStates(data: unknown): string[] {
  const rows = Array.isArray(data)
    ? (data as ClaimRow[])
    : [];

  return rows.map((row) =>
    String(row.state || "")
      .trim()
      .toLowerCase()
  );
}

function shouldClearAfterClaim(
  states: string[]
): boolean {
  if (states.length === 0) {
    return true;
  }

  if (states.some((state) => state === "claimed")) {
    return false;
  }

  return states.every(
    (state) =>
      state === "confirmed" ||
      state === "invalidated"
  );
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

  const nfcSecret =
    request.cookies.get(
      NFC_GUEST_SESSION_COOKIE
    )?.value ?? "";

  const qrSecret =
    request.cookies.get(
      QR_GUEST_SESSION_COOKIE
    )?.value ?? "";

  if (!nfcSecret && !qrSecret) {
    return redirectNoStore(
      new URL(
        nextPath,
        request.nextUrl.origin
      )
    );
  }

  let nfcStates: string[] = [];
  let qrStates: string[] = [];

  let clearNfc = false;
  let clearQr = false;

  if (nfcSecret) {
    if (
      !isValidNfcGuestSessionSecret(
        nfcSecret
      )
    ) {
      clearNfc = true;
    } else {
      try {
        const hash =
          hashNfcGuestSessionSecret(
            nfcSecret
          );

        const { data, error } =
          await supabase.rpc(
            "mhidas_claim_nfc_encounters_v1",
            {
              p_guest_session_hash: hash,
            }
          );

        if (!error) {
          nfcStates = getClaimStates(data);
          clearNfc =
            shouldClearAfterClaim(
              nfcStates
            );
        }
      } catch {
      }
    }
  }

  if (qrSecret) {
    if (
      !isValidQrGuestSessionSecret(
        qrSecret
      )
    ) {
      clearQr = true;
    } else {
      try {
        const hash =
          hashQrGuestSessionSecret(
            qrSecret
          );

        const { data, error } =
          await supabase.rpc(
            "mhidas_claim_qr_encounters_v1",
            {
              p_guest_session_hash: hash,
            }
          );

        if (!error) {
          qrStates = getClaimStates(data);
          clearQr =
            shouldClearAfterClaim(
              qrStates
            );
        }
      } catch {
      }
    }
  }

  const profileRequired = [
    ...nfcStates,
    ...qrStates,
  ].some(
    (state) => state === "claimed"
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

  if (clearNfc) {
    clearGuestCookie(
      response,
      NFC_GUEST_SESSION_COOKIE
    );
  }

  if (clearQr) {
    clearGuestCookie(
      response,
      QR_GUEST_SESSION_COOKIE
    );
  }

  return response;
}