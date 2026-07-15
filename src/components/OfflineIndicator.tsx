import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const OfflineIndicator = () => {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOnline) {
      toast.warning(t("pwa.offlineTitle"), {
        description: t("pwa.offlineMessage"),
        duration: Infinity,
        id: "offline-toast",
        icon: <WifiOff className="h-4 w-4" />,
      });
    } else {
      toast.dismiss("offline-toast");
      
      if (wasOffline) {
        toast.success(t("pwa.backOnlineTitle"), {
          description: t("pwa.backOnlineMessage"),
          duration: 4000,
          icon: <RefreshCw className="h-4 w-4" />,
        });
        clearWasOffline();
      }
    }
  }, [isOnline, wasOffline, clearWasOffline, t]);

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg transition-all duration-300",
        "bg-destructive text-destructive-foreground"
      )}
    >
      <WifiOff className="h-4 w-4 animate-pulse" />
      <span className="text-sm font-medium">{t("pwa.offline")}</span>
    </div>
  );
};

