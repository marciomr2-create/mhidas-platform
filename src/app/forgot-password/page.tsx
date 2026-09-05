// src/app/forgot-password/page.tsx

import { Suspense } from "react";
import UseclubbersAuthShell from "@/components/auth/UseclubbersAuthShell";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ForgotPasswordPage() {
  return (
    <UseclubbersAuthShell
      titleId="forgot-password-title"
      title="Recupere seu acesso."
      description="Informe o e-mail da sua Conta USECLUBBERS. Enviaremos um link seguro para você criar uma nova senha."
    >
      <Suspense
        fallback={
          <p style={{ margin: "28px 0 0", color: "#CBD5E1" }}>
            Carregando...
          </p>
        }
      >
        <ForgotPasswordClient />
      </Suspense>
    </UseclubbersAuthShell>
  );
}
