self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Web Push event from Backend
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error("Push event data is not JSON:", e);
    // Fallback if data is raw string
    data = { body: event.data ? event.data.text() : "New message" };
  }

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

  const urlToOpen = new URL(
    event.notification.data || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Find matching window
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Focus any existing window and navigate
        if (clientList.length > 0 && "focus" in clientList[0]) {
          const client = clientList[0];
          client.navigate(urlToOpen);
          return client.focus();
        }
        // Or open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
