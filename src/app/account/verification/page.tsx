// src/app/account/verification/page.tsx

import { redirect } from "next/navigation";
import UseclubbersPageShell from "@/components/layout/UseclubbersPageShell";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import VerificationCenterClient from "./VerificationCenterClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type EntityType = "artist" | "club" | "festival" | "organization";

function initialEntityType(value: unknown): EntityType {
  if (
    value === "artist" ||
    value === "club" ||
    value === "festival" ||
    value === "organization"
  ) {
    return value;
  }

  return "artist";
}

export default async function VerificationCenterPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Faccount%2Fverification");
  }

  const [intentResult, requestsResult] = await Promise.all([
    supabase
      .from("account_entry_intents")
      .select("current_intent")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("entity_verification_requests")
      .select(
        "request_id,request_kind,requested_entity_type,requested_organization_type,requested_display_name,requested_handle,contact_email,email_signal_status,status,submitted_at,decision_reason,created_at,updated_at"
      )
      .eq("requester_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const loadError = Boolean(intentResult.error || requestsResult.error);

  return (
    <UseclubbersPageShell
      eyebrow="SUA CONTA USECLUBBERS"
      title="Central de Verificação"
      description="Crie ou reivindique perfis oficiais e acompanhe cada solicitação dentro da sua Conta USECLUBBERS. A Central é a fonte da verdade do processo."
      backHref="/dashboard"
      backLabel="Voltar ao início"
      pageClassName="uc-verification-page-shell"
    >
      <section className="uc-ui-grid uc-ui-grid--2 uc-ui-section uc-verification-intro-grid">
        <article className="uc-ui-surface">
          <span className="uc-ui-label">O que a verificação confirma</span>
          <strong className="uc-ui-value">Relação legítima com a identidade</strong>
          <p className="uc-ui-copy">
            A USECLUBBERS verifica a relação entre a identidade pública e seu
            responsável ou representante. Não é selo de popularidade, qualidade ou
            recomendação.
          </p>
        </article>

        <article className="uc-ui-surface">
          <span className="uc-ui-label">Canal oficial</span>
          <strong className="uc-ui-value">O processo acontece aqui</strong>
          <p className="uc-ui-copy">
            E-mails oficiais podem avisar sobre uma atualização, mas nenhuma
            verificação importante é concluída apenas por e-mail.
          </p>
        </article>
      </section>

      <VerificationCenterClient
        accountEmail={user.email ?? ""}
        initialEntityType={initialEntityType(intentResult.data?.current_intent)}
        initialRequests={(requestsResult.data ?? []).map((row) => ({
          request_id: String(row.request_id ?? ""),
          request_kind: String(row.request_kind ?? ""),
          requested_entity_type: String(row.requested_entity_type ?? ""),
          requested_organization_type:
            row.requested_organization_type == null
              ? null
              : String(row.requested_organization_type),
          requested_display_name: String(row.requested_display_name ?? ""),
          requested_handle:
            row.requested_handle == null ? null : String(row.requested_handle),
          contact_email: String(row.contact_email ?? ""),
          email_signal_status: String(row.email_signal_status ?? "unassessed"),
          status: String(row.status ?? "draft"),
          submitted_at:
            row.submitted_at == null ? null : String(row.submitted_at),
          decision_reason:
            row.decision_reason == null ? null : String(row.decision_reason),
          created_at: String(row.created_at ?? ""),
          updated_at: String(row.updated_at ?? ""),
        }))}
        loadError={loadError}
      />

      <section className="uc-ui-trust">
        <strong>
          A conta confirma quem acessa. A verificação confirma quem a identidade
          representa.
        </strong>
        <p>
          Documentos sensíveis nunca devem ser enviados por e-mail pessoal,
          Instagram ou outro canal informal. O envio privado de documentos será
          disponibilizado somente dentro desta Central em uma etapa protegida.
        </p>
      </section>
    </UseclubbersPageShell>
  );
}