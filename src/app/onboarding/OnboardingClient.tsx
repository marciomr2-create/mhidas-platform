// src/app/onboarding/OnboardingClient.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import { getSafePostOnboardingPath } from "@/lib/navigation/safeInternalNextPath";

type Props = {
  email: string;
  initialDisplayName: string;
  initialUsername: string;
  initialCityBase: string;
  initialAvatarUrl: string;
  returnTo: string;
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
  if (value.includes("username_unavailable")) {
    return "Este @username não está mais disponível.";
  }
  if (value.includes("username_reserved")) {
    return "Este @username é reservado.";
  }
  if (value.includes("identity_already_exists")) {
    return "Sua Identidade Clubber já foi criada com outro @username.";
  }
  if (value.includes("multiple_cards_require_manual_resolution")) {
    return "Sua conta possui mais de uma identidade antiga e precisa de revisão segura.";
  }
  if (value.includes("display_name_too_short")) {
    return "Informe seu nome público.";
  }
  return "Não foi possível criar sua Identidade Clubber.";
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  boxSizing: "border-box",
  padding: "0 14px",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 14,
  background: "#111111",
  color: "#f8fafc",
  outline: "none",
  fontSize: 16,
};

const helperStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.45,
};

export default function OnboardingClient({
  email,
  initialDisplayName,
  initialUsername,
  initialCityBase,
  initialAvatarUrl,
  returnTo,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const safeReturnTo = useMemo(
    () => getSafePostOnboardingPath(returnTo),
    [returnTo]
  );

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [cityBase, setCityBase] = useState(initialCityBase);
  const [useImportedPhoto, setUseImportedPhoto] = useState(
    Boolean(initialAvatarUrl)
  );
  const [availability, setAvailability] =
    useState<AvailabilityRow | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username]
  );

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
      setErrorMsg(
        "Escolha um @username disponível antes de continuar."
      );
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

      router.replace(safeReturnTo || "/dashboard/cards");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown";
      setErrorMsg(creationErrorMessage(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
      {errorMsg ? (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            border: "1px solid rgba(248,113,113,0.42)",
            borderRadius: 12,
            background: "rgba(127,29,29,0.14)",
            color: "#fecaca",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 5,
          paddingBottom: 18,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span
          style={{
            color: "#64748b",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.10em",
          }}
        >
          CONTA
        </span>
        <strong style={{ color: "#cbd5e1", fontSize: 14 }}>{email}</strong>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>
          Seu nome público
        </span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          maxLength={80}
          required
          autoComplete="name"
          placeholder="Ex.: nome que você quer mostrar no seu perfil"
          style={fieldStyle}
        />
        <small style={helperStyle}>
          É o nome que as pessoas verão na sua Identidade Clubber.
        </small>
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>
          Seu @username único
        </span>
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
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={helperStyle}>
            useclubbers.com.br/{normalizedUsername || "seu-nome"}
          </span>

          <strong
            style={{
              color: availability?.available ? "#2A8694" : "#94a3b8",
              fontSize: 12,
            }}
          >
            {checking
              ? "Verificando..."
              : availabilityMessage(availability?.reason ?? "")}
          </strong>
        </div>

        <small style={helperStyle}>
          Você pode usar o mesmo @username que já usa no Instagram ou em outra
          rede social, se ele ainda estiver disponível no USECLUBBERS.
        </small>

        <small style={helperStyle}>
          Este é o seu identificador público e universal dentro do
          USECLUBBERS.
        </small>
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>
          Cidade e estado
        </span>
        <input
          value={cityBase}
          onChange={(event) => setCityBase(event.target.value)}
          maxLength={120}
          placeholder="Ex.: São Paulo - SP"
          autoComplete="address-level2"
          style={fieldStyle}
        />
        <small style={helperStyle}>
          Sua cidade ajuda a aproximar pessoas e experiências da sua cena.
        </small>
      </label>

      {initialAvatarUrl ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            background: "#111111",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={initialAvatarUrl}
            alt="Foto encontrada na sua conta"
            width={48}
            height={48}
            style={{
              borderRadius: 12,
              objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />

          <input
            type="checkbox"
            checked={useImportedPhoto}
            onChange={(event) => setUseImportedPhoto(event.target.checked)}
            style={{ accentColor: "#2A8694" }}
          />

          <span style={{ color: "#cbd5e1", fontSize: 13 }}>
            Usar a foto encontrada na minha conta
          </span>
        </label>
      ) : null}

      <div
        style={{
          padding: "14px 0",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          color: "#94a3b8",
          lineHeight: 1.5,
          fontSize: 12,
        }}
      >
        Ao continuar, você confirma que estes dados representam você e
        que não está se passando por outra pessoa, artista ou marca.
      </div>

      <button
        type="submit"
        disabled={loading || checking || !availability?.available}
        style={{
          minHeight: 54,
          borderRadius: 14,
          border: "1px solid #2A8694",
          background:
            loading || checking || !availability?.available
              ? "rgba(42,134,148,0.12)"
              : "#2A8694",
          color: "#f8fafc",
          fontWeight: 900,
          fontSize: 15,
          cursor:
            loading || checking || !availability?.available
              ? "not-allowed"
              : "pointer",
          opacity:
            loading || checking || !availability?.available ? 0.72 : 1,
        }}
      >
        {loading
          ? "Criando sua Identidade Clubber..."
          : "Criar minha Identidade Clubber"}
      </button>

      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 11,
          lineHeight: 1.45,
          textAlign: "center",
        }}
      >
        Seu NFC é opcional e poderá ser vinculado depois.
      </p>
    </form>
  );
}
