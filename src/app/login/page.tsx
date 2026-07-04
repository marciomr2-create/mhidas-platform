// src/app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(24px, 6vw, 72px) 20px",
        background:
          "radial-gradient(circle at 10% 0%, rgba(76,29,149,0.24), transparent 34%), radial-gradient(circle at 100% 20%, rgba(13,148,136,0.18), transparent 36%), #050506",
      }}
    >
      <section
        aria-labelledby="login-title"
        style={{
          width: "min(100%, 520px)",
          boxSizing: "border-box",
          padding: "clamp(24px, 5vw, 40px)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.11)",
          background:
            "linear-gradient(145deg, rgba(18,18,24,0.97), rgba(7,13,15,0.98))",
          boxShadow: "0 28px 80px rgba(0,0,0,0.42)",
        }}
      >
        <header>
          <p
            style={{
              margin: 0,
              color: "#5eead4",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            USECLUBBERS
          </p>

          <h1
            id="login-title"
            style={{
              margin: "12px 0 0",
              color: "#ffffff",
              fontSize: "clamp(34px, 9vw, 52px)",
              lineHeight: 0.98,
              letterSpacing: "-0.045em",
            }}
          >
            Entrar
          </h1>

          <p
            style={{
              margin: "16px 0 0",
              color: "rgba(255,255,255,0.68)",
              fontSize: 16,
              lineHeight: 1.55,
            }}
          >
            Acesse sua central e continue suas conexões Clubber com segurança.
          </p>
        </header>

        <Suspense
          fallback={
            <div style={{ padding: "28px 0 2px" }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.72)" }}>
                Carregando...
              </p>
            </div>
          }
        >
          <LoginClient />
        </Suspense>
      </section>
    </main>
  );
}
