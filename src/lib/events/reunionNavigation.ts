export type ReunionLocationFreshness =
  | "recent"
  | "unstable"
  | "last_known"
  | "stale";

export type ReunionGuidanceMode =
  | "compass"
  | "last_known"
  | "meeting_point"
  | "unavailable";

export type ReunionCoordinate = {
  latitude: number;
  longitude: number;
};

export type ReunionNavigationResult = {
  distance_meters: number;
  bearing_degrees: number;
  relative_heading_degrees: number | null;
  freshness: ReunionLocationFreshness;
  guidance_mode: ReunionGuidanceMode;
  age_seconds: number;
};

const EARTH_RADIUS_METERS = 6371008.8;

export const REUNION_RECENT_MAX_SECONDS = 30;
export const REUNION_UNSTABLE_MAX_SECONDS = 120;
export const REUNION_LAST_KNOWN_MAX_SECONDS = 300;

function toRadians(
  degrees: number
): number {
  return (
    degrees *
    Math.PI /
    180
  );
}

function toDegrees(
  radians: number
): number {
  return (
    radians *
    180 /
    Math.PI
  );
}

export function normalizeDegrees(
  value: number
): number {
  const normalized =
    value % 360;

  return normalized < 0
    ? normalized + 360
    : normalized;
}

export function shortestSignedAngle(
  value: number
): number {
  const normalized =
    normalizeDegrees(value);

  return normalized > 180
    ? normalized - 360
    : normalized;
}

function assertCoordinate(
  coordinate: ReunionCoordinate
): void {
  if (
    !Number.isFinite(
      coordinate.latitude
    ) ||
    !Number.isFinite(
      coordinate.longitude
    ) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90 ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new Error(
      "Invalid reunion coordinate."
    );
  }
}

export function calculateDistanceMeters(
  from: ReunionCoordinate,
  to: ReunionCoordinate
): number {
  assertCoordinate(from);
  assertCoordinate(to);

  const fromLatitude =
    toRadians(from.latitude);

  const toLatitude =
    toRadians(to.latitude);

  const latitudeDelta =
    toRadians(
      to.latitude -
      from.latitude
    );

  const longitudeDelta =
    toRadians(
      to.longitude -
      from.longitude
    );

  const sinLatitude =
    Math.sin(
      latitudeDelta / 2
    );

  const sinLongitude =
    Math.sin(
      longitudeDelta / 2
    );

  const haversine =
    sinLatitude *
      sinLatitude +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      sinLongitude *
      sinLongitude;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(
        Math.max(
          0,
          1 - haversine
        )
      )
    );

  return (
    EARTH_RADIUS_METERS *
    angularDistance
  );
}

export function calculateBearingDegrees(
  from: ReunionCoordinate,
  to: ReunionCoordinate
): number {
  assertCoordinate(from);
  assertCoordinate(to);

  const fromLatitude =
    toRadians(from.latitude);

  const toLatitude =
    toRadians(to.latitude);

  const longitudeDelta =
    toRadians(
      to.longitude -
      from.longitude
    );

  const y =
    Math.sin(longitudeDelta) *
    Math.cos(toLatitude);

  const x =
    Math.cos(fromLatitude) *
      Math.sin(toLatitude) -
    Math.sin(fromLatitude) *
      Math.cos(toLatitude) *
      Math.cos(longitudeDelta);

  return normalizeDegrees(
    toDegrees(
      Math.atan2(y, x)
    )
  );
}

export function calculateRelativeHeadingDegrees(
  targetBearingDegrees: number,
  deviceHeadingDegrees: number | null
): number | null {
  if (
    deviceHeadingDegrees === null ||
    !Number.isFinite(
      deviceHeadingDegrees
    )
  ) {
    return null;
  }

  return shortestSignedAngle(
    normalizeDegrees(
      targetBearingDegrees
    ) -
    normalizeDegrees(
      deviceHeadingDegrees
    )
  );
}

export function classifyReunionFreshness(
  capturedAt: string,
  now = new Date()
): {
  freshness: ReunionLocationFreshness;
  age_seconds: number;
} {
  const capturedAtMs =
    new Date(
      capturedAt
    ).getTime();

  if (
    Number.isNaN(
      capturedAtMs
    )
  ) {
    throw new Error(
      "Invalid reunion captured_at."
    );
  }

  const ageSeconds =
    Math.max(
      0,
      Math.floor(
        (
          now.getTime() -
          capturedAtMs
        ) /
        1000
      )
    );

  if (
    ageSeconds <=
    REUNION_RECENT_MAX_SECONDS
  ) {
    return {
      freshness: "recent",
      age_seconds:
        ageSeconds,
    };
  }

  if (
    ageSeconds <=
    REUNION_UNSTABLE_MAX_SECONDS
  ) {
    return {
      freshness: "unstable",
      age_seconds:
        ageSeconds,
    };
  }

  if (
    ageSeconds <=
    REUNION_LAST_KNOWN_MAX_SECONDS
  ) {
    return {
      freshness: "last_known",
      age_seconds:
        ageSeconds,
    };
  }

  return {
    freshness: "stale",
    age_seconds:
      ageSeconds,
  };
}

export function selectReunionGuidanceMode(
  freshness:
    ReunionLocationFreshness,
  hasMeetingPoint: boolean
): ReunionGuidanceMode {
  if (
    freshness === "recent" ||
    freshness === "unstable"
  ) {
    return "compass";
  }

  if (
    freshness === "last_known"
  ) {
    return "last_known";
  }

  return hasMeetingPoint
    ? "meeting_point"
    : "unavailable";
}

export function calculateReunionNavigation(
  current: ReunionCoordinate,
  target: ReunionCoordinate,
  capturedAt: string,
  deviceHeadingDegrees:
    number | null,
  hasMeetingPoint: boolean,
  now = new Date()
): ReunionNavigationResult {
  const distanceMeters =
    calculateDistanceMeters(
      current,
      target
    );

  const bearingDegrees =
    calculateBearingDegrees(
      current,
      target
    );

  const {
    freshness,
    age_seconds,
  } =
    classifyReunionFreshness(
      capturedAt,
      now
    );

  return {
    distance_meters:
      distanceMeters,
    bearing_degrees:
      bearingDegrees,
    relative_heading_degrees:
      calculateRelativeHeadingDegrees(
        bearingDegrees,
        deviceHeadingDegrees
      ),
    freshness,
    guidance_mode:
      selectReunionGuidanceMode(
        freshness,
        hasMeetingPoint
      ),
    age_seconds,
  };
}
