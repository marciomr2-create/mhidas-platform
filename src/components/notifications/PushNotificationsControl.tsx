"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type PushSettings = {
  pushEnabled: boolean;
  activeSubscriptionCount: number;
  currentEndpointActive: boolean;
};

type PushConfigurationResponse = {
  ok: true;
  configured: boolean;
  vapidPublicKey: string | null;
  settings: PushSettings;
  dispatchEnabled: boolean;
};

type PushMutationResponse = {
  ok: true;
  action: "status" | "register" | "revoke";
  settings: PushSettings;
  dispatchEnabled: boolean;
};

type ControlState =
  | "loading"
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "inactive"
  | "active"
  | "working"
  | "error";

type BrowserCapabilities = {
  supported: boolean;
  secureContext: boolean;
};

const SERVICE_WORKER_URL = "/mhidas-push-sw.js";
const SERVICE_WORKER_SCOPE = "/";

function getBrowserCapabilities(): BrowserCapabilities {
  if (typeof window === "undefined") {
    return {
      supported: false,
      secureContext: false,
    };
  }

  const secureContext = window.isSecureContext;
  const supported =
    secureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  return {
    supported,
    secureContext,
  };
}

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return buffer;
}

function uint8ArrayToBase64Url(value: Uint8Array): string {
  let binary = "";

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function subscriptionUsesPublicKey(
  subscription: PushSubscription,
  publicKey: string
): boolean {
  const applicationServerKey =
    subscription.options.applicationServerKey;

  if (!applicationServerKey) {
    return false;
  }

  return (
    uint8ArrayToBase64Url(
      new Uint8Array(applicationServerKey)
    ) === publicKey
  );
}

function isValidPushSettings(value: unknown): value is PushSettings {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const record = value as Partial<PushSettings>;

  return (
    typeof record.pushEnabled === "boolean" &&
    typeof record.activeSubscriptionCount === "number" &&
    Number.isSafeInteger(record.activeSubscriptionCount) &&
    record.activeSubscriptionCount >= 0 &&
    typeof record.currentEndpointActive === "boolean"
  );
}

function isValidConfigurationResponse(
  value: unknown
): value is PushConfigurationResponse {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const record = value as Partial<PushConfigurationResponse>;

  return (
    record.ok === true &&
    typeof record.configured === "boolean" &&
    (record.vapidPublicKey === null ||
      typeof record.vapidPublicKey === "string") &&
    typeof record.dispatchEnabled === "boolean" &&
    isValidPushSettings(record.settings)
  );
}

function isValidMutationResponse(
  value: unknown
): value is PushMutationResponse {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const record = value as Partial<PushMutationResponse>;

  return (
    record.ok === true &&
    ["status", "register", "revoke"].includes(
      String(record.action ?? "")
    ) &&
    typeof record.dispatchEnabled === "boolean" &&
    isValidPushSettings(record.settings)
  );
}

async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(
    SERVICE_WORKER_URL,
    {
      scope: SERVICE_WORKER_SCOPE,
      updateViaCache: "none",
    }
  );

  await registration.update().catch(() => undefined);

  return registration;
}

async function readJsonResponse(
  response: Response
): Promise<unknown> {
  return response.json().catch(() => null);
}

