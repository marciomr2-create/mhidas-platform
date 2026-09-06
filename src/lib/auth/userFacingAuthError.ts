// src/lib/auth/userFacingAuthError.ts

type AuthErrorSnapshot = {
  code: string;
  message: string;
  status: number | null;
};

function readAuthError(error: unknown): AuthErrorSnapshot {
  if (!error || typeof error !== "object") {
    return {
      code: "",
      message: error instanceof Error ? error.message.toLowerCase() : "",
      status: null,
    };
  }

  const record = error as Record<string, unknown>;

  const code =
    typeof record.code === "string" ? record.code.trim().toLowerCase() : "";

  const message =
    typeof record.message === "string"
      ? record.message.trim().toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : "";

  const status =
    typeof record.status === "number" && Number.isFinite(record.status)
      ? record.status
      : null;

  return { code, message, status };
}

function isRateLimited(snapshot: AuthErrorSnapshot): boolean {
  return (
    snapshot.status === 429 ||
    snapshot.code.includes("rate_limit") ||
    snapshot.code === "too_many_requests" ||
    snapshot.message.includes("rate limit") ||
    snapshot.message.includes("too many requests")
  );
}

function isNetworkFailure(snapshot: AuthErrorSnapshot): boolean {
  return (
    snapshot.message.includes("failed to fetch") ||
    snapshot.message.includes("network") ||
    snapshot.message.includes("fetch failed") ||
    snapshot.message.includes("networkerror")
  );
}

export function getLoginErrorMessage(error: unknown): string {
  const snapshot = readAuthError(error);

  if (
    snapshot.code === "invalid_credentials" ||
    snapshot.message.includes("invalid login credentials")
  ) {
    return "E-mail ou senha incorretos.";
  }

  if (
    snapshot.code === "email_not_confirmed" ||
    snapshot.message.includes("email not confirmed")
  ) {
    return "Confirme seu e-mail antes de entrar. Use a mensagem mais recente enviada pelo USECLUBBERS.";
  }

  if (isRateLimited(snapshot)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (
    snapshot.code === "captcha_failed" ||
    snapshot.message.includes("captcha")
  ) {
    return "Não foi possível validar a segurança do acesso. Tente novamente.";
  }

  if (isNetworkFailure(snapshot)) {
    return "Não foi possível conectar ao serviço de acesso. Verifique sua conexão e tente novamente.";
  }

  return "Não foi possível entrar agora. Tente novamente.";
}

export function getSignupErrorMessage(error: unknown): string {
  const snapshot = readAuthError(error);

  if (
    snapshot.code === "email_address_invalid" ||
    snapshot.message.includes("invalid email")
  ) {
    return "Digite um endereço de e-mail válido.";
  }

  if (
    snapshot.code === "weak_password" ||
    snapshot.message.includes("password should") ||
    snapshot.message.includes("password is too weak")
  ) {
    return "Use uma senha mais forte e tente novamente.";
  }

  if (
    snapshot.code === "user_already_exists" ||
    snapshot.code === "email_exists" ||
    snapshot.message.includes("already registered") ||
    snapshot.message.includes("already exists")
  ) {
    return "Não foi possível criar uma nova conta com este e-mail. Se você já usa o USECLUBBERS, entre ou redefina sua senha.";
  }

  if (isRateLimited(snapshot)) {
    return "Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (isNetworkFailure(snapshot)) {
    return "Não foi possível conectar ao serviço de cadastro. Verifique sua conexão e tente novamente.";
  }

  return "Não foi possível criar sua conta agora. Tente novamente.";
}

export function getOAuthErrorMessage(
  error: unknown,
  context: "login" | "signup"
): string {
  const snapshot = readAuthError(error);

  if (isRateLimited(snapshot)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (isNetworkFailure(snapshot)) {
    return context === "login"
      ? "Não foi possível conectar ao Google agora. Verifique sua conexão e tente novamente."
      : "Não foi possível iniciar o cadastro com Google agora. Verifique sua conexão e tente novamente.";
  }

  return context === "login"
    ? "Não foi possível iniciar o acesso com Google. Tente novamente."
    : "Não foi possível continuar o cadastro com Google. Tente novamente.";
}