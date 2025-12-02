import { useTranslation } from "react-i18next";
import { Home, Ship, Plane, Building2, Coffee, Palmtree } from "lucide-react";
import { CheckInType, TimeEntry, getCheckInColor } from "@/hooks/useTimeEntries";
import { cn } from "@/lib/utils";

interface TimesheetSummaryProps {
  entries: TimeEntry[];
}

const summaryItems: { type: CheckInType; icon: React.ElementType; labelKey: string }[] = [
  { type: 'home_office', icon: Home, labelKey: 'homeOffice' },
  { type: 'offshore', icon: Ship, labelKey: 'offshore' },
  { type: 'travel', icon: Plane, labelKey: 'travel' },
  { type: 'base', icon: Building2, labelKey: 'base' },
  { type: 'day_off', icon: Coffee, labelKey: 'dayOff' },
  { type: 'vacation', icon: Palmtree, labelKey: 'vacation' },
];

export const TimesheetSummary = ({ entries }: TimesheetSummaryProps) => {
  const { t } = useTranslation();

  const counts = entries.reduce((acc, entry) => {
    acc[entry.check_in_type] = (acc[entry.check_in_type] || 0) + 1;
    return acc;
  }, {} as Record<CheckInType, number>);

  const totalDays = entries.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {summaryItems.map(({ type, icon: Icon, labelKey }) => {
        const count = counts[type] || 0;
        return (
          <div
            key={type}
            className="flex flex-col items-center p-3 rounded-lg bg-card border"
          >
            <div className={cn("p-2 rounded-full text-white mb-2", getCheckInColor(type))}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold">{count}</span>
            <span className="text-xs text-muted-foreground text-center">
              {t(`timesheet.types.${labelKey}`)}
            </span>
          </div>
        );
      })}
      <div className="col-span-2 sm:col-span-3 md:col-span-6 flex justify-center p-3 rounded-lg bg-primary/10 border border-primary/20">
        <span className="text-sm font-medium">
          {t('timesheet.totalDays')}: <span className="text-lg font-bold">{totalDays}</span>
        </span>
      </div>
    </div>
  );
};
