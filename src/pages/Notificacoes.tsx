import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bell, Wrench, Gauge, Package, FileText, Users, 
  AlertTriangle, AlertCircle, Clock, CheckCircle,
  CheckCheck, Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getDateLocale } from "@/utils/dateLocale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_module: string | null;
  related_id: string | null;
  created_at: string;
};

const PAGE_SIZE = 20;

const getNotificationIcon = (type: string) => {
  if (type.includes("calibration")) return Gauge;
  if (type.includes("maintenance")) return Wrench;
  if (type.includes("inventory") || type.includes("low")) return Package;
  if (type.includes("document")) return FileText;
  if (type.includes("user") || type.includes("approval")) return Users;
  return Bell;
};

const getUrgencyLevel = (notification: Notification): 'critical' | 'warning' | 'info' | 'success' => {
  const title = notification.title.toLowerCase();
  const type = notification.type;
  if (type.includes('overdue') || title.includes('vencida') || title.includes('atrasada') || title.includes('urgente')) return 'critical';
  if (type.includes('expiring') || title.includes('atenção') || title.includes('vencendo')) return 'warning';
  if (type.includes('scheduled') || type.includes('low') || type.includes('approval')) return 'info';
  return 'success';
};

const getUrgencyIcon = (urgency: string) => {
  switch (urgency) {
    case 'critical': return AlertCircle;
    case 'warning': return AlertTriangle;
    case 'info': return Clock;
    default: return CheckCircle;
  }
};

const matchesTypeFilter = (notification: Notification, filter: string) => {
  if (filter === "all") return true;
  const type = notification.type;
  switch (filter) {
    case "calibration": return type.includes("calibration");
    case "maintenance": return type.includes("maintenance");
    case "inventory": return type.includes("inventory") || type.includes("low");
    case "document": return type.includes("document");
    case "certification": return type.includes("certification");
    case "user": return type.includes("user") || type.includes("approval");
    default: return true;
  }
};

const Notificacoes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [page, setPage] = useState(0);

  const typeOptions = [
    { value: "all", label: t('notifications.page.typeAll') },
    { value: "calibration", label: t('notifications.page.typeCalibration') },
    { value: "maintenance", label: t('notifications.page.typeMaintenance') },
    { value: "inventory", label: t('notifications.page.typeInventory') },
    { value: "document", label: t('notifications.page.typeDocuments') },
    { value: "certification", label: t('notifications.page.typeCertifications') },
    { value: "user", label: t('notifications.page.typeApproval') },
  ];

  const urgencyOptions = [
    { value: "all", label: t('notifications.page.urgencyAll') },
    { value: "critical", label: t('notifications.page.urgencyCritical') },
    { value: "warning", label: t('notifications.page.urgencyWarning') },
    { value: "info", label: t('notifications.page.urgencyInfo') },
  ];

  const readOptions = [
    { value: "all", label: t('notifications.page.readAll') },
    { value: "unread", label: t('notifications.page.readUnread') },
    { value: "read", label: t('notifications.page.readRead') },
  ];

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'critical': return { iconClass: 'text-destructive', bgClass: 'bg-destructive/10 border-destructive/30', dotClass: 'bg-destructive', label: t('notifications.page.urgencyCritical') };
      case 'warning': return { iconClass: 'text-orange-500', bgClass: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50', dotClass: 'bg-orange-500', label: t('notifications.page.urgencyWarning') };
      case 'info': return { iconClass: 'text-blue-500', bgClass: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50', dotClass: 'bg-blue-500', label: t('notifications.page.urgencyInfo') };
      default: return { iconClass: 'text-green-500', bgClass: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50', dotClass: 'bg-green-500', label: 'OK' };
    }
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('notificacoes-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: t('notifications.page.allMarkedRead') });
    },
  });

  const filtered = notifications.filter((n) => {
    if (!matchesTypeFilter(n, typeFilter)) return false;
    if (urgencyFilter !== "all" && getUrgencyLevel(n) !== urgencyFilter) return false;
    if (readFilter === "unread" && n.is_read) return false;
    if (readFilter === "read" && !n.is_read) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) markAsRead.mutate(notification.id);
    if (notification.related_module) {
      const routes: Record<string, string> = {
        inventario: '/inventario', inventory: '/inventario', maintenance: '/inventario',
        documents: '/procedimentos-oficiais', users: '/gerenciar-usuarios', certificacoes: '/certificacoes',
      };
      navigate(routes[notification.related_module] || '/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bell className="h-8 w-8" />
              {t('notifications.title')}
              {unreadCount > 0 && (
                <Badge variant="destructive">
                  {unreadCount} {unreadCount > 1 ? t('notifications.page.unreadPlural') : t('notifications.page.unread')}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">{filtered.length} {t('notifications.page.found')}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={() => markAllAsRead.mutate()} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              {t('notifications.page.markAllRead')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={(v) => { setUrgencyFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {urgencyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {readOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg">{t('notifications.page.noNotificationsFound')}</p>
            <p className="text-sm">{t('notifications.page.adjustFilters')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginated.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const urgency = getUrgencyLevel(notification);
              const styles = getUrgencyStyles(urgency);
              const UrgencyIcon = getUrgencyIcon(urgency);
              return (
                <Card
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                    notification.is_read ? "opacity-60" : styles.bgClass
                  }`}
                  onClick={() => handleClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-full ${notification.is_read ? 'bg-muted' : 'bg-background'}`}>
                      <Icon className={`h-5 w-5 ${notification.is_read ? 'text-muted-foreground' : styles.iconClass}`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${notification.is_read ? 'text-muted-foreground' : ''}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && urgency !== 'success' && (
                          <Badge variant="outline" className={`text-xs ${styles.iconClass} border-current`}>
                            <UrgencyIcon className="h-3 w-3 mr-1" />
                            {styles.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: getDateLocale() })}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 mt-2 ${styles.dotClass}`} />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              {t('common.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('common.page')} {page + 1} {t('common.of')} {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              {t('common.next')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notificacoes;

