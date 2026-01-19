import { 
  Bell, 
  Wrench, 
  Gauge, 
  Package, 
  FileText, 
  Users, 
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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

export const NotificationBell = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Todas as notificações foram marcadas como lidas",
      });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "calibration_expiring":
      case "calibration_overdue":
        return Gauge;
      case "maintenance_scheduled":
      case "maintenance_overdue":
        return Wrench;
      case "inventory_low":
        return Package;
      case "document_expiring":
        return FileText;
      case "user_approval":
        return Users;
      default:
        return Bell;
    }
  };

  // Get urgency indicator based on type and title
  const getUrgencyLevel = (notification: Notification): 'critical' | 'warning' | 'info' | 'success' => {
    const title = notification.title.toLowerCase();
    const type = notification.type;
    
    // Critical: overdue or urgent
    if (type.includes('overdue') || title.includes('vencida') || title.includes('atrasada') || title.includes('urgente')) {
      return 'critical';
    }
    
    // Warning: expiring soon
    if (type.includes('expiring') || title.includes('atenção') || title.includes('vencendo')) {
      return 'warning';
    }
    
    // Info: scheduled, low inventory
    if (type.includes('scheduled') || type.includes('low') || type.includes('approval')) {
      return 'info';
    }
    
    return 'success';
  };

  // Get colors based on urgency
  const getUrgencyStyles = (urgency: 'critical' | 'warning' | 'info' | 'success') => {
    switch (urgency) {
      case 'critical':
        return {
          iconClass: 'text-destructive',
          bgClass: 'bg-destructive/10 border-destructive/30',
          dotClass: 'bg-destructive',
        };
      case 'warning':
        return {
          iconClass: 'text-orange-500',
          bgClass: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50',
          dotClass: 'bg-orange-500',
        };
      case 'info':
        return {
          iconClass: 'text-blue-500',
          bgClass: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50',
          dotClass: 'bg-blue-500',
        };
      case 'success':
        return {
          iconClass: 'text-green-500',
          bgClass: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50',
          dotClass: 'bg-green-500',
        };
    }
  };

  // Get urgency indicator icon
  const getUrgencyIcon = (urgency: 'critical' | 'warning' | 'info' | 'success') => {
    switch (urgency) {
      case 'critical':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Clock;
      case 'success':
        return CheckCircle;
    }
  };

  // Handle notification click - navigate to related module
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate based on related module
    if (notification.related_module) {
      const moduleRoutes: Record<string, string> = {
        'inventario': '/inventario',
        'inventory': '/inventario',
        'maintenance': '/inventario',
        'documents': '/procedimentos-oficiais',
        'users': '/gerenciar-usuarios',
      };
      
      const route = moduleRoutes[notification.related_module] || '/';
      navigate(route);
    }
  };

  // Count notifications by urgency for badge color
  const criticalCount = notifications.filter(n => !n.is_read && getUrgencyLevel(n) === 'critical').length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className={`h-5 w-5 ${criticalCount > 0 ? 'text-destructive' : ''}`} />
          {unreadCount > 0 && (
            <Badge
              variant={criticalCount > 0 ? "destructive" : "default"}
              className={`absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs ${
                criticalCount > 0 ? 'animate-pulse' : ''
              }`}
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">Notificações</h4>
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} urgente{criticalCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                className="text-xs"
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Carregando...
              </p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const urgency = getUrgencyLevel(notification);
                  const styles = getUrgencyStyles(urgency);
                  const UrgencyIcon = getUrgencyIcon(urgency);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                        notification.is_read 
                          ? "bg-background border-border opacity-70" 
                          : styles.bgClass
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`p-2 rounded-full ${notification.is_read ? 'bg-muted' : 'bg-background'}`}>
                          <Icon
                            className={`h-4 w-4 ${notification.is_read ? 'text-muted-foreground' : styles.iconClass}`}
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium leading-none truncate ${
                              notification.is_read ? 'text-muted-foreground' : ''
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && urgency !== 'success' && (
                              <UrgencyIcon className={`h-3.5 w-3.5 flex-shrink-0 ${styles.iconClass}`} />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                        
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${styles.dotClass}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
