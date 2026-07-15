import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Home, Ship, Plane, Building2, Coffee, Palmtree, Trash2 } from "lucide-react";
import { CheckInType, TimeEntry, getCheckInLabel, getCheckInColor } from "@/hooks/useTimeEntries";
import { cn } from "@/lib/utils";

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  existingEntry?: TimeEntry | null;
  onSave: (type: CheckInType, notes: string) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

const checkInTypes: { type: CheckInType; icon: React.ElementType; labelKey: string }[] = [
  { type: 'home_office', icon: Home, labelKey: 'homeOffice' },
  { type: 'offshore', icon: Ship, labelKey: 'offshore' },
  { type: 'travel', icon: Plane, labelKey: 'travel' },
  { type: 'base', icon: Building2, labelKey: 'base' },
  { type: 'day_off', icon: Coffee, labelKey: 'dayOff' },
  { type: 'vacation', icon: Palmtree, labelKey: 'vacation' },
];

export const CheckInModal = ({
  open,
  onOpenChange,
  selectedDate,
  existingEntry,
  onSave,
  onDelete,
  isLoading,
}: CheckInModalProps) => {
  const { t, i18n } = useTranslation();
  const [selectedType, setSelectedType] = useState<CheckInType>('base');
  const [notes, setNotes] = useState('');

  const getLocale = () => {
    switch (i18n.language) {
      case 'pt-BR': return ptBR;
      case 'es-ES': return es;
      default: return enUS;
    }
  };

  useEffect(() => {
    if (existingEntry) {
      setSelectedType(existingEntry.check_in_type);
      setNotes(existingEntry.notes || '');
    } else {
      setSelectedType('base');
      setNotes('');
    }
  }, [existingEntry, open]);

  const handleSave = () => {
    onSave(selectedType, notes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingEntry ? t('timesheet.editCheckIn') : t('timesheet.newCheckIn')}
          </DialogTitle>
          <DialogDescription>
            {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: getLocale() })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('timesheet.checkInType')}</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as CheckInType)}
              className="grid grid-cols-2 gap-2"
            >
              {checkInTypes.map(({ type, icon: Icon, labelKey }) => (
                <div key={type}>
                  <RadioGroupItem
                    value={type}
                    id={type}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={type}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-all",
                      "hover:bg-muted peer-data-[state=checked]:border-primary",
                      selectedType === type && "border-primary bg-primary/5"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-full text-white", getCheckInColor(type))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">
                      {t(`timesheet.types.${labelKey}`)}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('timesheet.notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('timesheet.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingEntry && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

