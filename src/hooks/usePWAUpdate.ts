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
        
        // Check for updates every 15 seconds (more aggressive)
        setInterval(() => {
          registration.update();
        }, 15 * 1000);
      }
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

  // Force clear ALL caches on every page load to ensure fresh content
  useEffect(() => {
    const forceRefreshCaches = async () => {
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          // Clear ALL caches, not just workbox ones
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log("All caches cleared for fresh content");
        } catch (error) {
          console.error("Error clearing caches:", error);
        }
      }
      
      // Also unregister old service workers and re-register
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
    };
    forceRefreshCaches();
  }, []);

  const updateApp = useCallback(async () => {
    try {
      // Clear all caches before updating
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      await updateServiceWorker(true);
      
      // Force hard reload
      window.location.href = window.location.href;
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
