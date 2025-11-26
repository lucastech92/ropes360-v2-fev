import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useTranslation } from "react-i18next";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const PWAInstallPrompt = () => {
  const { canInstall, showIOSInstructions, promptInstall, dismissPrompt } = usePWAInstall();
  const { t } = useTranslation();

  if (!canInstall && !showIOSInstructions) return null;

  const handleInstall = async () => {
    await promptInstall();
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="border-primary/20 bg-card shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-foreground">
                  {t("pwa.installTitle")}
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={dismissPrompt}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("pwa.installDescription")}
              </p>

              {showIOSInstructions ? (
                <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-foreground">
                    {t("pwa.iosInstructions")}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Share className="h-4 w-4" />
                    <span>{t("pwa.iosStep1")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <PlusSquare className="h-4 w-4" />
                    <span>{t("pwa.iosStep2")}</span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("pwa.installButton")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={dismissPrompt}
                  >
                    {t("pwa.later")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
