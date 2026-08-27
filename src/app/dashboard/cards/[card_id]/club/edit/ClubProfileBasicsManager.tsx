"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { createBrowserClient } from "@/utils/supabase/client";

type Props = {
  cardId: string;
  initialLabel: string;
  initialPhotoUrl: string;
};

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const CLUB_BUCKET = "club-photos";
const CROP_WIDTH = 1600;
const CROP_HEIGHT = 900;
const TARGET_ASPECT = CROP_WIDTH / CROP_HEIGHT;

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "")
    .toLowerCase();
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      image.src = objectUrl;
    });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

async function cropPhoto(file: File, cropArea: CropArea): Promise<File> {
  const image = await loadImageFromFile(file);

  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Não foi possível identificar o tamanho da imagem.");
  }

  const sourceX = Math.max(
    0,
    Math.min(Math.round(cropArea.x), Math.max(sourceWidth - 1, 0))
  );
  const sourceY = Math.max(
    0,
    Math.min(Math.round(cropArea.y), Math.max(sourceHeight - 1, 0))
  );
  const sourceCropWidth = Math.max(
    1,
    Math.min(Math.round(cropArea.width), sourceWidth - sourceX)
  );
  const sourceCropHeight = Math.max(
    1,
    Math.min(Math.round(cropArea.height), sourceHeight - sourceY)
  );

  const canvas = document.createElement("canvas");
  canvas.width = CROP_WIDTH;
  canvas.height = CROP_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível preparar o enquadramento.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceCropWidth,
    sourceCropHeight,
    0,
    0,
    CROP_WIDTH,
    CROP_HEIGHT
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Não foi possível gerar a foto ajustada."));
      },
      "image/jpeg",
      0.92
    );
  });

  return new File([blob], "clubber-profile-adjusted.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function rangeStyle() {
  return {
    width: "100%",
    accentColor: "#2A8694",
    cursor: "pointer",
  } as const;
}

