// src/components/layout/UseclubbersPageShell.tsx

import Link from "next/link";
import type { ReactNode } from "react";

type UseclubbersPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  mode?: "clubber" | "pro";
  wide?: boolean;
};

export default function UseclubbersPageShell({
  title,
  description,
  children,
  eyebrow = "USECLUBBERS",
  backHref,
  backLabel = "Voltar",
  mode = "clubber",
  wide = false,
}: UseclubbersPageShellProps) {
  return (
    <main className="uc-ui-shell" data-mhidas-mode={mode}>
      <section className={wide ? "uc-ui-page uc-ui-page--wide" : "uc-ui-page"}>
        <header className="uc-ui-header">
          <div className="uc-ui-header-copy">
            <p className="uc-ui-eyebrow">{eyebrow}</p>
            <h1 className="uc-ui-title">{title}</h1>
            <p className="uc-ui-description">{description}</p>
          </div>

          {backHref ? (
            <Link href={backHref} className="uc-ui-button uc-ui-button--quiet">
              {backLabel}
            </Link>
          ) : null}
        </header>

        {children}
      </section>
    </main>
  );
}