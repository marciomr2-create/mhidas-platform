"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export async function connectProfessional(targetUserId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Você precisa estar autenticado para conectar.");
  }

  const requesterUserId = user.id;
  const targetId = String(targetUserId || "").trim();

  if (!targetId) {
    throw new Error("Usuário de destino inválido.");
  }

  if (requesterUserId === targetId) {
    throw new Error("Você não pode se conectar com o próprio perfil.");
  }

  const { error } = await supabase.rpc("create_professional_connection", {
    p_requester: requesterUserId,
    p_target: targetId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/network");
}