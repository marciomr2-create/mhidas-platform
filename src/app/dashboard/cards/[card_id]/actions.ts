"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function togglePublish(card_id: string, current: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const nextValue = !current;

  const { error } = await supabase
    .from("cards")
    .update({
      is_published: nextValue,
      published_at: nextValue ? new Date().toISOString() : null,
    })
    .eq("card_id", card_id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/cards/${card_id}`);
  revalidatePath(`/dashboard/cards`);
}