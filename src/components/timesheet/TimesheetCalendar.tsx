import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DayPicker, DayContentProps } from "react-day-picker";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Home, Ship, Plane, Building2, Coffee, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckInType, TimeEntry, getCheckInColor } from "@/hooks/useTimeEntries";
import { cn } from "@/lib/utils";

interface TimesheetCalendarProps {
  entries: TimeEntry[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  month: Date;
  onMonthChange: (date: Date) => void;
}

const typeIcons: Record<CheckInType, React.ElementType> = {
  home_office: Home,
  offshore: Ship,
  travel: Plane,
  base: Building2,
  day_off: Coffee,
  vacation: Palmtree,
};

export const TimesheetCalendar = ({
  entries,
  selectedDate,
  onSelectDate,
  month,
  onMonthChange,
}: TimesheetCalendarProps) => {
  const { i18n } = useTranslation();

  const getLocale = () => {
    switch (i18n.language) {
      case 'pt-BR': return ptBR;
      case 'es-ES': return es;
      default: return enUS;
    }
  };

  const getEntryForDate = (date: Date): TimeEntry | undefined => {
    return entries.find(entry => 
      isSameDay(new Date(entry.entry_date + 'T00:00:00'), date)
    );
  };

  const renderDayContent = (props: DayContentProps) => {
    const entry = getEntryForDate(props.date);
    const Icon = entry ? typeIcons[entry.check_in_type] : null;
    
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <span className={cn(
          "text-sm",
          entry && "font-semibold"
        )}>
          {props.date.getDate()}
        </span>
        {entry && Icon && (
          <div className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 p-0.5 rounded text-white",
            getCheckInColor(entry.check_in_type)
          )}>
            <Icon className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  const modifiers = {
    hasEntry: (date: Date) => !!getEntryForDate(date),
    home_office: (date: Date) => getEntryForDate(date)?.check_in_type === 'home_office',
    offshore: (date: Date) => getEntryForDate(date)?.check_in_type === 'offshore',
    travel: (date: Date) => getEntryForDate(date)?.check_in_type === 'travel',
    base: (date: Date) => getEntryForDate(date)?.check_in_type === 'base',
    day_off: (date: Date) => getEntryForDate(date)?.check_in_type === 'day_off',
    vacation: (date: Date) => getEntryForDate(date)?.check_in_type === 'vacation',
  };

  const modifiersStyles = {
    home_office: { backgroundColor: 'rgb(59 130 246 / 0.15)' },
    offshore: { backgroundColor: 'rgb(249 115 22 / 0.15)' },
    travel: { backgroundColor: 'rgb(168 85 247 / 0.15)' },
    base: { backgroundColor: 'rgb(34 197 94 / 0.15)' },
    day_off: { backgroundColor: 'rgb(156 163 175 / 0.15)' },
    vacation: { backgroundColor: 'rgb(6 182 212 / 0.15)' },
  };

  return (
    <DayPicker
      mode="single"
      selected={selectedDate || undefined}
      onSelect={(date) => date && onSelectDate(date)}
      month={month}
      onMonthChange={onMonthChange}
      locale={getLocale()}
      modifiers={modifiers}
      modifiersStyles={modifiersStyles}
      showOutsideDays={false}
      className="p-3 pointer-events-auto"
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-lg font-semibold capitalize",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-9 w-9 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem] capitalize",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "h-12 w-12"
        ),
        day: cn(
          "h-12 w-12 p-0 font-normal rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground focus:outline-none",
          "aria-selected:opacity-100"
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_today: "ring-2 ring-primary ring-offset-2",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: renderDayContent,
      }}
    />
  );
};
