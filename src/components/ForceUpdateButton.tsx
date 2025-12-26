import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const ForceUpdateButton = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    toast.info("Forçando atualização...");

    try {
      // Unregister all service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`[ForceUpdate] Found ${registrations.length} SW registrations`);
        
        for (const registration of registrations) {
          await registration.unregister();
          console.log("[ForceUpdate] Unregistered SW:", registration.scope);
        }
      }

      // Clear all caches
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        console.log("[ForceUpdate] Clearing caches:", cacheKeys);
        
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        console.log("[ForceUpdate] All caches cleared");
      }

      // Clear localStorage PWA keys
      sessionStorage.removeItem("pwa:last_sw_reload_at");

      toast.success("Cache limpo! Recarregando...");
      
      // Force reload bypassing cache
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("[ForceUpdate] Error:", error);
      toast.error("Erro ao atualizar. Tente novamente.");
      setIsUpdating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleForceUpdate}
      disabled={isUpdating}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
      {isUpdating ? "Atualizando..." : "Forçar Atualização"}
    </Button>
  );
};
