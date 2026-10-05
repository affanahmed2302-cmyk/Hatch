/* Hatch service worker — push + light offline; never pin old logos */
const CACHE = "hatch-static-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/icon.svg", "/manifest.json"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Always network-first for icons / manifest so old ring logo dies
  if (
    url.pathname.endsWith("icon.svg") ||
    url.pathname.endsWith("manifest.json")
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
    return;
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Hatch", body: "New activity", url: "/home" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Hatch", {
      body: data.body || "",
      icon: "/icon.svg?v=energy-h-c3",
      badge: "/icon.svg?v=energy-h-c3",
      data: { url: data.url || "/home" },
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
