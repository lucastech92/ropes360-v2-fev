import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Gauge, Wrench, FileText, Package, Award, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type AlertCount = {
  calibration: number;
  maintenance: number;
  documents: number;
  certifications: number;
  inventory: number;
  total: number;
};

export const AlertsSummaryWidget = () => {
  const { t } = useTranslation();

  const { data: alerts } = useQuery({
    queryKey: ["alerts-summary"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { calibration: 0, maintenance: 0, documents: 0, certifications: 0, inventory: 0, total: 0 } as AlertCount;

      const { data, error } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) return { calibration: 0, maintenance: 0, documents: 0, certifications: 0, inventory: 0, total: 0 } as AlertCount;

      const counts: AlertCount = { calibration: 0, maintenance: 0, documents: 0, certifications: 0, inventory: 0, total: data.length };
      data.forEach((n) => {
        if (n.type.includes("calibration")) counts.calibration++;
        else if (n.type.includes("maintenance")) counts.maintenance++;
        else if (n.type.includes("document")) counts.documents++;
        else if (n.type.includes("certification")) counts.certifications++;
        else if (n.type.includes("inventory") || n.type.includes("low")) counts.inventory++;
      });
      return counts;
    },
    refetchInterval: 60000,
  });

  if (!alerts || alerts.total === 0) return null;

  const items = [
    { icon: Gauge, label: t('alerts.calibrations'), count: alerts.calibration, color: "text-orange-500" },
    { icon: Wrench, label: t('alerts.maintenances'), count: alerts.maintenance, color: "text-blue-500" },
    { icon: FileText, label: t('alerts.documents'), count: alerts.documents, color: "text-purple-500" },
    { icon: Award, label: t('alerts.certifications'), count: alerts.certifications, color: "text-green-500" },
    { icon: Package, label: t('alerts.stock'), count: alerts.inventory, color: "text-red-500" },
  ].filter(i => i.count > 0);

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            {t('alerts.activeAlerts')}
            <Badge variant="destructive">{alerts.total}</Badge>
          </CardTitle>
          <Link to="/notificacoes" className="text-sm text-primary flex items-center gap-1 hover:underline">
            {t('alerts.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-sm font-medium">{item.count}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