export default function ClubProfileBasicsManager({
  cardId,
  initialLabel,
  initialPhotoUrl,
}: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [label, setLabel] = useState(initialLabel);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState("");
  const [photoTouched, setPhotoTouched] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const photoPreview = localPhotoPreview || photoUrl;

  const onCropComplete = useCallback(
    (_croppedArea: CropArea, nextCroppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(nextCroppedAreaPixels);
    },
    []
  );

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione uma imagem válida.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 5 MB.");
      return;
    }

    try {
      const preview = await fileToDataUrl(file);
      setSelectedPhotoFile(file);
      setLocalPhotoPreview(preview);
      setPhotoTouched(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setMessage(
        "Nova foto selecionada. Arraste para enquadrar e salve para concluir."
      );
    } catch {
      setMessage("Não foi possível preparar a imagem.");
    }
  }

  function removePhoto() {
    setSelectedPhotoFile(null);
    setLocalPhotoPreview("");
    setPhotoUrl("");
    setPhotoTouched(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setMessage("Foto removida. Salve para concluir.");
  }

  function resetCrop() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function uploadPhoto(userId: string) {
    if (!photoTouched) return normalizeText(photoUrl);
    if (!selectedPhotoFile) return "";

    if (!croppedAreaPixels) {
      throw new Error("Aguarde o enquadramento da foto carregar e tente novamente.");
    }

    const adjustedPhoto = await cropPhoto(selectedPhotoFile, croppedAreaPixels);

    const sanitized = sanitizeFileName(
      adjustedPhoto.name || "clubber-profile-adjusted.jpg"
    );
    const extension = sanitized.includes(".")
      ? sanitized.split(".").pop()
      : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from(CLUB_BUCKET)
      .upload(path, adjustedPhoto, {
        cacheControl: "3600",
        upsert: false,
        contentType: adjustedPhoto.type,
      });

    if (error) {
      throw new Error(`Não foi possível enviar a foto. ${error.message}`);
    }

    const { data } = supabase.storage.from(CLUB_BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  async function save() {
    const nextLabel = normalizeText(label);

    if (!nextLabel) {
      setMessage("Informe o nome do perfil.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const finalPhotoUrl = await uploadPhoto(user.id);

      const { data: updatedCard, error: cardError } = await supabase
        .from("cards")
        .update({ label: nextLabel })
        .eq("card_id", cardId)
        .eq("user_id", user.id)
        .select("card_id")
        .single();

      if (cardError || !updatedCard) {
        throw new Error(
          cardError?.message || "Não foi possível atualizar o nome do perfil."
        );
      }

      const profilePayload = {
        club_photo_url: finalPhotoUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfiles, error: updateError } = await supabase
        .from("club_profiles")
        .update(profilePayload)
        .eq("user_id", user.id)
        .select("user_id");

      if (updateError) throw updateError;

      if (!Array.isArray(updatedProfiles) || updatedProfiles.length === 0) {
        const { error: insertError } = await supabase
          .from("club_profiles")
          .insert({
            user_id: user.id,
            ...profilePayload,
          });

        if (insertError) throw insertError;
      }

      setLabel(nextLabel);
      setPhotoUrl(finalPhotoUrl);
      setSelectedPhotoFile(null);
      setLocalPhotoPreview("");
      setPhotoTouched(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setMessage("Foto e nome salvos com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar agora."
      );
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled =
    saving || Boolean(selectedPhotoFile && !croppedAreaPixels);

  return (
    <div className="edit-basics-manager">
      {message ? (
        <div className="edit-message" role="status">
          {message}
        </div>
      ) : null}

      <div className="edit-basics-grid">
        <div className="edit-photo-block">
          <p className="edit-field-label">Foto do perfil</p>

          {selectedPhotoFile && localPhotoPreview ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                overflow: "hidden",
                borderRadius: 18,
                background: "#0B1117",
                touchAction: "none",
              }}
            >
              <Cropper
                image={localPhotoPreview}
                crop={crop}
                zoom={zoom}
                aspect={TARGET_ASPECT}
                minZoom={1}
                maxZoom={3}
                cropShape="rect"
                showGrid={false}
                objectFit="cover"
                zoomWithScroll
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          ) : (
            <div className="edit-photo-preview">
              {photoPreview ? (
                <img src={photoPreview} alt="Foto do Perfil Clubber" />
              ) : (
                <span>Nenhuma foto selecionada</span>
              )}
            </div>
          )}

          {selectedPhotoFile ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                padding: "14px 0 2px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <strong style={{ fontSize: 13 }}>Ajustar enquadramento</strong>

                <button
                  type="button"
                  onClick={resetCrop}
                  disabled={saving}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#2A8694",
                    fontWeight: 850,
                    cursor: saving ? "not-allowed" : "pointer",
                    padding: 0,
                  }}
                >
                  Centralizar
                </button>
              </div>

              <p className="edit-helper" style={{ margin: 0 }}>
                Arraste a foto com o dedo ou mouse. No celular, use pinça para
                aproximar. No computador, use a roda do mouse ou o controle de
                zoom abaixo.
              </p>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#CBD5E1", fontSize: 12 }}>Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  disabled={saving}
                  aria-label="Zoom da foto"
                  style={rangeStyle()}
                />
              </label>
            </div>
          ) : photoPreview ? (
            <p className="edit-helper">
              Para mudar o enquadramento da foto atual, escolha a imagem novamente.
            </p>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelected}
            style={{ display: "none" }}
          />

          <div className="edit-photo-actions">
            <button
              type="button"
              className="edit-secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              Escolher foto
            </button>

            {photoPreview ? (
              <button
                type="button"
                className="edit-secondary-button"
                onClick={removePhoto}
                disabled={saving}
              >
                Remover foto
              </button>
            ) : null}
          </div>

          <p className="edit-helper">
            Imagem de até 5 MB. O enquadramento final será salvo em 16:9.
          </p>
        </div>

        <div className="edit-name-block">
          <label className="edit-field">
            <span className="edit-field-label">Nome do perfil</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
              placeholder="Como você quer aparecer"
            />
          </label>

          <p className="edit-helper">
            Esse é o nome que aparece no seu Perfil Clubber.
          </p>

          <button
            type="button"
            className="edit-primary-button"
            onClick={save}
            disabled={saveDisabled}
          >
            {saving ? "Salvando..." : "Salvar foto e nome"}
          </button>
        </div>
      </div>
    </div>
  );
}
