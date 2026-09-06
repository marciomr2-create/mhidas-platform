// src/app/auth/email-change-confirm/page.tsx

import { Suspense } from "react";
import EmailChangeConfirmClient from "./EmailChangeConfirmClient";

export const dynamic = "force-dynamic";

export default function EmailChangeConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="uc-ui-shell">
          <div className="uc-ui-page">
            <section className="uc-ui-surface">
              <p className="uc-ui-copy">Carregando confirmação...</p>
            </section>
          </div>
        </main>
      }
    >
      <EmailChangeConfirmClient />
    </Suspense>
  );
}