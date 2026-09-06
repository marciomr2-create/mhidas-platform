// src/app/account/security/page.tsx

import { redirect } from "next/navigation";
import ChangeAccountEmailForm from "@/components/account/ChangeAccountEmailForm";
import UseclubbersPageShell from "@/components/layout/UseclubbersPageShell";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import AccountSecurityClient from "./AccountSecurityClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EmailChangeCallbackStatus =
  | "awaiting_other"
  | "confirmed"
  | "failed"
  | null;

type AccountSecurityPageProps = {
  searchParams: Promise<{
    email_change?: string | string[];
  }>;
};

function getAccessMethod(appMetadata: Record<string, unknown>): string {
  const providerSet = new Set<string>();

  const primaryProvider = appMetadata.provider;
  if (typeof primaryProvider === "string" && primaryProvider.trim()) {
    providerSet.add(primaryProvider.trim().toLowerCase());
  }

  const providers = appMetadata.providers;
  if (Array.isArray(providers)) {
    for (const provider of providers) {
      if (typeof provider === "string" && provider.trim()) {
        providerSet.add(provider.trim().toLowerCase());
      }
    }
  }

  const hasGoogle = providerSet.has("google");
  const hasEmail = providerSet.has("email");

  if (hasGoogle && hasEmail) return "Google + e-mail";
  if (hasGoogle) return "Google";
  if (hasEmail) return "E-mail e senha";

  return "Conta USECLUBBERS";
}

function getEmailChangeCallbackStatus(
  value: string | string[] | undefined
): EmailChangeCallbackStatus {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "awaiting_other" ||
    normalized === "confirmed" ||
    normalized === "failed"
  ) {
    return normalized;
  }

  return null;
}

export default async function AccountSecurityPage({
  searchParams,
}: AccountSecurityPageProps) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Faccount%2Fsecurity");
  }

  const resolvedSearchParams = await searchParams;
  const emailChangeCallbackStatus = getEmailChangeCallbackStatus(
    resolvedSearchParams.email_change
  );

  const email = user.email ?? "";
  const emailConfirmed = Boolean(user.email_confirmed_at);
  const accessMethod = getAccessMethod(
    (user.app_metadata ?? {}) as Record<string, unknown>
  );

  return (
    <UseclubbersPageShell
      eyebrow="SUA CONTA USECLUBBERS"
      title="Conta e segurança"
      description="Gerencie como você acessa sua conta. Sua Conta USECLUBBERS é independente da sua Identidade Clubber e das identidades que você administra."
      backHref="/dashboard"
      backLabel="Voltar ao início"
    >
      <section className="uc-ui-grid uc-ui-grid--2 uc-ui-section">
        <article className="uc-ui-surface">
          <span className="uc-ui-label">E-mail da conta</span>
          <strong className="uc-ui-value">
            {email || "E-mail não disponível"}
          </strong>
          <span
            className={
              emailConfirmed
                ? "uc-ui-status uc-ui-status--accent"
                : "uc-ui-status"
            }
          >
            {emailConfirmed ? "E-mail confirmado" : "Confirmação pendente"}
          </span>
        </article>

        <article className="uc-ui-surface">
          <span className="uc-ui-label">Método de acesso</span>
          <strong className="uc-ui-value">{accessMethod}</strong>
          <p className="uc-ui-copy">
            Este método identifica como você entra na sua Conta USECLUBBERS.
          </p>
        </article>
      </section>

      <ChangeAccountEmailForm
        currentEmail={email}
        callbackStatus={emailChangeCallbackStatus}
      />

      <AccountSecurityClient />

      <section className="uc-ui-trust">
        <strong>A conta confirma quem acessa.</strong>
        <p>
          A verificação de uma identidade é um processo separado. Alterações
          nesta área não criam, verificam ou publicam uma identidade.
        </p>
      </section>
    </UseclubbersPageShell>
  );
}