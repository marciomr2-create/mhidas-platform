// src/app/api/event-ticket-intents/_shared/eventSocialRadarRead.ts
import "server-only";

import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

export type EventSocialParticipationMode =
  | "alone"
  | "with_friends"
  | "undecided";

export type EventSocialRadarMember = {
  user_id: string;
  label: string;
  slug: string;
  city_base: string;
  club_tagline: string;
  club_photo_url: string;
  favorite_genres: string[];
  participation_mode: EventSocialParticipationMode;
  wants_group: boolean;
  accepts_new_people: boolean;
  meet_on_site: boolean;
  first_time: boolean;
  same_city: boolean;
  is_accepted_connection: boolean;
};

export type EventSocialRadarCounts = {
  active_participants: number;
  alone: number;
  with_friends: number;
  undecided: number;
  wants_group: number;
  accepts_new_people: number;
  meet_on_site: number;
  first_time: number;
  same_city: number;
  accepted_connections: number;
};

export type EventSocialGroupPreferenceCounts = {
  mixed_group: number;
  women_only: number;
  men_only: number;
  lgbtqia_plus: number;
};

export type EventSocialRadarReadResult = {
  ok: boolean;
  event_group_id: string;
  members: EventSocialRadarMember[];
  counts: EventSocialRadarCounts;
  group_preferences: EventSocialGroupPreferenceCounts;
  truncated: boolean;
};

type StoredSocialPreferences = {
  wants_group: boolean;
  accepts_new_people: boolean;
  meet_on_site: boolean;
  women_only: boolean;
  men_only: boolean;
  lgbtqia_plus: boolean;
  mixed_group: boolean;
  first_time: boolean;
  same_city: boolean;
};

type StoredSocialJourney = {
  participation_mode: EventSocialParticipationMode;
  preferences: StoredSocialPreferences;
};

type TicketIntentRow = {
  user_id: string;
  status: string | null;
  metadata: unknown;
  updated_at: string | null;
};

type CardRow = {
  user_id: string;
  slug: string | null;
  label: string | null;
  status: string | null;
  is_published: boolean | null;
};

type ClubProfileRow = {
  user_id: string;
  city_base: string | null;
  club_tagline: string | null;
  club_photo_url: string | null;
  favorite_genres: string | null;
};

type ConnectionRow = {
  requester_user_id: string;
  target_user_id: string;
  status: string | null;
};

type RelationshipControlRow = {
  owner_user_id: string;
  target_user_id: string;
  status: string | null;
};

const ALLOWED_PARTICIPATION_MODES: EventSocialParticipationMode[] = [
  "alone",
  "with_friends",
  "undecided",
];

const INTENT_PAGE_SIZE = 1000;
const MAX_SOCIAL_INTENTS = 5000;
const RELATED_ROW_CHUNK_SIZE = 200;
const GROUP_PREFERENCE_PUBLIC_MINIMUM = 3;

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function isAllowedParticipationMode(
  value: string
): value is EventSocialParticipationMode {
  return ALLOWED_PARTICIPATION_MODES.includes(
    value as EventSocialParticipationMode
  );
}

function normalizePublicHttpsUrl(value: unknown): string {
  const normalized = normalizeText(value, 1200);

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function splitEventList(value: unknown): string[] {
  const normalized = normalizeText(value, 1600);

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(/,|•|;|\|/)
        .map((item) => normalizeText(item, 80))
        .filter(Boolean)
    )
  ).slice(0, 12);
}

