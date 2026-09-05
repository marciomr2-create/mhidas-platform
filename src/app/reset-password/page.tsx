// src/app/reset-password/page.tsx

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import UseclubbersAuthShell from "@/components/auth/UseclubbersAuthShell";
import ResetPasswordClient from "./ResetPasswordClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RECOVERY_COOKIE = "uc_password_recovery";

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const recoveryUserId =
    cookieStore.get(RECOVERY_COOKIE)?.value ?? "";

  const recoveryAuthorized =
    Boolean(user?.id) && recoveryUserId === user?.id;

  return (
    <UseclubbersAuthShell
      titleId="reset-password-title"
      title="Crie uma nova senha."
      description="Escolha uma nova senha para continuar usando sua Conta USECLUBBERS."
    >
      <ResetPasswordClient recoveryAuthorized={recoveryAuthorized} />
    </UseclubbersAuthShell>
  );
}
