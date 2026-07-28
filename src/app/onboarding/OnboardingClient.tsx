// src/app/onboarding/OnboardingClient.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

type Props = {
  email: string;
  initialDisplayName: string;
  initialUsername: string;
  initialCityBase: string;
  initialAvatarUrl: string;
};

type AvailabilityRow = {
  normalized_username: string;
  available: boolean;
  reason: string;
};

type IdentityRow = {
  card_id: string;
  slug: string;
  created: boolean;
};

function normalizeUsername(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function availabilityMessage(reason: string): string {
  if (reason === "available") return "Disponível";
  if (reason === "too_short") return "Use pelo menos 3 caracteres";
  if (reason === "too_long") return "Use no máximo 30 caracteres";
  if (reason === "reserved") return "Nome reservado pela plataforma";
  if (reason === "held_by_history") return "Nome protegido pelo histórico";
  if (reason === "already_used") return "Este nome já pertence a outra pessoa";
  return "Não foi possível validar agora";
}

function creationErrorMessage(value: string): string {
  if (value.includes("username_unavailable")) return "Este @username não está mais disponível.";
  if (value.includes("username_reserved")) return "Este @username é reservado.";
  if (value.includes("identity_already_exists")) return "Sua identidade Clubber já foi criada com outro @username.";
  if (value.includes("multiple_cards_require_manual_resolution")) return "Sua conta possui mais de uma identidade antiga e precisa de revisão segura.";
  if (value.includes("display_name_too_short")) return "Informe seu nome público.";
  return "Não foi possível criar seu perfil Clubber.";
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 0 12px",
  border: 0,
  borderBottom: "1px solid rgba(255,255,255,0.18)",
  background: "transparent",
  color: "#ffffff",
  outline: "none",
  fontSize: 17,
};

export default function OnboardingClient({
  email,
  initialDisplayName,
  initialUsername,
  initialCityBase,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [cityBase, setCityBase] = useState(initialCityBase);
  const [useImportedPhoto, setUseImportedPhoto] = useState(Boolean(initialAvatarUrl));
  const [availability, setAvailability] = useState<AvailabilityRow | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);

  useEffect(() => {
    let cancelled = false;

    if (normalizedUsername.length < 3) {
      setAvailability({
        normalized_username: normalizedUsername,
        available: false,
        reason: "too_short",
      });
      return;
    }

    setChecking(true);

    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc(
        "check_public_username_availability",
        { p_username: normalizedUsername }
      );

      if (cancelled) return;

      if (error) {
        setAvailability(null);
      } else {
        const rows = (data ?? []) as AvailabilityRow[];
        setAvailability(rows[0] ?? null);
      }

      setChecking(false);
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedUsername, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);

    if (!availability?.available) {
      setErrorMsg("Escolha um @username disponível antes de continuar.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "create_public_clubber_identity",
        {
          p_username: normalizedUsername,
          p_display_name: displayName.trim(),
          p_city_base: cityBase.trim() || null,
          p_avatar_url: useImportedPhoto ? initialAvatarUrl || null : null,
        }
      );

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as IdentityRow[];
      if (!rows[0]?.card_id) throw new Error("identity_not_created");

      router.replace("/dashboard/cards");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown";
      setErrorMsg(creationErrorMessage(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
      {errorMsg ? (
        <div
          role="alert"
          style={{
            padding: "13px 0",
            borderTop: "1px solid rgba(248,113,113,0.46)",
            borderBottom: "1px solid rgba(248,113,113,0.20)",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 5 }}>
        <span style={{ color: "rgba(255,255,255,0.54)", fontSize: 12, fontWeight: 800 }}>
          CONTA
        </span>
        <strong>{email}</strong>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 900 }}>Seu nome público</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          maxLength={80}
          required
          autoComplete="name"
          placeholder="Ex.: Marcio MR2"
          style={fieldStyle}
        />
        <small style={{ color: "rgba(255,255,255,0.58)" }}>
          Pode se repetir. É o nome que as pessoas verão no seu perfil.
        </small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 900 }}>Seu @username único</span>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={30}
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={fieldStyle}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 13,
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.58)" }}>
            useclubbers.com.br/{normalizedUsername || "seu-nome"}
          </span>
          <strong
            style={{
              color: availability?.available
                ? "#5eead4"
                : "rgba(255,255,255,0.64)",
            }}
          >
            {checking
              ? "Verificando..."
              : availabilityMessage(availability?.reason ?? "")}
          </strong>
        </div>
        <small style={{ color: "rgba(255,255,255,0.58)" }}>
          Esta é apenas uma sugestão. Você pode usar o @username pelo qual já é
          conhecido em outras plataformas, se estiver disponível.
        </small>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 900 }}>Cidade e estado</span>
        <input
          value={cityBase}
          onChange={(event) => setCityBase(event.target.value)}
          maxLength={120}
          placeholder="Ex.: São Paulo - SP"
          autoComplete="address-level2"
          style={fieldStyle}
        />
      </label>

      {initialAvatarUrl ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 0",
            borderTop: "1px solid rgba(255,255,255,0.10)",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={initialAvatarUrl}
            alt="Foto encontrada na sua conta"
            width={48}
            height={48}
            style={{ borderRadius: 999, objectFit: "cover" }}
          />
          <input
            type="checkbox"
            checked={useImportedPhoto}
            onChange={(event) => setUseImportedPhoto(event.target.checked)}
          />
          <span>Usar a foto encontrada na minha conta</span>
        </label>
      ) : null}

      <div
        style={{
          padding: "15px 0",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.64)",
          lineHeight: 1.55,
          fontSize: 13,
        }}
      >
        Ao continuar, você confirma que estes dados representam você e que não
        está se passando por outra pessoa, artista ou marca.
      </div>

      <button
        type="submit"
        disabled={loading || checking || !availability?.available}
        style={{
          minHeight: 56,
          borderRadius: 18,
          border: "1px solid rgba(45,212,191,0.46)",
          background:
            loading || !availability?.available
              ? "rgba(45,212,191,0.18)"
              : "linear-gradient(135deg, #14b8a6, #059669)",
          color: "#ffffff",
          fontWeight: 950,
          fontSize: 17,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Criando seu perfil..." : "Criar meu perfil Clubber"}
      </button>

      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.58)",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        Nenhum NFC será criado ou exigido. Você poderá vinculá-lo depois.
      </p>
    </form>
  );
}
