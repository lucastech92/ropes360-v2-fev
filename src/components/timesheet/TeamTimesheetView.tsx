import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Download, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckInType, TimeEntry, getCheckInLabel, getCheckInColor } from "@/hooks/useTimeEntries";
import { exportToExcel } from "@/utils/exportUtils";
import { cn } from "@/lib/utils";

interface TeamTimesheetViewProps {
  month: Date;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export const TeamTimesheetView = ({ month }: TeamTimesheetViewProps) => {
  const { t, i18n } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const getLocale = () => {
    switch (i18n.language) {
      case 'pt-BR': return ptBR;
      case 'es-ES': return es;
      default: return enUS;
    }
  };

  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  const { data: users } = useQuery({
    queryKey: ['user-profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const { data: allEntries } = useQuery({
    queryKey: ['team-time-entries', format(month, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
        .lte('entry_date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;
      return data as TimeEntry[];
    },
  });

  const filteredUsers = selectedUserId === 'all' 
    ? users 
    : users?.filter(u => u.user_id === selectedUserId);

  const getEntryForUserDate = (userId: string, date: Date): TimeEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allEntries?.find(e => e.user_id === userId && e.entry_date === dateStr);
  };

  const handleExport = () => {
    if (!filteredUsers || !allEntries) return;

    const exportData = filteredUsers.map(user => {
      const row: Record<string, any> = {
        'Colaborador': user.full_name || user.email || 'N/A',
      };

      daysInMonth.forEach(day => {
        const entry = getEntryForUserDate(user.user_id, day);
        row[format(day, 'dd')] = entry ? getCheckInLabel(entry.check_in_type) : '';
      });

      return row;
    });

    exportToExcel(exportData, `folha-ponto-${format(month, 'yyyy-MM')}`, 'Folha de Ponto');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t('timesheet.selectEmployee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('timesheet.allEmployees')}</SelectItem>
              {users?.map(user => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.full_name || user.email || 'N/A'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t('timesheet.exportExcel')}
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">
                {t('timesheet.employee')}
              </TableHead>
              {daysInMonth.map(day => (
                <TableHead 
                  key={day.toISOString()} 
                  className="text-center min-w-[40px] px-1"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground capitalize">
                      {format(day, 'EEE', { locale: getLocale() })}
                    </span>
                    <span className="font-semibold">{format(day, 'd')}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map(user => (
              <TableRow key={user.user_id}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium">
                  {user.full_name || user.email || 'N/A'}
                </TableCell>
                {daysInMonth.map(day => {
                  const entry = getEntryForUserDate(user.user_id, day);
                  return (
                    <TableCell 
                      key={day.toISOString()} 
                      className="text-center p-1"
                    >
                      {entry && (
                        <div 
                          className={cn(
                            "w-6 h-6 mx-auto rounded text-white flex items-center justify-center text-xs font-bold",
                            getCheckInColor(entry.check_in_type)
                          )}
                          title={getCheckInLabel(entry.check_in_type)}
                        >
                          {entry.check_in_type.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
