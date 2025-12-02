import { useTranslation } from "react-i18next";
import { Home, Ship, Plane, Building2, Coffee, Palmtree } from "lucide-react";
import { CheckInType, getCheckInColor } from "@/hooks/useTimeEntries";
import { cn } from "@/lib/utils";

const legendItems: { type: CheckInType; icon: React.ElementType; labelKey: string }[] = [
  { type: 'home_office', icon: Home, labelKey: 'homeOffice' },
  { type: 'offshore', icon: Ship, labelKey: 'offshore' },
  { type: 'travel', icon: Plane, labelKey: 'travel' },
  { type: 'base', icon: Building2, labelKey: 'base' },
  { type: 'day_off', icon: Coffee, labelKey: 'dayOff' },
  { type: 'vacation', icon: Palmtree, labelKey: 'vacation' },
];

export const TimesheetLegend = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
      {legendItems.map(({ type, icon: Icon, labelKey }) => (
        <div key={type} className="flex items-center gap-2">
          <div className={cn("p-1 rounded text-white", getCheckInColor(type))}>
            <Icon className="h-3 w-3" />
          </div>
          <span className="text-xs text-muted-foreground">
            {t(`timesheet.types.${labelKey}`)}
          </span>
        </div>
      ))}
    </div>
  );
};
