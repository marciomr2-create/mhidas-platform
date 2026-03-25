"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const RESERVED = new Set([
  "api",
  "login",
  "dashboard",
  "invalid",
  "t",
  "r",
  "u",
  "_next",
  "favicon.ico",
]);

function normalizeSlug(input: string) {
  let s = (input || "").trim().toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[\s_]+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s;
}

export async function togglePublish(card_id: string, current: boolean) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const nextValue = !current;

  const { error } = await supabase
    .from("cards")
    .update({
      is_published: nextValue,
      published_at: nextValue ? new Date().toISOString() : null,
    })
    .eq("card_id", card_id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/cards/${card_id}`);
  revalidatePath(`/dashboard/cards`);
}

export async function changeSlugOnce(card_id: string, nextSlugRaw: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const nextSlug = normalizeSlug(nextSlugRaw);

  if (!nextSlug || nextSlug.length < 3) {
    throw new Error("Slug inválido. Use ao menos 3 caracteres.");
  }
  if (RESERVED.has(nextSlug)) {
    throw new Error("Este slug é reservado e não pode ser utilizado.");
  }

  // Carrega card
  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("card_id,user_id,slug,slug_changes")
    .eq("card_id", card_id)
    .eq("user_id", user.id)
    .single();

  if (cardErr || !card) throw new Error("Card não encontrado ou acesso negado.");

  const currentSlug = String((card as any).slug || "").toLowerCase();
  const changes = Number((card as any).slug_changes ?? 0);

  if (changes >= 1) {
    throw new Error("Você já alterou o slug uma vez. Alterações adicionais não são permitidas.");
  }

  if (currentSlug && currentSlug === nextSlug) {
    throw new Error("O novo slug é igual ao atual.");
  }

  // Verifica unicidade global considerando cards + histórico (o histórico tem índice unique_ci)
  // Primeiro checa cards
  const { data: clashCards } = await supabase
    .from("cards")
    .select("card_id")
    .ilike("slug", nextSlug)
    .limit(1);

  if ((clashCards || []).some((x: any) => x.card_id !== card_id)) {
    throw new Error("Este slug já está em uso. Escolha outro.");
  }

  // Depois checa histórico
  const { data: clashHist } = await supabase
    .from("card_slug_history")
    .select("card_id, slug")
    .ilike("slug", nextSlug)
    .limit(1);

  if ((clashHist || []).length > 0) {
    throw new Error("Este slug já foi utilizado por outro perfil. Escolha outro.");
  }

  // 1) Se houver slug atual, registra no histórico como não current (preservação de QR/link antigo)
  if (currentSlug) {
    // garante que exista no histórico (idempotente)
    const { data: existingOld } = await supabase
      .from("card_slug_history")
      .select("id, slug")
      .eq("card_id", card_id)
      .ilike("slug", currentSlug)
      .maybeSingle();

    if (!existingOld) {
      const { error: insOldErr } = await supabase.from("card_slug_history").insert({
        card_id,
        slug: currentSlug,
        is_current: false,
      });
      if (insOldErr) throw new Error(insOldErr.message);
    }
  }

  // 2) Desmarca current antigo e marca o novo como current no histórico
  await supabase
    .from("card_slug_history")
    .update({ is_current: false })
    .eq("card_id", card_id);

  const { error: insNewErr } = await supabase.from("card_slug_history").insert({
    card_id,
    slug: nextSlug,
    is_current: true,
  });

  if (insNewErr) throw new Error(insNewErr.message);

  // 3) Atualiza cards.slug e incrementa contador
  const { error: updErr } = await supabase
    .from("cards")
    .update({
      slug: nextSlug,
      slug_changes: changes + 1,
      slug_last_changed_at: new Date().toISOString(),
    })
    .eq("card_id", card_id)
    .eq("user_id", user.id);

  if (updErr) throw new Error(updErr.message);

  // Revalida páginas
  revalidatePath(`/dashboard/cards/${card_id}`);
  revalidatePath(`/dashboard/cards`);
  revalidatePath(`/${nextSlug}`);
  if (currentSlug) revalidatePath(`/${currentSlug}`);
}