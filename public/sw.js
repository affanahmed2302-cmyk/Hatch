/* Hatch SW v7 — network-first, never poison /_next after broken deploys */
const CACHE = "hatch-static-v7";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/icon.svg", "/manifest.json"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_ALL") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Next.js chunks / RSC — always network. Stale chunks cause white-screen crashes.
  if (
    event.request.mode === "navigate" ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/").then((r) => r || Response.error()))
    );
    return;
  }

  // Static assets only
  if (
    url.pathname.endsWith("icon.svg") ||
    url.pathname.endsWith("manifest.json") ||
    url.pathname.endsWith("sw.js")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Hatch", body: "New activity", url: "/home" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* */ }
  event.waitUntil(
    self.registration.showNotification(data.title || "Hatch", {
      body: data.body || "",
      icon: "/icon.svg?v=energy-h-v7",
      badge: "/icon.svg?v=energy-h-v7",
      data: { url: data.url || "/home" },
      requireInteraction: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
