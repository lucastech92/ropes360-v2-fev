import { useState, useEffect, useCallback } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const usePWAUpdate = () => {
  const [needRefresh, setNeedRefresh] = useState(false);

  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.log("Service Worker registered:", swUrl);

      if (!registration) return;

      // Force immediate update check
      registration.update();

      // Check for updates every 60 seconds
      const intervalId = window.setInterval(() => {
        registration.update();
      }, 60 * 1000);

      // Best-effort cleanup on page unload
      window.addEventListener(
        "beforeunload",
        () => {
          window.clearInterval(intervalId);
        },
        { once: true }
      );
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    setNeedRefresh(swNeedRefresh);
    
    if (swNeedRefresh) {
      console.log("New version detected, prompting update...");
    }
  }, [swNeedRefresh]);


  const updateApp = useCallback(async () => {
    try {
      // Clear all caches before updating
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      await updateServiceWorker(true);

      // Force reload
      window.location.reload();
    } catch (error) {
      console.error("Error updating app:", error);
      window.location.reload();
    }
  }, [updateServiceWorker]);

  const dismissUpdate = useCallback(() => {
    setSwNeedRefresh(false);
    setNeedRefresh(false);
  }, [setSwNeedRefresh]);

  return {
    needRefresh,
    updateApp,
    dismissUpdate,
  };
};
