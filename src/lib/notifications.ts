/**
 * Send a browser notification if the tab is hidden and permissions are granted.
 * This is a simple utility to avoid repeating the same pattern everywhere.
 */
export async function sendAppNotification(
  title: string,
  body: string,
  options?: NotificationOptions,
) {
  if (
    typeof window === "undefined" ||
    !document.hidden ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: "/icon.png",
          badge: "/icon.png",
          ...options,
        });
        return;
      }
    }

    // Fallback if no SW
    new Notification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      silent: false,
      ...options,
    });
  } catch {
    // Notification API not available (e.g., in some mobile browsers)
  }
}
