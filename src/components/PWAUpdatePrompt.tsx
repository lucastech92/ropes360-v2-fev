import { useEffect } from "react";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export const PWAUpdatePrompt = () => {
  const { needRefresh, updateApp, dismissUpdate } = usePWAUpdate();

  // Auto-update after 3 seconds if user doesn't interact
  useEffect(() => {
    if (needRefresh) {
      const timer = setTimeout(() => {
        updateApp();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [needRefresh, updateApp]);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-3">
        <RefreshCw className="h-5 w-5 flex-shrink-0 animate-spin" />
        <div className="flex-1">
          <p className="font-medium text-sm">Nova versão disponível</p>
          <p className="text-xs opacity-90">Clique para atualizar o aplicativo</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={dismissUpdate}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={updateApp}
            className="h-8"
          >
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  );
};
