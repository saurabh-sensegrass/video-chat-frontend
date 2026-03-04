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

/**
 * Utility to convert base64 URL-safe VAPID key to Uint8Array
 * required by the pushManager.subscribe call.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the current device to Web Push notifications.
 * It will prompt for permission if not already granted.
 */
export async function subscribeToPush(token: string) {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    console.log("Push notifications are not supported by this browser.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted.");
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/push/vapid-public-key`,
    );
    if (!response.ok) throw new Error("Failed to fetch VAPID key");

    const { publicKey } = await response.json();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // If we have an existing subscription, check if VAPID keys match
    // If not, we MUST re-subscribe with the new key
    if (subscription) {
      const currentKey = subscription.options.applicationServerKey;
      if (currentKey) {
        const currentKeyBase64 = btoa(
          String.fromCharCode(...new Uint8Array(currentKey)),
        )
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        if (currentKeyBase64 !== publicKey) {
          console.log("VAPID key changed, re-subscribing...");
          await subscription.unsubscribe();
          subscription = null;
        }
      }
    }

    if (!subscription) {
      // Subscribe to push manager
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 3. Send subscription to our backend
    const subResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/push/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      },
    );

    if (!subResponse.ok) {
      throw new Error(`Backend subscription failed: ${subResponse.statusText}`);
    }

    console.log("Successfully subscribed to push notifications");
    return true;
  } catch (err) {
    console.error("Error subscribing to push:", err);
    return false;
  }
}
