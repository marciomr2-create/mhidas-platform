const RESERVED_NEXT_SLUGS = new Set([
  "account",
  "api",
  "auth",
  "clubbers",
  "dashboard",
  "event",
  "forgot-password",
  "invalid",
  "login",
  "network",
  "onboarding",
  "pro",
  "r",
  "reset-password",
  "signup",
  "t",
  "u",
]);

export const ACCOUNT_ENTRY_INTENTS = [
  "clubber",
  "artist",
  "club",
  "festival",
  "organization",
] as const;

export type AccountEntryIntent = (typeof ACCOUNT_ENTRY_INTENTS)[number];

export function isAccountEntryIntent(
  value: string | null | undefined
): value is AccountEntryIntent {
  return ACCOUNT_ENTRY_INTENTS.includes(value as AccountEntryIntent);
}

function sanitizeInternalPath(
  value: string | null | undefined,
  allowOnboarding: boolean,
  allowAccountStart: boolean
): string {
  const candidate = String(value || "").trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return "";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(candidate, "https://useclubbers.local");
  } catch {
    return "";
  }

  const pathname = parsedUrl.pathname;
  const search = parsedUrl.search;

  if (pathname === "/dashboard" && !search) return "/dashboard";
  if (pathname === "/dashboard/cards" && !search) return "/dashboard/cards";
  if (pathname === "/clubbers" && !search) return "/clubbers";

  if (allowOnboarding && pathname === "/onboarding") {
    const query = new URLSearchParams(search);

    if (query.size === 0) {
      return "/onboarding";
    }

    if (
      query.size === 1 &&
      query.has("return_to") &&
      query.getAll("return_to").length === 1
    ) {
      const safeReturnTo = sanitizeInternalPath(
        query.get("return_to"),
        false,
        false
      );

      if (safeReturnTo) {
        const onboardingQuery = new URLSearchParams({
          return_to: safeReturnTo,
        });

        return `/onboarding?${onboardingQuery.toString()}`;
      }
    }

    return "";
  }

  if (allowAccountStart && pathname === "/account/start") {
    const query = new URLSearchParams(search);
    const intent = query.get("intent");
    const returnTo = query.get("return_to");

    for (const key of query.keys()) {
      if (key !== "intent" && key !== "return_to") {
        return "";
      }
    }

    if (!isAccountEntryIntent(intent)) {
      return "";
    }

    if (query.getAll("intent").length !== 1) {
      return "";
    }

    const accountQuery = new URLSearchParams({
      intent,
    });

    if (returnTo !== null) {
      if (query.getAll("return_to").length !== 1) {
        return "";
      }

      const safeReturnTo = sanitizeInternalPath(returnTo, false, false);

      if (!safeReturnTo) {
        return "";
      }

      accountQuery.set("return_to", safeReturnTo);
    }

    return `/account/start?${accountQuery.toString()}`;
  }

  if (/^\/event\/[a-z0-9][a-z0-9_-]*$/i.test(pathname)) {
    return `${pathname}${search}`;
  }

  if (/^\/[a-z0-9][a-z0-9_-]*$/i.test(pathname)) {
    const slug = pathname.slice(1).toLowerCase();

    if (RESERVED_NEXT_SLUGS.has(slug)) {
      return "";
    }

    const query = new URLSearchParams(search);

    if (query.size === 1 && query.get("mode") === "club") {
      return `${pathname}?mode=club`;
    }
  }

  return "";
}

export function getSafeInternalNextPath(
  value: string | null | undefined
): string {
  return sanitizeInternalPath(value, true, true);
}

export function getSafePostOnboardingPath(
  value: string | null | undefined
): string {
  return sanitizeInternalPath(value, false, false);
}

export function getSafeRecoveryReturnPath(
  value: string | null | undefined
): string {
  return sanitizeInternalPath(value, true, true);
}

export function buildOnboardingPath(
  returnTo: string | null | undefined
): string {
  const safeReturnTo = getSafePostOnboardingPath(returnTo);

  if (!safeReturnTo) {
    return "/onboarding";
  }

  const query = new URLSearchParams({
    return_to: safeReturnTo,
  });

  return `/onboarding?${query.toString()}`;
}

export function buildAccountStartPath(
  intent: AccountEntryIntent,
  returnTo: string | null | undefined
): string {
  const query = new URLSearchParams({
    intent,
  });
  const safeReturnTo = getSafePostOnboardingPath(returnTo);

  if (safeReturnTo) {
    query.set("return_to", safeReturnTo);
  }

  return `/account/start?${query.toString()}`;
}

export function buildForgotPasswordPath(
  returnTo: string | null | undefined
): string {
  const safeReturnTo = getSafeRecoveryReturnPath(returnTo);

  if (!safeReturnTo) {
    return "/forgot-password";
  }

  const query = new URLSearchParams({
    return_to: safeReturnTo,
  });

  return `/forgot-password?${query.toString()}`;
}

export function buildPasswordResetPath(
  returnTo: string | null | undefined
): string {
  const safeReturnTo = getSafeRecoveryReturnPath(returnTo);

  if (!safeReturnTo) {
    return "/reset-password";
  }

  const query = new URLSearchParams({
    return_to: safeReturnTo,
  });

  return `/reset-password?${query.toString()}`;
}
