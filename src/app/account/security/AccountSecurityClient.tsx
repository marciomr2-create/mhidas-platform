// src/app/account/security/AccountSecurityClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import { buildForgotPasswordPath } from "@/lib/navigation/safeInternalNextPath";

export default function AccountSecurityClient() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const recoveryHref = buildForgotPasswordPath("/account/security");

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        setSignOutError("Não foi possível sair da conta agora. Tente novamente.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Não foi possível sair da conta agora. Tente novamente.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <section className="uc-ui-stack uc-ui-section">
      <article className="uc-ui-surface uc-ui-action">
        <div className="uc-ui-action-copy">
          <span className="uc-ui-label">Senha e recuperação</span>
          <h2>Precisa criar uma nova senha?</h2>
          <p>
            Enviaremos um link seguro para o e-mail da sua Conta USECLUBBERS.
          </p>
        </div>

        <Link
          href={recoveryHref}
          className="uc-ui-button uc-ui-button--primary"
        >
          Redefinir senha
        </Link>
      </article>

      <article className="uc-ui-surface uc-ui-action">
        <div className="uc-ui-action-copy">
          <span className="uc-ui-label">Sessão atual</span>
          <h2>Sair deste navegador</h2>
          <p>
            Encerra somente a sessão atual. Seus perfis, conexões e dados
            permanecem na conta.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="uc-ui-button uc-ui-button--quiet"
        >
          {signingOut ? "Saindo..." : "Sair da conta"}
        </button>

        {signOutError ? (
          <p className="uc-ui-error" role="alert">
            {signOutError}
          </p>
        ) : null}
      </article>
    </section>
  );
}