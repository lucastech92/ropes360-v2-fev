import { useState, useEffect, useCallback } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const usePWAUpdate = () => {
  const [needRefresh, setNeedRefresh] = useState(false);

  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("Service Worker registered:", swUrl);
      
      // Check for updates every 60 seconds
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    setNeedRefresh(swNeedRefresh);
  }, [swNeedRefresh]);

  const updateApp = useCallback(async () => {
    try {
      await updateServiceWorker(true);
      // Force reload after update
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
