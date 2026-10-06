import { NextRequest, NextResponse } from "next/server";
import {
  readCanonicalEventGroupBridge,
  readCanonicalPublicEventBySlug,
} from "@/app/api/official-events/canonical/_shared/canonicalPublicEventReadFoundation";
import { readCanonicalEventAgenda } from "@/lib/events/canonicalEventAgendaRead";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ROUTE_VERSION = "mvp2-event-memory-me-read-v2";

type EventGroupRow = {
  group_id: string;
  event_name: string | null;
  event_slug: string | null;
  event_date: string | null;
  event_image_url: string | null;
  city_base: string | null;
};

type AgendaRow = {
  set_id: string;
};

type CheckInRow = {
  checked_in_at: string | null;
};

type EncounterRow = {
  encounter_id: string;
  counterpart_user_id: string;
  source: string;
  last_source: string;
  touch_count: number;
  nfc_touch_count: number;
  qr_touch_count: number;
  event_group_id: string | null;
  canonical_event_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

type ConnectionRow = {
  requester_user_id: string;
  target_user_id: string;
  status: string;
};

type CardRow = {
  user_id: string;
  label: string | null;
  slug: string | null;
};

type ProfileRow = {
  user_id: string;
  club_photo_url: string | null;
};

function jsonNoStore(
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function errorResponse(
  code: string,
  status: number
) {
  return jsonNoStore(
    {
      ok: false,
      version: ROUTE_VERSION,
      scope: "event-memory-me",
      error: code,
      database_write_performed: false,
    },
    status
  );
}

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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function readArray(
  value: unknown
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function acceptedCounterpart(
  row: ConnectionRow,
  viewerUserId: string
): string | null {
  if (row.status !== "accepted") {
    return null;
  }

  if (
    row.requester_user_id === viewerUserId
  ) {
    return row.target_user_id;
  }

  if (
    row.target_user_id === viewerUserId
  ) {
    return row.requester_user_id;
  }

  return null;
}

export async function GET(
  request: NextRequest
) {
  try {
    const eventSlug = normalizeEventSlug(
      request.nextUrl.searchParams.get("event_slug")
    );

    if (!eventSlug) {
      return errorResponse(
        "valid_event_slug_required",
        400
      );
    }

    const supabase =
      await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return errorResponse(
        "authentication_required",
        401
      );
    }

    const canonicalRead =
      await readCanonicalPublicEventBySlug(
        eventSlug
      );

    const canonicalEvent =
      canonicalRead.canonical_event;

    if (
      !canonicalRead.ok ||
      !canonicalRead.found ||
      !canonicalEvent ||
      canonicalEvent.is_100_percent_validated !== true ||
      !["validated", "published"].includes(
        String(
          canonicalEvent.validation_status ?? ""
        )
          .trim()
          .toLowerCase()
      )
    ) {
      return errorResponse(
        "validated_canonical_event_not_found",
        404
      );
    }

    const canonicalEventId =
      canonicalEvent.id;

    const bridgeRead =
      await readCanonicalEventGroupBridge(
        canonicalEventId
      );

    if (!bridgeRead.ok) {
      return errorResponse(
        "event_group_bridge_read_failed",
        500
      );
    }

    const bridgeEventGroupIds =
      bridgeRead.event_group_ids;

    const eventGroupSelect =
      "group_id,event_name,event_slug,event_date,event_image_url,city_base";

    const eventGroupQuery =
      bridgeEventGroupIds.length === 0
        ? supabase
            .from("event_groups")
            .select(eventGroupSelect)
            .eq("event_slug", eventSlug)
            .limit(1)
        : bridgeEventGroupIds.length === 1
          ? supabase
              .from("event_groups")
              .select(eventGroupSelect)
              .eq(
                "group_id",
                bridgeEventGroupIds[0]
              )
              .limit(1)
          : supabase
              .from("event_groups")
              .select(eventGroupSelect)
              .in(
                "group_id",
                bridgeEventGroupIds
              )
              .eq("event_slug", eventSlug)
              .order(
                "group_id",
                { ascending: true }
              )
              .limit(1);

    const [
      personalAgendaResult,
      eventGroupResult,
      checkInResult,
      officialAgenda,
    ] = await Promise.all([
      supabase
        .from("clubber_event_agenda_items")
        .select("set_id")
        .eq("user_id", user.id)
        .eq(
          "canonical_event_id",
          canonicalEventId
        )
        .eq("status", "saved"),

      eventGroupQuery,

      supabase
        .from("club_event_checkins")
        .select("checked_in_at")
        .eq("user_id", user.id)
        .or(
          `event_slug.eq.${eventSlug},event_key.eq.${eventSlug}`
        )
        .eq("status", "active")
        .order(
          "checked_in_at",
          { ascending: false }
        )
        .limit(10),

      readCanonicalEventAgenda(
        canonicalEventId
      ),
    ]);

    if (personalAgendaResult.error) {
      return errorResponse(
        "personal_agenda_read_failed",
        500
      );
    }

    if (eventGroupResult.error) {
      return errorResponse(
        "event_group_read_failed",
        500
      );
    }

    if (checkInResult.error) {
      return errorResponse(
        "check_in_read_failed",
        500
      );
    }

    if (!officialAgenda.ok) {
      return errorResponse(
        "official_agenda_read_failed",
        503
      );
    }

    const personalAgenda =
      (personalAgendaResult.data ??
        []) as AgendaRow[];

    const eventGroup =
      (
        (eventGroupResult.data ?? [])[0] as
          | EventGroupRow
          | undefined
      ) ?? null;

    const checkIns =
      (checkInResult.data ??
        []) as CheckInRow[];

    const eventGroupId =
      eventGroup?.group_id ?? null;

    const eventGroupResolution =
      bridgeEventGroupIds.length === 0
        ? "legacy_slug_fallback_no_link"
        : bridgeEventGroupIds.length === 1
          ? eventGroupId ===
            bridgeEventGroupIds[0]
            ? "canonical_bridge_single"
            : "canonical_bridge_single_not_visible"
          : eventGroup
            ? "canonical_bridge_multiple_slug_match"
            : "canonical_bridge_multiple_no_visible_slug_match";

    const savedSetIds =
      personalAgenda.map(
        (row) => row.set_id
      );

    const savedIdSet =
      new Set(savedSetIds);

    const stageNames =
      new Map(
        officialAgenda.stages.map(
          (stage) => [
            stage.stage_id,
            stage.name,
          ]
        )
      );

    const savedSets =
      officialAgenda.all_sets
        .filter((set) =>
          savedIdSet.has(set.set_id)
        )
        .map((set) => ({
          set_id: set.set_id,
          set_title: set.set_title,
          stage_id: set.stage_id,
          stage_name: set.stage_id
            ? stageNames.get(
                set.stage_id
              ) ?? null
            : null,
          starts_at: set.starts_at,
          ends_at: set.ends_at,
          lifecycle_status:
            set.lifecycle_status,
          performers:
            set.performers.map(
              (performer) => ({
                performer_id:
                  performer.performer_id,
                display_name:
                  performer.display_name,
                role: performer.role,
              })
            ),
        }));

    let tribes: unknown[] = [];
    let rides: unknown[] = [];
    let meetups: unknown[] = [];

    if (eventGroupId) {
      const {
        data,
        error,
      } = await supabase.rpc(
        "mhidas_read_my_event_memory_social_v1",
        {
          p_event_group_id:
            eventGroupId,
        }
      );

      if (error) {
        return errorResponse(
          "social_memory_read_failed",
          500
        );
      }

      if (isRecord(data)) {
        tribes = readArray(data.tribes);
        rides = readArray(data.rides);
        meetups = readArray(data.meetups);
      }
    }

    const {
      data: encounterData,
      error: encounterError,
    } = await supabase.rpc(
      "mhidas_read_my_clubber_encounters_v1",
      {
        p_limit: 200,
      }
    );

    if (encounterError) {
      return errorResponse(
        "encounter_read_failed",
        500
      );
    }

    const eventEncounters =
      ((encounterData ??
        []) as EncounterRow[]).filter(
        (encounter) =>
          encounter.canonical_event_id ===
            canonicalEventId ||
          (
            eventGroupId !== null &&
            encounter.event_group_id ===
              eventGroupId
          )
      );

    const uniqueEncounters:
      EncounterRow[] = [];

    const counterpartIds =
      new Set<string>();

    for (
      const encounter
      of eventEncounters
    ) {
      if (
        counterpartIds.has(
          encounter.counterpart_user_id
        )
      ) {
        continue;
      }

      counterpartIds.add(
        encounter.counterpart_user_id
      );

      uniqueEncounters.push(
        encounter
      );
    }

    const counterpartIdList =
      Array.from(counterpartIds);

    const acceptedIds =
      new Set<string>();

    const cards =
      new Map<string, CardRow>();

    const profiles =
      new Map<string, ProfileRow>();

    if (
      counterpartIdList.length > 0
    ) {
      const [
        connectionResult,
        cardResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from("clubber_connections")
          .select(
            "requester_user_id,target_user_id,status"
          )
          .eq("status", "accepted")
          .or(
            `requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`
          ),

        supabase
          .from("cards")
          .select(
            "user_id,label,slug"
          )
          .in(
            "user_id",
            counterpartIdList
          )
          .eq("status", "active")
          .eq("is_published", true),

        supabase
          .from("club_profiles")
          .select(
            "user_id,club_photo_url"
          )
          .in(
            "user_id",
            counterpartIdList
          ),
      ]);

      if (connectionResult.error) {
        return errorResponse(
          "connection_read_failed",
          500
        );
      }

      if (cardResult.error) {
        return errorResponse(
          "counterpart_card_read_failed",
          500
        );
      }

      if (profileResult.error) {
        return errorResponse(
          "counterpart_profile_read_failed",
          500
        );
      }

      for (
        const row
        of (
          connectionResult.data ??
          []
        ) as ConnectionRow[]
      ) {
        const counterpart =
          acceptedCounterpart(
            row,
            user.id
          );

        if (
          counterpart !== null &&
          counterpartIds.has(
            counterpart
          )
        ) {
          acceptedIds.add(
            counterpart
          );
        }
      }

      for (
        const card
        of (
          cardResult.data ??
          []
        ) as CardRow[]
      ) {
        if (
          !cards.has(
            card.user_id
          )
        ) {
          cards.set(
            card.user_id,
            card
          );
        }
      }

      for (
        const profile
        of (
          profileResult.data ??
          []
        ) as ProfileRow[]
      ) {
        profiles.set(
          profile.user_id,
          profile
        );
      }
    }

    const people =
      uniqueEncounters.map(
        (encounter) => {
          const card =
            cards.get(
              encounter.counterpart_user_id
            );

          const profile =
            profiles.get(
              encounter.counterpart_user_id
            );

          return {
            encounter_id:
              encounter.encounter_id,
            counterpart_user_id:
              encounter.counterpart_user_id,
            label:
              card?.label ?? null,
            profile_slug:
              card?.slug ?? null,
            photo_url:
              profile?.club_photo_url ??
              null,
            source:
              encounter.source,
            last_source:
              encounter.last_source,
            touch_count:
              encounter.touch_count,
            nfc_touch_count:
              encounter.nfc_touch_count,
            qr_touch_count:
              encounter.qr_touch_count,
            first_seen_at:
              encounter.first_seen_at,
            last_seen_at:
              encounter.last_seen_at,
            continued_in_network:
              acceptedIds.has(
                encounter.counterpart_user_id
              ),
          };
        }
      );

    const latestCheckIn =
      checkIns[0] ?? null;

    return jsonNoStore({
      ok: true,
      version: ROUTE_VERSION,
      scope: "event-memory-me",
      mode: "read",
      database_write_performed: false,
      viewer_user_id: user.id,

      event: {
        canonical_event_id:
          canonicalEventId,
        slug:
          canonicalEvent.slug,
        event_name:
          canonicalEvent.event_name,
        starts_at:
          canonicalEvent.starts_at,
        ends_at:
          canonicalEvent.ends_at,
        event_date_key:
          canonicalEvent.event_date_key,
        venue_name:
          canonicalEvent.venue_name,
        city:
          canonicalEvent.city,
        state:
          canonicalEvent.state,
        country:
          canonicalEvent.country,
        official_image:
          canonicalEvent.official_image,
      },

      event_group:
        eventGroup,

      event_group_resolution: {
        strategy:
          eventGroupResolution,
        bridge_link_count:
          bridgeEventGroupIds.length,
      },

      presence: {
        checked_in:
          checkIns.length > 0,
        latest_checked_in_at:
          latestCheckIn?.checked_in_at ??
          null,
        matching_check_in_count:
          checkIns.length,
      },

      agenda: {
        semantics:
          "intent_not_attendance",
        copy:
          "Você marcou para ver",
        saved_set_ids:
          savedSetIds,
        saved_sets:
          savedSets,
        unresolved_saved_set_count:
          savedSetIds.length -
          savedSets.length,
      },

      social: {
        event_group_id:
          eventGroupId,
        tribes,
        rides,
        meetups,
      },

      encounters: {
        people,
        person_count:
          people.length,
        continued_connection_count:
          people.filter(
            (person) =>
              person.continued_in_network
          ).length,
      },

      safety: {
        agenda_is_intent: true,
        check_in_is_presence_evidence:
          true,
        encounter_requires_explicit_event_context:
          true,
        location_history_included:
          false,
        live_presence_status_included:
          false,
        me_perdi_data_included:
          false,
        other_member_lists_included:
          false,
        global_event_bridge_created:
          true,
        canonical_bridge_read_only:
          true,
        canonical_bridge_direct_client_access:
          false,
      },

      summary: {
        saved_set_count:
          savedSetIds.length,
        tribe_count:
          tribes.length,
        ride_count:
          rides.length,
        meetup_count:
          meetups.length,
        encountered_people_count:
          people.length,
        continued_connection_count:
          people.filter(
            (person) =>
              person.continued_in_network
          ).length,
      },
    });
  } catch {
    return errorResponse(
      "event_memory_read_failed",
      500
    );
  }
}