import { Users, Wrench, ClipboardList, Calendar, Package, Activity, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/hooks/useServiceTimeline";

const iconMap: Record<string, React.ElementType> = {
  calendar: Calendar,
  users: Users,
  clipboard: ClipboardList,
  wrench: Wrench,
  package: Package,
  activity: Activity,
};

const colorMap: Record<string, { bg: string; border: string; dot: string }> = {
  service_created: { bg: "bg-primary/10", border: "border-primary/30", dot: "bg-primary" },
  collaborator_added: { bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-500" },
  checklist_linked: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  equipment_checkout: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  equipment_checkin: { bg: "bg-green-600/10", border: "border-green-600/30", dot: "bg-green-600" },
  inventory_checkout: { bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  inventory_checkin: { bg: "bg-amber-600/10", border: "border-amber-600/30", dot: "bg-amber-600" },
  activity: { bg: "bg-muted", border: "border-muted-foreground/20", dot: "bg-muted-foreground" },
};

const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffWeeks < 5) return `há ${diffWeeks} semana${diffWeeks > 1 ? "s" : ""}`;
  return `há ${diffMonths} mês${diffMonths > 1 ? "es" : ""}`;
};

const getEventIcon = (event: TimelineEvent) => {
  if (event.event_type.includes("checkout")) return ArrowUpFromLine;
  if (event.event_type.includes("checkin")) return ArrowDownToLine;
  return iconMap[event.icon_type] || Activity;
};

interface ServiceTimelineEventProps {
  event: TimelineEvent;
  index: number;
  isLast: boolean;
}

export const ServiceTimelineEvent = ({ event, index, isLast }: ServiceTimelineEventProps) => {
  const Icon = getEventIcon(event);
  const colors = colorMap[event.event_type] || colorMap.activity;
  const date = new Date(event.event_date);

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
      )}

      {/* Dot */}
      <div className={cn("relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2", colors.bg, colors.border)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <Card
        className={cn("flex-1 animate-fade-in border", colors.border)}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1">
              <p className="font-semibold text-sm text-foreground">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
            <div className="text-right shrink-0">
              <Badge variant="outline" className="text-xs">
                {getRelativeTime(event.event_date)}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          {event.actor_name && event.actor_name !== "Sistema" && (
            <div className="mt-2 flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{event.actor_name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

