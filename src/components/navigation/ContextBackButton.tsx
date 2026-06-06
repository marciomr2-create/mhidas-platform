// src/components/navigation/ContextBackButton.tsx

"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

type ContextBackButtonProps = {
  fallbackHref: string;
  label?: string;
  compact?: boolean;
  fullWidth?: boolean;
};

function buttonStyle(
  compact: boolean,
  fullWidth: boolean
): CSSProperties {
  return {
    width: fullWidth ? "100%" : "fit-content",
    minHeight: compact ? 40 : 46,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: compact ? "10px 13px" : "12px 16px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.045))",
    color: "#ffffff",
    fontSize: compact ? 12 : 13,
    fontWeight: 900,
    lineHeight: 1,
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(0,0,0,0.20)",
  };
}

export default function ContextBackButton({
  fallbackHref,
  label = "Voltar",
  compact = false,
  fullWidth = false,
}: ContextBackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window === "undefined") {
      return;
    }

    const hasNavigationHistory = window.history.length > 1;

    if (hasNavigationHistory) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      style={buttonStyle(compact, fullWidth)}
    >
      <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>
        ←
      </span>

      <span>{label}</span>
    </button>
  );
}
