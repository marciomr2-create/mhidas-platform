// src/app/clubbers/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { createPublicClient } from "@/utils/supabase/public";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import ClubberDiscoveryClient, {
  type ClubberDiscoveryItem,
  type ClubberViewerContext,
  type InitialConnectionState,
} from "./ClubberDiscoveryClient";

type CardRow = {
  user_id: string;
  slug: string;
  label: string | null;
  status: string;
  is_published: boolean;
};

type ClubProfileRow = {
  user_id: string;
  city_base: string | null;
  club_tagline: string | null;
  club_photo_url: string | null;
  favorite_genres: string | null;
  open_to_networking: boolean | null;
};

type ConnectionRow = {
  requester_user_id: string;
  target_user_id: string;
  status: string;
  created_at: string | null;
};

type RelationshipControlRow = {
  owner_user_id: string;
  target_user_id: string;
  status: string;
};

function normalizeText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitList(value: string | null | undefined): string[] {
  const text = normalizeText(value);

  if (!text) {
    return [];
  }

  const items = text
    .split(/,|•|;|\|/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = item
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function resolveConnectionState(
  viewerUserId: string,
  targetUserId: string,
  connections: ConnectionRow[],
  controls: RelationshipControlRow[],
): InitialConnectionState {
  const relatedControls = controls.filter(
    (row) =>
      (row.owner_user_id === viewerUserId &&
        row.target_user_id === targetUserId) ||
      (row.owner_user_id === targetUserId &&
        row.target_user_id === viewerUserId),
  );

  if (relatedControls.some((row) => row.status === "blocked")) {
    return "blocked";
  }

  if (relatedControls.some((row) => row.status === "suspended")) {
    return "suspended";
  }

  const relatedConnections = connections.filter(
    (row) =>
      (row.requester_user_id === viewerUserId &&
        row.target_user_id === targetUserId) ||
      (row.requester_user_id === targetUserId &&
        row.target_user_id === viewerUserId),
  );

  const relation =
    relatedConnections.find((row) => row.status === "accepted") ||
    relatedConnections.find((row) => row.status === "pending") ||
    relatedConnections[0];

  if (!relation) {
    return "none";
  }

  if (relation.status === "accepted") {
    return "connected";
  }

  if (relation.status === "pending") {
    return relation.requester_user_id === viewerUserId
      ? "outgoing_pending"
      : "incoming_pending";
  }

  return "none";
}

export default async function ClubbersPage() {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user: authenticatedUser },
  } = await authSupabase.auth.getUser();

  const publicSupabase = createPublicClient();

  const { data: cardsData } = await publicSupabase
    .from("cards")
    .select("user_id,slug,label,status,is_published")
    .eq("status", "active")
    .eq("is_published", true);

  const cardsByUserId = new Map<string, CardRow>();

  for (const card of (cardsData ?? []) as CardRow[]) {
    const userId = normalizeText(card.user_id);
    const slug = normalizeText(card.slug);

    if (!userId || !slug || cardsByUserId.has(userId)) {
      continue;
    }

    cardsByUserId.set(userId, {
      ...card,
      user_id: userId,
      slug,
    });
  }

  const candidateUserIds = Array.from(cardsByUserId.keys()).filter(
    (userId) => userId !== authenticatedUser?.id,
  );

  const profileUserIds = Array.from(
    new Set(
      authenticatedUser?.id
        ? [...candidateUserIds, authenticatedUser.id]
        : candidateUserIds,
    ),
  );

  const { data: profilesData } = profileUserIds.length
    ? await publicSupabase
        .from("club_profiles")
        .select(
          "user_id,city_base,club_tagline,club_photo_url,favorite_genres,open_to_networking",
        )
        .in("user_id", profileUserIds)
    : { data: [] as ClubProfileRow[] };

  const profilesByUserId = new Map<string, ClubProfileRow>();

  for (const profile of (profilesData ?? []) as ClubProfileRow[]) {
    profilesByUserId.set(profile.user_id, profile);
  }

  let connections: ConnectionRow[] = [];
  let controls: RelationshipControlRow[] = [];

  if (authenticatedUser) {
    const [connectionsResult, controlsResult] = await Promise.all([
      authSupabase
        .from("clubber_connections")
        .select(
          "requester_user_id,target_user_id,status,created_at",
        )
        .or(
          `requester_user_id.eq.${authenticatedUser.id},target_user_id.eq.${authenticatedUser.id}`,
        )
        .order("created_at", { ascending: false }),
      authSupabase
        .from("clubber_relationship_controls")
        .select("owner_user_id,target_user_id,status")
        .or(
          `owner_user_id.eq.${authenticatedUser.id},target_user_id.eq.${authenticatedUser.id}`,
        ),
    ]);

    connections = (connectionsResult.data ?? []) as ConnectionRow[];
    controls = (controlsResult.data ?? []) as RelationshipControlRow[];
  }

  const items: ClubberDiscoveryItem[] = [];

  for (const userId of candidateUserIds) {
    const card = cardsByUserId.get(userId);
    const profile = profilesByUserId.get(userId);

    if (!card || !profile) {
      continue;
    }

    items.push({
      user_id: userId,
      slug: card.slug,
      label: normalizeText(card.label) || "Clubber",
      city_base: normalizeText(profile.city_base),
      club_tagline: normalizeText(profile.club_tagline),
      club_photo_url: normalizeText(profile.club_photo_url),
      favorite_genres: splitList(profile.favorite_genres),
      open_to_networking: Boolean(profile.open_to_networking),
      initial_connection_state: authenticatedUser
        ? resolveConnectionState(
            authenticatedUser.id,
            userId,
            connections,
            controls,
          )
        : "unauthorized",
    });
  }

  const viewerProfile = authenticatedUser
    ? profilesByUserId.get(authenticatedUser.id)
    : undefined;

  const viewer: ClubberViewerContext = {
    user_id: authenticatedUser?.id || "",
    city_base: normalizeText(viewerProfile?.city_base),
    favorite_genres: splitList(viewerProfile?.favorite_genres),
    is_authenticated: Boolean(authenticatedUser),
  };

  return <ClubberDiscoveryClient items={items} viewer={viewer} />;
}
