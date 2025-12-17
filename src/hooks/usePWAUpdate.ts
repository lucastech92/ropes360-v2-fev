import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const usePWAUpdate = () => {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.log("Service Worker registered:", swUrl);

      if (!registration) return;

      // Check for updates every 60 seconds
      const intervalId = window.setInterval(() => {
        registration.update();
      }, 60 * 1000);

      window.addEventListener(
        "beforeunload",
        () => window.clearInterval(intervalId),
        { once: true }
      );
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  // When a new Service Worker takes control, reload once to guarantee the newest assets are used.
  // Important: don't block future updates in the same session (use a time-based guard, not a boolean).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (!hadController) return;

      const key = "pwa:last_sw_reload_at";
      const now = Date.now();
      const last = Number(sessionStorage.getItem(key) || "0");

      // Prevent reload loops (e.g., multiple controllerchange events in quick succession)
      if (now - last < 15_000) return;

      sessionStorage.setItem(key, String(now));

      // Clear runtime caches before reloading to avoid serving stale assets
      void (async () => {
        try {
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } finally {
          window.location.reload();
        }
      })();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
  }, []);

  // Auto-update silently when new version is detected (waiting state)
  useEffect(() => {
    if (needRefresh) {
      console.log("New version available, updating silently...");
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return {
    offlineReady,
    needRefresh,
  };
};