function parseStoredSocialJourney(metadataValue: unknown): StoredSocialJourney | null {
  const metadata = asRecord(metadataValue);
  const journey = asRecord(metadata?.event_social_journey);
  const participationMode = normalizeText(journey?.participation_mode, 32);
  const audience = normalizeText(journey?.audience, 32);
  const preferences = asRecord(journey?.preferences);

  if (
    !journey ||
    journey.active !== true ||
    audience !== "event_social" ||
    !isAllowedParticipationMode(participationMode)
  ) {
    return null;
  }

  const mixedGroup = normalizeBoolean(preferences?.mixed_group);

  return {
    participation_mode: participationMode,
    preferences: {
      wants_group: normalizeBoolean(preferences?.wants_group),
      accepts_new_people: normalizeBoolean(preferences?.accepts_new_people),
      meet_on_site: normalizeBoolean(preferences?.meet_on_site),
      women_only: mixedGroup
        ? false
        : normalizeBoolean(preferences?.women_only),
      men_only: mixedGroup
        ? false
        : normalizeBoolean(preferences?.men_only),
      lgbtqia_plus: mixedGroup
        ? false
        : normalizeBoolean(preferences?.lgbtqia_plus),
      mixed_group: mixedGroup,
      first_time: normalizeBoolean(preferences?.first_time),
      same_city: normalizeBoolean(preferences?.same_city),
    },
  };
}

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createEmptyResult(
  eventGroupId: string,
  ok = false
): EventSocialRadarReadResult {
  return {
    ok,
    event_group_id: eventGroupId,
    members: [],
    counts: {
      active_participants: 0,
      alone: 0,
      with_friends: 0,
      undecided: 0,
      wants_group: 0,
      accepts_new_people: 0,
      meet_on_site: 0,
      first_time: 0,
      same_city: 0,
      accepted_connections: 0,
    },
    group_preferences: {
      mixed_group: 0,
      women_only: 0,
      men_only: 0,
      lgbtqia_plus: 0,
    },
    truncated: false,
  };
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export async function readEventSocialRadar({
  eventGroupId,
  viewerUserId,
}: {
  eventGroupId: string;
  viewerUserId?: string | null;
}): Promise<EventSocialRadarReadResult> {
  const normalizedEventGroupId = normalizeText(eventGroupId, 64);

  if (!isUuidLike(normalizedEventGroupId)) {
    return createEmptyResult(normalizedEventGroupId);
  }

  const serviceSupabase = createServiceRoleClient();

  if (!serviceSupabase) {
    return createEmptyResult(normalizedEventGroupId);
  }

  try {
    const { data: eventGroup, error: eventGroupError } = await serviceSupabase
      .from("event_groups")
      .select("group_id,status,is_public")
      .eq("group_id", normalizedEventGroupId)
      .maybeSingle();

    if (
      eventGroupError ||
      !eventGroup ||
      eventGroup.is_public === false ||
      (eventGroup.status && eventGroup.status !== "active")
    ) {
      return createEmptyResult(normalizedEventGroupId);
    }

    const intentRows: TicketIntentRow[] = [];
    let truncated = false;

    for (
      let from = 0;
      from < MAX_SOCIAL_INTENTS;
      from += INTENT_PAGE_SIZE
    ) {
      const to = Math.min(
        from + INTENT_PAGE_SIZE - 1,
        MAX_SOCIAL_INTENTS - 1
      );

      const { data, error } = await serviceSupabase
        .from("event_ticket_intents")
        .select("user_id,status,metadata,updated_at")
        .eq("event_group_id", normalizedEventGroupId)
        .neq("status", "cancelled")
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) {
        return createEmptyResult(normalizedEventGroupId);
      }

      const batch = (data ?? []) as TicketIntentRow[];
      intentRows.push(...batch);

      if (batch.length < INTENT_PAGE_SIZE) {
        break;
      }

      if (to === MAX_SOCIAL_INTENTS - 1) {
        truncated = true;
      }
    }

    const journeyByUserId = new Map<string, StoredSocialJourney>();

    for (const intent of intentRows) {
      const userId = normalizeText(intent.user_id, 64);

      if (!isUuidLike(userId) || journeyByUserId.has(userId)) {
        continue;
      }

      const journey = parseStoredSocialJourney(intent.metadata);

      if (journey) {
        journeyByUserId.set(userId, journey);
      }
    }

    const socialUserIds = Array.from(journeyByUserId.keys());

    if (socialUserIds.length === 0) {
      return {
        ...createEmptyResult(normalizedEventGroupId, true),
        truncated,
      };
    }

    const cardRows: CardRow[] = [];
    const profileRows: ClubProfileRow[] = [];

    for (const userIdChunk of chunkValues(
      socialUserIds,
      RELATED_ROW_CHUNK_SIZE
    )) {
      const [cardResult, profileResult] = await Promise.all([
        serviceSupabase
          .from("cards")
          .select("user_id,slug,label,status,is_published")
          .in("user_id", userIdChunk)
          .eq("status", "active")
          .eq("is_published", true),
        serviceSupabase
          .from("club_profiles")
          .select(
            "user_id,city_base,club_tagline,club_photo_url,favorite_genres"
          )
          .in("user_id", userIdChunk),
      ]);

      if (cardResult.error || profileResult.error) {
        return createEmptyResult(normalizedEventGroupId);
      }

      cardRows.push(...((cardResult.data ?? []) as CardRow[]));
      profileRows.push(...((profileResult.data ?? []) as ClubProfileRow[]));
    }

    const normalizedViewerUserId = normalizeText(viewerUserId, 64);
    const viewerIsValid = isUuidLike(normalizedViewerUserId);
    const acceptedConnectionUserIds = new Set<string>();
    const controlledUserIds = new Set<string>();

    if (viewerIsValid) {
      const [connectionResult, controlResult] = await Promise.all([
        serviceSupabase
          .from("clubber_connections")
          .select("requester_user_id,target_user_id,status")
          .eq("status", "accepted")
          .or(
            `requester_user_id.eq.${normalizedViewerUserId},target_user_id.eq.${normalizedViewerUserId}`
          ),
        serviceSupabase
          .from("clubber_relationship_controls")
          .select("owner_user_id,target_user_id,status")
          .or(
            `owner_user_id.eq.${normalizedViewerUserId},target_user_id.eq.${normalizedViewerUserId}`
          ),
      ]);

      if (controlResult.error) {
        return createEmptyResult(normalizedEventGroupId);
      }

      if (!connectionResult.error) {
        for (const row of (connectionResult.data ?? []) as ConnectionRow[]) {
          const counterpartUserId =
            row.requester_user_id === normalizedViewerUserId
              ? row.target_user_id
              : row.requester_user_id;

          if (socialUserIds.includes(counterpartUserId)) {
            acceptedConnectionUserIds.add(counterpartUserId);
          }
        }
      }

      for (const row of (controlResult.data ?? []) as RelationshipControlRow[]) {
        if (row.status !== "blocked" && row.status !== "suspended") {
          continue;
        }

        const counterpartUserId =
          row.owner_user_id === normalizedViewerUserId
            ? row.target_user_id
            : row.owner_user_id;

        if (counterpartUserId) {
          controlledUserIds.add(counterpartUserId);
        }
      }
    }

    const cardByUserId = new Map<string, CardRow>();

    for (const card of cardRows) {
      const userId = normalizeText(card.user_id, 64);
      const slug = normalizeText(card.slug, 120).toLowerCase();

      if (
        !userId ||
        !slug ||
        card.status !== "active" ||
        card.is_published !== true ||
        cardByUserId.has(userId)
      ) {
        continue;
      }

      cardByUserId.set(userId, card);
    }

    const profileByUserId = new Map<string, ClubProfileRow>();

    for (const profile of profileRows) {
      const userId = normalizeText(profile.user_id, 64);

      if (userId && !profileByUserId.has(userId)) {
        profileByUserId.set(userId, profile);
      }
    }

    const members: EventSocialRadarMember[] = [];

    for (const userId of socialUserIds) {
      if (controlledUserIds.has(userId)) {
        continue;
      }

      const card = cardByUserId.get(userId);
      const journey = journeyByUserId.get(userId);

      if (!card || !journey) {
        continue;
      }

      const profile = profileByUserId.get(userId);

      members.push({
        user_id: userId,
        label: normalizeText(card.label, 100) || "Clubber",
        slug: normalizeText(card.slug, 120).toLowerCase(),
        city_base: normalizeText(profile?.city_base, 120),
        club_tagline: normalizeText(profile?.club_tagline, 240),
        club_photo_url: normalizePublicHttpsUrl(profile?.club_photo_url),
        favorite_genres: splitEventList(profile?.favorite_genres),
        participation_mode: journey.participation_mode,
        wants_group: journey.preferences.wants_group,
        accepts_new_people: journey.preferences.accepts_new_people,
        meet_on_site: journey.preferences.meet_on_site,
        first_time: journey.preferences.first_time,
        same_city: journey.preferences.same_city,
        is_accepted_connection: acceptedConnectionUserIds.has(userId),
      });
    }

    const visibleUserIds = new Set(members.map((member) => member.user_id));
    const visibleJourneys = Array.from(journeyByUserId.entries()).filter(
      ([userId]) => visibleUserIds.has(userId)
    );

    const counts: EventSocialRadarCounts = {
      active_participants: members.length,
      alone: members.filter(
        (member) => member.participation_mode === "alone"
      ).length,
      with_friends: members.filter(
        (member) => member.participation_mode === "with_friends"
      ).length,
      undecided: members.filter(
        (member) => member.participation_mode === "undecided"
      ).length,
      wants_group: members.filter((member) => member.wants_group).length,
      accepts_new_people: members.filter(
        (member) => member.accepts_new_people
      ).length,
      meet_on_site: members.filter((member) => member.meet_on_site).length,
      first_time: members.filter((member) => member.first_time).length,
      same_city: members.filter((member) => member.same_city).length,
      accepted_connections: members.filter(
        (member) => member.is_accepted_connection
      ).length,
    };

    const rawGroupPreferences: EventSocialGroupPreferenceCounts = {
      mixed_group: visibleJourneys.filter(
        ([, journey]) => journey.preferences.mixed_group
      ).length,
      women_only: visibleJourneys.filter(
        ([, journey]) => journey.preferences.women_only
      ).length,
      men_only: visibleJourneys.filter(
        ([, journey]) => journey.preferences.men_only
      ).length,
      lgbtqia_plus: visibleJourneys.filter(
        ([, journey]) => journey.preferences.lgbtqia_plus
      ).length,
    };

    const groupPreferences: EventSocialGroupPreferenceCounts = {
      mixed_group:
        rawGroupPreferences.mixed_group >=
        GROUP_PREFERENCE_PUBLIC_MINIMUM
          ? rawGroupPreferences.mixed_group
          : 0,
      women_only:
        rawGroupPreferences.women_only >=
        GROUP_PREFERENCE_PUBLIC_MINIMUM
          ? rawGroupPreferences.women_only
          : 0,
      men_only:
        rawGroupPreferences.men_only >=
        GROUP_PREFERENCE_PUBLIC_MINIMUM
          ? rawGroupPreferences.men_only
          : 0,
      lgbtqia_plus:
        rawGroupPreferences.lgbtqia_plus >=
        GROUP_PREFERENCE_PUBLIC_MINIMUM
          ? rawGroupPreferences.lgbtqia_plus
          : 0,
    };

    members.sort((left, right) => {
      if (
        left.is_accepted_connection !== right.is_accepted_connection
      ) {
        return left.is_accepted_connection ? -1 : 1;
      }

      if (left.wants_group !== right.wants_group) {
        return left.wants_group ? -1 : 1;
      }

      return left.label.localeCompare(right.label, "pt-BR");
    });

    return {
      ok: true,
      event_group_id: normalizedEventGroupId,
      members,
      counts,
      group_preferences: groupPreferences,
      truncated,
    };
  } catch {
    return createEmptyResult(normalizedEventGroupId);
  }
}
