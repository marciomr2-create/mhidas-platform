// src/app/login/page.tsx

import { Suspense } from "react";
import UseclubbersAuthShell from "@/components/auth/UseclubbersAuthShell";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <UseclubbersAuthShell
      titleId="login-title"
      title="Entrar"
      description="Acesse sua central e continue suas conexões Clubber com segurança."
    >
      <Suspense
        fallback={
          <div style={{ padding: "28px 0 2px" }}>
            <p style={{ margin: 0, color: "#CBD5E1" }}>Carregando...</p>
          </div>
        }
      >
        <LoginClient />
      </Suspense>
    </UseclubbersAuthShell>
  );
}
