self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// For future Web Push handling (if implemented)
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "CommSphere";
  const body = data.body || "New notification";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200],
      data: data.url,
    }),
  );
});

// Handle clicking on the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Try to find an existing window and focus it
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If we found a window, focus it
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        // If no window exists, open a new one
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      }),
  );
});
