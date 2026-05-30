// src/app/api/official-events/_shared/resolverHelpers.ts

import { type JsonRecord, normalizeText } from "./resolverTypes";

export function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeUrl(value: unknown): string {
  const raw = normalizeText(value);

  if (!raw) return "";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";

    for (const key of Array.from(url.searchParams.keys())) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.startsWith("utm_") ||
        lowerKey === "fbclid" ||
        lowerKey === "igshid" ||
        lowerKey === "ref"
      ) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return "";
  }
}

export function calculateBaseConfidence(params: {
  query: string;
  eventName: string;
  officialUrl: string;
  eventDate: string;
  venueName: string;
  city: string;
}): number {
  const query = params.query.toLowerCase();
  const eventName = params.eventName.toLowerCase();

  let score = 35;

  if (params.officialUrl) score += 25;
  if (params.eventDate) score += 10;
  if (params.venueName) score += 10;
  if (params.city) score += 5;

  if (query && eventName.includes(query)) {
    score += 15;
  } else if (query && query.includes(eventName)) {
    score += 8;
  }

  return clamp(score, 0, 95);
}
