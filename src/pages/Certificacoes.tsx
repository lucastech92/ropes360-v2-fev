import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, FileCheck, Users, BarChart3, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { CertificationUpload } from "@/components/certifications/CertificationUpload";
import { CertificationCard } from "@/components/certifications/CertificationCard";
import { CompetencyMatrix } from "@/components/certifications/CompetencyMatrix";
import { useCertifications, getCertStatus } from "@/hooks/useCertifications";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const Certificacoes = () => {
  const { t } = useTranslation();
  const { certifications, isLoadingCerts, deleteCertification } = useCertifications();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["user_profiles_for_certs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, email");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"])
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkRole();
  }, []);

  const getUserName = (userId: string) => {
    const p = profiles?.find((pr) => pr.user_id === userId);
    return p?.full_name || p?.email || "";
  };

  const certUserIds = Array.from(new Set(certifications.map((c) => c.user_id)));

  const filteredCerts = certifications.filter((c) => {
    const statusMatch = statusFilter === "all" || getCertStatus(c.expiry_date) === statusFilter;
    const userMatch = userFilter === "all" || c.user_id === userFilter;
    return statusMatch && userMatch;
  });

  const validCount = certifications.filter((c) => getCertStatus(c.expiry_date) === "valid").length;
  const expiringCount = certifications.filter((c) => getCertStatus(c.expiry_date) === "expiring").length;
  const expiredCount = certifications.filter((c) => getCertStatus(c.expiry_date) === "expired").length;

  if (isLoadingCerts) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("certifications.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("certifications.subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="certificates">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="certificates" className="gap-1.5">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t("certifications.certificates")}</span>
            </TabsTrigger>
            <TabsTrigger value="competencies" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("certifications.competencies")}</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("certifications.overview")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Upload Card */}
              <Card className="lg:col-span-1 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{t("certifications.addCertificate")}</CardTitle>
                  <CardDescription>{t("certifications.uploadDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CertificationUpload isAdmin={isAdmin} profiles={profiles ?? []} />
                </CardContent>
              </Card>

              {/* List Card */}
              <Card className="lg:col-span-2 border-border/50">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                    <div>
                      <CardTitle className="text-lg">{t("certifications.myCertificates")}</CardTitle>
                      <CardDescription>
                        {filteredCerts.length} {t("certifications.certificatesTotal")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {isAdmin && certUserIds.length > 0 && (
                        <Select value={userFilter} onValueChange={setUserFilter}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t("certifications.allTechnicians")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("certifications.allTechnicians")}</SelectItem>
                            {certUserIds.map((uid) => (
                              <SelectItem key={uid} value={uid}>
                                {getUserName(uid) || uid.slice(0, 8)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("certifications.allStatus")}</SelectItem>
                          <SelectItem value="valid">{t("certifications.valid")}</SelectItem>
                          <SelectItem value="expiring">{t("certifications.expiringSoon")}</SelectItem>
                          <SelectItem value="expired">{t("certifications.expired")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredCerts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{t("certifications.noCertificates")}</p>
                      </div>
                    ) : (
                      filteredCerts.map((cert) => (
                        <CertificationCard
                          key={cert.id}
                          cert={cert}
                          canDelete={isAdmin}
                          onDelete={(c) => deleteCertification.mutate(c)}
                          showUser={isAdmin}
                          userName={getUserName(cert.user_id)}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Competencies Tab */}
          <TabsContent value="competencies" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{t("certifications.competencyMatrix")}</CardTitle>
                <CardDescription>{t("certifications.competencyDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <CompetencyMatrix canEdit={isAdmin} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{validCount}</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("certifications.valid")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{expiringCount}</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">{t("certifications.expiringSoon")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{expiredCount}</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{t("certifications.expired")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(expiringCount > 0 || expiredCount > 0) && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{t("certifications.urgentActions")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {certifications
                      .filter((c) => getCertStatus(c.expiry_date) !== "valid")
                      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
                      .map((cert) => (
                        <CertificationCard
                          key={cert.id}
                          cert={cert}
                          showUser={isAdmin}
                          userName={getUserName(cert.user_id)}
                        />
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Certificacoes;
