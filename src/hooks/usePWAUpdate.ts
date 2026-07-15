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
      console.log("[PWA] Service Worker registered:", swUrl);

      if (!registration) return;

      // Check for updates every 30 seconds (more aggressive)
      const intervalId = window.setInterval(() => {
        console.log("[PWA] Checking for updates...");
        registration.update();
      }, 30 * 1000);

      window.addEventListener(
        "beforeunload",
        () => window.clearInterval(intervalId),
        { once: true }
      );
    },
    onRegisterError(error) {
      console.error("[PWA] SW registration error:", error);
    },
  });

  // When a new Service Worker takes control, reload once to guarantee the newest assets are used.
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
      console.log("[PWA] New SW took control, clearing caches and reloading...");

      // Clear runtime caches before reloading to avoid serving stale assets
      void (async () => {
        try {
          if ("caches" in window) {
            const keys = await caches.keys();
            console.log("[PWA] Clearing caches:", keys);
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
      console.log("[PWA] New version available, updating silently...");
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // On mount, try to unregister any stale service workers and clear caches
  useEffect(() => {
    const cleanupStaleWorkers = async () => {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`[PWA] Found ${registrations.length} SW registrations`);
        
        // If there are multiple registrations, something is wrong - clear all caches
        if (registrations.length > 1) {
          console.log("[PWA] Multiple SW registrations detected, cleaning up...");
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        }
      } catch (error) {
        console.error("[PWA] Error checking registrations:", error);
      }
    };

    cleanupStaleWorkers();
  }, []);

  return {
    offlineReady,
    needRefresh,
  };
};

