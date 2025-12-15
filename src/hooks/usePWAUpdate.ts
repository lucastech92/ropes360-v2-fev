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

  // Auto-update silently when new version is detected
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
