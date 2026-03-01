"use client";

type Props = {
  text: string;
};

export default function CopyLinkButton({ text }: Props) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {}
      }}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.04)",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Copiar Link
    </button>
  );
}