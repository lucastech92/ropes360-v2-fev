import { useTranslation } from "react-i18next";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2,
  Wifi,
  WifiOff,
  Bell,
  Zap
} from "lucide-react";

const Install = () => {
  const { t } = useTranslation();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const benefits = [
    { icon: WifiOff, label: t("pwa.benefit1") },
    { icon: Zap, label: t("pwa.benefit2") },
    { icon: Bell, label: t("pwa.benefit3") },
    { icon: Smartphone, label: t("pwa.benefit4") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("pwa.pageTitle")}
            </h1>
            <p className="text-muted-foreground">
              {t("pwa.pageDescription")}
            </p>
          </div>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("pwa.benefitsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                  >
                    <benefit.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm">{benefit.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Installation Status */}
          {isInstalled ? (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="flex items-center gap-4 p-6">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t("pwa.alreadyInstalled")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("pwa.alreadyInstalledDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("pwa.howToInstall")}
                </CardTitle>
                <CardDescription>
                  {isIOS ? t("pwa.iosDevice") : t("pwa.androidDevice")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isIOS ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        1
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Share className="h-5 w-5 text-primary" />
                          <span className="font-medium">{t("pwa.iosStep1Title")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("pwa.iosStep1Desc")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        2
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PlusSquare className="h-5 w-5 text-primary" />
                          <span className="font-medium">{t("pwa.iosStep2Title")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("pwa.iosStep2Desc")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : canInstall ? (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      {t("pwa.clickToInstall")}
                    </p>
                    <Button size="lg" onClick={promptInstall} className="gap-2">
                      <Download className="h-5 w-5" />
                      {t("pwa.installNow")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("pwa.chromeInstructions")}
                    </p>
                    <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        1
                      </div>
                      <div className="space-y-1">
                        <span className="font-medium">{t("pwa.chromeStep1")}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        2
                      </div>
                      <div className="space-y-1">
                        <span className="font-medium">{t("pwa.chromeStep2")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Install;