export default function PushNotificationsControl() {
  const [controlState, setControlState] = useState<ControlState>("loading");
  const [message, setMessage] = useState(
    "Verificando este dispositivo..."
  );
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [dispatchEnabled, setDispatchEnabled] = useState(false);
  const [activeSubscriptionCount, setActiveSubscriptionCount] = useState(0);

  const mountedRef = useRef(true);
  const actionInFlightRef = useRef(false);

  const applyInactiveState = useCallback(
    (count: number, dispatchIsEnabled: boolean) => {
      setActiveSubscriptionCount(count);
      setDispatchEnabled(dispatchIsEnabled);
      setControlState("inactive");
      setMessage(
        "Ative para preparar este dispositivo para notificações, mesmo com o aplicativo fechado."
      );
    },
    []
  );

  const loadState = useCallback(async (): Promise<void> => {
    const capabilities = getBrowserCapabilities();

    if (!capabilities.secureContext) {
      setControlState("unsupported");
      setMessage(
        "As notificações exigem uma conexão segura HTTPS."
      );
      return;
    }

    if (!capabilities.supported) {
      setControlState("unsupported");
      setMessage(
        "Este navegador não oferece suporte a notificações push."
      );
      return;
    }

    try {
      setControlState("loading");
      setMessage("Verificando este dispositivo...");

      const configurationResponse = await fetch(
        "/api/notifications/push",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const configurationPayload = await readJsonResponse(
        configurationResponse
      );

      if (
        !configurationResponse.ok ||
        !isValidConfigurationResponse(configurationPayload)
      ) {
        throw new Error(
          "Não foi possível verificar as notificações deste dispositivo."
        );
      }

      if (
        !configurationPayload.configured ||
        !configurationPayload.vapidPublicKey
      ) {
        setVapidPublicKey(null);
        setDispatchEnabled(false);
        setActiveSubscriptionCount(
          configurationPayload.settings.activeSubscriptionCount
        );
        setControlState("unconfigured");
        setMessage(
          "A chave pública de notificações ainda não foi configurada neste ambiente."
        );
        return;
      }

      const configuredPublicKey = configurationPayload.vapidPublicKey;

      setVapidPublicKey(configuredPublicKey);
      setDispatchEnabled(configurationPayload.dispatchEnabled);
      setActiveSubscriptionCount(
        configurationPayload.settings.activeSubscriptionCount
      );

      if (Notification.permission === "denied") {
        setControlState("denied");
        setMessage(
          "As notificações foram bloqueadas nas permissões do navegador."
        );
        return;
      }

      const registration = await registerPushServiceWorker();
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        applyInactiveState(
          configurationPayload.settings.activeSubscriptionCount,
          configurationPayload.dispatchEnabled
        );
        return;
      }

      if (
        !subscriptionUsesPublicKey(
          subscription,
          configuredPublicKey
        )
      ) {
        applyInactiveState(
          configurationPayload.settings.activeSubscriptionCount,
          configurationPayload.dispatchEnabled
        );
        setMessage(
          "A assinatura deste dispositivo precisa ser renovada para a chave atual."
        );
        return;
      }

      const statusResponse = await fetch(
        "/api/notifications/push",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            action: "status",
            endpoint: subscription.endpoint,
          }),
        }
      );

      const statusPayload = await readJsonResponse(
        statusResponse
      );

      if (
        !statusResponse.ok ||
        !isValidMutationResponse(statusPayload) ||
        statusPayload.action !== "status"
      ) {
        throw new Error(
          "Não foi possível confirmar a assinatura deste dispositivo."
        );
      }

      setDispatchEnabled(statusPayload.dispatchEnabled);
      setActiveSubscriptionCount(
        statusPayload.settings.activeSubscriptionCount
      );

      if (
        statusPayload.settings.pushEnabled &&
        statusPayload.settings.currentEndpointActive
      ) {
        setControlState("active");
        setMessage(
          statusPayload.dispatchEnabled
            ? "Notificações ativadas neste dispositivo."
            : "Dispositivo preparado. O envio será liberado na próxima etapa técnica."
        );
        return;
      }

      applyInactiveState(
        statusPayload.settings.activeSubscriptionCount,
        statusPayload.dispatchEnabled
      );
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setControlState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível verificar as notificações deste dispositivo."
      );
    }
  }, [applyInactiveState]);

  useEffect(() => {
    mountedRef.current = true;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "MHIDAS_PUSH_SUBSCRIPTION_CHANGED"
      ) {
        void loadState();
      }
    };

    navigator.serviceWorker?.addEventListener(
      "message",
      handleServiceWorkerMessage
    );

    void loadState();

    return () => {
      mountedRef.current = false;
      navigator.serviceWorker?.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, [loadState]);

  async function activatePush(): Promise<void> {
    if (
      actionInFlightRef.current ||
      controlState === "working" ||
      !vapidPublicKey
    ) {
      return;
    }

    actionInFlightRef.current = true;
    setControlState("working");
    setMessage("Ativando notificações neste dispositivo...");

    let createdSubscription: PushSubscription | null = null;

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setControlState(
          permission === "denied"
            ? "denied"
            : "inactive"
        );
        setMessage(
          permission === "denied"
            ? "As notificações foram bloqueadas nas permissões do navegador."
            : "A permissão não foi concedida. Nenhuma alteração foi feita."
        );
        return;
      }

      const registration = await registerPushServiceWorker();
      let subscription = await registration.pushManager.getSubscription();

      if (
        subscription &&
        !subscriptionUsesPublicKey(
          subscription,
          vapidPublicKey
        )
      ) {
        const oldEndpoint = subscription.endpoint;
        const revokeOldResponse = await fetch(
          "/api/notifications/push",
          {
            method: "DELETE",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              endpoint: oldEndpoint,
            }),
          }
        );

        const revokeOldPayload = await readJsonResponse(
          revokeOldResponse
        );

        if (
          !revokeOldResponse.ok ||
          !isValidMutationResponse(revokeOldPayload) ||
          revokeOldPayload.action !== "revoke"
        ) {
          throw new Error(
            "Não foi possível renovar a assinatura deste dispositivo."
          );
        }

        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToArrayBuffer(
            vapidPublicKey
          ),
        });
        createdSubscription = subscription;
      }

      const subscriptionJson = subscription.toJSON();

      const registerResponse = await fetch(
        "/api/notifications/push",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            action: "register",
            subscription: subscriptionJson,
            userAgent: navigator.userAgent,
          }),
        }
      );

      const registerPayload = await readJsonResponse(
        registerResponse
      );

      if (
        !registerResponse.ok ||
        !isValidMutationResponse(registerPayload) ||
        registerPayload.action !== "register"
      ) {
        throw new Error(
          "Não foi possível registrar este dispositivo."
        );
      }

      setActiveSubscriptionCount(
        registerPayload.settings.activeSubscriptionCount
      );
      setDispatchEnabled(registerPayload.dispatchEnabled);
      setControlState("active");
      setMessage(
        registerPayload.dispatchEnabled
          ? "Notificações ativadas neste dispositivo."
          : "Dispositivo preparado. O envio será liberado na próxima etapa técnica."
      );
    } catch (error) {
      if (createdSubscription) {
        await createdSubscription
          .unsubscribe()
          .catch(() => false);
      }

      setControlState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível ativar as notificações neste dispositivo."
      );
    } finally {
      actionInFlightRef.current = false;
    }
  }

  async function deactivatePush(): Promise<void> {
    if (
      actionInFlightRef.current ||
      controlState === "working"
    ) {
      return;
    }

    actionInFlightRef.current = true;
    setControlState("working");
    setMessage("Desativando notificações neste dispositivo...");

    try {
      const registration = await navigator.serviceWorker.getRegistration(
        SERVICE_WORKER_SCOPE
      );
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        applyInactiveState(
          activeSubscriptionCount,
          dispatchEnabled
        );
        return;
      }

      const revokeResponse = await fetch(
        "/api/notifications/push",
        {
          method: "DELETE",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        }
      );

      const revokePayload = await readJsonResponse(
        revokeResponse
      );

      if (
        !revokeResponse.ok ||
        !isValidMutationResponse(revokePayload) ||
        revokePayload.action !== "revoke"
      ) {
        throw new Error(
          "Não foi possível desativar este dispositivo."
        );
      }

      await subscription.unsubscribe();

      applyInactiveState(
        revokePayload.settings.activeSubscriptionCount,
        revokePayload.dispatchEnabled
      );
      setMessage("Notificações desativadas neste dispositivo.");
    } catch (error) {
      setControlState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível desativar as notificações neste dispositivo."
      );
    } finally {
      actionInFlightRef.current = false;
    }
  }

  const canActivate = controlState === "inactive";
  const canDeactivate = controlState === "active";

  return (
    <div
      className="mhidas-push-control"
      data-state={controlState}
      aria-live="polite"
    >
      <style>{`
        .mhidas-push-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 14px;
          padding: 13px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 16px;
          background: var(--mhidas-card-secondary);
          box-sizing: border-box;
        }

        .mhidas-push-control[data-state="active"] {
          border-color: rgba(42, 134, 148, 0.48);
          background: rgba(42, 134, 148, 0.08);
        }

        .mhidas-push-control[data-state="denied"],
        .mhidas-push-control[data-state="error"] {
          border-color: rgba(248, 113, 113, 0.34);
        }

        .mhidas-push-copy {
          flex: 1 1 250px;
          min-width: 0;
        }

        .mhidas-push-title {
          margin: 0;
          color: #F8FAFC;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 900;
        }

        .mhidas-push-message {
          margin: 4px 0 0;
          color: #CBD5E1;
          font-size: 12px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .mhidas-push-device-count {
          color: #94A3B8;
        }

        .mhidas-push-button {
          flex: 0 0 auto;
          min-height: 38px;
          padding: 9px 12px;
          border: 1px solid rgba(42, 134, 148, 0.42);
          border-radius: 12px;
          background: var(--mhidas-clubber-action-strong);
          color: #FFFFFF;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .mhidas-push-button[data-action="deactivate"] {
          border-color: rgba(148, 163, 184, 0.28);
          background: var(--mhidas-card-secondary);
        }

        .mhidas-push-button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        @media (max-width: 640px) {
          .mhidas-push-control {
            align-items: stretch;
            flex-direction: column;
          }

          .mhidas-push-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="mhidas-push-copy">
        <p className="mhidas-push-title">
          Notificações no celular
        </p>
        <p className="mhidas-push-message">
          {message}
          {activeSubscriptionCount > 1 ? (
            <span className="mhidas-push-device-count">
              {` ${activeSubscriptionCount} dispositivos ativos na conta.`}
            </span>
          ) : null}
        </p>
      </div>

      {canActivate ? (
        <button
          type="button"
          className="mhidas-push-button"
          disabled={!vapidPublicKey}
          onClick={() => void activatePush()}
        >
          Ativar neste dispositivo
        </button>
      ) : null}

      {canDeactivate ? (
        <button
          type="button"
          className="mhidas-push-button"
          data-action="deactivate"
          onClick={() => void deactivatePush()}
        >
          Desativar neste dispositivo
        </button>
      ) : null}

      {controlState === "working" ? (
        <button
          type="button"
          className="mhidas-push-button"
          disabled
        >
          Processando...
        </button>
      ) : null}

      {controlState === "error" ? (
        <button
          type="button"
          className="mhidas-push-button"
          onClick={() => void loadState()}
        >
          Verificar novamente
        </button>
      ) : null}
    </div>
  );
}
