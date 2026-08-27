"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

export type ClubContentProfile = {
  youtube_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  beatport_url: string | null;
  mixcloud_url: string | null;
  apple_music_url: string | null;
  deezer_url: string | null;
  primary_streaming_platform: string | null;
  playlist_title: string | null;
  playlist_description: string | null;
};

type ChannelField =
  | "youtube_url"
  | "spotify_url"
  | "soundcloud_url"
  | "mixcloud_url"
  | "beatport_url"
  | "apple_music_url"
  | "deezer_url";

type ChannelDefinition = {
  field: ChannelField;
  platform: string;
  label: string;
  placeholder: string;
};

const CHANNELS: ChannelDefinition[] = [
  {
    field: "youtube_url",
    platform: "youtube",
    label: "YouTube",
    placeholder: "Cole o link do seu canal, vídeo ou playlist",
  },
  {
    field: "spotify_url",
    platform: "spotify",
    label: "Spotify",
    placeholder: "Cole o link do seu perfil ou playlist",
  },
  {
    field: "soundcloud_url",
    platform: "soundcloud",
    label: "SoundCloud",
    placeholder: "Cole o link do seu perfil, set ou faixa",
  },
  {
    field: "mixcloud_url",
    platform: "mixcloud",
    label: "Mixcloud",
    placeholder: "Cole o link do seu perfil ou programa",
  },
  {
    field: "beatport_url",
    platform: "beatport",
    label: "Beatport",
    placeholder: "Cole o link do seu perfil ou seleção",
  },
  {
    field: "apple_music_url",
    platform: "apple_music",
    label: "Apple Music",
    placeholder: "Cole o link do seu perfil ou playlist",
  },
  {
    field: "deezer_url",
    platform: "deezer",
    label: "Deezer",
    placeholder: "Cole o link do seu perfil ou playlist",
  },
];

