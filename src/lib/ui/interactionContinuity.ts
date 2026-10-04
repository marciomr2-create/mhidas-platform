"use client";

export function scrollInteractionResult(
  element: HTMLElement | null
): void {
  if (
    !element ||
    typeof window === "undefined"
  ) {
    return;
  }

  const rect =
    element.getBoundingClientRect();

  const viewportHeight =
    window.innerHeight;

  const visibleLimit =
    Math.max(
      180,
      Math.min(
        viewportHeight - 120,
        viewportHeight * 0.65
      )
    );

  const resultStartAlreadyVisible =
    rect.top >= 12 &&
    rect.top <= visibleLimit;

  if (resultStartAlreadyVisible) {
    return;
  }

  const reducedMotion =
    typeof window.matchMedia ===
      "function" &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  element.scrollIntoView({
    behavior:
      reducedMotion
        ? "auto"
        : "smooth",
    block: "start",
  });
}
