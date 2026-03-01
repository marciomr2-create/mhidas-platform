// src/app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 24, maxWidth: 520 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Login</h1>
          <p style={{ marginTop: 10, opacity: 0.85 }}>Carregando…</p>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}