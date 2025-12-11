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
      
      // Force immediate update check
      if (registration) {
        registration.update();
        
        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    setNeedRefresh(swNeedRefresh);
    
    // Auto-update if refresh is needed (force update)
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
