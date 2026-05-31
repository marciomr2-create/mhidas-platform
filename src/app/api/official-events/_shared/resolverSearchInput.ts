// src/app/api/official-events/_shared/resolverSearchInput.ts

import {
  type OfficialEventSearchInput,
  getDiscoveryType,
  normalizeForDiscovery,
  normalizeText,
  clampNumber,
} from "./resolverTypes";

export type OfficialEventSearchInputParseOptions = {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
};

export function parseOfficialEventSearchInput(
  searchParams: URLSearchParams,
  options: OfficialEventSearchInputParseOptions = {}
): OfficialEventSearchInput {
  const defaultSize = options.defaultSize ?? 10;
  const minSize = options.minSize ?? 1;
  const maxSize = options.maxSize ?? 20;

  const query = normalizeText(
    searchParams.get("q") || searchParams.get("keyword")
  );

  const city = normalizeText(searchParams.get("city"));
  const state = normalizeText(searchParams.get("state"));
  const countryCode = normalizeText(
    searchParams.get("countryCode") || searchParams.get("country")
  );

  const startDate = normalizeText(searchParams.get("startDate"));
  const endDate = normalizeText(searchParams.get("endDate"));

  const discoveryType = getDiscoveryType(
    searchParams.get("discoveryType") || searchParams.get("type")
  );

  const normalizedQuery = normalizeForDiscovery(query);

  const rawSize = Number(searchParams.get("size") || defaultSize);
  const size = clampNumber(
    Number.isFinite(rawSize) ? rawSize : defaultSize,
    minSize,
    maxSize
  );

  const saveParam = normalizeText(searchParams.get("save")).toLowerCase();
  const save =
    saveParam !== "false" &&
    saveParam !== "0" &&
    saveParam !== "no";

  const eventGroupId = normalizeText(searchParams.get("eventGroupId"));

  return {
    query,
    normalizedQuery,
    discoveryType,
    city,
    state,
    countryCode,
    startDate,
    endDate,
    size,
    save,
    eventGroupId,
  };
}

export function validateOfficialEventSearchInput(input: OfficialEventSearchInput) {
  if (input.query.length < 2) {
    return {
      ok: false,
      message: "Use at least 2 characters to search official events.",
    };
  }

  return {
    ok: true,
    message: "Official event search input is valid.",
  };
}
