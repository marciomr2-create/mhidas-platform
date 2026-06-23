// src/app/dashboard/cards/[card_id]/club/preview/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ card_id: string }>;
};

export default async function ClubProfileOverviewPreviewRedirect({
  params,
}: PageProps) {
  const { card_id: cardId } = await params;

  redirect(`/dashboard/cards/${cardId}/club`);
}
