// src/components/auth/UseclubbersAuthShell.tsx

import type { ReactNode } from "react";

type UseclubbersAuthShellProps = {
  titleId: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function UseclubbersAuthShell({
  titleId,
  title,
  description,
  children,
}: UseclubbersAuthShellProps) {
  return (
    <main className="uc-auth-shell">
      <section className="uc-auth-card" aria-labelledby={titleId}>
        <header>
          <p className="uc-auth-eyebrow">USECLUBBERS</p>

          <h1 id={titleId} className="uc-auth-title">
            {title}
          </h1>

          <p className="uc-auth-description">{description}</p>
        </header>

        {children}

        <div className="uc-auth-mobile-end-space" aria-hidden="true" />
      </section>

      <style>{`
        .uc-auth-shell {
          min-height: 100svh;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 6vw, 72px) 20px;
          background: #050505;
        }

        .uc-auth-card {
          flex: 0 0 auto;
          width: 100%;
          max-width: 520px;
          box-sizing: border-box;
          padding: clamp(24px, 5vw, 40px);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: #0e0e0e;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
        }

        .uc-auth-eyebrow {
          margin: 0;
          color: #2a8694;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .uc-auth-title {
          margin: 12px 0 0;
          color: #f8fafc;
          font-size: clamp(34px, 9vw, 52px);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .uc-auth-description {
          margin: 16px 0 0;
          color: #cbd5e1;
          font-size: 16px;
          line-height: 1.55;
        }

        .uc-auth-mobile-end-space {
          display: none;
        }

        @media (max-width: 640px) {
          .uc-auth-shell {
            min-height: 100dvh;
            align-items: flex-start;
            padding:
              max(18px, env(safe-area-inset-top))
              12px
              calc(48px + env(safe-area-inset-bottom));
          }

          .uc-auth-card {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            padding: 24px 18px 24px;
            border-radius: 22px;
          }

          .uc-auth-mobile-end-space {
            display: block;
            width: 100%;
            height: calc(64px + env(safe-area-inset-bottom));
            pointer-events: none;
          }
        }
      `}</style>
    </main>
  );
}
