// src/app/signup/page.tsx

import SignupClient from "./SignupClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignupPage() {
  return (
    <>
      <main className="uc-signup-page">
        <section className="uc-signup-card" aria-labelledby="signup-title">
          <span
            style={{
              color: "#2A8694",
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
            Crie sua Conta USECLUBBERS.
          </h1>

          <p
            style={{
              margin: "16px 0 0",
              color: "rgba(255,255,255,0.70)",
              lineHeight: 1.6,
            }}
          >
            Uma única conta para viver sua Identidade Clubber e também administrar
            perfis de Artistas, Clubs, Festivais ou Organizações.
          </p>

          <SignupClient />
          <div className="uc-mobile-end-space" aria-hidden="true" />
        </section>
      </main>

      <style>{`
        .uc-signup-page {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 6vw, 72px) 20px;
          box-sizing: border-box;
          color: #ffffff;
          background: #050505;
        }

        .uc-signup-card {
          width: min(100%, 680px);
          padding: clamp(25px, 5vw, 42px);
          box-sizing: border-box;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.11);
          background: #0e0e0e;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
        }

        .uc-mobile-end-space {
          display: none;
        }

        @media (max-width: 640px) {
          .uc-signup-page {
            height: 100dvh;
            min-height: 100dvh;
            align-items: flex-start;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain;
            padding:
              max(18px, env(safe-area-inset-top))
              12px
              calc(24px + env(safe-area-inset-bottom));
          }

          .uc-signup-card {
            flex: 0 0 auto;
            width: 100%;
            margin: 0 auto;
            padding: 24px 18px 24px;
            border-radius: 22px;
          }

          .uc-mobile-end-space {
            display: block;
            width: 100%;
            height: calc(96px + env(safe-area-inset-bottom));
            pointer-events: none;
          }
        }
      `}</style>
    </>
  );
}
