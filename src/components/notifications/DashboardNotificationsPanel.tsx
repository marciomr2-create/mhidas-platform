"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PushNotificationsControl from "./PushNotificationsControl";

type NotificationItem = {
  id: string;
  sourceType: string;
  sourceId: string;
  notificationType: string;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  internalUrl: string | null;
  destinationAvailable: boolean;
  readAt: string | null;
  isRead: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type NotificationListResponse = {
  ok: true;
  notifications: NotificationItem[];
  page: {
    limit: number;
    unreadOnly: boolean;
    hasMore: boolean;
    nextCursor: string | null;
  };
  unreadCount: number;
};

type MarkReadResponse = {
  ok: true;
  action: "mark_read";
  notificationId: string;
  unreadCount: number;
};

type MarkAllReadResponse = {
  ok: true;
  action: "mark_all_read";
  markedCount: number;
  unreadCount: number;
};

type LoadOptions = {
  preserveError?: boolean;
};

const PAGE_SIZE = 10;

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeUnreadCount(value: unknown): number {
  const count = Number(value ?? 0);

  if (!Number.isSafeInteger(count) || count < 0) {
    return 0;
  }

  return count;
}

function isSafeInternalUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length < 2 || value.length > 500) {
    return false;
  }

  if (
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }

  if (!/^\/[A-Za-z0-9/_?&=.%#:@+~-]*$/.test(value)) {
    return false;
  }

  try {
    const parsed = new URL(value, "https://mhidas.invalid");

    return (
      parsed.origin === "https://mhidas.invalid" &&
      parsed.pathname.startsWith("/")
    );
  } catch {
    return false;
  }
}

function getSafeDestination(notification: NotificationItem): string | null {
  if (
    !notification.destinationAvailable ||
    !isSafeInternalUrl(notification.internalUrl)
  ) {
    return null;
  }

  return notification.internalUrl;
}

