import { CalendarEvent, CalendarEventType } from "@/hooks/useCalendarEvents";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Wrench, 
  Gauge, 
  Clock, 
  MapPin,
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEventCardProps {
  event: CalendarEvent;
  compact?: boolean;
}

const typeConfig: Record<CalendarEventType, { 
  icon: typeof Briefcase; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  service: { 
    icon: Briefcase, 
    color: "text-blue-600 dark:text-blue-400", 
    bgColor: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    label: "Serviço"
  },
  maintenance: { 
    icon: Wrench, 
    color: "text-orange-600 dark:text-orange-400", 
    bgColor: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
    label: "Manutenção"
  },
  calibration: { 
    icon: Gauge, 
    color: "text-purple-600 dark:text-purple-400", 
    bgColor: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800",
    label: "Calibração"
  },
  timesheet: { 
    icon: Clock, 
    color: "text-green-600 dark:text-green-400", 
    bgColor: "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800",
    label: "Ponto"
  },
};

const priorityColors: Record<string, string> = {
  alta: "bg-red-500",
  media: "bg-yellow-500",
  baixa: "bg-green-500",
};

export const CalendarEventCard = ({ event, compact = false }: CalendarEventCardProps) => {
  const config = typeConfig[event.type];
  const Icon = config.icon;

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate border",
          config.bgColor
        )}
      >
        <Icon className={cn("h-3 w-3 shrink-0", config.color)} />
        <span className="truncate font-medium">{event.title}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-all hover:shadow-md",
        config.bgColor
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn("p-1.5 rounded-md bg-background/50", config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{event.title}</h4>
            {event.metadata?.priority && (
              <span 
                className={cn(
                  "h-2 w-2 rounded-full",
                  priorityColors[event.metadata.priority] || "bg-gray-400"
                )}
                title={`Prioridade: ${event.metadata.priority}`}
              />
            )}
          </div>
          
          {event.description && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {event.type === "service" && <MapPin className="h-3 w-3" />}
              {event.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs py-0">
              {config.label}
            </Badge>
            
            {event.status && event.type === "maintenance" && (
              <Badge 
                variant={event.status === "pendente" ? "destructive" : "secondary"}
                className="text-xs py-0"
              >
                {event.status}
              </Badge>
            )}
            
            {event.metadata?.isEnd && (
              <Badge variant="outline" className="text-xs py-0 border-red-300 text-red-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Término
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
