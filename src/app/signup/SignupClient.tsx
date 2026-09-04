// src/app/signup/SignupClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  buildAccountStartPath,
  getSafePostOnboardingPath,
  type AccountEntryIntent,
} from "@/lib/navigation/safeInternalNextPath";

type EntryOption = {
  value: AccountEntryIntent;
  title: string;
  description: string;
  verificationNote?: string;
  guidanceNote?: string;
};

const ENTRY_OPTIONS: EntryOption[] = [
  {
    value: "clubber",
    title: "Clubber",
    description:
      "Quero criar minha Identidade Clubber, expressar meu estilo de vida, meus sons e experiências e ampliar meu grupo de amigos com pessoas que compartilham as mesmas afinidades.",
  },
  {
    value: "artist",
    title: "Artista / DJ / Projeto musical",
    description:
      "Quero criar ou reivindicar o perfil de um Artista, DJ ou Projeto musical.",
    verificationNote: "Perfis oficiais passam por verificação.",
  },
  {
    value: "club",
    title: "Club / Venue",
    description:
      "Tenho ou represento um Club ou Venue — uma casa ou espaço físico com endereço próprio e programação recorrente de música eletrônica — e quero criar ou reivindicar seu perfil.",
    verificationNote: "Perfis oficiais passam por verificação.",
    guidanceNote:
      "Se você organiza festas ou eventos, mas não possui um espaço físico próprio, escolha Organização / Parceiro.",
  },
  {
    value: "festival",
    title: "Festival",
    description: "Quero criar ou reivindicar o perfil de um Festival.",
    verificationNote: "Perfis oficiais passam por verificação.",
  },
  {
    value: "organization",
    title: "Organização / Parceiro",
    description:
      "Represento uma produtora, promoter, agência, ticketing, marca ou organização responsável por festas, eventos ou serviços da música eletrônica.",
    verificationNote: "Organizações oficiais passam por verificação.",
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111111",
  color: "#F8FAFC",
  outline: "none",
  fontSize: 16,
};

function intentLabel(intent: AccountEntryIntent): string {
  return (
    ENTRY_OPTIONS.find((option) => option.value === intent)?.title ??
    "seu caminho"
  );
}

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  const safeReturnTo = useMemo(
    () => getSafePostOnboardingPath(searchParams.get("return_to")),
    [searchParams]
  );

  const [entryIntent, setEntryIntent] = useState<AccountEntryIntent | "">("");
  const loginHref = entryIntent
    ? `/login?next=${encodeURIComponent(
        buildAccountStartPath(entryIntent, safeReturnTo)
      )}`
    : safeReturnTo
      ? `/login?return_to=${encodeURIComponent(safeReturnTo)}`
      : "/login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isOfficialPath = entryIntent !== "" && entryIntent !== "clubber";

  function getAccountStartPath(): string {
    if (!entryIntent) {
      throw new Error("Escolha como você faz parte da cena eletrônica.");
    }

    return buildAccountStartPath(entryIntent, safeReturnTo);
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);

    if (!entryIntent) {
      setErrorMsg("Escolha como você faz parte da cena eletrônica.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Use uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const accountStartPath = getAccountStartPath();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", accountStartPath);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callbackUrl.toString() },
      });

      if (error) throw new Error(error.message);

      if (data.session) {
        router.replace(accountStartPath);
        router.refresh();
        return;
      }

      setConfirmationSent(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Não foi possível criar a conta."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setErrorMsg(null);

    if (!entryIntent) {
      setErrorMsg("Escolha como você faz parte da cena eletrônica.");
      return;
    }

    setGoogleLoading(true);

    try {
      const accountStartPath = getAccountStartPath();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", accountStartPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) throw new Error(error.message);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível continuar com Google."
      );
      setGoogleLoading(false);
    }
  }

  if (confirmationSent && entryIntent) {
    const accountStartPath = buildAccountStartPath(entryIntent, safeReturnTo);

    return (
      <div style={{ display: "grid", gap: 18, marginTop: 28 }}>
        <div
          style={{
            borderTop: "1px solid rgba(42,134,148,0.44)",
            borderBottom: "1px solid rgba(42,134,148,0.18)",
            padding: "20px 0",
          }}
        >
          <strong style={{ display: "block", fontSize: 21 }}>
            Confirme seu e-mail para continuar
          </strong>

          {entryIntent === "clubber" ? (
            <p style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>
              Enviamos um link de confirmação para <strong>{email.trim()}</strong>.
              Abra o e-mail e confirme sua conta para criar sua Identidade Clubber
              e continuar de onde você parou.
            </p>
          ) : (
            <p style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>
              Enviamos um link de confirmação para <strong>{email.trim()}</strong>.
              Abra o e-mail e confirme sua Conta USECLUBBERS para continuar pelo
              caminho <strong>{intentLabel(entryIntent)}</strong>. Nenhum perfil
              oficial será criado ou verificado apenas pela confirmação do e-mail.
            </p>
          )}
        </div>

        <Link
          href={`/login?next=${encodeURIComponent(accountStartPath)}`}
          style={{ color: "#2A8694", fontWeight: 900, textDecoration: "none" }}
        >
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSignup}
      style={{ display: "grid", gap: 22, marginTop: 28 }}
    >
      {errorMsg ? (
        <div
          role="alert"
          style={{
            borderTop: "1px solid rgba(248,113,113,0.46)",
            borderBottom: "1px solid rgba(248,113,113,0.20)",
            padding: "13px 0",
            color: "#ffffff",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <fieldset
        style={{
          display: "grid",
          gap: 12,
          margin: 0,
          padding: 0,
          border: 0,
        }}
      >
        <legend
          style={{
            marginBottom: 12,
            padding: 0,
            fontSize: 22,
            fontWeight: 900,
            color: "#F8FAFC",
          }}
        >
          Como você faz parte da cena eletrônica?
        </legend>

        {ENTRY_OPTIONS.map((option) => {
          const selected = entryIntent === option.value;

          return (
            <label
              key={option.value}
              style={{
                display: "grid",
                gridTemplateColumns: "22px 1fr",
                gap: 12,
                alignItems: "start",
                padding: "15px 16px",
                borderRadius: 16,
                border: selected
                  ? "1px solid rgba(42,134,148,0.72)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: selected
                  ? "rgba(42,134,148,0.10)"
                  : "#111111",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="entry-intent"
                value={option.value}
                checked={selected}
                onChange={() => {
                  setEntryIntent(option.value);
                  setErrorMsg(null);
                }}
                style={{
                  marginTop: 4,
                  width: 17,
                  height: 17,
                  accentColor: "#2A8694",
                }}
              />

              <span style={{ display: "grid", gap: 5 }}>
                <strong style={{ color: "#F8FAFC", fontSize: 15 }}>
                  {option.title}
                </strong>

                <span
                  style={{
                    color: "#CBD5E1",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {option.description}
                </span>

                {option.guidanceNote ? (
                  <span
                    style={{
                      color: "#CBD5E1",
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    {option.guidanceNote}
                  </span>
                ) : null}

                {option.verificationNote ? (
                  <span
                    style={{
                      color: "#94A3B8",
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    {option.verificationNote}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div
        style={{
          padding: "14px 0",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          color: "#94A3B8",
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        Sua Conta USECLUBBERS é única. Você poderá ter sua Identidade Clubber e
        também administrar perfis de Artistas, Clubs, Festivais ou Organizações.
      </div>

      {isOfficialPath ? (
        <div
          style={{
            padding: "13px 14px",
            borderLeft: "2px solid #2A8694",
            background: "#111111",
            color: "#CBD5E1",
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          <strong style={{ display: "block", color: "#F8FAFC", marginBottom: 4 }}>
            Use seu e-mail profissional, se tiver.
          </strong>
          E-mails vinculados ao domínio oficial do artista, Club, festival ou
          organização podem ajudar a agilizar a verificação. E-mail corporativo
          aumenta a confiança, mas não substitui a validação da identidade ou da
          propriedade da entidade.
        </div>
      ) : null}

      {googleEnabled ? (
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          style={{
            minHeight: 52,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.055)",
            color: "#ffffff",
            fontWeight: 900,
            fontSize: 16,
          }}
        >
          {googleLoading ? "Abrindo Google..." : "Continuar com Google"}
        </button>
      ) : null}

      <label style={{ display: "grid", gap: 5 }}>
        <span style={{ fontWeight: 800 }}>E-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 5 }}>
        <span style={{ fontWeight: 800 }}>Crie uma senha</span>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ ...inputStyle, paddingRight: 92 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            style={{
              position: "absolute",
              top: "50%",
              right: 12,
              transform: "translateY(-50%)",
              border: 0,
              background: "transparent",
              color: "#2A8694",
              fontWeight: 900,
              fontSize: 13,
              cursor: "pointer",
              padding: "8px 4px",
            }}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </label>

      <label style={{ display: "grid", gap: 5 }}>
        <span style={{ fontWeight: 800 }}>Confirme a senha</span>
        <div style={{ position: "relative" }}>
          <input
            type={showPasswordConfirmation ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            style={{ ...inputStyle, paddingRight: 92 }}
          />
          <button
            type="button"
            onClick={() => setShowPasswordConfirmation((value) => !value)}
            aria-label={
              showPasswordConfirmation ? "Ocultar senha" : "Mostrar senha"
            }
            style={{
              position: "absolute",
              top: "50%",
              right: 12,
              transform: "translateY(-50%)",
              border: 0,
              background: "transparent",
              color: "#2A8694",
              fontWeight: 900,
              fontSize: 13,
              cursor: "pointer",
              padding: "8px 4px",
            }}
          >
            {showPasswordConfirmation ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </label>

      <button
        type="submit"
        disabled={loading || googleLoading}
        style={{
          minHeight: 54,
          borderRadius: 18,
          border: "1px solid rgba(42,134,148,0.44)",
          background: loading ? "rgba(42,134,148,0.28)" : "#2A8694",
          color: "#ffffff",
          fontWeight: 950,
          fontSize: 17,
        }}
      >
        {loading ? "Criando conta..." : "Criar conta gratuita"}
      </button>

      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.62)",
          fontSize: 13,
          lineHeight: 1.55,
          textAlign: "center",
        }}
      >
        Você não precisa ter cartão, pulseira, pingente ou tag NFC.
      </p>

      <Link
        href={loginHref}
        style={{
          color: "#2A8694",
          fontWeight: 900,
          textAlign: "center",
          textDecoration: "none",
        }}
      >
        Já tenho uma conta
      </Link>
    </form>
  );
}
