/* public/mhidas-push-sw.js
 * MHIDAS / USECLUBBERS
 * V4.8.155 - Dedicated Web Push service worker.
 * No fetch interception, offline cache or push dispatch is implemented here.
 */

"use strict";

const DEFAULT_TITLE = "USECLUBBERS";
const DEFAULT_BODY = "Você tem uma nova notificação.";
const DEFAULT_URL = "/dashboard";

const STATIC_SHELL_CACHE =
  "mhidas-static-shell-v2";

const STATIC_SHELL_PREFIX =
  "/_next/static/";

const EVENT_OFFLINE_CACHE =
  "mhidas-event-offline-shell-v1";

const EVENT_OFFLINE_FALLBACK_URL =
  "/mhidas-event-offline.html";

function isSafeStaticShellRequest(
  request
) {
  if (
    !request ||
    request.method !== "GET"
  ) {
    return false;
  }

  let url;

  try {
    url = new URL(
      request.url
    );
  } catch {
    return false;
  }

  if (
    url.origin !==
      self.location.origin ||
    url.pathname.startsWith(
      "/api/"
    ) ||
    !url.pathname.startsWith(
      STATIC_SHELL_PREFIX
    )
  ) {
    return false;
  }

  return true;
}

async function readStaticShell(
  request
) {
  const cache =
    await caches.open(
      STATIC_SHELL_CACHE
    );

  const cached =
    await cache.match(
      request
    );

  if (cached) {
    return cached;
  }

  const response =
    await fetch(request);

  if (
    response &&
    response.ok &&
    response.type === "basic"
  ) {
    await cache.put(
      request,
      response.clone()
    );
  }

  return response;
}

function isEventNavigationRequest(
  request
) {
  if (
    !request ||
    request.method !== "GET" ||
    request.mode !== "navigate"
  ) {
    return false;
  }

  try {
    const url =
      new URL(request.url);

    return (
      url.origin ===
        self.location.origin &&
      url.pathname.startsWith(
        "/event/"
      )
    );
  } catch {
    return false;
  }
}

async function readEventNavigation(
  request
) {
  try {
    return await fetch(request);
  } catch {
    const cache =
      await caches.open(
        EVENT_OFFLINE_CACHE
      );

    const fallback =
      await cache.match(
        EVENT_OFFLINE_FALLBACK_URL
      );

    if (fallback) {
      return fallback;
    }

    return Response.error();
  }
}

function normalizeText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isSafeInternalUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  if (
    value.length < 2 ||
    value.length > 500 ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    !/^\/[A-Za-z0-9/_?&=.%#:@+~-]*$/.test(value)
  ) {
    return false;
  }

  try {
    const parsed = new URL(value, self.location.origin);

    return (
      parsed.origin === self.location.origin &&
      parsed.pathname.startsWith("/")
    );
  } catch {
    return false;
  }
}

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    const json = event.data.json();

    if (
      json &&
      typeof json === "object" &&
      !Array.isArray(json)
    ) {
      return json;
    }
  } catch {
    try {
      return {
        body: event.data.text(),
      };
    } catch {
      return {};
    }
  }

  return {};
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache =
        await caches.open(
          EVENT_OFFLINE_CACHE
        );

      await cache.add(
        EVENT_OFFLINE_FALLBACK_URL
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter(
                (name) =>
                  (
                    name.startsWith(
                      "mhidas-static-shell-"
                    ) &&
                    name !==
                      STATIC_SHELL_CACHE
                  ) ||
                  (
                    name.startsWith(
                      "mhidas-event-offline-shell-"
                    ) &&
                    name !==
                      EVENT_OFFLINE_CACHE
                  )
              )
              .map((name) =>
                caches.delete(name)
              )
          )
        ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (
    isEventNavigationRequest(
      event.request
    )
  ) {
    event.respondWith(
      readEventNavigation(
        event.request
      )
    );

    return;
  }

  if (
    isSafeStaticShellRequest(
      event.request
    )
  ) {
    event.respondWith(
      readStaticShell(
        event.request
      )
    );
  }
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = normalizeText(payload.title, 120) || DEFAULT_TITLE;
  const body = normalizeText(payload.body ?? payload.summary, 280) || DEFAULT_BODY;
  const internalUrl = isSafeInternalUrl(payload.internalUrl)
    ? payload.internalUrl
    : DEFAULT_URL;
  const notificationId = normalizeText(
    payload.notificationId,
    80
  );
  const tag = normalizeText(payload.tag ?? notificationId, 120);

  const options = {
    body,
    data: {
      internalUrl,
      notificationId: notificationId || null,
    },
    tag: tag || undefined,
    renotify: Boolean(tag),
    requireInteraction: Boolean(payload.requireInteraction),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const candidateUrl = event.notification?.data?.internalUrl;
  const internalUrl = isSafeInternalUrl(candidateUrl)
    ? candidateUrl
    : DEFAULT_URL;
  const absoluteUrl = new URL(
    internalUrl,
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          const clientUrl = new URL(client.url);

          if (clientUrl.origin !== self.location.origin) {
            continue;
          }

          if ("navigate" in client) {
            await client.navigate(absoluteUrl);
          }

          if ("focus" in client) {
            return client.focus();
          }
        }

        return self.clients.openWindow(absoluteUrl);
      })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({
            type: "MHIDAS_PUSH_SUBSCRIPTION_CHANGED",
          });
        }
      })
  );
});