const css = `
  .club-content-manager {
    display: grid;
    gap: 22px;
  }

  .club-content-section {
    padding: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    background: #0E0E0E;
  }

  .club-content-section-head {
    display: grid;
    gap: 6px;
    margin-bottom: 18px;
  }

  .club-content-section h2 {
    margin: 0;
    font-size: 21px;
  }

  .club-content-section p {
    margin: 0;
    color: #CBD5E1;
    line-height: 1.5;
  }

  .club-content-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .club-channel-card {
    min-height: 176px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.09);
    border-top: 2px solid #2A8694;
    border-radius: 14px;
    background: #111111;
    display: grid;
    align-content: space-between;
    gap: 22px;
  }

  .club-channel-copy {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  .club-channel-copy h3 {
    margin: 0;
    font-size: 18px;
  }

  .club-channel-value {
    margin: 0;
    color: #F8FAFC;
    overflow-wrap: anywhere;
    line-height: 1.45;
  }

  .club-channel-status {
    margin: 0;
    color: #94A3B8;
    font-size: 13px;
  }

  .club-channel-status[data-primary="true"] {
    color: #8CC7CF;
  }

  .club-channel-actions {
    display: flex;
    gap: 18px;
    align-items: center;
    flex-wrap: wrap;
  }

  .club-channel-action {
    padding: 3px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #CBD5E1;
    font: inherit;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
    text-decoration: none;
  }

  .club-channel-action:hover:not(:disabled) {
    color: #F8FAFC;
  }

  .club-channel-action-primary {
    padding: 9px 14px;
    border: 1px solid rgba(42,134,148,0.66);
    border-radius: 8px;
    background: #247C88;
    color: #F8FAFC;
  }

  .club-channel-action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .club-channel-editor {
    display: grid;
    gap: 10px;
  }

  .club-channel-editor label,
  .club-content-field label {
    color: #F8FAFC;
    font-size: 13px;
    font-weight: 800;
  }

  .club-channel-editor input,
  .club-content-field input,
  .club-content-field textarea,
  .club-content-field select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    background: #050505;
    color: #F8FAFC;
    padding: 11px 12px;
    font: inherit;
    outline: none;
  }

  .club-channel-editor input:focus,
  .club-content-field input:focus,
  .club-content-field textarea:focus,
  .club-content-field select:focus {
    border-color: rgba(42,134,148,0.75);
  }

  .club-content-field {
    display: grid;
    gap: 8px;
  }

  .club-content-fields {
    display: grid;
    gap: 14px;
  }

  .club-content-field textarea {
    min-height: 110px;
    resize: vertical;
  }

  .club-content-save-row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  .club-content-feedback {
    color: #CBD5E1;
    font-size: 13px;
  }

  @media (max-width: 720px) {
    .club-content-section {
      padding: 17px;
      border-radius: 14px;
    }

    .club-content-grid {
      grid-template-columns: 1fr;
    }

    .club-channel-card {
      min-height: 0;
      padding: 17px;
      border-radius: 12px;
    }
  }
`;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string): boolean {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function initialChannels(profile: ClubContentProfile | null): Record<ChannelField, string> {
  return {
    youtube_url: clean(profile?.youtube_url),
    spotify_url: clean(profile?.spotify_url),
    soundcloud_url: clean(profile?.soundcloud_url),
    mixcloud_url: clean(profile?.mixcloud_url),
    beatport_url: clean(profile?.beatport_url),
    apple_music_url: clean(profile?.apple_music_url),
    deezer_url: clean(profile?.deezer_url),
  };
}

export default function ClubContentManager({
  initialProfile,
}: {
  initialProfile: ClubContentProfile | null;
}) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [channels, setChannels] = useState<Record<ChannelField, string>>(
    initialChannels(initialProfile)
  );
  const [drafts, setDrafts] = useState<Record<ChannelField, string>>(
    initialChannels(initialProfile)
  );
  const [editingField, setEditingField] = useState<ChannelField | null>(null);
  const [primaryPlatform, setPrimaryPlatform] = useState(
    clean(initialProfile?.primary_streaming_platform)
  );
  const [playlistTitle, setPlaylistTitle] = useState(clean(initialProfile?.playlist_title));
  const [playlistDescription, setPlaylistDescription] = useState(
    clean(initialProfile?.playlist_description)
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const availablePrimaryChannels = CHANNELS.filter((channel) =>
    clean(channels[channel.field])
  );

  async function persist(payload: Record<string, string | null>) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Faça login novamente para salvar.");
    }

    const { data: updated, error: updateError } = await supabase
      .from("club_profiles")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updated) {
      const { error: insertError } = await supabase.from("club_profiles").insert({
        user_id: user.id,
        ...payload,
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  async function saveChannel(channel: ChannelDefinition) {
    if (saving) return;

    const nextValue = clean(drafts[channel.field]);

    if (nextValue && !isHttpUrl(nextValue)) {
      setFeedback("Cole um link válido começando com http:// ou https://.");
      return;
    }

    setSaving(true);
    setFeedback("");

    try {
      const payload: Record<string, string | null> = {
        [channel.field]: nextValue || null,
      };

      if (!nextValue && primaryPlatform === channel.platform) {
        payload.primary_streaming_platform = null;
      }

      await persist(payload);

      setChannels((current) => ({ ...current, [channel.field]: nextValue }));
      if (!nextValue && primaryPlatform === channel.platform) {
        setPrimaryPlatform("");
      }
      setEditingField(null);
      setFeedback(nextValue ? `${channel.label} salvo.` : `${channel.label} removido.`);
    } catch (error) {
      setFeedback(
        error instanceof Error ? `Não foi possível salvar. ${error.message}` : "Não foi possível salvar."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveHighlights() {
    if (saving) return;

    setSaving(true);
    setFeedback("");

    try {
      await persist({
        primary_streaming_platform: primaryPlatform || null,
        playlist_title: clean(playlistTitle) || null,
        playlist_description: clean(playlistDescription) || null,
      });

      setFeedback("Destaques de conteúdo salvos.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? `Não foi possível salvar. ${error.message}` : "Não foi possível salvar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="club-content-manager">
      <style>{css}</style>

      <section className="club-content-section">
        <div className="club-content-section-head">
          <h2>Meus canais</h2>
          <p>
            Você pode ter mais de um canal. YouTube, Spotify e outras plataformas não
            precisam competir por um único espaço.
          </p>
        </div>

        <div className="club-content-grid">
          {CHANNELS.map((channel) => {
            const value = clean(channels[channel.field]);
            const editing = editingField === channel.field;
            const isPrimary = primaryPlatform === channel.platform && Boolean(value);

            return (
              <article className="club-channel-card" key={channel.field}>
                {editing ? (
                  <div className="club-channel-editor">
                    <label htmlFor={`channel-${channel.field}`}>{channel.label}</label>
                    <input
                      id={`channel-${channel.field}`}
                      value={drafts[channel.field]}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [channel.field]: event.target.value,
                        }))
                      }
                      placeholder={channel.placeholder}
                      autoComplete="off"
                    />

                    <div className="club-channel-actions">
                      <button
                        type="button"
                        className="club-channel-action club-channel-action-primary"
                        onClick={() => void saveChannel(channel)}
                        disabled={saving}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="club-channel-action"
                        onClick={() => {
                          setDrafts((current) => ({
                            ...current,
                            [channel.field]: value,
                          }));
                          setEditingField(null);
                        }}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="club-channel-copy">
                      <h3>{channel.label}</h3>
                      <p className="club-channel-value">
                        {value || "Ainda não adicionado"}
                      </p>
                      {value ? (
                        <p className="club-channel-status" data-primary={isPrimary ? "true" : "false"}>
                          {isPrimary ? "Canal em destaque" : "Adicionado ao perfil"}
                        </p>
                      ) : null}
                    </div>

                    <div className="club-channel-actions">
                      <button
                        type="button"
                        className={`club-channel-action${value ? "" : " club-channel-action-primary"}`}
                        onClick={() => {
                          setDrafts((current) => ({
                            ...current,
                            [channel.field]: value,
                          }));
                          setEditingField(channel.field);
                        }}
                      >
                        {value ? "Editar" : "Adicionar"}
                      </button>

                      {value ? (
                        <>
                          <a
                            className="club-channel-action"
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir
                          </a>
                          <button
                            type="button"
                            className="club-channel-action"
                            disabled={saving}
                            onClick={() => {
                              setDrafts((current) => ({
                                ...current,
                                [channel.field]: "",
                              }));
                              setEditingField(channel.field);
                            }}
                          >
                            Remover
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="club-content-section">
        <div className="club-content-section-head">
          <h2>Destaque do perfil</h2>
          <p>
            Escolha um canal principal e, se quiser, dê um nome e uma descrição para a
            seleção que mais representa você.
          </p>
        </div>

        <div className="club-content-fields">
          <div className="club-content-field">
            <label htmlFor="primary-channel">Canal principal</label>
            <select
              id="primary-channel"
              value={primaryPlatform}
              onChange={(event) => setPrimaryPlatform(event.target.value)}
            >
              <option value="">Nenhum canal em destaque</option>
              {availablePrimaryChannels.map((channel) => (
                <option key={channel.platform} value={channel.platform}>
                  {channel.label}
                </option>
              ))}
            </select>
          </div>

          <div className="club-content-field">
            <label htmlFor="playlist-title">Título da seleção</label>
            <input
              id="playlist-title"
              value={playlistTitle}
              onChange={(event) => setPlaylistTitle(event.target.value)}
              placeholder="Ex: Minha seleção principal"
            />
          </div>

          <div className="club-content-field">
            <label htmlFor="playlist-description">Descrição</label>
            <textarea
              id="playlist-description"
              value={playlistDescription}
              onChange={(event) => setPlaylistDescription(event.target.value)}
              placeholder="Conte o que essa seleção representa para você"
            />
          </div>
        </div>

        <div className="club-content-save-row">
          <button
            type="button"
            className="club-channel-action club-channel-action-primary"
            onClick={() => void saveHighlights()}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar destaque"}
          </button>

          {feedback ? (
            <span className="club-content-feedback" role="status" aria-live="polite">
              {feedback}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
