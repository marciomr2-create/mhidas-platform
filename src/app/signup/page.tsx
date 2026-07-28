// src/app/signup/page.tsx

import SignupClient from "./SignupClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignupPage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(24px, 6vw, 72px) 20px",
        boxSizing: "border-box",
        color: "#ffffff",
        background:
          "radial-gradient(circle at 8% 0%, rgba(20,184,166,0.22), transparent 35%), radial-gradient(circle at 100% 12%, rgba(124,58,237,0.20), transparent 34%), #050506",
      }}
    >
      <section
        aria-labelledby="signup-title"
        style={{
          width: "min(100%, 560px)",
          padding: "clamp(25px, 5vw, 42px)",
          boxSizing: "border-box",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.11)",
          background:
            "linear-gradient(145deg, rgba(16,19,25,0.97), rgba(5,13,14,0.98))",
          boxShadow: "0 28px 80px rgba(0,0,0,0.42)",
        }}
      >
        <span
          style={{
            color: "#5eead4",
            fontSize: 12,
            fontWeight: 950,
            letterSpacing: "0.14em",
          }}
        >
          USECLUBBERS
        </span>

        <h1
          id="signup-title"
          style={{
            margin: "12px 0 0",
            fontSize: "clamp(34px, 9vw, 54px)",
            lineHeight: 0.98,
            letterSpacing: "-0.05em",
          }}
        >
          Entre para a cena.
        </h1>

        <p
          style={{
            margin: "16px 0 0",
            color: "rgba(255,255,255,0.70)",
            lineHeight: 1.6,
          }}
        >
          Crie sua conta, escolha seu @username único e comece pelo perfil
          Clubber. O perfil Pro e o NFC podem ser ativados depois.
        </p>

        <SignupClient />
      </section>
    </main>
  );
}
