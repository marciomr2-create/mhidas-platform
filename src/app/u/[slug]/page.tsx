export const dynamic = "force-dynamic";
export const revalidate = 0;

import { permanentRedirect } from "next/navigation";

export default async function LegacyClubProfileRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cleanSlug = String(slug || "").trim();

  if (!cleanSlug) {
    permanentRedirect("/invalid");
  }

  permanentRedirect(`/${encodeURIComponent(cleanSlug)}?mode=club`);
}