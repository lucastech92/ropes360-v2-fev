import { useState, useEffect, useCallback } from "react";

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
}

export const useOnlineStatus = () => {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
    lastOnline: null,
  });

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline ? true : prev.wasOffline,
      lastOnline: new Date(),
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
    }));
  }, []);

  const clearWasOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      wasOffline: false,
    }));
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    ...status,
    clearWasOffline,
  };
};
