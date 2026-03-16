import { FileText, Download, Trash2, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Certification, getCertStatus, getDaysUntilExpiry } from "@/hooks/useCertifications";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface Props {
  cert: Certification;
  onDelete?: (cert: Certification) => void;
  canDelete?: boolean;
  showUser?: boolean;
  userName?: string;
}

const statusConfig = {
  valid: {
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  expiring: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  expired: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

export const CertificationCard = ({ cert, onDelete, canDelete, showUser, userName }: Props) => {
  const { t } = useTranslation();
  const status = getCertStatus(cert.expiry_date);
  const daysUntil = getDaysUntilExpiry(cert.expiry_date);
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const handleDownload = async () => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(cert.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const statusLabel = status === "valid"
    ? t("certifications.valid")
    : status === "expiring"
    ? t("certifications.expiringSoon")
    : t("certifications.expired");

  const daysLabel = daysUntil >= 0
    ? `${daysUntil} ${t("certifications.daysLeft")}`
    : `${Math.abs(daysUntil)} ${t("certifications.daysOverdue")}`;

  return (
    <Card className={cn("border transition-all hover:shadow-md", config.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("mt-0.5", config.color)}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground">{cert.certification_name}</h4>
                <Badge className={cn("text-xs", config.badge)}>{statusLabel}</Badge>
              </div>
              {showUser && userName && (
                <p className="text-xs text-muted-foreground mt-0.5">{userName}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(cert.expiry_date), "dd/MM/yyyy")}
                </span>
                <span className={cn("text-xs font-medium", config.color)}>{daysLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                <FileText className="h-3 w-3 inline mr-1" />
                {cert.file_name}
              </p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(cert)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
