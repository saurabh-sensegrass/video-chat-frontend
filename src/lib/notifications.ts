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

    if (applicationServerKey.length !== 65) {
      console.error(
        "Invalid VAPID public key length:",
        applicationServerKey.length,
      );
      throw new Error(
        `Invalid VAPID public key length: ${applicationServerKey.length}. Expected 65.`,
      );
    }

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

    console.debug("Subscribing with Public Key:", publicKey);
    if (!subscription) {
      try {
        // Subscribe to push manager
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (err: any) {
        // Robust self-healing: if it fails with AbortError, clear state and retry once
        if (err.name === "AbortError") {
          console.warn(
            "Push subscription aborted by browser, attempting to clear state and retry...",
          );
          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            await existing.unsubscribe();
          }
          // Second attempt
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        } else {
          throw err;
        }
      }
    }

    // 3. Send subscription to our backend
    console.debug("Sending subscription to backend...");
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
      const errorText = await subResponse.text();
      throw new Error(
        `Backend subscription failed: ${subResponse.statusText} (${subResponse.status}). Details: ${errorText}`,
      );
    }

    console.log("Successfully subscribed to push notifications");
    return true;
  } catch (err) {
    console.error("Error subscribing to push notifications:", {
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      raw: err,
    });
    return false;
  }
}
