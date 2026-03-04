self.addEventListener("install", () => {
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

  const title = data.title || "Video Chat App";
  const body = data.body || "You have a new notification";

  const options = {
    body,
    icon: "/icon.png",
    badge: "/icon.png", // Must be a small monochrome image for Android status bar
    vibrate: [200, 100, 200], // Native vibration pattern
    tag: "video-chat-message", // Groups notifications
    renotify: true, // Alerts the user even if a notification with this tag already exists
    data: data.url || "/", // Where to go on click
    actions: [
      { action: "open", title: "Open App" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
