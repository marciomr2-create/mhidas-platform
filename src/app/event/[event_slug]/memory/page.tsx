export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { notFound } from "next/navigation";
import UseclubbersPageShell from "@/components/layout/UseclubbersPageShell";
import EventMemoryClient from "./EventMemoryClient";

type PageProps = {
  params: Promise<{
    event_slug: string;
  }>;
};

function normalizeEventSlug(
  value: unknown
): string {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    !slug ||
    slug.length > 180 ||
    !/^[a-z0-9][a-z0-9-]*$/.test(slug)
  ) {
    return "";
  }

  return slug;
}

export default async function EventMemoryPage({
  params,
}: PageProps) {
  const { event_slug } = await params;

  const eventSlug =
    normalizeEventSlug(event_slug);

  if (!eventSlug) {
    notFound();
  }

  return (
    <UseclubbersPageShell
      eyebrow="MEMÓRIA DO EVENTO"
      title="Minha memória"
      description="Um resumo privado do que você marcou, registrou e conectou neste evento."
      backHref={`/event/${eventSlug}`}
      backLabel="Voltar ao evento"
      mode="clubber"
      wide
      pageClassName="event-memory-page-shell"
    >
      <EventMemoryClient
        eventSlug={eventSlug}
      />
    </UseclubbersPageShell>
  );
}