export default function DashboardNotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSequenceRef = useRef(0);
  const loadInFlightRef = useRef(false);
  const loadAbortControllerRef = useRef<AbortController | null>(null);
  const mutationInFlightRef = useRef(false);

  const badgeLabel = useMemo(() => {
    if (unreadCount <= 0) {
      return "Nenhuma notificação não lida";
    }

    return `${unreadCount} notificação${unreadCount === 1 ? "" : "ões"} não lida${unreadCount === 1 ? "" : "s"}`;
  }, [unreadCount]);

  const cancelActiveLoad = useCallback(() => {
    loadSequenceRef.current += 1;
    loadAbortControllerRef.current?.abort();
    loadAbortControllerRef.current = null;
    loadInFlightRef.current = false;
    setLoading(false);
    setLoadingMore(false);
  }, []);

  const loadNotifications = useCallback(
    async (
      cursor: string | null = null,
      options: LoadOptions = {}
    ): Promise<void> => {
      const isInitialLoad = cursor === null;

      if (loadInFlightRef.current && !isInitialLoad) {
        return;
      }

      if (isInitialLoad) {
        loadAbortControllerRef.current?.abort();
      }

      const requestSequence = loadSequenceRef.current + 1;
      loadSequenceRef.current = requestSequence;

      const abortController = new AbortController();
      loadAbortControllerRef.current = abortController;
      loadInFlightRef.current = true;

      if (isInitialLoad) {
        setLoading(true);
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }

      if (!options.preserveError) {
        setErrorMessage(null);
      }

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          unreadOnly: String(unreadOnly),
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await fetch(`/api/notifications?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Não foi possível carregar suas notificações.");
        }

        const payload = (await response.json()) as NotificationListResponse;

        if (
          !payload.ok ||
          !Array.isArray(payload.notifications) ||
          !payload.page ||
          payload.page.unreadOnly !== unreadOnly
        ) {
          throw new Error("Resposta inválida da central de notificações.");
        }

        if (
          abortController.signal.aborted ||
          requestSequence !== loadSequenceRef.current
        ) {
          return;
        }

        setUnreadCount(normalizeUnreadCount(payload.unreadCount));
        setNextCursor(payload.page.nextCursor);
        setHasMore(payload.page.hasMore);

        setNotifications((current) => {
          if (isInitialLoad) {
            return payload.notifications;
          }

          const knownIds = new Set(current.map((item) => item.id));
          const additionalItems = payload.notifications.filter(
            (item) => !knownIds.has(item.id)
          );

          return [...current, ...additionalItems];
        });
      } catch (error) {
        if (
          abortController.signal.aborted ||
          requestSequence !== loadSequenceRef.current
        ) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar suas notificações."
        );
      } finally {
        if (requestSequence === loadSequenceRef.current) {
          loadInFlightRef.current = false;
          loadAbortControllerRef.current = null;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [unreadOnly]
  );

  useEffect(() => {
    void loadNotifications();

    return () => {
      loadSequenceRef.current += 1;
      loadAbortControllerRef.current?.abort();
      loadAbortControllerRef.current = null;
      loadInFlightRef.current = false;
    };
  }, [loadNotifications]);

  const reconcileAfterMutationFailure = useCallback(
    async (message: string): Promise<void> => {
      await loadNotifications(null, {
        preserveError: true,
      });
      setErrorMessage(message);
    },
    [loadNotifications]
  );

  function changeUnreadFilter() {
    if (
      loading ||
      loadingMore ||
      markingAll ||
      activeNotificationId !== null ||
      mutationInFlightRef.current
    ) {
      return;
    }

    setUnreadOnly((current) => !current);
  }

  async function markNotificationRead(
    notification: NotificationItem,
    navigateAfter: boolean
  ) {
    if (mutationInFlightRef.current || activeNotificationId || markingAll) {
      return;
    }

    const safeDestination = getSafeDestination(notification);

    if (notification.isRead) {
      if (navigateAfter && safeDestination) {
        window.location.assign(safeDestination);
      }

      return;
    }

    mutationInFlightRef.current = true;
    cancelActiveLoad();
    setActiveNotificationId(notification.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "mark_read",
          notificationId: notification.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível marcar a notificação como lida.");
      }

      const payload = (await response.json()) as MarkReadResponse;

      if (
        !payload.ok ||
        payload.action !== "mark_read" ||
        payload.notificationId !== notification.id
      ) {
        throw new Error("Resposta inválida ao atualizar a notificação.");
      }

      const readAt = new Date().toISOString();

      if (unreadOnly) {
        setUnreadCount(normalizeUnreadCount(payload.unreadCount));

        if (navigateAfter && safeDestination) {
          window.location.assign(safeDestination);
          return;
        }

        await loadNotifications();
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
                readAt,
              }
            : item
        )
      );

      setUnreadCount(normalizeUnreadCount(payload.unreadCount));

      if (navigateAfter && safeDestination) {
        window.location.assign(safeDestination);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a notificação.";

      await reconcileAfterMutationFailure(message);
    } finally {
      mutationInFlightRef.current = false;
      setActiveNotificationId(null);
    }
  }

  async function markAllRead() {
    if (
      mutationInFlightRef.current ||
      markingAll ||
      activeNotificationId ||
      unreadCount <= 0
    ) {
      return;
    }

    mutationInFlightRef.current = true;
    cancelActiveLoad();
    setMarkingAll(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "mark_all_read",
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível marcar todas como lidas.");
      }

      const payload = (await response.json()) as MarkAllReadResponse;

      if (!payload.ok || payload.action !== "mark_all_read") {
        throw new Error("Resposta inválida ao atualizar as notificações.");
      }

      const readAt = new Date().toISOString();

      setNotifications((current) => {
        if (unreadOnly) {
          return [];
        }

        return current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? readAt,
        }));
      });

      setUnreadCount(normalizeUnreadCount(payload.unreadCount));

      if (unreadOnly) {
        setNextCursor(null);
        setHasMore(false);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar as notificações.";

      await reconcileAfterMutationFailure(message);
    } finally {
      mutationInFlightRef.current = false;
      setMarkingAll(false);
    }
  }

  return (
    <section className="mhidas-notifications-panel" aria-labelledby="mhidas-notifications-title">
      <style>{`
        .mhidas-notifications-panel {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          margin-top: 12px;
          padding: 17px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 22px;
          background: linear-gradient(135deg, #0B1020, #111827);
          box-shadow: 0 16px 42px rgba(5, 7, 13, 0.27);
          color: #F8FAFC;
          box-sizing: border-box;
        }

        .mhidas-notifications-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .mhidas-notifications-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .mhidas-notifications-title {
          margin: 0;
          font-size: 22px;
          line-height: 1.15;
          letter-spacing: -0.03em;
          overflow-wrap: anywhere;
        }

        .mhidas-notifications-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 26px;
          min-height: 26px;
          padding: 3px 8px;
          border-radius: 999px;
          background: #0D9488;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          box-sizing: border-box;
        }

        .mhidas-notifications-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 13px;
        }

        .mhidas-notifications-action,
        .mhidas-notifications-filter,
        .mhidas-notifications-retry {
          min-height: 38px;
          padding: 9px 12px;
          border: 1px solid rgba(20, 184, 166, 0.34);
          border-radius: 12px;
          background: rgba(13, 148, 136, 0.12);
          color: #CCFBF1;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .mhidas-notifications-filter[aria-pressed="true"] {
          border-color: rgba(20, 184, 166, 0.68);
          background: #0D9488;
          color: #FFFFFF;
        }

        .mhidas-notifications-action:disabled,
        .mhidas-notifications-filter:disabled,
        .mhidas-notifications-retry:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .mhidas-notifications-list {
          display: grid;
          gap: 9px;
          margin-top: 14px;
        }

        .mhidas-notification-item {
          display: grid;
          gap: 8px;
          min-width: 0;
          padding: 13px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.72);
          box-sizing: border-box;
        }

        .mhidas-notification-item[data-unread="true"] {
          border-color: rgba(20, 184, 166, 0.42);
          background: rgba(13, 148, 136, 0.1);
        }

        .mhidas-notification-topline {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .mhidas-notification-title {
          margin: 0;
          color: #F8FAFC;
          font-size: 15px;
          line-height: 1.3;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .mhidas-notification-time {
          flex: 0 0 auto;
          color: #94A3B8;
          font-size: 11px;
          line-height: 1.4;
          white-space: nowrap;
        }

        .mhidas-notification-summary,
        .mhidas-notifications-state {
          margin: 0;
          color: #CBD5E1;
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .mhidas-notifications-state {
          padding: 14px 0 2px;
        }

        .mhidas-notifications-error-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }

        .mhidas-notifications-error {
          flex: 1 1 220px;
          margin: 0;
          color: #FCA5A5;
          font-size: 13px;
          line-height: 1.45;
        }

        .mhidas-notification-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mhidas-notification-button {
          min-height: 36px;
          padding: 8px 11px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 11px;
          background: #111827;
          color: #F8FAFC;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .mhidas-notification-button[data-primary="true"] {
          border-color: rgba(13, 148, 136, 0.52);
          background: #0D9488;
        }

        .mhidas-notification-button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .mhidas-notifications-footer {
          display: flex;
          justify-content: center;
          margin-top: 12px;
        }

        @media (max-width: 640px) {
          .mhidas-notifications-panel {
            padding: 15px;
            border-radius: 20px;
          }

          .mhidas-notifications-header,
          .mhidas-notification-topline {
            align-items: stretch;
            flex-direction: column;
          }

          .mhidas-notifications-toolbar,
          .mhidas-notifications-error-row {
            align-items: stretch;
            flex-direction: column;
          }

          .mhidas-notifications-action,
          .mhidas-notifications-filter,
          .mhidas-notifications-retry,
          .mhidas-notification-button {
            width: 100%;
          }

          .mhidas-notification-time {
            white-space: normal;
          }
        }
      `}</style>

      <div className="mhidas-notifications-header">
        <div>
          <div className="mhidas-notifications-heading">
            <h2 id="mhidas-notifications-title" className="mhidas-notifications-title">
              Notificações
            </h2>
            <span className="mhidas-notifications-badge" aria-label={badgeLabel}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
          <p className="mhidas-notification-summary" style={{ marginTop: 6 }}>
            Atualizações sobre conexões, eventos e atividades da sua comunidade.
          </p>
        </div>
      </div>

      <PushNotificationsControl />

      <div className="mhidas-notifications-toolbar">
        <button
          type="button"
          className="mhidas-notifications-filter"
          aria-pressed={unreadOnly}
          disabled={
            loading ||
            loadingMore ||
            markingAll ||
            activeNotificationId !== null
          }
          onClick={changeUnreadFilter}
        >
          {unreadOnly ? "Mostrar todas" : "Somente não lidas"}
        </button>

        {unreadCount > 0 ? (
          <button
            type="button"
            className="mhidas-notifications-action"
            disabled={
              loading ||
              loadingMore ||
              markingAll ||
              activeNotificationId !== null
            }
            onClick={() => void markAllRead()}
          >
            {markingAll ? "Atualizando..." : "Marcar todas como lidas"}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="mhidas-notifications-error-row">
          <p className="mhidas-notifications-error" role="alert">
            {errorMessage}
          </p>
          <button
            type="button"
            className="mhidas-notifications-retry"
            disabled={loading || loadingMore}
            onClick={() => void loadNotifications()}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="mhidas-notifications-state">Carregando notificações...</p>
      ) : notifications.length === 0 ? (
        <p className="mhidas-notifications-state">
          {unreadOnly
            ? "Nenhuma notificação não lida no momento."
            : "Nenhuma notificação disponível no momento."}
        </p>
      ) : (
        <div className="mhidas-notifications-list">
          {notifications.map((notification) => {
            const isUpdating = activeNotificationId === notification.id;
            const safeDestination = getSafeDestination(notification);

            return (
              <article
                key={notification.id}
                className="mhidas-notification-item"
                data-unread={notification.isRead ? "false" : "true"}
              >
                <div className="mhidas-notification-topline">
                  <h3 className="mhidas-notification-title">{notification.title}</h3>
                  <time
                    className="mhidas-notification-time"
                    dateTime={notification.createdAt}
                  >
                    {formatCreatedAt(notification.createdAt)}
                  </time>
                </div>

                {notification.summary ? (
                  <p className="mhidas-notification-summary">{notification.summary}</p>
                ) : null}

                <div className="mhidas-notification-actions">
                  {safeDestination ? (
                    <button
                      type="button"
                      className="mhidas-notification-button"
                      data-primary="true"
                      disabled={isUpdating || markingAll || loadingMore}
                      onClick={() => void markNotificationRead(notification, true)}
                    >
                      {isUpdating ? "Abrindo..." : "Ver detalhes"}
                    </button>
                  ) : null}

                  {!notification.isRead ? (
                    <button
                      type="button"
                      className="mhidas-notification-button"
                      disabled={isUpdating || markingAll || loadingMore}
                      onClick={() => void markNotificationRead(notification, false)}
                    >
                      {isUpdating ? "Atualizando..." : "Marcar como lida"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {hasMore && nextCursor ? (
        <div className="mhidas-notifications-footer">
          <button
            type="button"
            className="mhidas-notification-button"
            disabled={loadingMore || loading || mutationInFlightRef.current}
            onClick={() => void loadNotifications(nextCursor)}
          >
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
