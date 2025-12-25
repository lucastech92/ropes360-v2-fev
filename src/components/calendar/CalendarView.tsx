import { useState, useMemo } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  getDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CalendarEvent, CalendarEventType, useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarEventCard } from "./CalendarEventCard";
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const typeColors: Record<CalendarEventType, string> = {
  service: "bg-blue-500",
  maintenance: "bg-orange-500",
  calibration: "bg-purple-500",
  timesheet: "bg-green-500",
};

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export const CalendarView = ({ onEventClick }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<CalendarEventType | "all">("all");

  const { data: events = [], isLoading } = useCalendarEvents(currentDate);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const key = format(event.date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    });
    return map;
  }, [filteredEvents]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter((e) => isSameDay(e.date, selectedDate));
  }, [filteredEvents, selectedDate]);

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const filterOptions: { value: CalendarEventType | "all"; label: string; color?: string }[] = [
    { value: "all", label: "Todos" },
    { value: "service", label: "Serviços", color: "bg-blue-500" },
    { value: "maintenance", label: "Manutenções", color: "bg-orange-500" },
    { value: "calibration", label: "Calibrações", color: "bg-purple-500" },
    { value: "timesheet", label: "Ponto", color: "bg-green-500" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar Grid */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg md:text-xl capitalize min-w-[180px] text-center">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Hoje
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(option.value)}
                className="text-xs"
              >
                {option.color && (
                  <span className={cn("h-2 w-2 rounded-full mr-1.5", option.color)} />
                )}
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDate.get(dateKey) || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={dateKey}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "min-h-[80px] md:min-h-[100px] p-1 border rounded-md cursor-pointer transition-all",
                        !isCurrentMonth && "opacity-40 bg-muted/30",
                        isCurrentMonth && "hover:bg-accent/50",
                        isSelected && "ring-2 ring-primary bg-accent/30",
                        isTodayDate && "border-primary border-2"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isTodayDate && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {dayEvents.length > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {dayEvents.length}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event) => (
                          <CalendarEventCard key={event.id} event={event} compact />
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{dayEvents.length - 2} mais
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Event Details Sidebar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
              : "Selecione uma data"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] md:h-[500px] pr-2">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Clique em um dia para ver os eventos
              </p>
            ) : selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum evento nesta data
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={cn(onEventClick && "cursor-pointer")}
                  >
                    <CalendarEventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
