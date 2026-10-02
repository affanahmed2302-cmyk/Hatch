const CACHE = "hatch-v3";
const SHELL = ["/", "/home", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && (url.pathname === "/" || url.pathname.startsWith("/icon") || url.pathname === "/manifest.json")) {
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});

/** Background call / message ring */
self.addEventListener("push", (event) => {
  let data = { title: "Hatch", body: "New activity", url: "/home", tag: "hatch" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  const isCall = data.type === "call" || (data.title || "").toLowerCase().includes("call");
  event.waitUntil(
    self.registration.showNotification(data.title || "Hatch", {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: data.tag || (isCall ? "hatch-call" : "hatch"),
      renotify: true,
      requireInteraction: isCall,
      vibrate: isCall ? [200, 100, 200, 100, 200] : [100, 50, 100],
      data: { url: data.url || "/inbox" },
      actions: isCall
        ? [
            { action: "open", title: "Answer" },
            { action: "dismiss", title: "Dismiss" },
          ]
        : [{ action: "open", title: "Open" }],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = (event.notification.data && event.notification.data.url) || "/inbox";
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
