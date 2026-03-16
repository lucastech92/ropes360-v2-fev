import { useTranslation } from "react-i18next";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2,
  WifiOff,
  Bell,
  Zap,
  Monitor,
  Chrome,
  Globe,
  Lightbulb
} from "lucide-react";

const StepItem = ({ number, children }: { number: number; children: React.ReactNode }) => (
  <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
      {number}
    </div>
    <div className="space-y-1 pt-1">{children}</div>
  </div>
);

const Install = () => {
  const { t } = useTranslation();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const benefits = [
    { icon: WifiOff, label: t("pwa.benefit1") },
    { icon: Zap, label: t("pwa.benefit2") },
    { icon: Bell, label: t("pwa.benefit3") },
    { icon: Smartphone, label: t("pwa.benefit4") },
  ];

  // Detect if user is on desktop
  const isDesktop = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const defaultTab = isIOS ? "ios" : isDesktop ? "desktop" : "mobile";

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
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Auto install button when available */}
                {canInstall && (
                  <div className="text-center space-y-3 pb-4 border-b border-border">
                    <p className="text-muted-foreground">
                      {t("pwa.clickToInstall")}
                    </p>
                    <Button size="lg" onClick={promptInstall} className="gap-2">
                      <Download className="h-5 w-5" />
                      {t("pwa.installNow")}
                    </Button>
                  </div>
                )}

                {/* Tabs for different platforms */}
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="desktop" className="gap-1.5 text-xs sm:text-sm">
                      <Monitor className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("pwa.tabDesktop")}</span>
                      <span className="sm:hidden">Desktop</span>
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="gap-1.5 text-xs sm:text-sm">
                      <Smartphone className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("pwa.tabMobile")}</span>
                      <span className="sm:hidden">Android</span>
                    </TabsTrigger>
                    <TabsTrigger value="ios" className="gap-1.5 text-xs sm:text-sm">
                      <Globe className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("pwa.tabIOS")}</span>
                      <span className="sm:hidden">iOS</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Desktop Tab */}
                  <TabsContent value="desktop" className="space-y-5 mt-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t("pwa.desktopTitle")}</h3>
                      <p className="text-sm text-muted-foreground">{t("pwa.desktopDescription")}</p>
                    </div>

                    {/* Chrome instructions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Chrome className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">{t("pwa.desktopChromeTitle")}</h4>
                      </div>
                      <StepItem number={1}>
                        <span className="font-medium">{t("pwa.desktopChromeStep1")}</span>
                      </StepItem>
                      <StepItem number={2}>
                        <span className="font-medium">{t("pwa.desktopChromeStep2")}</span>
                      </StepItem>
                      <StepItem number={3}>
                        <span className="font-medium">{t("pwa.desktopChromeStep3")}</span>
                      </StepItem>
                    </div>

                    {/* Edge instructions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">{t("pwa.desktopEdgeTitle")}</h4>
                      </div>
                      <StepItem number={1}>
                        <span className="font-medium">{t("pwa.desktopEdgeStep1")}</span>
                      </StepItem>
                      <StepItem number={2}>
                        <span className="font-medium">{t("pwa.desktopEdgeStep2")}</span>
                      </StepItem>
                      <StepItem number={3}>
                        <span className="font-medium">{t("pwa.desktopEdgeStep3")}</span>
                      </StepItem>
                    </div>

                    {/* Tip */}
                    <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
                      <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{t("pwa.desktopTip")}</p>
                    </div>
                  </TabsContent>

                  {/* Mobile Android Tab */}
                  <TabsContent value="mobile" className="space-y-5 mt-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t("pwa.mobileTitle")}</h3>
                      <p className="text-sm text-muted-foreground">{t("pwa.mobileDescription")}</p>
                    </div>

                    {/* Chrome mobile */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Chrome className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">{t("pwa.desktopChromeTitle")}</h4>
                      </div>
                      <StepItem number={1}>
                        <span className="font-medium">{t("pwa.mobileChromeStep1")}</span>
                      </StepItem>
                      <StepItem number={2}>
                        <span className="font-medium">{t("pwa.mobileChromeStep2")}</span>
                      </StepItem>
                      <StepItem number={3}>
                        <span className="font-medium">{t("pwa.mobileChromeStep3")}</span>
                      </StepItem>
                    </div>

                    {/* Samsung Internet */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">Samsung Internet</h4>
                      </div>
                      <StepItem number={1}>
                        <span className="font-medium">{t("pwa.mobileSamsungStep1")}</span>
                      </StepItem>
                      <StepItem number={2}>
                        <span className="font-medium">{t("pwa.mobileSamsungStep2")}</span>
                      </StepItem>
                      <StepItem number={3}>
                        <span className="font-medium">{t("pwa.mobileSamsungStep3")}</span>
                      </StepItem>
                    </div>
                  </TabsContent>

                  {/* iOS Tab */}
                  <TabsContent value="ios" className="space-y-5 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">Safari</h4>
                      </div>
                      <StepItem number={1}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Share className="h-5 w-5 text-primary" />
                            <span className="font-medium">{t("pwa.iosStep1Title")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t("pwa.iosStep1Desc")}
                          </p>
                        </div>
                      </StepItem>
                      <StepItem number={2}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <PlusSquare className="h-5 w-5 text-primary" />
                            <span className="font-medium">{t("pwa.iosStep2Title")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t("pwa.iosStep2Desc")}
                          </p>
                        </div>
                      </StepItem>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Install;
